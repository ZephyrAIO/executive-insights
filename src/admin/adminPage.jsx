import { useMemo, useState } from "react";
import { Navigate } from "react-router";

import Button from "../shared/components/ui/Button.jsx";
import GlowPanel from "../shared/components/ui/GlowPanel.jsx";
import {
    useAdminResourceQuery,
    useCreateAdminResourceMutation,
    useDeleteAdminResourceMutation,
    useUpdateAdminResourceMutation,
} from "../dashboard/infrastructure/dashboardQueries";
import { ADMIN_RESOURCES } from "./adminSchemas.js";

function createEmptyValue(config) {
    return config.fields.reduce((values, field) => {
        if (field.type === "fieldArray") {
            values[field.name] = [{ id: crypto.randomUUID(), fieldName: "" }];
            return values;
        }

        if (field.type === "select") {
            values[field.name] = "";
            return values;
        }

        values[field.name] = "";
        return values;
    }, {});
}

function getOptionValue(option, optionValue) {
    return option?.[optionValue] ?? "";
}

function getOptionLabel(option, optionLabel) {
    return option?.[optionLabel] ?? option?.name ?? option?.id ?? "";
}

function normalizeFormValues(values, config) {
    return config.fields.reduce((payload, field) => {
        const value = values[field.name];

        if (field.type === "fieldArray") {
            payload[field.name] = (value ?? [])
                .map((entry) => ({
                    id: entry.id || crypto.randomUUID(),
                    fieldName: entry.fieldName.trim(),
                }))
                .filter((entry) => entry.fieldName.length > 0);
            return payload;
        }

        if (field.name === "widgetId") {
            payload[field.name] = value || null;
            return payload;
        }

        if (field.name === "fieldName") {
            payload[field.name] = values.type === "field" ? value || null : null;
            return payload;
        }

        payload[field.name] = typeof value === "string" ? value.trim() : value;
        return payload;
    }, {});
}

function ResourceTable({ items, config, onCreate, onEdit, onDelete, deleting }) {
    return (
        <div className="admin-table-section">
            <div className="admin-table-toolbar">
                <div>
                    <p className="dashboard-panel-eyebrow">Records</p>
                    <h3>{config.title}</h3>
                </div>
                <Button onClick={onCreate}>Create {config.title.slice(0, -1) || "record"}</Button>
            </div>

            <div className="admin-table-shell">
                <div className="admin-table-header admin-table-row">
                    <div>Name</div>
                    <div>Record</div>
                    <div>Actions</div>
                </div>
                {items.map((item) => (
                    <div className="admin-table-row" key={item.id}>
                        <div className="admin-table-primary">
                            <strong>{item[config.displayField ?? "name"] ?? item.name ?? item.id}</strong>
                            <span className="admin-table-id">{item.id}</span>
                        </div>
                        <div className="admin-table-record">{JSON.stringify(item, null, 2)}</div>
                        <div className="admin-table-actions">
                            <Button tone="secondary" variant="ghost" onClick={() => onEdit(item)}>
                                Edit
                            </Button>
                            <Button tone="danger" variant="ghost" disabled={deleting} onClick={() => onDelete(item.id)}>
                                Delete
                            </Button>
                        </div>
                    </div>
                ))}
                {items.length === 0 ? (
                    <div className="dashboard-empty-state">No {config.title.toLowerCase()} found.</div>
                ) : null}
            </div>
        </div>
    );
}

function FieldArrayInput({ value, onChange }) {
    return (
        <div className="admin-field-array">
            {(value ?? []).map((field, index) => (
                <div className="admin-field-array-row" key={field.id}>
                    <input
                        type="text"
                        value={field.fieldName}
                        onChange={(event) => {
                            const nextValue = [...value];
                            nextValue[index] = { ...field, fieldName: event.target.value };
                            onChange(nextValue);
                        }}
                        placeholder="Field name"
                    />
                    <Button
                        tone="secondary"
                        variant="ghost"
                        disabled={value.length === 1}
                        onClick={() => onChange(value.filter((entry) => entry.id !== field.id))}
                    >
                        Remove
                    </Button>
                </div>
            ))}
            <Button
                tone="secondary"
                variant="ghost"
                onClick={() => onChange([...(value ?? []), { id: crypto.randomUUID(), fieldName: "" }])}
            >
                Add field
            </Button>
        </div>
    );
}

function ResourceForm({ config, values, onChange, onSubmit, onCancel, isSaving, referenceOptions, editingId }) {
    return (
        <form className="admin-form-panel" onSubmit={onSubmit}>
            <div className="admin-form-header">
                <div>
                    <p className="dashboard-panel-eyebrow">{config.title}</p>
                    <h2>{editingId ? "Edit record" : "Create record"}</h2>
                </div>
                <Button tone="secondary" variant="ghost" onClick={onCancel} type="button">
                    Cancel
                </Button>
            </div>

            <div className="admin-form-grid">
                {config.fields.map((field) => {
                    if (field.showWhen && !field.showWhen(values)) {
                        return null;
                    }

                    const fieldValue = values[field.name] ?? "";

                    if (field.type === "fieldArray") {
                        return (
                            <label className="admin-form-field admin-form-field--wide" key={field.name}>
                                <span>{field.label}</span>
                                <FieldArrayInput
                                    value={fieldValue}
                                    onChange={(nextValue) => onChange(field.name, nextValue)}
                                />
                            </label>
                        );
                    }

                    if (field.type === "select") {
                        const options = field.staticOptions ?? referenceOptions[field.optionsResource] ?? [];

                        return (
                            <label className="admin-form-field" key={field.name}>
                                <span>{field.label}</span>
                                <select
                                    required={field.required}
                                    value={fieldValue}
                                    onChange={(event) => onChange(field.name, event.target.value)}
                                >
                                    <option value="">{field.allowEmpty ? "None" : "Select an option"}</option>
                                    {options.map((option) => (
                                        <option
                                            key={getOptionValue(option, field.optionValue ?? "value")}
                                            value={getOptionValue(option, field.optionValue ?? "value")}
                                        >
                                            {getOptionLabel(option, field.optionLabel ?? "label")}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        );
                    }

                    if (field.type === "textarea") {
                        return (
                            <label className="admin-form-field admin-form-field--wide" key={field.name}>
                                <span>{field.label}</span>
                                <textarea
                                    required={field.required}
                                    value={fieldValue}
                                    onChange={(event) => onChange(field.name, event.target.value)}
                                />
                            </label>
                        );
                    }

                    return (
                        <label className="admin-form-field" key={field.name}>
                            <span>{field.label}</span>
                            <input
                                required={field.required}
                                type="text"
                                value={fieldValue}
                                onChange={(event) => onChange(field.name, event.target.value)}
                            />
                        </label>
                    );
                })}
            </div>

            <div className="admin-form-actions">
                <Button disabled={isSaving} type="submit">
                    {isSaving ? "Saving..." : editingId ? "Save changes" : "Create record"}
                </Button>
            </div>
        </form>
    );
}

export default function AdminPage({ resourceName = "dashboards" }) {
    const config = ADMIN_RESOURCES[resourceName];
    const [editingId, setEditingId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formValues, setFormValues] = useState(() => createEmptyValue(config ?? ADMIN_RESOURCES.dashboards));
    const resourceQuery = useAdminResourceQuery(resourceName);
    const createMutation = useCreateAdminResourceMutation(resourceName);
    const updateMutation = useUpdateAdminResourceMutation(resourceName);
    const deleteMutation = useDeleteAdminResourceMutation(resourceName);

    const dashboardsQuery = useAdminResourceQuery("dashboards");
    const widgetsQuery = useAdminResourceQuery("widgets");
    const hierarchiesQuery = useAdminResourceQuery("hierarchies");
    const qlikApplicationsQuery = useAdminResourceQuery("qlikApplications");

    const referenceOptions = useMemo(
        () => ({
            dashboards: dashboardsQuery.data ?? [],
            widgets: widgetsQuery.data ?? [],
            hierarchies: hierarchiesQuery.data ?? [],
            qlikApplications: qlikApplicationsQuery.data ?? [],
        }),
        [dashboardsQuery.data, hierarchiesQuery.data, qlikApplicationsQuery.data, widgetsQuery.data],
    );

    if (!config) {
        return <Navigate replace to="/admin/dashboards" />;
    }

    if (resourceQuery.isLoading) {
        return <div className="dashboard-loading-state">Loading {config.title.toLowerCase()}...</div>;
    }

    if (resourceQuery.error) {
        return <div className="dashboard-error-state">{resourceQuery.error.message}</div>;
    }

    const items = resourceQuery.data ?? [];
    const isSaving = createMutation.isPending || updateMutation.isPending;

    const resetForm = () => {
        setEditingId(null);
        setFormValues(createEmptyValue(config));
        setIsModalOpen(false);
    };

    const handleCreate = () => {
        setEditingId(null);
        setFormValues(createEmptyValue(config));
        setIsModalOpen(true);
    };

    const handleChange = (fieldName, value) => {
        setFormValues((current) => {
            const nextValues = { ...current, [fieldName]: value };

            if (fieldName === "type" && value === "hierarchy") {
                nextValues.fieldName = "";
            }

            return nextValues;
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const payload = normalizeFormValues(formValues, config);

        if (editingId) {
            await updateMutation.mutateAsync({ id: editingId, payload });
        } else {
            await createMutation.mutateAsync(payload);
        }

        resetForm();
    };

    const handleEdit = (item) => {
        setEditingId(item.id);
        setFormValues({
            ...createEmptyValue(config),
            ...item,
            fields: item.fields ?? createEmptyValue(config).fields,
            widgetId: item.widgetId ?? "",
            fieldName: item.fieldName ?? "",
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        await deleteMutation.mutateAsync(id);

        if (editingId === id) {
            resetForm();
        }
    };

    return (
        <section className="admin-content">
            <div className="admin-content-header">
                <div>
                    <p className="dashboard-panel-eyebrow">{config.title}</p>
                    <h2>Normalized resource orchestration</h2>
                </div>
                <p className="admin-content-body">
                    Edit the normalized dataset that projects dashboard endpoints, widget composition, and
                    hierarchy-aware filters in one place.
                </p>
            </div>

            <div className="admin-overview-grid">
                <GlowPanel as="article" className="admin-overview-card">
                    <p className="dashboard-panel-eyebrow">Records</p>
                    <h3>{items.length}</h3>
                    <p>Available entries currently loaded for this resource.</p>
                </GlowPanel>
                <GlowPanel as="article" className="admin-overview-card">
                    <p className="dashboard-panel-eyebrow">Fields</p>
                    <h3>{config.fields.length}</h3>
                    <p>Editable attributes exposed in the current form contract.</p>
                </GlowPanel>
                <GlowPanel as="article" className="admin-overview-card">
                    <p className="dashboard-panel-eyebrow">Backend</p>
                    <h3>json-server</h3>
                    <p>Writes apply directly to the mock API source that powers the dashboard projections.</p>
                </GlowPanel>
            </div>

            <div className="admin-content-grid">
                <ResourceTable
                    config={config}
                    deleting={deleteMutation.isPending}
                    items={items}
                    onCreate={handleCreate}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                />
            </div>

            {isModalOpen ? (
                <div className="admin-modal-backdrop" onClick={resetForm} role="presentation">
                    <div className="admin-modal-dialog" onClick={(event) => event.stopPropagation()}>
                        <ResourceForm
                            config={config}
                            editingId={editingId}
                            isSaving={isSaving}
                            onCancel={resetForm}
                            onChange={handleChange}
                            onSubmit={handleSubmit}
                            referenceOptions={referenceOptions}
                            values={formValues}
                        />
                    </div>
                </div>
            ) : null}

            {createMutation.error || updateMutation.error || deleteMutation.error ? (
                <div className="dashboard-error-state admin-feedback-state">
                    {(createMutation.error ?? updateMutation.error ?? deleteMutation.error).message}
                </div>
            ) : null}
        </section>
    );
}
