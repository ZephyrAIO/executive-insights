import { useRef } from "react";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

const ROW_HEIGHT = 44;

export default function Table({ model }) {
    "use no memo";

    const scrollContainerRef = useRef(null);
    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data: model.rows,
        columns: model.columns,
        getCoreRowModel: getCoreRowModel(),
    });
    const rows = table.getRowModel().rows;
    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => scrollContainerRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 8,
    });
    const virtualRows = rowVirtualizer.getVirtualItems();

    if (model.columns.length === 0) {
        return <div className="dashboard-empty-state">No table data is available for this object.</div>;
    }

    return (
        <div className="dashboard-table-shell">
            <div className="dashboard-table-header">
                {table.getHeaderGroups().map((headerGroup) => (
                    <div className="dashboard-table-row dashboard-table-row--header" key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                            <div className="dashboard-table-cell dashboard-table-cell--header" key={header.id}>
                                {header.isPlaceholder
                                    ? null
                                    : flexRender(header.column.columnDef.header, header.getContext())}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            <div className="dashboard-table-body" ref={scrollContainerRef}>
                <div className="dashboard-table-virtual-space" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
                    {virtualRows.map((virtualRow) => {
                        const row = rows[virtualRow.index];

                        return (
                            <div
                                className="dashboard-table-row"
                                key={row.id}
                                style={{ transform: `translateY(${virtualRow.start}px)` }}
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <div className="dashboard-table-cell" key={cell.id}>
                                        {flexRender(
                                            cell.column.columnDef.cell ?? cell.column.columnDef.header,
                                            cell.getContext(),
                                        )}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
