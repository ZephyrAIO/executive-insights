import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";

function getStateLabel(qState) {
    if (qState === "S") {
        return "Selected";
    }

    if (qState === "A") {
        return "Alternative";
    }

    if (qState === "X") {
        return "Closed";
    }

    return "Open";
}

export default function FilterOptionList({
    error = null,
    loading = false,
    loadMore,
    onToggle,
    options,
    selected,
    totalSize,
}) {
    const parentRef = useRef(null);
    const rowVirtualizer = useVirtualizer({
        count: options.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 34,
        overscan: 8,
    });
    const virtualItems = rowVirtualizer.getVirtualItems();
    const lastVirtualItem = virtualItems[virtualItems.length - 1];

    useEffect(() => {
        if (!lastVirtualItem || options.length >= totalSize || loading) {
            return;
        }

        if (lastVirtualItem.index >= options.length - 5) {
            loadMore(options.length);
        }
    }, [lastVirtualItem, loadMore, loading, options.length, totalSize]);

    if (error) {
        return <div className="dashboard-filter-message dashboard-filter-message--error">{error}</div>;
    }

    if (!loading && options.length === 0) {
        return <div className="dashboard-filter-message">No values found.</div>;
    }

    return (
        <div className="dashboard-filter-options" ref={parentRef}>
            <div
                className="dashboard-filter-option-space"
                style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
            >
                {virtualItems.map((virtualItem) => {
                    const option = options[virtualItem.index];
                    const isSelected = selected.includes(option.value);
                    const isClosed = option.qState === "X";

                    return (
                        <button
                            aria-pressed={isSelected}
                            className={`dashboard-filter-option dashboard-filter-option--${option.qState.toLowerCase()}`}
                            disabled={isClosed}
                            key={`${option.rowIndex}:${option.value}`}
                            onClick={() => onToggle(option.value)}
                            style={{ transform: `translateY(${virtualItem.start}px)` }}
                            type="button"
                        >
                            <span className={`dashboard-filter-checkbox ${isSelected ? "is-selected" : ""}`}>
                                {isSelected ? <Check aria-hidden="true" /> : null}
                            </span>
                            <span className="dashboard-filter-option-label">{option.qText}</span>
                            <span className="dashboard-filter-state">{getStateLabel(option.qState)}</span>
                        </button>
                    );
                })}
            </div>
            {loading ? <div className="dashboard-filter-message">Loading values...</div> : null}
        </div>
    );
}