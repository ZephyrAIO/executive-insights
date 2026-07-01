import { useMemo, useState } from "react";

import { useDebounce } from "../../../shared/hooks/useDebounce";
import { getHierarchyFieldConfigs } from "../hooks/filterConfig";
import { useFilterPopoverOrder } from "../hooks/useFilterPopoverOrder";
import { getFilterFieldKey, useFilterStore } from "../stores/filterStore";
import FilterPopover from "./ui/FilterPopover.jsx";
import FilterSearch from "./ui/FilterSearch.jsx";
import HierarchyFieldSection from "./ui/HierarchyFieldSection.jsx";

function getSelectedOptionLabel(selected, optionsByValue) {
    const selectedValue = selected[0];
    return optionsByValue[selectedValue]?.qText ?? selectedValue;
}

function getHierarchyLabel(hierarchyName, fields) {
    const selectedField = fields.findLast((field) => field.selected.length > 0);

    if (!selectedField) {
        return hierarchyName;
    }

    if (selectedField.selected.length === 1) {
        return getSelectedOptionLabel(selectedField.selected, selectedField.optionsByValue);
    }

    return `${selectedField.fieldLabel} (${selectedField.selected.length})`;
}

export default function HierarchyFilter({ dashboardId, filter, readAppId, scopeId, writeAppIds }) {
    const popoverOrder = useFilterPopoverOrder();
    const [searchValue, setSearchValue] = useState("");
    const debouncedSearch = useDebounce(searchValue, 250);
    const fieldConfigs = useMemo(() => getHierarchyFieldConfigs(filter), [filter]);
    const hierarchyName = filter.filterHierarchy?.name ?? "Hierarchy";
    const storeFields = useFilterStore((state) => state.fields);
    const fields = useMemo(
        () =>
            fieldConfigs.map((fieldConfig) => {
                const fieldKey = getFilterFieldKey({ dashboardId, scopeId, appId: readAppId, fieldName: fieldConfig.fieldName });
                const field = storeFields[fieldKey];

                return {
                    ...fieldConfig,
                    optionsByValue: field?.optionsByValue ?? {},
                    selected: field?.selected ?? [],
                };
            }),
        [dashboardId, fieldConfigs, readAppId, scopeId, storeFields],
    );
    const label = useMemo(() => getHierarchyLabel(hierarchyName, fields), [fields, hierarchyName]);
    const visibleFieldConfigs = useMemo(
        () =>
            fields.filter(
                (field, index) => !field.automaticVisibility || index === 0 || fields[index - 1].selected.length > 0,
            ),
        [fields],
    );

    const disabled = !readAppId || fieldConfigs.length === 0 || writeAppIds.length === 0;

    if (fieldConfigs.length === 0) {
        return null;
    }

    return (
        <FilterPopover
            disabled={disabled}
            forceMount
            label={label}
            loading={false}
            onOpenChange={popoverOrder.handleOpenChange}
            open={popoverOrder.isOpen}
        >
            <FilterSearch
                onChange={setSearchValue}
                placeholder={`Search ${fieldConfigs.map((fieldConfig) => fieldConfig.fieldLabel).join(", ")}`}
                value={searchValue}
            />
            <div className="dashboard-filter-hierarchy-list">
                {visibleFieldConfigs.map((fieldConfig) => (
                    <HierarchyFieldSection
                        allowedOptions={fieldConfig.options}
                        dashboardId={dashboardId}
                        fieldLabel={fieldConfig.fieldLabel}
                        fieldName={fieldConfig.fieldName}
                        key={fieldConfig.fieldName}
                        readAppId={readAppId}
                        preserveOrder={popoverOrder.preserveOrder}
                        refreshKey={popoverOrder.refreshRevision}
                        scopeId={scopeId}
                        search={debouncedSearch}
                        writeAppIds={writeAppIds}
                    />
                ))}
            </div>
        </FilterPopover>
    );
}