import { useCallback, useState } from "react";

import { getCachedValue, getOrCreateInflightRequest, hasCachedValue, setCachedValue } from "../../../shared/qlik/cache/qlikCache";
import { getQlikConnectionConfig, useQlik } from "../../../shared/qlik/hooks/useQlik";
import { getUniqueAppIds } from "./filterUtils";
import { useFilterStore } from "../stores/filterStore";

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

export function useClearDashboardFilters({ appIds, dashboardId }) {
    const { qlik, error: qlikError, loading: qlikLoading } = useQlik();
    const resetDashboard = useFilterStore((state) => state.resetDashboard);
    const [clearing, setClearing] = useState(false);
    const [error, setError] = useState(null);

    const openApp = useCallback(
        async (appId) => {
            if (!qlik) {
                throw new Error("Qlik is not ready to clear selections.");
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

    const clearAll = useCallback(async () => {
        if (qlikError || qlikLoading) {
            setError(normalizeError(qlikError, "Unable to clear filters while Qlik is loading."));
            return;
        }

        const targetAppIds = getUniqueAppIds(appIds);

        if (targetAppIds.length === 0) {
            resetDashboard(dashboardId);
            return;
        }

        setClearing(true);
        setError(null);

        try {
            await Promise.all(
                targetAppIds.map(async (appId) => {
                    const app = await openApp(appId);

                    if (typeof app?.clearAll === "function") {
                        await app.clearAll();
                    }
                }),
            );
            resetDashboard(dashboardId);
        } catch (nextError) {
            setError(normalizeError(nextError, "Unable to clear dashboard filters."));
        } finally {
            setClearing(false);
        }
    }, [appIds, dashboardId, openApp, qlikError, qlikLoading, resetDashboard]);

    return {
        clearAll,
        clearing,
        error,
    };
}