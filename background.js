import { updateAction } from './modules/action.js';
import { reload } from './modules/manifest.js';
import { getState, setState } from './modules/state.js';

updateAction();

chrome.runtime.onInstalled.addListener(() =>
    reload()
);

chrome.runtime.onStartup.addListener(() =>
    // Watchdog to wake up and call `updateAction`
    // If you call function here, it will not be called when extension will be enabled
    // Another method is to add `management` permission and listen to events there...
    true
);

chrome.storage.onChanged.addListener(async (changes, _area) =>
{
    if (changes.ts || changes.requests)
        await updateRequests();

    if (changes.ts || changes.injects)
        await updateInjects();

    updateAction(!!changes.ts);
});

/**
 * Re-register all dynamic rules in `declarativeNetRequest`
 * Intentionally separate add and remove operations to allow rules debugging
 */
async function updateRequests()
{
    let { requests: { rules, disabled, enabled }, errors } = await getState();

    errors.requests = {};

    console.log('Registering Request Rules...');
    try
    {
        // Clear all rules
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: (await chrome.declarativeNetRequest.getDynamicRules()).map(rule => rule.id)
        });

        // Register one by one
        for (let i = 0; i < rules.length; i++)
        {
            if (!enabled || disabled.some(id => id === rule.id))
                continue;

            try
            {
                await chrome.declarativeNetRequest.updateDynamicRules({ addRules: [rules[i]] });
            }
            catch (e)
            {
                errors.requests[i] = e.message.replace(/.*Error at index 0: /, '');
                console.warn('request_rules:', errors.requests[i], rules[i]);
            }
        }
    }
    catch (e)
    {
        errors.requests.common = e.message;
        console.warn('request_rules:', e.message);
    }

    let registered = await chrome.declarativeNetRequest.getDynamicRules();
    console.log(
        `--- Registered Request Rules: ${registered.length} of ${rules.length} ${enabled ? '' : '[disabled] '}---`
    );
    if (registered.length)
        console.table(registered);

    await setState({ errors });
}

/**
 * Re-register all content_scripts
 * Intentionally separate add and remove operations to allow rules debugging
 */
async function updateInjects()
{
    let { injects: { rules, disabled, enabled }, errors } = await getState();

    errors.injects = {};

    console.log('Registering Content Scripts...');
    try
    {
        // Clear all rules
        await chrome.scripting.unregisterContentScripts();

        // Register one by one
        for (let i = 0; i < rules.length; i++)
        {
            if (!enabled || disabled.some(id => id === rule.id))
                continue;

            try
            {
                await chrome.scripting.registerContentScripts([rules[i]]);
            }
            catch (e)
            {
                errors.injects[i] = e.message.replace(/.*Error at index 0: /, '');
                console.warn('content_scripts:', errors.injects[i], rules[i]);
            }
        }
    }
    catch (e)
    {
        errors.injects.common = e.message;
        console.warn('content_scripts:', e.message);
    }

    let registered = await chrome.scripting.getRegisteredContentScripts();
    console.log(
        `--- Registered Content Scripts: ${registered.length} of ${rules.length} ${enabled ? '' : '[disabled] '}---`
    );
    if (registered.length)
        console.table(registered);

    await setState({ errors });
}
