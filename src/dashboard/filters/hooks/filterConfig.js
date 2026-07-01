function parseJsonFields(json) {
    if (typeof json !== "string" || json.trim().length === 0) {
        return {};
    }

    try {
        const payload = JSON.parse(json);
        return payload && typeof payload.fields === "object" && !Array.isArray(payload.fields) ? payload.fields : {};
    } catch {
        return {};
    }
}

function getStringOptions(value) {
    return Array.isArray(value) ? value.filter((option) => typeof option === "string") : [];
}

function getOptionStateRank(option) {
    if (option.qState === "S") {
        return 0;
    }

    return 1;
}

function isSelectedOption(option, selectedValues) {
    return option.qState === "S" || selectedValues.includes(option.value);
}

function hasAllowedOptionRestriction(allowedOptions) {
    return Array.isArray(allowedOptions) && allowedOptions.length > 0;
}

function sortByStateThenRowIndex(left, right) {
    const stateDifference = getOptionStateRank(left) - getOptionStateRank(right);

    if (stateDifference !== 0) {
        return stateDifference;
    }

    return left.rowIndex - right.rowIndex;
}

export function getAllowedFields(filter) {
    return parseJsonFields(filter?.allowedValuesJson);
}

export function hasAllowedFieldConfig(filter) {
    return Object.keys(getAllowedFields(filter)).length > 0;
}

export function getAllowedFieldConfig(filter, fieldName) {
    const config = getAllowedFields(filter)[fieldName];

    if (!config || typeof config !== "object" || Array.isArray(config)) {
        return null;
    }

    return {
        automaticVisibility: config.automaticVisibility === true,
        fieldLabel:
            typeof config.fieldLabel === "string" && config.fieldLabel.trim().length > 0
                ? config.fieldLabel.trim()
                : fieldName,
        fieldName,
        options: Array.isArray(config.options) ? getStringOptions(config.options) : null,
    };
}

export function getFieldConfig(filter, fieldName) {
    return (
        getAllowedFieldConfig(filter, fieldName) ?? {
            automaticVisibility: false,
            fieldLabel: fieldName,
            fieldName,
            options: null,
        }
    );
}

export function isFieldAllowed(filter, fieldName) {
    return !hasAllowedFieldConfig(filter) || Boolean(getAllowedFieldConfig(filter, fieldName));
}

export function getDefaultFieldOptions(filter, fieldName) {
    const config = parseJsonFields(filter?.defaultValuesJson)[fieldName];
    return getStringOptions(config?.options);
}

export function getVisibleFilterOptions({ allowedOptions, options, selectedValues = [], totalSize }) {
    if (!hasAllowedOptionRestriction(allowedOptions)) {
        return { options, totalSize };
    }

    const allowedIndexes = new Map(allowedOptions.map((option, index) => [option, index]));
    const visibleOptions = options
        .filter((option) => allowedIndexes.has(option.qText) || isSelectedOption(option, selectedValues))
        .map((option) => {
            const allowedIndex = allowedIndexes.get(option.qText);

            return {
                ...option,
                rowIndex: typeof allowedIndex === "number" ? allowedIndex : allowedOptions.length + option.rowIndex,
            };
        })
        .sort(sortByStateThenRowIndex);
    const selectedOutOfListCount = visibleOptions.filter(
        (option) => !allowedIndexes.has(option.qText) && isSelectedOption(option, selectedValues),
    ).length;

    return {
        options: visibleOptions,
        totalSize: allowedOptions.length + selectedOutOfListCount,
    };
}

export function getHierarchyFieldConfigs(filter) {
    const fields = filter?.filterHierarchy?.fields ?? [];

    return fields
        .map((field) => field.fieldName)
        .filter((fieldName) => typeof fieldName === "string" && fieldName.trim().length > 0)
        .filter((fieldName) => isFieldAllowed(filter, fieldName))
        .map((fieldName) => getFieldConfig(filter, fieldName));
}