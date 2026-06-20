import QlikDataProvider from "./QlikDataProvider";

export default function DashboardView({ dashboardId, filtersByWidget = {}, visualisations }) {
    return (
        <div className="dashboard-grid">
            {visualisations.map((visualisation) => (
                <QlikDataProvider
                    dashboardId={dashboardId}
                    filters={filtersByWidget[visualisation.widgetId] ?? []}
                    key={visualisation.widgetId}
                    appId={visualisation.appId}
                    objectId={visualisation.objectId}
                    widgetId={visualisation.widgetId}
                    virtualisation={visualisation.type}
                    title={visualisation.name}
                    description={`Qlik object ${visualisation.objectId} rendered as a ${visualisation.type}.`}
                />
            ))}
        </div>
    );
}
