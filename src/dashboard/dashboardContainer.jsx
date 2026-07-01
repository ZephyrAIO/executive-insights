import DashboardView from "./dashboardView.jsx";
import FilterBar from "./filters/components/FilterBar.jsx";
import { useApplyFilterDefaults } from "./filters/hooks/useApplyFilterDefaults.js";
import { DashboardFilterCleanup } from "./filters/hooks/useDashboardFilterCleanup.jsx";
import {
    getCoreQlikAppId,
    getDashboardLevelFilters,
    getDashboardWriteAppIds,
    getUniqueAppIds,
    groupFiltersByWidget,
} from "./filters/hooks/filterUtils";
import {
    useDashboardFiltersQuery,
    useDashboardQuery,
    useSettingsQuery,
    useDashboardWidgetsQuery,
} from "./infrastructure/dashboardQueries";

export default function DashboardContainer({ dashboardId }) {
    const dashboardQuery = useDashboardQuery(dashboardId);
    const widgetsQuery = useDashboardWidgetsQuery(dashboardId, { enabled: dashboardQuery.isSuccess });
    const filtersQuery = useDashboardFiltersQuery(dashboardId, { enabled: dashboardQuery.isSuccess });
    const settingsQuery = useSettingsQuery();
    const isLoading = dashboardQuery.isLoading || widgetsQuery.isLoading || filtersQuery.isLoading || settingsQuery.isLoading;
    const error = dashboardQuery.error ?? widgetsQuery.error ?? filtersQuery.error ?? settingsQuery.error;
    const widgets = widgetsQuery.data ?? [];
    const filters = filtersQuery.data ?? [];
    const coreQlikAppId = getCoreQlikAppId(settingsQuery.data);
    const dashboardWriteAppIds = getDashboardWriteAppIds(widgets);
    const applyFilterDefaults = useApplyFilterDefaults({ coreQlikAppId, dashboardId, filters, widgets });

    if (isLoading) {
        return (
            <main className="dashboard-shell">
                <section className="dashboard-hero">
                    <div>
                        <p className="dashboard-hero-kicker">Executive Insights</p>
                        <h2>Loading dashboard</h2>
                    </div>
                    <p className="dashboard-hero-body">
                        Resolving dashboard metadata, widgets, and filters from the mock API.
                    </p>
                </section>
                <div className="dashboard-loading-state">Loading dashboard configuration...</div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="dashboard-shell">
                <section className="dashboard-hero">
                    <div>
                        <p className="dashboard-hero-kicker">Executive Insights</p>
                        <h2>Dashboard unavailable</h2>
                    </div>
                    <p className="dashboard-hero-body">The dashboard metadata endpoint returned an error.</p>
                </section>
                <div className="dashboard-error-state">{error.message}</div>
            </main>
        );
    }

    const dashboard = dashboardQuery.data;
    const dashboardFilters = getDashboardLevelFilters(filters);
    const widgetFilters = groupFiltersByWidget(filters);
    const cleanupAppIds = getUniqueAppIds([coreQlikAppId, ...dashboardWriteAppIds]);

    return (
        <main className="dashboard-shell">
            <DashboardFilterCleanup appIds={cleanupAppIds} dashboardId={dashboardId} />
            <section className="dashboard-hero">
                <div>
                    <p className="dashboard-hero-kicker">Executive Insights</p>
                    <h2>{dashboard.name}</h2>
                </div>
                <p className="dashboard-hero-body">
                    This dashboard resolves its metadata from the mock SQL/.NET API layer and renders the linked Qlik
                    objects as charts and tables.
                </p>
            </section>

            <section className="dashboard-filter-section">
                <FilterBar
                    clearAppIds={cleanupAppIds}
                    dashboardId={dashboardId}
                    filters={dashboardFilters}
                    onCleared={applyFilterDefaults}
                    readAppId={coreQlikAppId}
                    showClearAll
                    scopeId="dashboard"
                    title="Dashboard filters"
                    writeAppIds={dashboardWriteAppIds}
                />
            </section>
            <DashboardView dashboardId={dashboardId} filtersByWidget={widgetFilters} visualisations={widgets} />
        </main>
    );
}
