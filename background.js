importScripts('lib/jsqr.js');

const MAX_DECODE_DIMENSION = 1000; // Downscale huge images before decoding to avoid stalls

async function decodeQrFromUrl(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    let width = bitmap.width;
    let height = bitmap.height;
    if (width > MAX_DECODE_DIMENSION || height > MAX_DECODE_DIMENSION) {
        const scale = MAX_DECODE_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
    }

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const result = jsQR(imageData.data, width, height);
    return result ? result.data : null;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.type !== 'DECODE_QR_IMAGE' || !message.url) {
        return false;
    }

    decodeQrFromUrl(message.url)
        .then((text) => sendResponse({ text }))
        .catch(() => sendResponse({ text: null }));

    return true; // Keep the message channel open for the async sendResponse above.
});
