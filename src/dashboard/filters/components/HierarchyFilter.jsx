import { useEffect, useMemo, useState } from "react";

import { useDebounce } from "../../../shared/hooks/useDebounce";
import { getHierarchyFields } from "../hooks/filterUtils";
import { getFilterFieldKey, useFilterStore } from "../stores/filterStore";
import FilterPopover from "./ui/FilterPopover.jsx";
import FilterSearch from "./ui/FilterSearch.jsx";
import HierarchyFieldSection from "./ui/HierarchyFieldSection.jsx";

export default function HierarchyFilter({ dashboardId, filter, readAppId, scopeId, writeAppIds }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isOrderFrozen, setIsOrderFrozen] = useState(false);
    const [openRevision, setOpenRevision] = useState(0);
    const [searchValue, setSearchValue] = useState("");
    const debouncedSearch = useDebounce(searchValue, 250);
    const fieldNames = useMemo(() => getHierarchyFields(filter), [filter]);
    const hierarchyName = filter.filterHierarchy?.name ?? "Hierarchy";
    const selectionCount = useFilterStore((state) =>
        fieldNames.reduce((count, fieldName) => {
            const fieldKey = getFilterFieldKey({ dashboardId, appId: readAppId, fieldName });
            return count + (state.fields[fieldKey]?.selected.length ?? 0);
        }, 0),
    );
    const label = selectionCount > 0 ? `${hierarchyName} (${selectionCount})` : hierarchyName;
    const disabled = !readAppId || fieldNames.length === 0 || writeAppIds.length === 0;

    const handleOpenChange = (open) => {
        setIsOpen(open);
        setIsOrderFrozen(false);

        if (open) {
            setOpenRevision((currentRevision) => currentRevision + 1);
        }
    };

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const freezeTimeoutId = window.setTimeout(() => {
            setIsOrderFrozen(true);
        }, 0);

        return () => {
            window.clearTimeout(freezeTimeoutId);
        };
    }, [isOpen, openRevision]);

    return (
        <FilterPopover disabled={disabled} label={label} loading={false} onOpenChange={handleOpenChange} open={isOpen}>
            <FilterSearch
                onChange={setSearchValue}
                placeholder={`Search ${fieldNames.join(", ")}`}
                value={searchValue}
            />
            <div className="dashboard-filter-hierarchy-list">
                {fieldNames.map((fieldName) => (
                    <HierarchyFieldSection
                        dashboardId={dashboardId}
                        fieldName={fieldName}
                        key={fieldName}
                        readAppId={readAppId}
                        preserveOrder={isOrderFrozen}
                        refreshKey={openRevision}
                        scopeId={scopeId}
                        search={debouncedSearch}
                        writeAppIds={writeAppIds}
                    />
                ))}
            </div>
        </FilterPopover>
    );
}