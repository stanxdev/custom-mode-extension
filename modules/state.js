const storage = chrome.storage.local;

const storageTpl = {
    requests: { rules: [], disabled: [], enabled: true },
    injects: { rules: [], disabled: [], enabled: true },
    errors: { manifest: {}, requests: {}, injects: {} },
    icon: {
        default: { bottom: "#548af7", top: "#6c707e", accent: "transparent" },
        disabled: { bottom: "#6c707e", top: "#6c707e", accent: "transparent" },
        disabled_request_rules: { bottom: "#548af7", top: "#6c707e", accent: "#6c707e" },
        disabled_content_scripts: { bottom: "#548af7", top: "#6c707e", accent: "#6c707e" },
        error: { bottom: "#ffa040", top: "#6c707e", accent: "transparent" },
        error_request_rules: { bottom: "#548af7", top: "#6c707e", accent: "#ffa040" },
        error_content_scripts: { bottom: "#548af7", top: "#6c707e", accent: "#ffa040" }
    },
    popup: { expanded: { requests: false, injects: false } },
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
        icon: stored.icon,
        popup: stored.popup,
        ts: stored.ts
    };
}

async function setState(state = {})
{

    for (let [key, value] of Object.entries(state))
    {

        state[key] = normalize(value, structuredClone(storageTpl[key] || {}));

        // Filter `disabled` to include ids only from `rules`
        if (['requests', 'injects'].includes(key))
        {
            value.disabled = value.disabled.filter(id =>
                value.rules.some(rule => rule.id === id));
        }
    }

    await storage.set(
        purify(state)
    );
}

/**
 * Align data with template
 */
function normalize(data = {}, tpl = structuredClone(storageTpl))
{
    if (!(data instanceof Object))
        return data;

    for (let [key, value] of Object.entries(tpl))
    {
        // Different types... Assign default
        if (typeof value !== typeof data[key] ||
            (Array.isArray(value) && !Array.isArray(data[key])) ||
            (!Array.isArray(value) && Array.isArray(data[key])))
        {
            data[key] = typeof value === 'boolean' ? Boolean(data[key]) : value;
            continue;
        }

        if (value instanceof Object &&
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
    if (data instanceof Object && !Array.isArray(data))
    {
        Object.keys(data)
            .filter(key => !Object.hasOwn(tpl, key))
            .forEach(key => delete data[key]);
    }

    return data;
}

export { getState, setState };
