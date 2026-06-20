export default function PivotTable({ model }) {
    if (model.headerRows.length === 0 || model.rows.length === 0) {
        return <div className="dashboard-empty-state">No pivot table data is available for this object.</div>;
    }

    return (
        <div className="dashboard-pivot-table-shell">
            <div className="dashboard-pivot-table-scroll">
                <table className="dashboard-pivot-table">
                    <thead>
                        {model.headerRows.map((headerRow) => (
                            <tr key={headerRow.id}>
                                {headerRow.cells.map((cell) => (
                                    <th
                                        className={cell.isCorner ? "dashboard-pivot-table-corner" : undefined}
                                        colSpan={cell.colSpan}
                                        key={cell.id}
                                        rowSpan={cell.rowSpan}
                                        scope="col"
                                    >
                                        {cell.label}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {model.rows.map((row) => (
                            <tr key={row.id}>
                                {row.headers.map((header, index) => (
                                    <th key={`${row.id}-header-${index}`} scope="row">
                                        {header}
                                    </th>
                                ))}
                                {row.values.map((value, index) => (
                                    <td key={`${row.id}-value-${index}`}>{value}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
