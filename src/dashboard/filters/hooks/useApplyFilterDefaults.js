import { useCallback, useEffect, useMemo, useRef } from "react";

import { getCachedValue, getOrCreateInflightRequest, hasCachedValue, setCachedValue } from "../../../shared/qlik/cache/qlikCache";
import { getQlikConnectionConfig, useQlik } from "../../../shared/qlik/hooks/useQlik";
import { getDefaultFieldOptions, getHierarchyFieldConfigs } from "./filterConfig";
import { getDashboardLevelFilters, getDashboardWriteAppIds, getUniqueAppIds, groupFiltersByWidget } from "./filterUtils";
import { getFilterFieldKey, useFilterStore } from "../stores/filterStore";

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

function getFilterDefaultEntries(filter) {
    if (filter.type === "hierarchy") {
        return getHierarchyFieldConfigs(filter).flatMap((fieldConfig) => {
            const values = getDefaultFieldOptions(filter, fieldConfig.fieldName);
            return values.length > 0 ? [{ fieldName: fieldConfig.fieldName, values }] : [];
        });
    }

    const values = getDefaultFieldOptions(filter, filter.fieldName);
    return values.length > 0 ? [{ fieldName: filter.fieldName, values }] : [];
}

function getDefaultPlans({ coreQlikAppId, filters, widgets }) {
    const dashboardWriteAppIds = getDashboardWriteAppIds(widgets);
    const widgetsById = new Map(widgets.map((widget) => [widget.widgetId, widget]));
    const dashboardPlans = getDashboardLevelFilters(filters).map((filter) => ({
        filter,
        readAppId: coreQlikAppId,
        targetAppIds: dashboardWriteAppIds,
    }));
    const widgetFilters = groupFiltersByWidget(filters);
    const widgetPlans = Object.entries(widgetFilters).flatMap(([widgetId, widgetScopedFilters]) => {
        const widget = widgetsById.get(widgetId);

        if (!widget?.appId) {
            return [];
        }

        return widgetScopedFilters.map((filter) => ({
            filter,
            readAppId: widget.appId,
            targetAppIds: [widget.appId],
        }));
    });

    return [...dashboardPlans, ...widgetPlans].flatMap(({ filter, readAppId, targetAppIds }) =>
        getFilterDefaultEntries(filter).map((entry) => ({
            ...entry,
            filter,
            readAppId,
            targetAppIds: getUniqueAppIds(targetAppIds),
        })),
    );
}

export function useApplyFilterDefaults({ coreQlikAppId, dashboardId, filters, widgets }) {
    const { qlik, error: qlikError, loading: qlikLoading } = useQlik();
    const setSelectedOptimistic = useFilterStore((state) => state.setSelectedOptimistic);
    const defaultPlans = useMemo(
        () => getDefaultPlans({ coreQlikAppId, filters, widgets }),
        [coreQlikAppId, filters, widgets],
    );
    const appliedSignatureRef = useRef(null);

    const openApp = useCallback(
        async (appId) => {
            if (!qlik) {
                throw new Error("Qlik is not ready to apply default filters.");
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

    const applyDefaults = useCallback(
        async ({ force = false } = {}) => {
            if (qlikError || qlikLoading || defaultPlans.length === 0) {
                return;
            }

            const signature = JSON.stringify(defaultPlans);

            if (!force && appliedSignatureRef.current === signature) {
                return;
            }

            defaultPlans.forEach((plan) => {
                const fieldKeys = getUniqueAppIds([plan.readAppId, ...plan.targetAppIds]).map((appId) =>
                    getFilterFieldKey({ dashboardId, appId, fieldName: plan.fieldName }),
                );

                fieldKeys.forEach((fieldKey) => {
                    setSelectedOptimistic(fieldKey, plan.values);
                });
            });

            await Promise.all(
                defaultPlans.flatMap((plan) =>
                    plan.targetAppIds.map(async (appId) => {
                        const app = await openApp(appId);
                        await app.field(plan.fieldName).selectValues(plan.values, false, true);
                    }),
                ),
            );

            appliedSignatureRef.current = signature;
        },
        [dashboardId, defaultPlans, openApp, qlikError, qlikLoading, setSelectedOptimistic],
    );

    useEffect(() => {
        applyDefaults().catch(() => {
            // Default selections are best-effort during initial dashboard hydration.
        });
    }, [applyDefaults]);

    return applyDefaults;
}