import { Eraser, LoaderCircle } from "lucide-react";

import FieldFilter from "./FieldFilter.jsx";
import HierarchyFilter from "./HierarchyFilter.jsx";
import { useClearDashboardFilters } from "../hooks/useClearDashboardFilters";

export default function FilterBar({
    clearAppIds = [],
    dashboardId,
    filters,
    readAppId,
    onCleared,
    scopeId,
    showClearAll = false,
    title = "Filters",
    writeAppIds,
}) {
    const clearFilters = useClearDashboardFilters({ appIds: clearAppIds, dashboardId, onCleared });

    if (!filters || filters.length === 0) {
        return null;
    }

    return (
        <div className="dashboard-filter-bar" aria-label={title}>
            {filters.map((filter) => {
                if (filter.type === "hierarchy") {
                    return (
                        <HierarchyFilter
                            dashboardId={dashboardId}
                            filter={filter}
                            key={filter.filterId}
                            readAppId={readAppId}
                            scopeId={scopeId}
                            writeAppIds={writeAppIds}
                        />
                    );
                }

                return (
                    <FieldFilter
                        dashboardId={dashboardId}
                        filter={filter}
                        key={filter.filterId}
                        readAppId={readAppId}
                        scopeId={scopeId}
                        writeAppIds={writeAppIds}
                    />
                );
            })}
            {showClearAll ? (
                <button
                    className="dashboard-filter-clear-button"
                    disabled={clearFilters.clearing}
                    onClick={clearFilters.clearAll}
                    title="Clear dashboard filters"
                    type="button"
                >
                    {clearFilters.clearing ? (
                        <LoaderCircle aria-hidden="true" className="dashboard-filter-icon is-spinning" />
                    ) : (
                        <Eraser aria-hidden="true" className="dashboard-filter-icon" />
                    )}
                    <span>Clear all</span>
                </button>
            ) : null}
            {clearFilters.error ? (
                <span className="dashboard-filter-clear-error" role="status">
                    {clearFilters.error}
                </span>
            ) : null}
        </div>
    );
}