import BarChart from "./components/BarChart";
import FilterBar from "./filters/components/FilterBar.jsx";
import PivotTable from "./components/PivotTable";
import Table from "./components/Table";
import { DASHBOARD_VISUALISATIONS } from "./infrastructure/dashboardKeys";
import GlowPanel from "../shared/components/ui/GlowPanel.jsx";
import { useQlikObject } from "../shared/qlik/hooks/useQlikObject";
import { transformBarChartData } from "../shared/qlik/transformers/barChart";
import { transformTableData } from "../shared/qlik/transformers/table";

function renderVisualisation(virtualisation, model) {
    if (model?.kind === "pivotTable") {
        return <PivotTable model={model} />;
    }

    if (virtualisation === DASHBOARD_VISUALISATIONS.BAR_CHART) {
        return <BarChart model={model} />;
    }

    if (virtualisation === DASHBOARD_VISUALISATIONS.TABLE) {
        return <Table model={model} />;
    }

    return <div className="dashboard-empty-state">Unsupported virtualisation: {virtualisation}</div>;
}

function transformVisualisationData(virtualisation, payload) {
    if (virtualisation === DASHBOARD_VISUALISATIONS.BAR_CHART) {
        return transformBarChartData(payload);
    }

    return transformTableData(payload);
}

function getPanelClassName(virtualisation, model) {
    const isWide = virtualisation === DASHBOARD_VISUALISATIONS.TABLE || model?.kind === "pivotTable";
    return ["dashboard-panel", isWide ? "dashboard-panel--wide" : "dashboard-panel--tall"].join(" ");
}

export default function QlikDataProvider({
    appId,
    dashboardId,
    filters = [],
    objectId,
    widgetId,
    virtualisation = DASHBOARD_VISUALISATIONS.TABLE,
    title,
    description,
}) {
    const { object, layout, data, error, loading } = useQlikObject(appId, objectId);

    if (loading) {
        return (
            <GlowPanel as="article" className={getPanelClassName(virtualisation)}>
                <div className="dashboard-panel-copy">
                    <p className="dashboard-panel-eyebrow">{virtualisation}</p>
                    <h2>{title}</h2>
                    <p>{description}</p>
                </div>
                <div className="dashboard-loading-state">Loading Qlik object {objectId}...</div>
            </GlowPanel>
        );
    }

    if (error) {
        return (
            <GlowPanel as="article" className={`${getPanelClassName(virtualisation)} dashboard-panel--error`}>
                <div className="dashboard-panel-copy">
                    <p className="dashboard-panel-eyebrow">{virtualisation}</p>
                    <h2>{title}</h2>
                    <p>{description}</p>
                </div>
                <div className="dashboard-error-state">{error.message}</div>
            </GlowPanel>
        );
    }

    const model = transformVisualisationData(virtualisation, { object, layout, data });

    return (
        <GlowPanel as="article" className={getPanelClassName(virtualisation, model)}>
            <div className="dashboard-panel-copy">
                <p className="dashboard-panel-eyebrow">{virtualisation}</p>
                <h2>{title}</h2>
                <p>{description}</p>
            </div>
            <FilterBar
                dashboardId={dashboardId}
                filters={filters}
                readAppId={appId}
                scopeId={`widget:${widgetId}`}
                title={`${title} filters`}
                writeAppIds={[appId]}
            />
            {renderVisualisation(virtualisation, model)}
        </GlowPanel>
    );
}
