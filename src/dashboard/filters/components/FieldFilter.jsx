import { useMemo } from "react";

import FilterOptionList from "./ui/FilterOptionList.jsx";
import FilterPopover from "./ui/FilterPopover.jsx";
import FilterSearch from "./ui/FilterSearch.jsx";
import { getFieldConfig, isFieldAllowed } from "../hooks/filterConfig";
import { useFilterOptions } from "../hooks/useFilterOptions";
import { useFilterPopoverOrder } from "../hooks/useFilterPopoverOrder";
import { useFilterSearch } from "../hooks/useFilterSearch";
import { useFilterSelection } from "../hooks/useFilterSelection";

function getTriggerLabel(fieldLabel, selected, optionsByValue) {
    if (selected.length === 1) {
        return optionsByValue[selected[0]]?.qText ?? selected[0];
    }

    if (selected.length > 1) {
        return `${fieldLabel} (${selected.length})`;
    }

    return fieldLabel;
}

export default function FieldFilter({ dashboardId, filter, readAppId, scopeId, writeAppIds }) {
    const popoverOrder = useFilterPopoverOrder();
    const fieldName = filter.fieldName;
    const fieldConfig = useMemo(() => getFieldConfig(filter, fieldName), [filter, fieldName]);
    const optionsState = useFilterOptions({
        dashboardId,
        scopeId,
        appId: readAppId,
        allowedOptions: fieldConfig.options,
        fieldName,
        preserveOrder: popoverOrder.preserveOrder,
        refreshKey: popoverOrder.refreshRevision,
    });
    const selection = useFilterSelection({ dashboardId, scopeId, readAppId, writeAppIds, fieldName });
    const [searchValue, setSearchValue] = useFilterSearch(optionsState.fieldKey, optionsState.search);
    const label = getTriggerLabel(fieldConfig.fieldLabel, selection.selected, optionsState.optionsByValue);
    const disabled = !readAppId || !fieldName || writeAppIds.length === 0;

    if (!isFieldAllowed(filter, fieldName)) {
        return null;
    }

    return (
        <FilterPopover
            disabled={disabled}
            label={label}
            loading={optionsState.loading || selection.applying}
            onOpenChange={popoverOrder.handleOpenChange}
            open={popoverOrder.isOpen}
        >
            <FilterSearch onChange={setSearchValue} placeholder={`Search ${fieldConfig.fieldLabel}`} value={searchValue} />
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
        </FilterPopover>
    );
}