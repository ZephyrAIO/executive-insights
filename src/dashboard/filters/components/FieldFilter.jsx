import { useEffect, useState } from "react";

import FilterOptionList from "./ui/FilterOptionList.jsx";
import FilterPopover from "./ui/FilterPopover.jsx";
import FilterSearch from "./ui/FilterSearch.jsx";
import { useFilterOptions } from "../hooks/useFilterOptions";
import { useFilterSearch } from "../hooks/useFilterSearch";
import { useFilterSelection } from "../hooks/useFilterSelection";

function getTriggerLabel(fieldName, selected, optionsByValue) {
    if (selected.length === 1) {
        return optionsByValue[selected[0]]?.qText ?? selected[0];
    }

    if (selected.length > 1) {
        return `${fieldName} (${selected.length})`;
    }

    return fieldName;
}

export default function FieldFilter({ dashboardId, filter, readAppId, scopeId, writeAppIds }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isOrderFrozen, setIsOrderFrozen] = useState(false);
    const [openRevision, setOpenRevision] = useState(0);
    const fieldName = filter.fieldName;
    const optionsState = useFilterOptions({
        dashboardId,
        scopeId,
        appId: readAppId,
        fieldName,
        preserveOrder: isOrderFrozen,
        refreshKey: openRevision,
    });
    const selection = useFilterSelection({ dashboardId, scopeId, readAppId, writeAppIds, fieldName });
    const [searchValue, setSearchValue] = useFilterSearch(optionsState.fieldKey, optionsState.search);
    const label = getTriggerLabel(fieldName, selection.selected, optionsState.optionsByValue);
    const disabled = !readAppId || !fieldName || writeAppIds.length === 0;

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
        <FilterPopover
            disabled={disabled}
            label={label}
            loading={optionsState.loading || selection.applying}
            onOpenChange={handleOpenChange}
            open={isOpen}
        >
            <FilterSearch onChange={setSearchValue} placeholder={`Search ${fieldName}`} value={searchValue} />
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