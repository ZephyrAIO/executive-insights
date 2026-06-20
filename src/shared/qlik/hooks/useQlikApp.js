import { useEffect, useState } from "react";

import { getCachedValue, getOrCreateInflightRequest, hasCachedValue, setCachedValue } from "../cache/qlikCache";
import { getQlikConnectionConfig, useQlik } from "./useQlik";

function normalizeError(error, fallbackMessage) {
    if (error instanceof Error) {
        return error;
    }

    if (typeof error === "string") {
        return new Error(error);
    }

    if (error && typeof error.message === "string") {
        return new Error(error.message);
    }

    return new Error(fallbackMessage);
}

function getAppCacheKey(appId) {
    return `app:${appId}`;
}

function normalizeAppId(appId) {
    if (typeof appId !== "string") {
        return appId;
    }

    const trimmedAppId = appId.trim();

    if (!trimmedAppId) {
        return trimmedAppId;
    }

    if (!/[\\/]/.test(trimmedAppId)) {
        return trimmedAppId;
    }

    const pathSegments = trimmedAppId.split(/[\\/]/).filter(Boolean);
    return pathSegments[pathSegments.length - 1] ?? trimmedAppId;
}

export function useQlikApp(appId) {
    const { qlik, error: qlikError, loading: qlikLoading } = useQlik();
    const resolvedAppId = normalizeAppId(appId);
    const [state, setState] = useState(() => ({
        cacheKey: resolvedAppId ? getAppCacheKey(resolvedAppId) : null,
        app: null,
        error: null,
    }));
    const cacheKey = resolvedAppId ? getAppCacheKey(resolvedAppId) : null;
    const cachedApp = cacheKey && hasCachedValue(cacheKey) ? getCachedValue(cacheKey) : null;
    const app = cachedApp ?? (state.cacheKey === cacheKey ? state.app : null);
    const error = qlikError ?? (state.cacheKey === cacheKey ? state.error : null);
    const loading = Boolean(resolvedAppId) && !qlikError && (qlikLoading || (app == null && error == null));
    useEffect(() => {
        let isActive = true;

        if (!resolvedAppId || qlikError || qlikLoading || !qlik || hasCachedValue(cacheKey)) {
            return () => {
                isActive = false;
            };
        }

        const loadApp = async () => {
            try {
                const app = await getOrCreateInflightRequest(cacheKey, async () => {
                    const app = await qlik.openApp(resolvedAppId, getQlikConnectionConfig());
                    return setCachedValue(cacheKey, app);
                });

                if (isActive) {
                    setState({ cacheKey, app, error: null });
                }
            } catch (error) {
                if (isActive) {
                    setState({
                        cacheKey,
                        app: null,
                        error: normalizeError(
                            error,
                            `Unable to open Qlik app ${resolvedAppId}${
                                resolvedAppId !== appId ? ` (from ${appId})` : ""
                            }.`,
                        ),
                    });
                }
            }
        };

        loadApp();

        return () => {
            isActive = false;
        };
    }, [appId, cacheKey, qlik, qlikError, qlikLoading, resolvedAppId]);

    return { app, error, loading };
}
