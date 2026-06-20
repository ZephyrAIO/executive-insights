import { useCallback, useEffect, useMemo, useRef } from "react";

import { getCachedValue, getOrCreateInflightRequest, hasCachedValue, setCachedValue } from "../cache/qlikCache";
import { useQlikApp } from "./useQlikApp";

export const DEFAULT_BATCH_SIZE = 20;
export const LIST_PATH = "/qListObjectDef";

function normalizeError(error, fallbackMessage) {
    if (error instanceof Error) {
        return error;
    }

    if (typeof error === "string") {
        return new Error(error);
    }

    if (error && typeof error.message === "string") {
        return new Error(error.message);
    }

    return new Error(fallbackMessage);
}

function normalizeFieldName(fieldName) {
    return typeof fieldName === "string" ? fieldName.trim() : "";
}

function getListCacheKey(appId, fieldName) {
    return `filter-list:${appId}:${fieldName}`;
}

function getListPageCacheKey(cacheKey, searchRevision, top, height) {
    return `${cacheKey}:page:${searchRevision}:${top}:${height}`;
}

function getListModel(listObject) {
    return listObject?.model ?? listObject;
}

function getListDataPages(payload) {
    if (Array.isArray(payload)) {
        return payload;
    }

    return payload?.qDataPages ?? [];
}

function createDataPage(top, height) {
    return {
        qTop: top,
        qLeft: 0,
        qHeight: height,
        qWidth: 1,
    };
}

export function buildListDefinition(fieldName, batchSize = DEFAULT_BATCH_SIZE) {
    return {
        qDef: {
            qFieldDefs: [fieldName],
            qSortCriterias: [
                {
                    qSortByState: 1,
                    qSortByFrequency: 0,
                    qSortByNumeric: 1,
                    qSortByAscii: 1,
                    qSortByLoadOrder: 0,
                    qSortByExpression: 0,
                },
            ],
        },
        qShowAlternatives: true,
        qInitialDataFetch: [createDataPage(0, batchSize)],
    };
}

function getNumericValue(qNum) {
    if (typeof qNum === "number" && Number.isFinite(qNum)) {
        return qNum;
    }

    if (typeof qNum === "string" && qNum.trim().length > 0) {
        const parsedValue = Number(qNum);

        if (Number.isFinite(parsedValue)) {
            return parsedValue;
        }
    }

    return null;
}

function getSelectableValue(cell) {
    return getNumericValue(cell.qNum) ?? cell.qText;
}

export function mapListObjectOptions(matrix = [], pageTop = 0) {
    return matrix
        .map((row, index) => ({ cell: row?.[0], rowIndex: pageTop + index }))
        .filter(({ cell }) => cell && typeof cell.qText === "string")
        .map(({ cell, rowIndex }) => ({
            value: getSelectableValue(cell),
            qText: cell.qText,
            label: cell.qText,
            qElemNumber: typeof cell.qElemNumber === "number" ? cell.qElemNumber : null,
            qNum: getNumericValue(cell.qNum),
            qState: typeof cell.qState === "string" ? cell.qState : "O",
            selected: cell.qState === "S",
            rowIndex,
        }));
}

async function createListObject(app, fieldName, batchSize) {
    if (typeof app?.createList !== "function") {
        throw new Error("Qlik field lists are unavailable for this app connection.");
    }

    return await app.createList(buildListDefinition(fieldName, batchSize));
}

async function loadLayout(listObject) {
    const listModel = getListModel(listObject);

    if (typeof listModel?.getLayout !== "function") {
        return null;
    }

    return await listModel.getLayout();
}

async function loadListPage(listObject, top, height) {
    const listModel = getListModel(listObject);

    if (typeof listModel?.getListObjectData !== "function") {
        const layout = await loadLayout(listObject);
        return layout?.qListObject?.qDataPages ?? [];
    }

    return await listModel.getListObjectData(LIST_PATH, [createDataPage(top, height)]);
}

export function useQlikListObject({ appId, fieldName, batchSize = DEFAULT_BATCH_SIZE, onChanged }) {
    const normalizedFieldName = normalizeFieldName(fieldName);
    const { app, error: appError, loading: appLoading } = useQlikApp(appId);
    const cacheKey = appId && normalizedFieldName ? getListCacheKey(appId, normalizedFieldName) : null;
    const onChangedRef = useRef(onChanged);

    useEffect(() => {
        onChangedRef.current = onChanged;
    }, [onChanged]);

    const getListObject = useCallback(async () => {
        if (!cacheKey || !app || appError || appLoading) {
            return null;
        }

        if (hasCachedValue(cacheKey)) {
            return getCachedValue(cacheKey);
        }

        return getOrCreateInflightRequest(cacheKey, async () => {
            const listObject = await createListObject(app, normalizedFieldName, batchSize);
            return setCachedValue(cacheKey, listObject);
        });
    }, [app, appError, appLoading, batchSize, cacheKey, normalizedFieldName]);

    useEffect(() => {
        let isActive = true;
        let listModel = null;

        const handleChanged = () => {
            onChangedRef.current?.();
        };

        const attachChangedListener = async () => {
            const listObject = await getListObject();

            if (!isActive || !listObject) {
                return;
            }

            listModel = getListModel(listObject);

            if (typeof listModel?.on === "function") {
                listModel.on("changed", handleChanged);
            }
        };

        attachChangedListener();

        return () => {
            isActive = false;

            if (typeof listModel?.removeListener === "function") {
                listModel.removeListener("changed", handleChanged);
            }
        };
    }, [getListObject]);

    const readLayout = useCallback(async () => {
        const listObject = await getListObject();

        if (!listObject) {
            return null;
        }

        return loadLayout(listObject);
    }, [getListObject]);

    const readPage = useCallback(
        async ({ top = 0, height = batchSize, searchRevision = 0 } = {}) => {
            const listObject = await getListObject();

            if (!listObject || !cacheKey) {
                return [];
            }

            return getOrCreateInflightRequest(getListPageCacheKey(cacheKey, searchRevision, top, height), async () => {
                const pages = getListDataPages(await loadListPage(listObject, top, height));
                const matrix = pages?.[0]?.qMatrix ?? [];
                return mapListObjectOptions(matrix, top);
            });
        },
        [batchSize, cacheKey, getListObject],
    );

    const search = useCallback(
        async (text) => {
            const listObject = getListModel(await getListObject());

            if (!listObject || typeof listObject.searchListObjectFor !== "function") {
                return;
            }

            await listObject.searchListObjectFor(LIST_PATH, text);
        },
        [getListObject],
    );

    const abortSearch = useCallback(async () => {
        const listObject = getListModel(await getListObject());

        if (!listObject || typeof listObject.abortListObjectSearch !== "function") {
            return;
        }

        await listObject.abortListObjectSearch(LIST_PATH);
    }, [getListObject]);

    const readInitial = useCallback(async () => {
        const layout = await readLayout();
        const listObject = layout?.qListObject;
        const matrix = listObject?.qDataPages?.[0]?.qMatrix ?? [];
        const options = mapListObjectOptions(matrix, 0);

        return {
            layout,
            options,
            totalSize: listObject?.qSize?.qcy ?? options.length,
        };
    }, [readLayout]);

    return useMemo(
        () => ({
            abortSearch,
            appError: appError ? normalizeError(appError, "Unable to open Qlik app.") : null,
            appLoading,
            cacheKey,
            readInitial,
            readPage,
            search,
        }),
        [abortSearch, appError, appLoading, cacheKey, readInitial, readPage, search],
    );
}