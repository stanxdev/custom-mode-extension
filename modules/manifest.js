import { getState, setState } from './state.js';

const path = 'custom/manifest.inc.json';
const manifestTpl = {
    //theme: {},    # Available only in main manifest file
    includes: [],
    env: {},
    request_rules: [],
    content_scripts: []
};

async function reload()
{
    let data = await getState();

    data.errors = { manifest: {} };  // Reset errors
    data.ts = new Date().toISOString();

    ({
        request_rules: data.requests.rules,
        content_scripts: data.injects.rules,
        theme: data.theme
    } = await parse(path, data.errors.manifest));

    await setState(data);

    console.log('--- Manifest Request Rules    ---', data.requests.rules, { disabled: data.requests.disabled });
    console.log('--- Manifest Content Scripts  ---', data.injects.rules, { disabled: data.injects.disabled });
}

async function parse(file, errors = {})
{
    if (!file.startsWith('custom/'))
        file = 'custom/' + file;

    let json = { ...manifestTpl };

    try
    {
        Object.assign(json,
            await (await fetch(file)).json()
        );

        for (let include of json.includes)
        {
            let includeJson = await parse(include, errors);

            json.env = Object.assign({}, includeJson.env, json.env);    // Higher level priority
            json.request_rules.push(...includeJson.request_rules);
            json.content_scripts.push(...includeJson.content_scripts);
        }

        json.request_rules = handleEnv(json.request_rules, json.env);
        json.content_scripts = normalizeInjects(json.content_scripts);

        console.log(file, json);
    }
    catch (e)
    {
        errors[Object.keys(errors).length] = `${file}: ${e.message}`;
        console.warn(file, e.message);
    }

    return json;
}

/**
 * Replace ${env.VARIABLE} to real values in `request_rules`
 */
function handleEnv(data, env = {})
{
    if (Array.isArray(data))
        return data.map(x => handleEnv(x, env));

    if (typeof data === 'object')
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
