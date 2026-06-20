import { useCallback, useEffect, useState } from "react";

import { getCachedValue, getOrCreateInflightRequest, hasCachedValue, setCachedValue } from "../cache/qlikCache";
import { useQlikApp } from "./useQlikApp";

const HYPERCUBE_PATH = "/qHyperCubeDef";
const MAX_HYPERCUBE_CELLS = 10000;

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

function getObjectCacheKey(appId, objectId) {
    return `object:${appId}:${objectId}`;
}

function getObjectModel(qlikObject) {
    return qlikObject?.model ?? qlikObject;
}

function getRawObjectData(layout) {
    if (layout?.qHyperCube) {
        return layout.qHyperCube;
    }

    if (layout?.qListObject) {
        return layout.qListObject;
    }

    if (layout?.qPivotCube) {
        return layout.qPivotCube;
    }

    return layout ?? null;
}

function createHypercubePage(qSize) {
    const qWidth = Math.max(1, qSize?.qcx ?? 1);
    const maxPageHeight = Math.max(1, Math.floor(MAX_HYPERCUBE_CELLS / qWidth));

    return {
        qTop: 0,
        qLeft: 0,
        qWidth,
        qHeight: Math.max(1, Math.min(qSize?.qcy ?? 1, maxPageHeight)),
    };
}

async function hydrateHypercubeData(objectModel, layout) {
    const hypercube = layout?.qHyperCube;

    if (!hypercube) {
        return layout;
    }

    const page = createHypercubePage(hypercube.qSize);

    if (hypercube.qMode === "P" && typeof objectModel?.getHyperCubePivotData === "function") {
        const qPivotDataPages = await objectModel.getHyperCubePivotData(HYPERCUBE_PATH, [page]);

        return {
            ...layout,
            qHyperCube: {
                ...hypercube,
                qPivotDataPages,
            },
        };
    }

    if (typeof objectModel?.getHyperCubeData === "function") {
        const qDataPages = await objectModel.getHyperCubeData(HYPERCUBE_PATH, [page]);

        return {
            ...layout,
            qHyperCube: {
                ...hypercube,
                qDataPages,
            },
        };
    }

    return layout;
}

export function useQlikObject(appId, objectId) {
    const { app, error: appError, loading: appLoading } = useQlikApp(appId);
    const [state, setState] = useState(() => ({
        cacheKey: appId && objectId ? getObjectCacheKey(appId, objectId) : null,
        object: null,
        layout: null,
        data: null,
        error: null,
    }));
    const cacheKey = appId && objectId ? getObjectCacheKey(appId, objectId) : null;
    const cachedObject = cacheKey && hasCachedValue(cacheKey) ? getCachedValue(cacheKey) : null;
    const object = cachedObject ?? (state.cacheKey === cacheKey ? state.object : null);
    const layout = state.cacheKey === cacheKey ? state.layout : null;
    const data = state.cacheKey === cacheKey ? state.data : null;
    const error = appError ?? (state.cacheKey === cacheKey ? state.error : null);
    const loading = Boolean(appId && objectId) && !appError && (appLoading || (object == null && error == null));

    const loadObject = useCallback(async () => {
        const qlikObject = hasCachedValue(cacheKey)
            ? getCachedValue(cacheKey)
            : await getOrCreateInflightRequest(cacheKey, async () => {
                  const objectModel = await app.getObject(objectId);
                  return setCachedValue(cacheKey, objectModel);
              });

        const objectModel = getObjectModel(qlikObject);
        const rawLayout = typeof objectModel?.getLayout === "function" ? await objectModel.getLayout() : null;
        const layout = await hydrateHypercubeData(objectModel, rawLayout);

        return {
            object: qlikObject,
            objectModel,
            layout,
            data: getRawObjectData(layout),
        };
    }, [app, cacheKey, objectId]);

    useEffect(() => {
        let isActive = true;
        let objectModel = null;

        if (!appId || !objectId || appError || appLoading || !app) {
            return () => {
                isActive = false;
            };
        }

        const runLoadObject = async () => {
            try {
                const result = await loadObject();

                if (isActive) {
                    objectModel = result.objectModel;
                    setState({ cacheKey, object: result.object, layout: result.layout, data: result.data, error: null });
                }
            } catch (error) {
                if (isActive) {
                    setState({
                        cacheKey,
                        object: null,
                        layout: null,
                        data: null,
                        error: normalizeError(error, `Unable to load Qlik object ${objectId}.`),
                    });
                }
            }
        };

        const handleChange = () => {
            runLoadObject();
        };

        const attachObject = async () => {
            await runLoadObject();

            if (!isActive || typeof objectModel?.on !== "function") {
                return;
            }

            objectModel.on("changed", handleChange);
        };

        attachObject();

        return () => {
            isActive = false;

            if (typeof objectModel?.removeListener === "function") {
                objectModel.removeListener("changed", handleChange);
            }
        };
    }, [app, appError, appId, appLoading, cacheKey, loadObject, objectId]);

    return { object, layout, data, error, loading };
}
