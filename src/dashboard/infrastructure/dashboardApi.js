const API_BASE = "/api";

async function parseResponse(response) {
    if (response.ok) {
        if (response.status === 204) {
            return null;
        }

        return response.json();
    }

    let message = `Request failed with status ${response.status}`;

    try {
        const payload = await response.json();

        if (payload && typeof payload.error === "string") {
            message = payload.error;
        }
    } catch {
        // Ignore malformed JSON error payloads.
    }

    throw new Error(message);
}

async function request(path, options) {
    const response = await fetch(`${API_BASE}${path}`, {
        headers: {
            "Content-Type": "application/json",
        },
        ...options,
    });

    return parseResponse(response);
}

export async function getDashboards() {
    return request("/dashboards");
}

export async function getDashboard(dashboardId) {
    return request(`/dashboards/${dashboardId}`);
}

export async function getDashboardWidgets(dashboardId) {
    return request(`/dashboards/${dashboardId}/widgets`);
}

export async function getDashboardFilters(dashboardId) {
    return request(`/dashboards/${dashboardId}/filters`);
}

export async function getSettings() {
    return request("/settings");
}

export async function getAdminResource(name) {
    return request(`/admin/${name}`);
}

export async function createAdminResource(name, payload) {
    return request(`/admin/${name}`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function updateAdminResource(name, id, payload) {
    return request(`/admin/${name}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}

export async function deleteAdminResource(name, id) {
    return request(`/admin/${name}/${id}`, {
        method: "DELETE",
    });
}
