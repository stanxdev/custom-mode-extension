import { getState } from './state.js';

const defaultAccentTimeout = 3000;

/**
 * Action icon and badge depends on state of extension
 * Also allows to show the accent (small circle) for some time
 */
async function updateAction({ badgeOnError = false, accent = false, accentTimeout = defaultAccentTimeout } = {})
{
    let state = await getState(),
        icon = state.theme.icon,
        hasErrors = Object.values(state.errors).some(x => Object.keys(x).length),
        iconParams = {
            bottom: state.injects.registered.length ? icon.enabled : icon.disabled,
            top: state.requests.registered.length ? icon.enabled : icon.disabled,
            accent: hasErrors ? icon.error : accent ? icon.accent : 'transparent'
        };

    chrome.action.setIcon({ imageData: generateIcon(iconParams) });

    if (!hasErrors)
    {
        chrome.action.setBadgeText({ text: '' });

        if (accent && accentTimeout)
        {
            setTimeout(() =>
                chrome.action.setIcon({
                    imageData: generateIcon({ bottom: iconParams.bottom, top: iconParams.top })
                }),
                accentTimeout
            );
        }
    }
    else if (badgeOnError)
    {
        chrome.action.setBadgeBackgroundColor({ color: icon.error });
        chrome.action.setBadgeText({ text: '!' });
    }
}

/**
 * Draw icon on canvas
 * @returns ImageData
 */
function generateIcon({ bottom = '#6c707e', top = '#6c707e', accent = 'transparent' })
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
