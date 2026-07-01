import { useCallback } from "react";

import { getCachedValue, getOrCreateInflightRequest, hasCachedValue, setCachedValue } from "../../../shared/qlik/cache/qlikCache";
import { getQlikConnectionConfig, useQlik } from "../../../shared/qlik/hooks/useQlik";
import { getFilterFieldKey, selectFilterField, useFilterStore } from "../stores/filterStore";

function getUniqueValues(values = []) {
    return [...new Set(values.filter((value) => value !== null && value !== undefined))];
}

function getNextSelectedValues(selected, value, shouldSelect) {
    if (shouldSelect) {
        return selected.includes(value) ? selected : [...selected, value];
    }

    return selected.filter((selectedValue) => selectedValue !== value);
}

function shouldToggleTarget(selected, value, shouldSelect) {
    const isSelected = selected.includes(value);
    return shouldSelect ? !isSelected : isSelected;
}

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
        async ({ nextSelected, shouldSelect, toggledValue }) => {
            if (qlikError || qlikLoading || !fieldName) {
                setError(fieldKey, normalizeError(qlikError, `Unable to apply ${fieldName} selection.`));
                return;
            }

            const targetAppIds = getUniqueValues(writeAppIds?.length ? writeAppIds : [readAppId]);
            const targetFieldKeys = targetAppIds.map((appId) => getFilterFieldKey({ dashboardId, appId, fieldName }));
            const affectedFieldKeys = getUniqueValues([fieldKey, ...targetFieldKeys]);
            const storeFields = useFilterStore.getState().fields;
            const previousSelections = Object.fromEntries(
                affectedFieldKeys.map((affectedFieldKey) => [
                    affectedFieldKey,
                    affectedFieldKey === fieldKey ? field.selected : storeFields[affectedFieldKey]?.selected ?? [],
                ]),
            );

            affectedFieldKeys.forEach((affectedFieldKey) => {
                const selected =
                    affectedFieldKey === fieldKey
                        ? nextSelected
                        : getNextSelectedValues(previousSelections[affectedFieldKey], toggledValue, shouldSelect);

                setSelectedOptimistic(affectedFieldKey, selected);
                setApplying(affectedFieldKey, true);
            });

            try {
                await Promise.all(
                    targetAppIds.map(async (appId) => {
                        const targetFieldKey = getFilterFieldKey({ dashboardId, appId, fieldName });

                        if (!shouldToggleTarget(previousSelections[targetFieldKey] ?? [], toggledValue, shouldSelect)) {
                            return;
                        }

                        const app = await openApp(appId);
                        const qlikField = app.field(fieldName);
                        await qlikField.selectValues([toggledValue], true, true);
                    }),
                );
            } catch (error) {
                affectedFieldKeys.forEach((affectedFieldKey) => {
                    setSelectedOptimistic(affectedFieldKey, previousSelections[affectedFieldKey]);
                });
                setError(fieldKey, normalizeError(error, `Unable to apply ${fieldName} selection.`));
            } finally {
                affectedFieldKeys.forEach((affectedFieldKey) => {
                    setApplying(affectedFieldKey, false);
                });
            }
        },
        [dashboardId, field.selected, fieldKey, fieldName, openApp, qlikError, qlikLoading, readAppId, setApplying, setError, setSelectedOptimistic, writeAppIds],
    );

    const toggleValue = useCallback(
        (value) => {
            const shouldSelect = !field.selected.includes(value);
            const nextSelected = getNextSelectedValues(field.selected, value, shouldSelect);

            applySelection({ nextSelected, shouldSelect, toggledValue: value });
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