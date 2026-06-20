import { App } from "@tinyhttp/app";
import { cors } from "@tinyhttp/cors";
import { JSONFilePreset } from "lowdb/node";
import { json } from "milliparsec";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sirv from "sirv";
import { Service, isItem } from "json-server/lib/service.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, "db.json");
const defaultData = {
    settings: [],
    dashboards: [],
    widgets: [],
    dashboardWidgets: [],
    filters: [],
    hierarchies: [],
    qlikApplications: [],
};
const db = await JSONFilePreset(dbPath, defaultData);
const service = new Service(db);
const app = new App();
const port = Number.parseInt(process.env.PORT ?? "4000", 10);
const adminResourceNames = new Set([
    "settings",
    "dashboards",
    "widgets",
    "dashboardWidgets",
    "filters",
    "hierarchies",
    "qlikApplications",
]);

app.use(cors());
app.use(json());
app.use(sirv(join(__dirname, "../public"), { dev: process.env.NODE_ENV !== "production" }));

function getCollection(name) {
    return Array.isArray(db.data[name]) ? db.data[name] : [];
}

function getItemById(name, id) {
    return getCollection(name).find((item) => item.id === id);
}

function getApplicationAppId(qlikApplicationId) {
    return getItemById("qlikApplications", qlikApplicationId)?.appId ?? "";
}

function normalizeHierarchyFields(fields, existingFields = []) {
    if (!Array.isArray(fields)) {
        return [];
    }

    return fields
        .map((field, index) => {
            if (typeof field === "string") {
                return {
                    id: existingFields[index]?.id ?? crypto.randomUUID(),
                    fieldName: field.trim(),
                };
            }

            if (!isItem(field)) {
                return null;
            }

            const fieldName = typeof field.fieldName === "string" ? field.fieldName.trim() : "";

            if (fieldName.length === 0) {
                return null;
            }

            return {
                id: typeof field.id === "string" && field.id.length > 0 ? field.id : crypto.randomUUID(),
                fieldName,
            };
        })
        .filter(Boolean);
}

function normalizePayload(name, payload, existingItem) {
    if (name === "settings") {
        return {
            ...payload,
            key: typeof payload.key === "string" ? payload.key.trim() : "",
            value: typeof payload.value === "string" ? payload.value.trim() : "",
        };
    }

    if (name === "filters") {
        const type = payload.type === "hierarchy" ? "hierarchy" : "field";

        return {
            ...payload,
            widgetId: payload.widgetId || null,
            type,
            fieldName: type === "field" && typeof payload.fieldName === "string" ? payload.fieldName : null,
        };
    }

    if (name === "hierarchies") {
        return {
            ...payload,
            qlikApplicationId: undefined,
            fields: normalizeHierarchyFields(payload.fields, existingItem?.fields),
        };
    }

    return payload;
}

function mapSettings(settings) {
    return Object.fromEntries(
        getCollection(settings)
            .filter((entry) => typeof entry.key === "string" && entry.key.length > 0)
            .map((entry) => [entry.key, entry.value ?? ""]),
    );
}

function findSettingByKey(key, excludeId) {
    return getCollection("settings").find(
        (entry) => entry.key === key && (typeof excludeId !== "string" || entry.id !== excludeId),
    );
}

function mapDashboardSummary(dashboard) {
    return {
        dashboardId: dashboard.id,
        name: dashboard.name,
    };
}

function mapWidget(widget) {
    return {
        widgetId: widget.id,
        name: widget.name,
        appId: getApplicationAppId(widget.qlikApplicationId),
        objectId: widget.objectId,
        type: widget.type,
    };
}

function mapHierarchy(hierarchy) {
    return {
        filterHierarchyId: hierarchy.id,
        name: hierarchy.name,
        fields: (hierarchy.fields ?? []).map((field) => ({
            filterHierarchyFieldId: field.id,
            fieldName: field.fieldName,
        })),
    };
}

function mapFilter(filter) {
    const hierarchy = getItemById("hierarchies", filter.filterHierarchyId);

    return {
        filterId: filter.id,
        dashboardId: filter.dashboardId,
        widgetId: filter.widgetId ?? undefined,
        type: filter.type,
        filterHierarchyId: filter.filterHierarchyId,
        filterHierarchy: hierarchy ? mapHierarchy(hierarchy) : null,
        fieldName: filter.fieldName ?? null,
    };
}

function removeById(name, id) {
    const items = getCollection(name);
    const item = items.find((entry) => entry.id === id);

    if (!item) {
        return null;
    }

    const index = items.indexOf(item);
    items.splice(index, 1);
    return item;
}

function cascadeDelete(name, id) {
    if (name === "dashboards") {
        db.data.dashboardWidgets = getCollection("dashboardWidgets").filter((link) => link.dashboardId !== id);
        db.data.filters = getCollection("filters").filter((filter) => filter.dashboardId !== id);
        return;
    }

    if (name === "widgets") {
        db.data.dashboardWidgets = getCollection("dashboardWidgets").filter((link) => link.widgetId !== id);
        db.data.filters = getCollection("filters").map((filter) =>
            filter.widgetId === id ? { ...filter, widgetId: null } : filter,
        );
        return;
    }

    if (name === "hierarchies") {
        db.data.filters = getCollection("filters").filter((filter) => filter.filterHierarchyId !== id);
        return;
    }

    if (name === "qlikApplications") {
        db.data.widgets = getCollection("widgets").map((widget) =>
            widget.qlikApplicationId === id ? { ...widget, qlikApplicationId: "" } : widget,
        );
    }
}

function parseSort(query) {
    return typeof query._sort === "string" && query._sort.length > 0 ? query._sort : undefined;
}

app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

app.get("/dashboards", (_req, res) => {
    res.json(getCollection("dashboards").map(mapDashboardSummary));
});

app.get("/dashboards/:dashboardId", (req, res) => {
    const dashboard = getItemById("dashboards", req.params.dashboardId);

    if (!dashboard) {
        res.status(404).json({ error: "Dashboard not found" });
        return;
    }

    res.json(mapDashboardSummary(dashboard));
});

app.get("/dashboards/:dashboardId/widgets", (req, res) => {
    const dashboard = getItemById("dashboards", req.params.dashboardId);

    if (!dashboard) {
        res.status(404).json({ error: "Dashboard not found" });
        return;
    }

    const widgets = getCollection("dashboardWidgets")
        .filter((link) => link.dashboardId === dashboard.id)
        .map((link) => getItemById("widgets", link.widgetId))
        .filter(Boolean)
        .map(mapWidget);

    res.json(widgets);
});

app.get("/dashboards/:dashboardId/filters", (req, res) => {
    const dashboard = getItemById("dashboards", req.params.dashboardId);

    if (!dashboard) {
        res.status(404).json({ error: "Dashboard not found" });
        return;
    }

    res.json(
        getCollection("filters")
            .filter((filter) => filter.dashboardId === dashboard.id)
            .map(mapFilter),
    );
});

app.get("/settings", (_req, res) => {
    res.json(mapSettings("settings"));
});

app.get("/admin/:name", (req, res) => {
    const { name } = req.params;

    if (!adminResourceNames.has(name)) {
        res.status(404).json({ error: "Resource not found" });
        return;
    }

    const data = service.find(name, {
        where: {},
        sort: parseSort(req.query),
        page: undefined,
        perPage: undefined,
        embed: req.query._embed,
    });

    res.json(data);
});

app.get("/admin/:name/:id", (req, res) => {
    const { name, id } = req.params;

    if (!adminResourceNames.has(name)) {
        res.status(404).json({ error: "Resource not found" });
        return;
    }

    const data = service.findById(name, id, req.query);

    if (!data) {
        res.status(404).json({ error: "Resource item not found" });
        return;
    }

    res.json(data);
});

app.post("/admin/:name", async (req, res) => {
    const { name } = req.params;

    if (!adminResourceNames.has(name)) {
        res.status(404).json({ error: "Resource not found" });
        return;
    }

    if (!isItem(req.body)) {
        res.status(400).json({ error: "Body must be a JSON object" });
        return;
    }

    const payload = normalizePayload(name, req.body);

    if (name === "settings") {
        if (!payload.key) {
            res.status(400).json({ error: "Setting key is required" });
            return;
        }

        if (findSettingByKey(payload.key)) {
            res.status(409).json({ error: "Setting key must be unique" });
            return;
        }
    }

    const data = await service.create(name, payload);
    res.status(201).json(data);
});

app.patch("/admin/:name/:id", async (req, res) => {
    const { name, id } = req.params;

    if (!adminResourceNames.has(name)) {
        res.status(404).json({ error: "Resource not found" });
        return;
    }

    if (!isItem(req.body)) {
        res.status(400).json({ error: "Body must be a JSON object" });
        return;
    }

    const existingItem = getItemById(name, id);
    const payload = normalizePayload(name, req.body, existingItem);

    if (name === "settings") {
        if (!payload.key) {
            res.status(400).json({ error: "Setting key is required" });
            return;
        }

        if (findSettingByKey(payload.key, id)) {
            res.status(409).json({ error: "Setting key must be unique" });
            return;
        }
    }

    const data = await service.patchById(name, id, payload);

    if (!data) {
        res.status(404).json({ error: "Resource item not found" });
        return;
    }

    res.json(data);
});

app.delete("/admin/:name/:id", async (req, res) => {
    const { name, id } = req.params;

    if (!adminResourceNames.has(name)) {
        res.status(404).json({ error: "Resource not found" });
        return;
    }

    const removedItem = removeById(name, id);

    if (!removedItem) {
        res.status(404).json({ error: "Resource item not found" });
        return;
    }

    cascadeDelete(name, id);
    await db.write();
    res.json(removedItem);
});

app.listen(port, () => {
    console.log(`Mock API listening on http://localhost:${port}`);
});
