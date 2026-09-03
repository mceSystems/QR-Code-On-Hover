let qrCodeDiv = null;
let qrDecodeDiv = null;
let decodeHideTimeoutId = null;
let currentAllowedDomains = [];
let currentQrSize = 150; // Default size

// Load initial settings and listen for changes
function initializeSettings() {
    chrome.storage.sync.get(['allowedDomains', 'qrSize'], (result) => {
        if (chrome.runtime.lastError) {
            return;
        }
        currentAllowedDomains = result.allowedDomains || [];
        currentQrSize = result.qrSize || 150;
    });

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (chrome.runtime.lastError) {
            return;
        }
        if (namespace === 'sync') {
            if (changes.allowedDomains) {
                currentAllowedDomains = changes.allowedDomains.newValue || [];
            }
            if (changes.qrSize) {
                currentQrSize = changes.qrSize.newValue || 150;
            }
        }
    });
}

function createQrCodeDiv() {
    if (!qrCodeDiv) {
        qrCodeDiv = document.createElement('div');
        qrCodeDiv.id = 'link-hover-qr-code';
        qrCodeDiv.style.position = 'fixed';
        qrCodeDiv.style.zIndex = '10001';
        qrCodeDiv.style.background = 'white';
        qrCodeDiv.style.padding = '10px';
        qrCodeDiv.style.borderRadius = '5px';
        qrCodeDiv.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        qrCodeDiv.style.display = 'none';
        document.body.appendChild(qrCodeDiv);
    }
}

function createQrDecodeDiv() {
    if (!qrDecodeDiv) {
        qrDecodeDiv = document.createElement('div');
        qrDecodeDiv.id = 'link-hover-qr-decode';
        qrDecodeDiv.style.position = 'fixed';
        qrDecodeDiv.style.zIndex = '10001';
        qrDecodeDiv.style.background = 'white';
        qrDecodeDiv.style.padding = '10px';
        qrDecodeDiv.style.borderRadius = '5px';
        qrDecodeDiv.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        qrDecodeDiv.style.display = 'none';
        qrDecodeDiv.style.maxWidth = '280px';
        qrDecodeDiv.style.fontFamily = 'Arial, sans-serif';

        const textDiv = document.createElement('div');
        textDiv.className = 'qr-decode-text';
        textDiv.style.fontSize = '13px';
        textDiv.style.wordBreak = 'break-all';
        textDiv.style.marginBottom = '8px';
        qrDecodeDiv.appendChild(textDiv);

        const copyButton = document.createElement('button');
        copyButton.type = 'button';
        copyButton.textContent = 'Copy';
        copyButton.style.width = '100%';
        copyButton.style.padding = '6px';
        copyButton.style.border = 'none';
        copyButton.style.borderRadius = '5px';
        copyButton.style.background = '#4a90e2';
        copyButton.style.color = 'white';
        copyButton.style.fontSize = '13px';
        copyButton.style.cursor = 'pointer';
        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText(textDiv.textContent).then(() => {
                copyButton.textContent = 'Copied!';
                setTimeout(() => {
                    copyButton.textContent = 'Copy';
                }, 1000);
            });
        });
        qrDecodeDiv.appendChild(copyButton);

        // Give the user time to move the cursor from the image onto the popup
        // (e.g. to click Copy) without the gap between them closing it early.
        qrDecodeDiv.addEventListener('mouseenter', cancelHideDecodedQr);
        qrDecodeDiv.addEventListener('mouseleave', hideDecodedQr);

        document.body.appendChild(qrDecodeDiv);
    }
}

function positionPopupNearCursor(el, e) {
    const width = el.offsetWidth;
    const height = el.offsetHeight;

    let x = e.clientX + 20;
    let y = e.clientY + 20;

    if (x + width > window.innerWidth) {
        x = e.clientX - width - 20;
    }
    if (y + height > window.innerHeight) {
        y = e.clientY - height - 20;
    }

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
}

function showQrCode(e) {
    const link = e.target.closest('a');
    if (!link || !link.href || link.href.startsWith('javascript:')) {
        return;
    }
    
    // Check against the cached settings
    if (currentAllowedDomains.length > 0) {
        try {
            const linkUrl = new URL(link.href);
            const linkDomain = linkUrl.hostname;

            const isAllowed = currentAllowedDomains.some(domain => linkDomain.endsWith(domain));

            if (!isAllowed) {
                return;
            }
        } catch (error) {
            console.log("Invalid URL, ignoring: ", link.href);
            return;
        }
    }

    qrCodeDiv.innerHTML = '';
    new QRCode(qrCodeDiv, {
        text: link.href,
        width: currentQrSize,
        height: currentQrSize,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    qrCodeDiv.style.visibility = 'hidden';
    qrCodeDiv.style.display = 'block';
    positionPopupNearCursor(qrCodeDiv, e);
    qrCodeDiv.style.visibility = 'visible';

    link.addEventListener('mouseleave', hideQrCode, { once: true });
}

function hideQrCode() {
    if (qrCodeDiv) {
        qrCodeDiv.style.display = 'none';
    }
}

function requestQrDecode(url) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'DECODE_QR_IMAGE', url }, (response) => {
            if (chrome.runtime.lastError || !response) {
                resolve(null);
                return;
            }
            resolve(response.text);
        });
    });
}

async function showDecodedQr(e) {
    const img = e.target;

    if (img.closest('#link-hover-qr-code') || img.closest('#link-hover-qr-decode')) {
        return;
    }

    if (currentAllowedDomains.length > 0) {
        const isAllowed = currentAllowedDomains.some(domain => location.hostname.endsWith(domain));
        if (!isAllowed) {
            return;
        }
    }

    const src = img.currentSrc || img.src;
    if (!src) {
        return;
    }

    const decodedText = await requestQrDecode(src);
    if (!decodedText || !img.matches(':hover')) {
        return;
    }

    cancelHideDecodedQr();
    qrDecodeDiv.querySelector('.qr-decode-text').textContent = decodedText;

    qrDecodeDiv.style.visibility = 'hidden';
    qrDecodeDiv.style.display = 'block';
    positionPopupNearCursor(qrDecodeDiv, e);
    qrDecodeDiv.style.visibility = 'visible';

    img.addEventListener('mouseleave', scheduleHideDecodedQr, { once: true });
}

function scheduleHideDecodedQr() {
    decodeHideTimeoutId = setTimeout(hideDecodedQr, 200);
}

function cancelHideDecodedQr() {
    clearTimeout(decodeHideTimeoutId);
}

function hideDecodedQr() {
    if (qrDecodeDiv) {
        qrDecodeDiv.style.display = 'none';
    }
}

function init() {
    createQrCodeDiv();
    createQrDecodeDiv();
    initializeSettings();

    document.body.addEventListener('mouseenter', (event) => {
        if (event.target.tagName === 'A') {
            showQrCode(event);
        } else if (event.target.tagName === 'IMG') {
            showDecodedQr(event);
        }
    }, true);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
} 