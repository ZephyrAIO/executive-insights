import { NavLink, Outlet } from "react-router";
import GlowPanel from "../shared/components/ui/GlowPanel.jsx";

export default function AdminLayout({ items }) {
    return (
        <main className="admin-shell">
            <GlowPanel as="section" className="admin-sidebar-panel">
                <div className="admin-sidebar-copy">
                    <p className="dashboard-panel-eyebrow">Control plane</p>
                    <h2 className="admin-sidebar-title">Admin Page</h2>
                    <p>
                        Curate normalized resources, hierarchy metadata, and widget mappings without leaving the same
                        visual system.
                    </p>
                </div>

                <div className="admin-sidebar-stats" aria-label="Admin overview">
                    <div className="admin-sidebar-stat">
                        <span>Resources</span>
                        <strong>{items.length}</strong>
                    </div>
                    <div className="admin-sidebar-stat">
                        <span>Mode</span>
                        <strong>Live CRUD</strong>
                    </div>
                </div>

                <nav className="admin-sidebar-nav" aria-label="Admin resources">
                    {items.map((item) => (
                        <NavLink
                            key={item.resourceName}
                            className={({ isActive }) =>
                                ["admin-sidebar-link", isActive ? "active" : ""].filter(Boolean).join(" ")
                            }
                            to={`/admin/${item.resourceName}`}
                        >
                            {item.title}
                        </NavLink>
                    ))}
                </nav>
            </GlowPanel>

            <Outlet />
        </main>
    );
}
