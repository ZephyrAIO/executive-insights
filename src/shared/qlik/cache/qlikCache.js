const valueCache = new Map();
const inflightRequestCache = new Map();

export function hasCachedValue(key) {
    return valueCache.has(key) ?? false;
}

export function getCachedValue(key) {
    return valueCache.get(key) ?? null;
}

export function setCachedValue(key, value) {
    valueCache.set(key, value);
    return value;
}

export function clearCachedValue(key) {
    valueCache.delete(key);
}

export function getInflightRequest(key) {
    return inflightRequestCache.get(key) ?? null;
}

export function setInflightRequest(key, request) {
    inflightRequestCache.set(key, request);
    return request;
}

export function clearInflightRequest(key) {
    inflightRequestCache.delete(key);
}

export async function getOrCreateInflightRequest(key, createRequest) {
    const existingRequest = getInflightRequest(key);

    if (existingRequest) {
        return existingRequest;
    }

    const request = (async () => createRequest())();
    setInflightRequest(key, request);

    try {
        return await request;
    } finally {
        if (getInflightRequest(key) === request) {
            clearInflightRequest(key);
        }
    }
}

export function clearQlikCache() {
    valueCache.clear();
    inflightRequestCache.clear();
}
