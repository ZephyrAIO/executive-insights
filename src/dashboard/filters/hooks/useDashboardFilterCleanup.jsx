import { useEffect } from "react";

import { useQlikApp } from "../../../shared/qlik/hooks/useQlikApp";
import { getUniqueAppIds } from "./filterUtils";
import { useFilterStore } from "../stores/filterStore";

function DashboardAppCleanup({ appId }) {
    const { app } = useQlikApp(appId);

    useEffect(() => {
        return () => {
            if (typeof app?.clearAll === "function") {
                const clearApp = async () => {
                    try {
                        await app.clearAll();
                    } catch {
                        // Ignore cleanup errors during unmount.
                    }
                };

                clearApp();
            }
        };
    }, [app]);

    return null;
}

export function DashboardFilterCleanup({ dashboardId, appIds }) {
    const resetDashboard = useFilterStore((state) => state.resetDashboard);
    const uniqueAppIds = getUniqueAppIds(appIds);

    useEffect(() => {
        return () => {
            resetDashboard(dashboardId);
        };
    }, [dashboardId, resetDashboard]);

    return uniqueAppIds.map((appId) => <DashboardAppCleanup appId={appId} key={appId} />);
}