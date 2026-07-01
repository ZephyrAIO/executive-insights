export const ADMIN_RESOURCES = {
    settings: {
        title: "Settings",
        resourceName: "settings",
        displayField: "key",
        fields: [
            { name: "key", label: "Key", type: "text", required: true },
            { name: "value", label: "Value", type: "text", required: true },
        ],
    },
    dashboards: {
        title: "Dashboards",
        resourceName: "dashboards",
        fields: [{ name: "name", label: "Name", type: "text", required: true }],
    },
    widgets: {
        title: "Widgets",
        resourceName: "widgets",
        fields: [
            { name: "name", label: "Name", type: "text", required: true },
            {
                name: "qlikApplicationId",
                label: "Qlik application",
                type: "select",
                required: true,
                optionsResource: "qlikApplications",
                optionLabel: "name",
                optionValue: "id",
            },
            { name: "objectId", label: "Object ID", type: "text", required: true },
            {
                name: "type",
                label: "Type",
                type: "select",
                required: true,
                staticOptions: [
                    { label: "Bar chart", value: "barchart" },
                    { label: "Table", value: "table" },
                ],
            },
        ],
    },
    dashboardWidgets: {
        title: "Dashboard Widget Links",
        resourceName: "dashboardWidgets",
        fields: [
            {
                name: "dashboardId",
                label: "Dashboard",
                type: "select",
                required: true,
                optionsResource: "dashboards",
                optionLabel: "name",
                optionValue: "id",
            },
            {
                name: "widgetId",
                label: "Widget",
                type: "select",
                required: true,
                optionsResource: "widgets",
                optionLabel: "name",
                optionValue: "id",
            },
        ],
    },
    filters: {
        title: "Filters",
        resourceName: "filters",
        fields: [
            {
                name: "dashboardId",
                label: "Dashboard",
                type: "select",
                required: true,
                optionsResource: "dashboards",
                optionLabel: "name",
                optionValue: "id",
            },
            {
                name: "widgetId",
                label: "Widget",
                type: "select",
                optionsResource: "widgets",
                optionLabel: "name",
                optionValue: "id",
                allowEmpty: true,
            },
            {
                name: "type",
                label: "Type",
                type: "select",
                required: true,
                staticOptions: [
                    { label: "Hierarchy", value: "hierarchy" },
                    { label: "Field", value: "field" },
                ],
            },
            {
                name: "filterHierarchyId",
                label: "Hierarchy",
                type: "select",
                required: true,
                optionsResource: "hierarchies",
                optionLabel: "name",
                optionValue: "id",
                showWhen: (values) => values.type === "hierarchy",
            },
            {
                name: "fieldName",
                label: "Field name",
                type: "text",
                required: true,
                showWhen: (values) => values.type === "field",
            },
            {
                name: "defaultValuesJson",
                label: "Default values JSON",
                type: "textarea",
            },
            {
                name: "allowedValuesJson",
                label: "Allowed values JSON",
                type: "textarea",
            },
        ],
    },
    hierarchies: {
        title: "Hierarchies",
        resourceName: "hierarchies",
        fields: [
            { name: "name", label: "Name", type: "text", required: true },
            {
                name: "fields",
                label: "Hierarchy fields",
                type: "fieldArray",
                required: true,
            },
        ],
    },
    qlikApplications: {
        title: "Qlik Applications",
        resourceName: "qlikApplications",
        fields: [
            { name: "name", label: "Name", type: "text", required: true },
            { name: "appId", label: "App ID", type: "text", required: true },
        ],
    },
};

export const adminNavigationItems = Object.entries(ADMIN_RESOURCES).map(([resourceName, config]) => ({
    resourceName,
    title: config.title,
}));
