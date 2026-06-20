import { useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible } from "radix-ui";

import { useFilterOptions } from "../../hooks/useFilterOptions";
import { useFilterSelection } from "../../hooks/useFilterSelection";
import { useFilterStore } from "../../stores/filterStore";
import FilterOptionList from "./FilterOptionList.jsx";

function getFieldLabel(fieldName, selected, optionsByValue) {
    if (selected.length === 1) {
        return optionsByValue[selected[0]]?.qText ?? selected[0];
    }

    if (selected.length > 1) {
        return `${fieldName} (${selected.length})`;
    }

    return fieldName;
}

export default function HierarchyFieldSection({
    dashboardId,
    fieldName,
    preserveOrder = false,
    readAppId,
    refreshKey = 0,
    search,
    scopeId,
    writeAppIds,
}) {
    const optionsState = useFilterOptions({
        dashboardId,
        scopeId,
        appId: readAppId,
        fieldName,
        preserveOrder,
        refreshKey,
    });
    const setSearch = useFilterStore((state) => state.setSearch);
    const selection = useFilterSelection({ dashboardId, scopeId, readAppId, writeAppIds, fieldName });

    useEffect(() => {
        setSearch(optionsState.fieldKey, search);
    }, [optionsState.fieldKey, search, setSearch]);

    const label = getFieldLabel(fieldName, selection.selected, optionsState.optionsByValue);

    return (
        <Collapsible.Root className="dashboard-filter-hierarchy-field" defaultOpen>
            <Collapsible.Trigger className="dashboard-filter-collapsible-trigger">
                <span>{label}</span>
                <ChevronDown aria-hidden="true" className="dashboard-filter-icon" />
            </Collapsible.Trigger>
            <Collapsible.Content className="dashboard-filter-collapsible-content">
                <FilterOptionList
                    applying={selection.applying}
                    error={selection.error ?? optionsState.error}
                    loading={optionsState.loading || optionsState.appLoading}
                    loadMore={optionsState.loadMore}
                    onToggle={selection.toggleValue}
                    options={optionsState.options}
                    selected={selection.selected}
                    totalSize={optionsState.totalSize}
                />
            </Collapsible.Content>
        </Collapsible.Root>
    );
}