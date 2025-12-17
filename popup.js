import { reload } from './modules/manifest.js';
import { getState, setState } from './modules/state.js';

/** Initialized in `render` */
let state = null;

init();


function init()
{
    render();

    // Message `updated` is sent from background.js after registering requests and injects
    chrome.runtime.onMessage.addListener(message =>
        message === 'updated' &&
        render() &&
        chrome.tabs.reload()
    );

    // Reload manifest
    document.querySelector('#reload')
        .addEventListener('click', () => reload());


    document.querySelectorAll('details').forEach(details =>
    {
        const key = details.id;

        // Store expanded/collapsed state of block
        details.addEventListener('toggle', (event) =>
        {
            state.popup.expanded[key] = event.newState === 'open';
            setState({ popup: state.popup });
        });

        // Store enabled/disabled state of block
        details.querySelector('.block-enabled')
            .addEventListener('change', (event) =>
            {
                state[key].enabled = event.currentTarget.checked;
                setState({ [key]: state[key] });
            });
    });
}

async function render()
{
    state = await getState();

    // Timestamp
    document.querySelector('#ts').innerHTML = new Date(state.ts).toLocaleString('sv-SE');

    // Manifest errors
    renderError(document.querySelector('#errors-list'),
        Object.entries(state.errors.manifest)
            .reduce((html, [file, error]) =>
                html + `<li><code>${file}</code><br>${error}</li>`, '')
    );

    // Blocks
    ['requests', 'injects'].forEach(key =>
    {
        let block = document.querySelector(`#${key}`);

        // Expanded/collapsed
        block.open = state.popup.expanded[key];

        // Has rule errors
        block.classList.toggle('has-rule-errors', !!Object.keys(state.errors[key]).length);

        // Enabled/disabled
        block.querySelector('.block-enabled').checked = state[key].enabled;

        // Info
        block.querySelector('.block-info').innerHTML =
            !state[key].enabled || state[key].registered.length === state[key].rules.length
                ? `[ ${state[key].rules.length} ]`
                : `[ ${state[key].registered.length} of ${state[key].rules.length} ]`;

        // Error
        renderError(block.querySelector('.block-error'),
            state.errors[key].common
        );

        // Rules
        let template = document.querySelector("#rule-template"),
            fragments = [];

        state[key].rules.forEach((rule, index) =>
        {
            let li = document.importNode(template.content, true);
            fragments.push(li);

            // Type
            renderRuleType(li.querySelector('.rule-type'), key, rule);

            // Id
            let idEl = li.querySelector('.rule-id');
            idEl.innerHTML = rule.id;
            idEl.title = JSON.stringify(rule, null, 4);

            // Enabled
            let checkbox = li.querySelector('.rule-enabled');
            checkbox.checked = !state[key].disabled.some(id => id === rule.id);
            checkbox.addEventListener('change', (event) =>
            {

                if (event.currentTarget.checked)
                    state[key].disabled = state[key].disabled.filter(id => id !== rule.id);
                else
                    state[key].disabled.push(rule.id);

                setState({ [key]: state[key] });
            });

            // Error
            renderError(li.querySelector('.rule-error'),
                state.errors[key][index]
            );
        });

        block.querySelector('ul').replaceChildren(...fragments);
    });
}

/**
 * @param {HTMLElement} el
 * @param {string}      error
 */
function renderError(el, error = '')
{
    el.classList.toggle('hidden', !error.length);
    el.innerHTML = error;
}

/**
 * @param {HTMLElement} el
 * @param {string}      key
 * @param {Object}      rule
 */
function renderRuleType(el, key, rule)
{
    let symbol = (type) => ({
        unknown: '??',
        redirect: '=>',
        modifyHeaders: '##',
        'JS & CSS': '#}',
        JS: '##',
        CSS: '{}'
    }[type || 'unknown']);

    let type;

    if (key === 'requests')
    {
        type = rule.action?.type;
    }
    if (key === 'injects')
    {
        if (rule.css?.length && rule.js?.length)
            type = 'JS & CSS';
        else if (rule.js?.length)
            type = 'JS';
        else if (rule.css?.length)
            type = 'CSS';
    }

    el.innerHTML = symbol(type);
    el.title = type;
}
