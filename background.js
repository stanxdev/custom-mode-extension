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

    if (changes.ts || changes.requests || changes.injects)
    {
        await updateAction({ badgeOnError: !!changes.ts });

        // Message for popup, ignore if there are no popup
        chrome.runtime.sendMessage('updated').catch(() => false);
    }
});

/**
 * Re-register all dynamic rules in `declarativeNetRequest`
 * Intentionally separate add and remove operations to allow rules debugging
 */
async function updateRequests()
{
    let { requests: { rules, disabled, enabled }, errors } = await getState();

    errors.requests = {};    // Reset errors

    console.log('--- Registering Request Rules...');
    try
    {
        // Clear all rules
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: (await chrome.declarativeNetRequest.getDynamicRules()).map(rule => rule.id)
        });

        // Register one by one
        for (let i = 0; i < rules.length; i++)
        {
            let {
                _id: apiId, id: ourId,
                name, descript, file,
                ... /*chrome.declarativeNetRequest.Rule*/ rule
            } = rules[i];

            if (!enabled || disabled.some(id => id === ourId))
                continue;

            try
            {
                rule.id = apiId;
                await chrome.declarativeNetRequest.updateDynamicRules({ addRules: [rule] });
            }
            catch (e)
            {
                errors.requests[i] = e.message.replace(/.*Error at index 0: /, '');
                console.warn('request_rules:', `id: ${ourId}`, `error: ${errors.requests[i]}`, rule);
            }
        }

        let registered = await chrome.declarativeNetRequest.getDynamicRules();
        console.log(
            `--- Registered Request Rules: ${registered.length} of ${rules.length} ${enabled ? '' : '[disabled] '}---`
        );
        if (registered.length)
            console.table(registered);
    }
    catch (e)
    {
        errors.requests.common = e.message;
        console.warn('request_rules:', e.message);
    }

    await setState({ errors });
}

/**
 * Re-register all content_scripts
 * Intentionally separate add and remove operations to allow rules debugging
 */
async function updateInjects()
{
    let { injects: { rules, disabled, enabled }, errors } = await getState();

    errors.injects = {};    // Reset errors

    console.log('--- Registering Content Scripts...');
    try
    {
        // Clear all rules
        await chrome.scripting.unregisterContentScripts();

        // Register one by one
        for (let i = 0; i < rules.length; i++)
        {
            let {
                name, descript, file,
                ... /*chrome.scripting.RegisteredContentScript*/ rule
            } = rules[i];

            if (!enabled || disabled.some(id => id === rule.id))
                continue;

            try
            {
                await chrome.scripting.registerContentScripts([rule]);
            }
            catch (e)
            {
                errors.injects[i] = e.message.replace(/.*Error at index 0: /, '');
                console.warn('content_scripts:', `id: ${rule.id}`, `error: ${errors.injects[i]}`, rule);
            }
        }

        let registered = await chrome.scripting.getRegisteredContentScripts();
        console.log(
            `--- Registered Content Scripts: ${registered.length} of ${rules.length} ${enabled ? '' : '[disabled] '}---`
        );
        if (registered.length)
            console.table(registered);
    }
    catch (e)
    {
        errors.injects.common = e.message;
        console.warn('content_scripts:', e.message);
    }

    await setState({ errors });
}
