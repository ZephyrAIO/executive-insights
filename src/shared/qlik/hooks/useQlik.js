import { useEffect, useState } from "react";

import { getCachedValue, getOrCreateInflightRequest, hasCachedValue, setCachedValue } from "../cache/qlikCache";

const QLIK_CACHE_KEY = "qlik";
const QLIK_LOADER_KEY = "qlik:loader";
const QLIK_REQUIRE_SCRIPT_ID = "qlik-requirejs";
const QLIK_PROXY_PREFIX = "/qlik";
const QLIK_DIRECT_RESOURCES_URL = "http://localhost:4848/resources";
const qlikErrorListeners = new Set();

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

function ensureTrailingSlash(value) {
    return value.endsWith("/") ? value : `${value}/`;
}

function getWindowRequire() {
    if (typeof window === "undefined") {
        return null;
    }

    if (typeof window.requirejs === "function") {
        return window.requirejs;
    }

    if (typeof window.require === "function") {
        return window.require;
    }

    return null;
}

function getQlikResourcesUrl() {
    if (typeof window !== "undefined" && window.location.protocol === "https:") {
        return `${window.location.origin}${QLIK_PROXY_PREFIX}/resources`;
    }

    return QLIK_DIRECT_RESOURCES_URL;
}

function getQlikLoaderUrl() {
    return `${getQlikResourcesUrl()}/assets/external/requirejs/require.js`;
}

function getPrefixFromResourcesPath(pathname) {
    const basePath = pathname.endsWith("/resources") ? pathname.slice(0, -"/resources".length) : pathname;

    if (!basePath) {
        return "/";
    }

    const normalizedPath = basePath.endsWith("/") ? basePath : `${basePath}/`;
    return normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;
}

export function getQlikConnectionConfig() {
    const resourcesUrl = new URL(getQlikResourcesUrl());

    return {
        host: resourcesUrl.hostname,
        port: resourcesUrl.port ? Number(resourcesUrl.port) : resourcesUrl.protocol === "https:" ? 443 : 80,
        prefix: getPrefixFromResourcesPath(resourcesUrl.pathname),
        isSecure: resourcesUrl.protocol === "https:",
    };
}

function configureRequire(requireFn) {
    if (typeof requireFn?.config === "function") {
        requireFn.config({ baseUrl: ensureTrailingSlash(getQlikResourcesUrl()) });
    }
}

function subscribeToQlikErrors(listener) {
    qlikErrorListeners.add(listener);

    return () => {
        qlikErrorListeners.delete(listener);
    };
}

function emitQlikError(error) {
    const normalizedError = normalizeError(error, "Qlik reported an error.");
    qlikErrorListeners.forEach((listener) => listener(normalizedError));
}

async function loadRequireScript() {
    const existingRequire = getWindowRequire();

    if (existingRequire) {
        configureRequire(existingRequire);
        return existingRequire;
    }

    return getOrCreateInflightRequest(
        QLIK_LOADER_KEY,
        () =>
            new Promise((resolve, reject) => {
                if (typeof document === "undefined") {
                    reject(new Error("Qlik can only be loaded in a browser environment."));
                    return;
                }

                const resolveRequire = () => {
                    const loadedRequire = getWindowRequire();

                    if (!loadedRequire) {
                        reject(new Error("Qlik loader script did not expose require.js."));
                        return;
                    }

                    configureRequire(loadedRequire);
                    resolve(loadedRequire);
                };

                const rejectRequire = () => {
                    reject(new Error(`Unable to load Qlik from ${getQlikLoaderUrl()}.`));
                };

                let script = document.getElementById(QLIK_REQUIRE_SCRIPT_ID);

                if (script?.dataset.loaded === "true") {
                    resolveRequire();
                    return;
                }

                if (!script) {
                    script = document.createElement("script");
                    script.id = QLIK_REQUIRE_SCRIPT_ID;
                    script.src = getQlikLoaderUrl();
                    script.async = true;
                    document.head.appendChild(script);
                }

                script.addEventListener(
                    "load",
                    () => {
                        script.dataset.loaded = "true";
                        resolveRequire();
                    },
                    { once: true },
                );
                script.addEventListener("error", rejectRequire, { once: true });
            }),
    );
}

async function loadQlikNamespace() {
    if (hasCachedValue(QLIK_CACHE_KEY)) {
        return getCachedValue(QLIK_CACHE_KEY);
    }

    return getOrCreateInflightRequest(QLIK_CACHE_KEY, async () => {
        const requireFn = await loadRequireScript();

        const qlik = await new Promise((resolve, reject) => {
            requireFn(["js/qlik"], resolve, (error) =>
                reject(normalizeError(error, "Unable to resolve the Qlik namespace.")),
            );
        });

        if (typeof qlik?.setOnError === "function") {
            qlik.setOnError(emitQlikError);
        }

        return setCachedValue(QLIK_CACHE_KEY, qlik);
    });
}

export function useQlik() {
    const [state, setState] = useState(() => ({
        qlik: hasCachedValue(QLIK_CACHE_KEY) ? getCachedValue(QLIK_CACHE_KEY) : null,
        error: null,
    }));
    const cachedQlik = hasCachedValue(QLIK_CACHE_KEY) ? getCachedValue(QLIK_CACHE_KEY) : null;
    const qlik = cachedQlik ?? state.qlik;
    const error = state.error;
    const loading = qlik == null && error == null;

    useEffect(() => {
        let isActive = true;

        const unsubscribe = subscribeToQlikErrors((error) => {
            if (isActive) {
                setState((currentState) => ({
                    ...currentState,
                    error,
                    loading: false,
                }));
            }
        });

        if (hasCachedValue(QLIK_CACHE_KEY)) {
            return () => {
                isActive = false;
                unsubscribe();
            };
        }

        const loadQlik = async () => {
            try {
                const qlik = await loadQlikNamespace();

                if (isActive) {
                    setState({ qlik, error: null });
                }
            } catch (error) {
                if (isActive) {
                    setState({ qlik: null, error: normalizeError(error, "Unable to load Qlik.") });
                }
            }
        };

        loadQlik();

        return () => {
            isActive = false;
            unsubscribe();
        };
    }, []);

    return { qlik, error, loading };
}
