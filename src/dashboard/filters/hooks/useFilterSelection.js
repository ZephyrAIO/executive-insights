import { useCallback } from "react";

import { getCachedValue, getOrCreateInflightRequest, hasCachedValue, setCachedValue } from "../../../shared/qlik/cache/qlikCache";
import { getQlikConnectionConfig, useQlik } from "../../../shared/qlik/hooks/useQlik";
import { getFilterFieldKey, selectFilterField, useFilterStore } from "../stores/filterStore";

function normalizeError(error, fallbackMessage) {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === "string") {
        return error;
    }

    if (error && typeof error.message === "string") {
        return error.message;
    }

    return fallbackMessage;
}

function normalizeAppId(appId) {
    if (typeof appId !== "string") {
        return appId;
    }

    const trimmedAppId = appId.trim();

    if (!trimmedAppId || !/[\\/]/.test(trimmedAppId)) {
        return trimmedAppId;
    }

    const pathSegments = trimmedAppId.split(/[\\/]/).filter(Boolean);
    return pathSegments[pathSegments.length - 1] ?? trimmedAppId;
}

export function useFilterSelection({ dashboardId, scopeId, readAppId, writeAppIds, fieldName }) {
    const fieldKey = getFilterFieldKey({ dashboardId, scopeId, appId: readAppId, fieldName });
    const field = useFilterStore(selectFilterField(fieldKey));
    const { qlik, error: qlikError, loading: qlikLoading } = useQlik();
    const setSelectedOptimistic = useFilterStore((state) => state.setSelectedOptimistic);
    const setApplying = useFilterStore((state) => state.setApplying);
    const setError = useFilterStore((state) => state.setError);

    const openApp = useCallback(
        async (appId) => {
            if (!qlik) {
                throw new Error("Qlik is not ready for selection writes.");
            }

            const resolvedAppId = normalizeAppId(appId);
            const cacheKey = `app:${resolvedAppId}`;

            if (hasCachedValue(cacheKey)) {
                return getCachedValue(cacheKey);
            }

            return getOrCreateInflightRequest(cacheKey, async () => {
                const app = await qlik.openApp(resolvedAppId, getQlikConnectionConfig());
                return setCachedValue(cacheKey, app);
            });
        },
        [qlik],
    );

    const applySelection = useCallback(
        async ({ nextSelected, toggledValue }) => {
            if (qlikError || qlikLoading || !fieldName) {
                setError(fieldKey, normalizeError(qlikError, `Unable to apply ${fieldName} selection.`));
                return;
            }

            const previousSelected = field.selected;
            const targetAppIds = writeAppIds?.length ? writeAppIds : [readAppId];
            setSelectedOptimistic(fieldKey, nextSelected);
            setApplying(fieldKey, true);

            try {
                await Promise.all(
                    targetAppIds.map(async (appId) => {
                        const app = await openApp(appId);
                        const qlikField = app.field(fieldName);
                        await qlikField.selectValues([toggledValue], true, true);
                    }),
                );
            } catch (error) {
                setSelectedOptimistic(fieldKey, previousSelected);
                setError(fieldKey, normalizeError(error, `Unable to apply ${fieldName} selection.`));
            } finally {
                setApplying(fieldKey, false);
            }
        },
        [field.selected, fieldKey, fieldName, openApp, qlikError, qlikLoading, readAppId, setApplying, setError, setSelectedOptimistic, writeAppIds],
    );

    const toggleValue = useCallback(
        (value) => {
            const nextSelected = field.selected.includes(value)
                ? field.selected.filter((selectedValue) => selectedValue !== value)
                : [...field.selected, value];

            applySelection({ nextSelected, toggledValue: value });
        },
        [applySelection, field.selected],
    );

    return {
        applying: field.applying,
        error: field.error,
        selected: field.selected,
        toggleValue,
    };
}