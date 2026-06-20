const BAR_COLOURS = ["#2b6cb0", "#0f766e", "#b45309", "#be123c", "#4338ca", "#4d7c0f"];

function getHypercube(layout, data) {
    return layout?.qHyperCube ?? data?.qHyperCube ?? data ?? null;
}

function getMatrix(hypercube) {
    return hypercube?.qDataPages?.flatMap((page) => page?.qMatrix ?? []) ?? [];
}

function getLabel(cell, index) {
    if (typeof cell?.qText === "string" && cell.qText.length > 0) {
        return cell.qText;
    }

    if (typeof cell?.qNum === "number" && Number.isFinite(cell.qNum)) {
        return String(cell.qNum);
    }

    return `Item ${index + 1}`;
}

function getNumericValue(cell) {
    if (typeof cell?.qNum === "number" && Number.isFinite(cell.qNum)) {
        return cell.qNum;
    }

    const parsedValue = Number(cell?.qText);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function getDatasetLabel(measure, index) {
    return measure?.qFallbackTitle ?? `Measure ${index + 1}`;
}

export function transformBarChartData({ layout, data }) {
    const hypercube = getHypercube(layout, data);
    const matrix = getMatrix(hypercube);
    const dimensionCount = hypercube?.qDimensionInfo?.length ?? 0;
    const measureInfo = hypercube?.qMeasureInfo ?? [];

    if (matrix.length === 0 || dimensionCount === 0 || measureInfo.length === 0) {
        return {
            kind: "barChart",
            labels: [],
            datasets: [],
            title: layout?.qMeta?.title ?? layout?.title ?? "Qlik bar chart",
        };
    }

    const labels = matrix.map((row, index) => getLabel(row[0], index));
    const datasets = measureInfo.map((measure, measureIndex) => ({
        label: getDatasetLabel(measure, measureIndex),
        data: matrix.map((row) => getNumericValue(row[dimensionCount + measureIndex])),
        backgroundColor: BAR_COLOURS[measureIndex % BAR_COLOURS.length],
        borderRadius: 8,
        maxBarThickness: 48,
    }));

    return {
        kind: "barChart",
        labels,
        datasets,
        title: layout?.qMeta?.title ?? layout?.title ?? "Qlik bar chart",
    };
}
