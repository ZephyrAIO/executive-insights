import { useState } from "react";
import { Navigate, NavLink, Route, Routes, useMatch, useNavigate, useParams } from "react-router";

import AdminLayout from "./admin/adminLayout.jsx";
import AdminPage from "./admin/adminPage.jsx";
import { adminNavigationItems } from "./admin/adminSchemas.js";
import DashboardContainer from "./dashboard/dashboardContainer.jsx";
import { useDashboardsQuery } from "./dashboard/infrastructure/dashboardQueries";
import "./App.css";

function DashboardIndexRoute() {
    const dashboardsQuery = useDashboardsQuery();

    if (dashboardsQuery.isLoading) {
        return <div className="dashboard-loading-state">Loading dashboards...</div>;
    }

    if (dashboardsQuery.error) {
        return <div className="dashboard-error-state">{dashboardsQuery.error.message}</div>;
    }

    const firstDashboardId = dashboardsQuery.data?.[0]?.dashboardId;

    if (!firstDashboardId) {
        return <div className="dashboard-empty-state">No dashboards are available.</div>;
    }

    return <Navigate replace to={`/dashboards/${firstDashboardId}`} />;
}

function DashboardRoute() {
    const { dashboardId = "" } = useParams();
    return <DashboardContainer dashboardId={dashboardId} />;
}

function AdminRoute() {
    const { resourceName = "dashboards" } = useParams();
    return <AdminPage key={resourceName} resourceName={resourceName} />;
}

function DashboardSwitcher() {
    const navigate = useNavigate();
    const dashboardsQuery = useDashboardsQuery();
    const { dashboardId = "" } = useParams();

    if (dashboardsQuery.isLoading) {
        return <div className="app-shell-badge">Loading dashboards...</div>;
    }

    if (dashboardsQuery.error) {
        return <div className="app-shell-badge app-shell-badge--error">{dashboardsQuery.error.message}</div>;
    }

    return (
        <label className="app-shell-selector">
            <span>Active dashboard</span>
            <select value={dashboardId} onChange={(event) => navigate(`/dashboards/${event.target.value}`)}>
                {dashboardsQuery.data?.map((dashboard) => (
                    <option key={dashboard.dashboardId} value={dashboard.dashboardId}>
                        {dashboard.name}
                    </option>
                ))}
            </select>
        </label>
    );
}

function AppShellContext() {
    const isDashboardRoute = useMatch("/dashboards/:dashboardId");

    if (!isDashboardRoute) {
        return null;
    }

    return <DashboardSwitcher />;
}

function AppShell() {
    const [isNavOpen, setIsNavOpen] = useState(false);

    return (
        <div className="app-shell">
            <div className="app-shell-background" aria-hidden="true">
                <div className="app-shell-noise" />
                <div className="app-shell-grid" />
                <div className="app-shell-blob app-shell-blob--primary" />
                <div className="app-shell-blob app-shell-blob--secondary" />
                <div className="app-shell-blob app-shell-blob--tertiary" />
                <div className="app-shell-blob app-shell-blob--bottom" />
            </div>

            <div className="app-shell-inner">
                <header className="app-shell-header">
                    <div className="app-shell-brand-block">
                        <NavLink className="app-shell-brand" onClick={() => setIsNavOpen(false)} to="/">
                            Executive Insights
                        </NavLink>
                        <p className="app-shell-brand-copy">
                            Premium analytics operations across dashboards, hierarchy metadata, and Qlik-driven views.
                        </p>
                    </div>

                    <button
                        aria-controls="app-primary-nav"
                        aria-expanded={isNavOpen}
                        className={`app-shell-toggle ${isNavOpen ? "is-open" : ""}`}
                        onClick={() => setIsNavOpen((current) => !current)}
                        type="button"
                    >
                        <span className="app-shell-toggle-line" />
                        <span className="app-shell-toggle-line" />
                        <span className="app-shell-toggle-label">{isNavOpen ? "Close" : "Menu"}</span>
                    </button>

                    <div className={`app-shell-actions ${isNavOpen ? "is-open" : ""}`} id="app-primary-nav">
                        <div className="app-shell-context">
                            <AppShellContext />
                        </div>

                        <nav className="app-shell-nav" aria-label="Primary">
                            <NavLink
                                className={({ isActive }) =>
                                    ["app-shell-link", isActive ? "active" : ""].filter(Boolean).join(" ")
                                }
                                onClick={() => setIsNavOpen(false)}
                                to="/"
                                end
                            >
                                Dashboard
                            </NavLink>
                            <NavLink
                                className={({ isActive }) =>
                                    ["app-shell-link", isActive ? "active" : ""].filter(Boolean).join(" ")
                                }
                                onClick={() => setIsNavOpen(false)}
                                to="/admin/dashboards"
                            >
                                Admin
                            </NavLink>
                        </nav>
                    </div>
                </header>

                <div className="app-shell-frame">
                    <Routes>
                        <Route path="/" element={<DashboardIndexRoute />} />
                        <Route path="/dashboards/:dashboardId" element={<DashboardRoute />} />
                        <Route path="/admin" element={<AdminLayout items={adminNavigationItems} />}>
                            <Route index element={<Navigate replace to="dashboards" />} />
                            <Route path=":resourceName" element={<AdminRoute />} />
                        </Route>
                    </Routes>
                </div>
            </div>
        </div>
    );
}

export default function App() {
    return <AppShell />;
}
