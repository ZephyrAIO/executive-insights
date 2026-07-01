import { create } from "zustand";

function createFieldState() {
    return {
        options: [],
        optionsByValue: {},
        selected: [],
        search: "",
        totalSize: 0,
        loadedTops: [],
        loading: false,
        loadingPages: {},
        applying: false,
        error: null,
        searchRevision: 0,
    };
}

const EMPTY_FIELD_STATE = createFieldState();

function getOptionKey(option) {
    return `${typeof option.value}:${String(option.value)}`;
}

function getOptionStateRank(option) {
    if (option.qState === "S") {
        return 0;
    }

    return 1;
}

function mergeOptions(currentOptions, nextOptions, { preserveOrder = false } = {}) {
    if (preserveOrder) {
        const nextOptionMap = new Map(nextOptions.map((option) => [getOptionKey(option), option]));
        const mergedOptions = currentOptions.map((option) => {
            const nextOption = nextOptionMap.get(getOptionKey(option));

            if (!nextOption) {
                return option;
            }

            return { ...nextOption, rowIndex: option.rowIndex };
        });
        const currentOptionKeys = new Set(currentOptions.map(getOptionKey));
        const appendedOptions = nextOptions.filter((option) => !currentOptionKeys.has(getOptionKey(option)));

        return [...mergedOptions, ...appendedOptions];
    }

    const optionMap = new Map(currentOptions.map((option) => [option.rowIndex, option]));

    nextOptions.forEach((option) => {
        optionMap.set(option.rowIndex, option);
    });

    return [...optionMap.values()].sort((left, right) => {
        const stateDifference = getOptionStateRank(left) - getOptionStateRank(right);

        if (stateDifference !== 0) {
            return stateDifference;
        }

        return left.rowIndex - right.rowIndex;
    });
}

function indexOptions(options) {
    return Object.fromEntries(options.map((option) => [option.value, option]));
}

function getSelectedValues(options, fallbackSelected) {
    const selectedFromQlik = options.filter((option) => option.qState === "S").map((option) => option.value);
    return selectedFromQlik.length > 0 ? selectedFromQlik : fallbackSelected;
}

export const useFilterStore = create((set, get) => ({
    fields: {},
    ensureField: (fieldKey) => {
        if (!fieldKey || get().fields[fieldKey]) {
            return;
        }

        set((state) => ({
            fields: {
                ...state.fields,
                [fieldKey]: createFieldState(),
            },
        }));
    },
    setSearch: (fieldKey, search) => {
        set((state) => {
            const field = state.fields[fieldKey] ?? createFieldState();

            if (field.search === search) {
                return state;
            }

            return {
                fields: {
                    ...state.fields,
                    [fieldKey]: {
                        ...field,
                        search,
                        options: [],
                        optionsByValue: {},
                        loadedTops: [],
                        totalSize: 0,
                        searchRevision: field.searchRevision + 1,
                        error: null,
                    },
                },
            };
        });
    },
    setLoading: (fieldKey, loading) => {
        set((state) => {
            const field = state.fields[fieldKey] ?? createFieldState();

            return {
                fields: {
                    ...state.fields,
                    [fieldKey]: { ...field, loading },
                },
            };
        });
    },
    setPageLoading: (fieldKey, top, loading) => {
        set((state) => {
            const field = state.fields[fieldKey] ?? createFieldState();
            const loadingPages = { ...field.loadingPages };

            if (loading) {
                loadingPages[top] = true;
            } else {
                delete loadingPages[top];
            }

            return {
                fields: {
                    ...state.fields,
                    [fieldKey]: { ...field, loadingPages },
                },
            };
        });
    },
    mergePage: (fieldKey, options, { preserveOrder = false, top = 0, totalSize = null } = {}) => {
        set((state) => {
            const field = state.fields[fieldKey] ?? createFieldState();
            const mergedOptions = mergeOptions(field.options, options, { preserveOrder });
            const loadedTops = field.loadedTops.includes(top) ? field.loadedTops : [...field.loadedTops, top];

            return {
                fields: {
                    ...state.fields,
                    [fieldKey]: {
                        ...field,
                        options: mergedOptions,
                        optionsByValue: indexOptions(mergedOptions),
                        selected: getSelectedValues(mergedOptions, field.selected),
                        totalSize: typeof totalSize === "number" ? totalSize : field.totalSize,
                        loadedTops,
                        loading: false,
                        error: null,
                    },
                },
            };
        });
    },
    setSelectedOptimistic: (fieldKey, selected) => {
        set((state) => {
            const field = state.fields[fieldKey] ?? createFieldState();

            return {
                fields: {
                    ...state.fields,
                    [fieldKey]: { ...field, selected, error: null },
                },
            };
        });
    },
    setApplying: (fieldKey, applying) => {
        set((state) => {
            const field = state.fields[fieldKey] ?? createFieldState();

            return {
                fields: {
                    ...state.fields,
                    [fieldKey]: { ...field, applying },
                },
            };
        });
    },
    setError: (fieldKey, error) => {
        set((state) => {
            const field = state.fields[fieldKey] ?? createFieldState();

            return {
                fields: {
                    ...state.fields,
                    [fieldKey]: { ...field, loading: false, applying: false, error },
                },
            };
        });
    },
    resetField: (fieldKey) => {
        set((state) => {
            const fields = { ...state.fields };
            delete fields[fieldKey];
            return { fields };
        });
    },
    resetDashboard: (dashboardId) => {
        const prefix = `dashboard:${dashboardId}:`;

        set((state) => ({
            fields: Object.fromEntries(Object.entries(state.fields).filter(([fieldKey]) => !fieldKey.startsWith(prefix))),
        }));
    },
}));

export function getFilterFieldKey({ dashboardId, appId, fieldName }) {
    return `dashboard:${dashboardId}:field:${appId}:${fieldName}`;
}

export function selectFilterField(fieldKey) {
    return (state) => state.fields[fieldKey] ?? EMPTY_FIELD_STATE;
}