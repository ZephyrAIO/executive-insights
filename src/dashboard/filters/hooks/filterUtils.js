export function getDashboardLevelFilters(filters = []) {
    return filters.filter((filter) => !filter.widgetId);
}

export function getWidgetFilters(filters = [], widgetId) {
    return filters.filter((filter) => filter.widgetId === widgetId);
}

export function groupFiltersByWidget(filters = []) {
    return filters.reduce((groups, filter) => {
        if (!filter.widgetId) {
            return groups;
        }

        return {
            ...groups,
            [filter.widgetId]: [...(groups[filter.widgetId] ?? []), filter],
        };
    }, {});
}

export function getUniqueAppIds(appIds = []) {
    return [...new Set(appIds.filter((appId) => typeof appId === "string" && appId.trim().length > 0))];
}

export function getDashboardWriteAppIds(widgets = []) {
    return getUniqueAppIds(widgets.map((widget) => widget.appId));
}

export function getHierarchyFields(filter) {
    return (filter?.filterHierarchy?.fields ?? [])
        .map((field) => field.fieldName)
        .filter((fieldName) => typeof fieldName === "string" && fieldName.trim().length > 0);
}

export function getCoreQlikAppId(settings) {
    return settings?.["core-qlik-application-id"] ?? "";
}