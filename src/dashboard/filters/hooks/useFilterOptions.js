import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";

import { DEFAULT_BATCH_SIZE, useQlikListObject } from "../../../shared/qlik/hooks/useQlikListObject";
import { getVisibleFilterOptions } from "./filterConfig";
import { getFilterFieldKey, selectFilterField, useFilterStore } from "../stores/filterStore";

function normalizeError(error, fallbackMessage) {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === "string") {
        return error;
    }

    if (error && typeof error.message === "string") {
        return error.message;
    }

    return fallbackMessage;
}

function indexOptions(options) {
    return Object.fromEntries(options.map((option) => [option.value, option]));
}

export function useFilterOptions({
    dashboardId,
    scopeId,
    appId,
    allowedOptions = null,
    fieldName,
    batchSize = DEFAULT_BATCH_SIZE,
    preserveOrder = false,
    refreshKey = 0,
}) {
    const fieldKey = getFilterFieldKey({ dashboardId, scopeId, appId, fieldName });
    const field = useFilterStore(selectFilterField(fieldKey));
    const ensureField = useFilterStore((state) => state.ensureField);
    const setLoading = useFilterStore((state) => state.setLoading);
    const setPageLoading = useFilterStore((state) => state.setPageLoading);
    const mergePage = useFilterStore((state) => state.mergePage);
    const setError = useFilterStore((state) => state.setError);
    const lastSearchRef = useRef(field.search);
    const optionsLengthRef = useRef(field.options.length);
    const preserveOrderRef = useRef(preserveOrder);
    const loadedTopsRef = useRef(field.loadedTops);
    const searchRevisionRef = useRef(field.searchRevision);

    const refreshLoadedPagesRef = useRef(null);

    const visibleField = useMemo(
        () =>
            getVisibleFilterOptions({
                allowedOptions,
                options: field.options,
                selectedValues: field.selected,
                totalSize: field.totalSize,
            }),
        [allowedOptions, field.options, field.selected, field.totalSize],
    );
    const visibleOptionsByValue = useMemo(() => indexOptions(visibleField.options), [visibleField.options]);

    const handleChanged = useCallback(() => {
        refreshLoadedPagesRef.current?.();
    }, []);

    const listObject = useQlikListObject({ appId, fieldName, batchSize, onChanged: handleChanged });

    useLayoutEffect(() => {
        preserveOrderRef.current = preserveOrder;
    }, [preserveOrder]);

    useEffect(() => {
        loadedTopsRef.current = field.loadedTops;
    }, [field.loadedTops]);

    useEffect(() => {
        optionsLengthRef.current = field.options.length;
    }, [field.options.length]);

    useEffect(() => {
        searchRevisionRef.current = field.searchRevision;
    }, [field.searchRevision]);

    useEffect(() => {
        ensureField(fieldKey);
    }, [ensureField, fieldKey]);

    const loadInitial = useCallback(async ({ preserveOrder: shouldPreserveOrder = preserveOrderRef.current } = {}) => {
        if (!appId || !fieldName || listObject.appError) {
            return;
        }

        const hasCachedValues = optionsLengthRef.current > 0 || loadedTopsRef.current.length > 0;
        setLoading(fieldKey, !hasCachedValues);

        try {
            const result = await listObject.readInitial();
            mergePage(fieldKey, result.options, {
                preserveOrder: shouldPreserveOrder,
                top: 0,
                totalSize: result.totalSize,
            });
        } catch (error) {
            setError(fieldKey, normalizeError(error, `Unable to load ${fieldName}.`));
        }
    }, [appId, fieldKey, fieldName, listObject, mergePage, setError, setLoading]);

    useEffect(() => {
        loadInitial({ preserveOrder: false });
    }, [loadInitial, refreshKey]);

    useEffect(() => {
        let refreshRevision = 0;

        refreshLoadedPagesRef.current = async () => {
            if (!appId || !fieldName || listObject.appError) {
                return;
            }

            const currentRefreshRevision = refreshRevision + 1;
            refreshRevision = currentRefreshRevision;

            try {
                const loadedTops = loadedTopsRef.current.length > 0 ? loadedTopsRef.current : [0];
                const uniqueLoadedTops = [...new Set(loadedTops)].sort((left, right) => left - right);

                await Promise.all(
                    uniqueLoadedTops.map(async (top) => {
                        const options =
                            top === 0
                                ? (await listObject.readInitial()).options
                                : await listObject.readPage({
                                      top,
                                      height: batchSize,
                                      searchRevision: searchRevisionRef.current,
                                  });

                        if (refreshRevision === currentRefreshRevision) {
                            mergePage(fieldKey, options, {
                                preserveOrder: preserveOrderRef.current,
                                top,
                            });
                        }
                    }),
                );
            } catch (error) {
                if (refreshRevision === currentRefreshRevision) {
                    setError(fieldKey, normalizeError(error, `Unable to refresh ${fieldName} states.`));
                }
            }
        };

        return () => {
            refreshRevision += 1;
            refreshLoadedPagesRef.current = null;
        };
    }, [appId, batchSize, fieldKey, fieldName, listObject, mergePage, setError]);

    useEffect(() => {
        if (!listObject.appError) {
            return;
        }

        setError(fieldKey, normalizeError(listObject.appError, `Unable to open Qlik app for ${fieldName}.`));
    }, [fieldKey, fieldName, listObject.appError, setError]);

    useEffect(() => {
        let isActive = true;

        if (field.search === lastSearchRef.current) {
            return () => {
                isActive = false;
            };
        }

        lastSearchRef.current = field.search;
        setLoading(fieldKey, true);

        const applySearch = async () => {
            try {
                await listObject.abortSearch();

                if (field.search.trim().length > 0) {
                    await listObject.search(field.search.trim());
                }

                if (isActive) {
                    const result = await listObject.readInitial();
                    mergePage(fieldKey, result.options, {
                        preserveOrder: false,
                        top: 0,
                        totalSize: result.totalSize,
                    });
                }
            } catch (error) {
                if (isActive) {
                    setError(fieldKey, normalizeError(error, `Unable to search ${fieldName}.`));
                }
            }
        };

        applySearch();

        return () => {
            isActive = false;
        };
    }, [field.search, fieldKey, fieldName, listObject, mergePage, setError, setLoading]);

    const loadMore = useCallback(
        async () => {
            const lastLoadedTop = field.loadedTops.length > 0 ? Math.max(...field.loadedTops) : -batchSize;
            const top = lastLoadedTop + batchSize;

            if (top >= field.totalSize || field.loadedTops.includes(top) || field.loadingPages[top]) {
                return;
            }

            setPageLoading(fieldKey, top, true);

            try {
                const options = await listObject.readPage({
                    top,
                    height: batchSize,
                    searchRevision: field.searchRevision,
                });
                mergePage(fieldKey, options, {
                    preserveOrder: preserveOrderRef.current,
                    top,
                });
            } catch (error) {
                setError(fieldKey, normalizeError(error, `Unable to load more ${fieldName} values.`));
            } finally {
                setPageLoading(fieldKey, top, false);
            }
        },
        [batchSize, field.loadedTops, field.loadingPages, field.searchRevision, field.totalSize, fieldKey, fieldName, listObject, mergePage, setError, setPageLoading],
    );

    return {
        ...field,
        appLoading: listObject.appLoading,
        fieldKey,
        loadMore,
        options: visibleField.options,
        optionsByValue: visibleOptionsByValue,
        totalSize: visibleField.totalSize,
    };
}