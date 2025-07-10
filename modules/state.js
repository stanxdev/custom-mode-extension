const storage = chrome.storage.local;

const storageTpl = {
    requests: { rules: [], disabled: [], enabled: true },
    injects: { rules: [], disabled: [], enabled: true },
    theme: { icon: { disabled: "#6C707E", enabled: "#548AF7", accent: "#55ff7f", error: "#ffa040" } },
    errors: { manifest: {}, requests: {}, injects: {} },
    ts: 0
};

async function getState()
{
    let stored = normalize(await storage.get(storageTpl));

    return {
        requests: {
            ...stored.requests,
            registered: await chrome.declarativeNetRequest.getDynamicRules()
        },
        injects: {
            ...stored.injects,
            registered: await chrome.scripting.getRegisteredContentScripts()
        },
        errors: stored.errors,
        theme: stored.theme
    };
}

async function setState(state = {})
{
    for (let [key, value] of Object.entries(state))
    {
        normalize(value, structuredClone(storageTpl[key]));

        // Filter `disabled` to include ids only from `rules`
        if (['requests', 'injects'].includes(key))
        {
            value.disabled = value.disabled.filter(id =>
                value.rules.some(rule => rule.id === id));
        }
    }

    storage.set(
        purify(state)
    );
}

/**
 * Align data with template
 */
function normalize(data = {}, tpl = structuredClone(storageTpl))
{
    if (typeof data !== "object")
        return data;

    for (const [key, value] of Object.entries(tpl))
    {
        // Different types... Assign default
        if (typeof value !== typeof data[key] ||
            (Array.isArray(value) && !Array.isArray(data[key])) ||
            (!Array.isArray(value) && Array.isArray(data[key])))
        {
            data[key] = typeof value === 'boolean' ? Boolean(data[key]) : value;
            continue;
        }

        if (typeof value === 'object' &&
            !Array.isArray(value) &&
            Object.keys(value).length)
        {
            normalize(data[key], value);
        }
    }

    return purify(data, tpl);
}

/**
 * Delete useless (leftover) keys
 */
function purify(data = {}, tpl = storageTpl)
{
    if (typeof data === 'object' && !Array.isArray(data))
    {
        Object.keys(data).filter(key => !Object.hasOwn(tpl, key)).forEach(key =>
            delete data[key]
        );
    }

    return data;
}

export { getState, setState };
