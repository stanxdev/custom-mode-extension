import { getState } from './state.js';

const defaultAccentTimeout = 3000;

/**
 * Action icon and badge depends on state of extension
 * Also allows to show the accent (small circle) for some time
 */
async function updateAction({ badgeOnError = false, accentTimeout = null } = {})
{
    let state = await getState(),
        iconColors = getIconColors(state),
        hasErrors = Object.values(state.errors).some((/*Object*/x) => Object.keys(x).length);

    await chrome.action.setIcon({ imageData: generateIcon(iconColors) });

    if (!hasErrors)
    {
        await chrome.action.setBadgeText({ text: '' });

        if (accentTimeout)
        {
            setTimeout(() =>
                chrome.action.setIcon({
                    imageData: generateIcon({ ...iconColors, accent: 'transparent' })
                }),
                Number.isInteger(accentTimeout) ? accentTimeout : defaultAccentTimeout
            );
        }
    }
    else if (badgeOnError)
    {
        await chrome.action.setBadgeBackgroundColor({ color: state.icon.error.bottom });
        await chrome.action.setBadgeText({ text: '!' });
    }
}

function getIconColors(state)
{
    if (Object.keys(state.errors.manifest).length)
        return state.icon.error;
    if (Object.keys(state.errors.requests).length)
        return state.icon.error_request_rules;
    if (Object.keys(state.errors.injects).length)
        return state.icon.error_content_scripts;

    if (!state.requests.enabled && !state.injects.enabled)
        return state.icon.disabled;
    if (!state.requests.enabled)
        return state.icon.disabled_request_rules;
    if (!state.injects.enabled)
        return state.icon.disabled_content_scripts;

    return state.icon.default;
}

/**
 * Draw icon on canvas
 * @returns ImageData
 */
function generateIcon({ bottom = '#548af7', top = '#6c707e', accent = 'transparent' } = {})
{
    // Action icon is 16x16, viewport is smaller... So scale context to avoid blur
    const viewportSize = 14;
    const scale = 3;
    const canvasSize = viewportSize * scale;

    const canvas = new OffscreenCanvas(canvasSize, canvasSize);
    const ctx = canvas.getContext("2d");

    ctx.scale(scale, scale);

    // Bottom circle
    ctx.beginPath();
    ctx.arc(4.5, 9.5, 4.5, 0, Math.PI * 2, true);
    ctx.fillStyle = bottom;
    ctx.fill();

    // Top half-circle
    ctx.save();
    ctx.beginPath();
    ctx.rect(4.5, 0, 14, 9.5);
    ctx.arc(4.5, 9.5, 5.5, 0, Math.PI * 2, true);
    ctx.clip();

    ctx.beginPath();
    ctx.arc(9.5, 4.5, 4.5, 0, Math.PI * 2, true);
    ctx.fillStyle = top;
    ctx.fill();
    ctx.restore();

    // Accent small circle
    ctx.beginPath();
    ctx.arc(12, 12, 2, 0, Math.PI * 2, true);
    ctx.fillStyle = accent;
    ctx.fill();

    return ctx.getImageData(0, 0, canvasSize, canvasSize);
}

export { updateAction };
