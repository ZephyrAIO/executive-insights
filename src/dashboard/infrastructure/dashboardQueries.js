import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    createAdminResource,
    deleteAdminResource,
    getAdminResource,
    getDashboard,
    getDashboardFilters,
    getDashboards,
    getDashboardWidgets,
    getSettings,
    updateAdminResource,
} from "./dashboardApi";

export const dashboardQueryKeys = {
    all: ["dashboards"],
    settings: ["settings"],
    detail: (dashboardId) => ["dashboards", dashboardId],
    widgets: (dashboardId) => ["dashboards", dashboardId, "widgets"],
    filters: (dashboardId) => ["dashboards", dashboardId, "filters"],
    adminResource: (resourceName) => ["admin", resourceName],
};

export function useDashboardsQuery() {
    return useQuery({
        queryKey: dashboardQueryKeys.all,
        queryFn: getDashboards,
    });
}

export function useDashboardQuery(dashboardId, options = {}) {
    return useQuery({
        queryKey: dashboardQueryKeys.detail(dashboardId),
        queryFn: () => getDashboard(dashboardId),
        enabled: Boolean(dashboardId) && (options.enabled ?? true),
    });
}

export function useDashboardWidgetsQuery(dashboardId, options = {}) {
    return useQuery({
        queryKey: dashboardQueryKeys.widgets(dashboardId),
        queryFn: () => getDashboardWidgets(dashboardId),
        enabled: Boolean(dashboardId) && (options.enabled ?? true),
    });
}

export function useDashboardFiltersQuery(dashboardId, options = {}) {
    return useQuery({
        queryKey: dashboardQueryKeys.filters(dashboardId),
        queryFn: () => getDashboardFilters(dashboardId),
        enabled: Boolean(dashboardId) && (options.enabled ?? true),
    });
}

export function useSettingsQuery() {
    return useQuery({
        queryKey: dashboardQueryKeys.settings,
        queryFn: getSettings,
    });
}

export function useAdminResourceQuery(resourceName) {
    return useQuery({
        queryKey: dashboardQueryKeys.adminResource(resourceName),
        queryFn: () => getAdminResource(resourceName),
    });
}

function invalidateDashboardQueries(queryClient) {
    queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all });
}

function invalidateAdminAndRelatedQueries(queryClient, resourceName) {
    queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.adminResource(resourceName) });
    invalidateDashboardQueries(queryClient);

    if (resourceName === "settings") {
        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.settings });
    }

    if (resourceName === "dashboardWidgets" || resourceName === "widgets" || resourceName === "filters") {
        queryClient.invalidateQueries({ queryKey: ["dashboards"] });
    }
}

export function useCreateAdminResourceMutation(resourceName) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload) => createAdminResource(resourceName, payload),
        onSuccess: () => {
            invalidateAdminAndRelatedQueries(queryClient, resourceName);
        },
    });
}

export function useUpdateAdminResourceMutation(resourceName) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, payload }) => updateAdminResource(resourceName, id, payload),
        onSuccess: () => {
            invalidateAdminAndRelatedQueries(queryClient, resourceName);
        },
    });
}

export function useDeleteAdminResourceMutation(resourceName) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id) => deleteAdminResource(resourceName, id),
        onSuccess: () => {
            invalidateAdminAndRelatedQueries(queryClient, resourceName);
        },
    });
}
