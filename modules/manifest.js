import { getState, setState } from './state.js';

const manifest = 'custom/manifest.inc.json';
const manifestTpl = {
    includes: [],
    env: {},
    request_rules: [],
    content_scripts: []
    // icon: {} # Available only in main manifest file
};

async function reload()
{
    console.log('--- Reloading Manifest...');

    let data = await getState();

    data.errors = { manifest: {} };  // Reset errors
    data.ts = Date.now();

    ({
        request_rules: data.requests.rules,
        content_scripts: data.injects.rules,
        icon: data.icon
    } = await parse(manifest, data.errors.manifest));

    // Assign unique id
    let uniqueId = 101;
    data.requests.rules.forEach(rule =>
        rule._id = typeof rule.id === 'number' ? rule.id : uniqueId++
    );

    console.log('--- Manifest Request Rules    ---', data.requests.rules, '--- [disabled] ---', data.requests.disabled);
    console.log('--- Manifest Content Scripts  ---', data.injects.rules, '--- [disabled] ---', data.injects.disabled);

    await setState(data);
}

async function parse(file, errors = {})
{
    if (!file.startsWith('custom/'))
        file = 'custom/' + file;

    let json = structuredClone(manifestTpl);

    try
    {
        Object.assign(json,
            await (await fetch(file)).json()
        );

        // Store file for each rule
        json.request_rules.forEach(rule => rule.file = file);
        json.content_scripts.forEach(rule => rule.file = file);

        // Process includes recursively
        for (let include of json.includes)
        {
            let includeJson = await parse(include, errors);

            json.env = Object.assign({}, includeJson.env, json.env);    // Higher level priority
            json.request_rules.push(...includeJson.request_rules);
            json.content_scripts.push(...includeJson.content_scripts);
        }

        handleEnv([json.request_rules, json.content_scripts], json.env);
        normalizeInjects(json.content_scripts);

        console.log(file, json);
    }
    catch (e)
    {
        errors[file] = e.message;
        console.warn(file, e.message);
    }

    return json;
}

/**
 * Replace ${env.VARIABLE} to real values from `env`
 */
function handleEnv(data, env = {})
{
    if (Array.isArray(data))
        return data.map(x => handleEnv(x, env));

    if (data instanceof Object)
        Object.keys(data).forEach(key =>
            data[key] = handleEnv(data[key], env));

    if (typeof data === 'string')
        Object.keys(env).forEach(key =>
            data = data.replaceAll(`\${env.${key}}`, env[key]));

    return data;
}

/**
 * Prepend paths with 'custom/'
 * Replace keys: snake_case => camelCase
 */
function normalizeInjects(rules = [])
{
    rules.forEach(rule =>
        Object.entries(rule).forEach(([key, value]) =>
        {
            // Prepend paths with 'custom/'
            if (['css', 'js'].includes(key))
            {
                rule[key] = value.map(file =>
                    file.replace(/^(custom\/)?/, 'custom/')
                );
            }

            // Replace keys: snake_case => camelCase
            if (key.match(/_\w/))
            {
                delete rule[key];
                rule[key.replace(/_(\w)/g, (_, g1) => g1.toUpperCase())] = value;
            }
        })
    );

    return rules;
}

export { reload };
