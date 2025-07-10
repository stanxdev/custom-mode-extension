import { getState } from './state.js';

async function updateAction(badgeOnError = false)
{
    let state = await getState(),
        hasErrors = Object.values(state.errors).some(x => Object.keys(x).length);

    chrome.action.setIcon({
        imageData: generateIcon(
            state.theme.icon,
            state.requests.registered.length,
            state.injects.registered.length,
            hasErrors
        )
    });

    if (!hasErrors)
    {
        chrome.action.setBadgeText({ text: '' });
    }
    else if (badgeOnError)
    {
        chrome.action.setBadgeBackgroundColor({ color: state.theme.icon.error });
        chrome.action.setBadgeText({
            text: '!'
        });
    }
}

/**
 * Draw icon on canvas
 * @returns ImageData
 */
function generateIcon(
    colors = { enabled: '#548AF7', disabled: '#6C707E', error: '#ffa040' },
    hasRequests = false,
    hasInjects = false,
    hasErrors = false)
{
    // Action icon is 16x16, viewport is smaller... So scale context to avoid blur
    const viewportSize = 14;
    const scale = 3;
    const canvasSize = viewportSize * scale;

    const canvas = new OffscreenCanvas(canvasSize, canvasSize);
    const ctx = canvas.getContext("2d");

    ctx.scale(scale, scale);

    // Injects circle
    ctx.beginPath();
    ctx.arc(4.5, 9.5, 4.5, 0, Math.PI * 2, true);
    ctx.fillStyle = hasInjects ? colors.enabled : colors.disabled;
    ctx.fill();

    // Requests half-circle
    ctx.save();
    ctx.beginPath();
    ctx.rect(4.5, 0, 14, 9.5);
    ctx.arc(4.5, 9.5, 5.5, 0, Math.PI * 2, true);
    ctx.clip();

    ctx.beginPath();
    ctx.arc(9.5, 4.5, 4.5, 0, Math.PI * 2, true);
    ctx.fillStyle = hasRequests ? colors.enabled : colors.disabled;
    ctx.fill();
    ctx.restore();

    // Errors circle
    if (hasErrors)
    {
        ctx.beginPath();
        ctx.arc(12, 12, 2, 0, Math.PI * 2, true);
        ctx.fillStyle = colors.error;
        ctx.fill();
    }

    return ctx.getImageData(0, 0, canvasSize, canvasSize);
}

export { updateAction };
