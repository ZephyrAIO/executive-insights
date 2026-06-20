function getHypercube(layout, data) {
    return layout?.qHyperCube ?? data?.qHyperCube ?? data ?? null;
}

function getPivotPage(hypercube) {
    return hypercube?.qPivotDataPages?.[0] ?? null;
}

function getListObject(layout, data) {
    return layout?.qListObject ?? data?.qListObject ?? data ?? null;
}

function getHypercubeMatrix(hypercube) {
    return hypercube?.qDataPages?.flatMap((page) => page?.qMatrix ?? []) ?? [];
}

function getListObjectMatrix(listObject) {
    return listObject?.qDataPages?.flatMap((page) => page?.qMatrix ?? []) ?? [];
}

function getHypercubeColumns(hypercube) {
    const dimensionColumns =
        hypercube?.qDimensionInfo?.map((dimension, index) => ({
            id: dimension?.qFallbackTitle ?? `dimension-${index}`,
            header: dimension?.qFallbackTitle ?? `Dimension ${index + 1}`,
            accessorKey: `column_${index}`,
            meta: { isNumeric: false },
        })) ?? [];

    const measureColumns =
        hypercube?.qMeasureInfo?.map((measure, index) => ({
            id: measure?.qFallbackTitle ?? `measure-${index}`,
            header: measure?.qFallbackTitle ?? `Measure ${index + 1}`,
            accessorKey: `column_${dimensionColumns.length + index}`,
            meta: { isNumeric: true },
        })) ?? [];

    return [...dimensionColumns, ...measureColumns];
}

function getListObjectColumns(listObject) {
    const fieldInfo = listObject?.qDimensionInfo ?? {};

    return [
        {
            id: fieldInfo?.qFallbackTitle ?? "value",
            header: fieldInfo?.qFallbackTitle ?? "Value",
            accessorKey: "column_0",
            meta: { isNumeric: false },
        },
    ];
}

function getCellValue(cell) {
    if (cell == null) {
        return "";
    }

    if (typeof cell.qText === "string" && cell.qText.length > 0 && cell.qText !== "-") {
        return cell.qText;
    }

    if (typeof cell.qNum === "number" && Number.isFinite(cell.qNum)) {
        return cell.qNum;
    }

    return "";
}

function getPivotNodeLabel(node, fallback) {
    if (typeof node?.qText === "string" && node.qText.length > 0) {
        return node.qText;
    }

    if (typeof node?.qValue === "number" && Number.isFinite(node.qValue)) {
        return String(node.qValue);
    }

    return fallback;
}

function getPivotCellValue(cell) {
    if (cell == null) {
        return "";
    }

    if (typeof cell.qText === "string" && cell.qText.length > 0) {
        return cell.qText;
    }

    if (typeof cell.qNum === "number" && Number.isFinite(cell.qNum)) {
        return cell.qNum;
    }

    return "";
}

function getPivotLeafPaths(nodes, parentPath = []) {
    if (!Array.isArray(nodes) || nodes.length === 0) {
        return [];
    }

    return nodes.flatMap((node, index) => {
        const path = [...parentPath, node];

        if (Array.isArray(node?.qSubNodes) && node.qSubNodes.length > 0) {
            return getPivotLeafPaths(node.qSubNodes, path);
        }

        return [path.length > 0 ? path : [{ qText: `Item ${index + 1}` }]];
    });
}

function pathsSharePrefix(paths, startIndex, nextIndex, depth) {
    for (let level = 0; level < depth; level += 1) {
        const currentLabel = getPivotNodeLabel(paths[startIndex][level], "");
        const nextLabel = getPivotNodeLabel(paths[nextIndex][level], "");

        if (currentLabel !== nextLabel) {
            return false;
        }
    }

    return true;
}

function buildPivotHeaderRows(columnPaths, rowHeaderDepth) {
    const columnDepth = columnPaths.reduce((maxDepth, path) => Math.max(maxDepth, path.length), 0);

    if (columnDepth === 0) {
        return [];
    }

    return Array.from({ length: columnDepth }, (_, level) => {
        const cells = [];

        if (level === 0 && rowHeaderDepth > 0) {
            cells.push({
                id: "pivot-corner",
                label: "",
                colSpan: rowHeaderDepth,
                rowSpan: columnDepth,
                isCorner: true,
            });
        }

        let pathIndex = 0;

        while (pathIndex < columnPaths.length) {
            const label = getPivotNodeLabel(columnPaths[pathIndex][level], `Column ${pathIndex + 1}`);
            let colSpan = 1;

            while (
                pathIndex + colSpan < columnPaths.length &&
                pathsSharePrefix(columnPaths, pathIndex, pathIndex + colSpan, level) &&
                getPivotNodeLabel(columnPaths[pathIndex + colSpan][level], `Column ${pathIndex + colSpan + 1}`) ===
                    label
            ) {
                colSpan += 1;
            }

            const rowSpan = columnPaths[pathIndex].length <= level + 1 ? columnDepth - level : 1;

            cells.push({
                id: `pivot-header-${level}-${pathIndex}`,
                label,
                colSpan,
                rowSpan,
                isCorner: false,
            });
            pathIndex += colSpan;
        }

        return {
            id: `pivot-header-row-${level}`,
            cells,
        };
    });
}

function transformPivotTableData(hypercube, layout) {
    const pivotPage = getPivotPage(hypercube);
    const rowPaths = getPivotLeafPaths(pivotPage?.qLeft ?? []);
    const columnPaths = getPivotLeafPaths(pivotPage?.qTop ?? []);
    const rowHeaderDepth = rowPaths.reduce((maxDepth, path) => Math.max(maxDepth, path.length), 0);
    const values = pivotPage?.qData ?? [];

    if (rowPaths.length === 0 || columnPaths.length === 0 || values.length === 0) {
        return {
            kind: "pivotTable",
            headerRows: [],
            rows: [],
            title: layout?.qMeta?.title ?? layout?.title ?? "Qlik pivot table",
        };
    }

    const headerRows = buildPivotHeaderRows(columnPaths, rowHeaderDepth);
    const rows = rowPaths.map((path, rowIndex) => ({
        id: `pivot-row-${rowIndex}`,
        headers: Array.from({ length: rowHeaderDepth }, (_, level) =>
            getPivotNodeLabel(path[level], level === 0 ? `Row ${rowIndex + 1}` : ""),
        ),
        values: (values[rowIndex] ?? []).map((cell) => getPivotCellValue(cell)),
    }));

    return {
        kind: "pivotTable",
        headerRows,
        rows,
        title: layout?.qMeta?.title ?? layout?.title ?? "Qlik pivot table",
    };
}

function createRows(matrix) {
    return matrix.map((cells, rowIndex) => {
        const row = { id: `row-${rowIndex}` };

        cells.forEach((cell, columnIndex) => {
            row[`column_${columnIndex}`] = getCellValue(cell);
        });

        return row;
    });
}

export function transformTableData({ layout, data }) {
    const hypercube = getHypercube(layout, data);

    if (hypercube?.qMode === "P") {
        return transformPivotTableData(hypercube, layout);
    }

    if (hypercube?.qDimensionInfo || hypercube?.qMeasureInfo) {
        const columns = getHypercubeColumns(hypercube);
        const rows = createRows(getHypercubeMatrix(hypercube));

        return {
            kind: "table",
            columns,
            rows,
            rowCount: rows.length,
            title: layout?.qMeta?.title ?? layout?.title ?? "Qlik table",
        };
    }

    const listObject = getListObject(layout, data);

    if (listObject?.qDimensionInfo) {
        const columns = getListObjectColumns(listObject);
        const rows = createRows(getListObjectMatrix(listObject));

        return {
            kind: "table",
            columns,
            rows,
            rowCount: rows.length,
            title: layout?.qMeta?.title ?? layout?.title ?? "Qlik list",
        };
    }

    return {
        kind: "table",
        columns: [],
        rows: [],
        rowCount: 0,
        title: layout?.qMeta?.title ?? layout?.title ?? "Qlik table",
    };
}
