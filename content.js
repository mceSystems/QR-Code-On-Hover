let qrCodeDiv = null;
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

    const qrCodeWidth = currentQrSize + 20; // Add padding
    const qrCodeHeight = currentQrSize + 20;

    let x = e.clientX + 20;
    let y = e.clientY + 20;

    if (x + qrCodeWidth > window.innerWidth) {
        x = e.clientX - qrCodeWidth - 20;
    }
    if (y + qrCodeHeight > window.innerHeight) {
        y = e.clientY - qrCodeHeight - 20;
    }

    qrCodeDiv.style.left = `${x}px`;
    qrCodeDiv.style.top = `${y}px`;
    qrCodeDiv.style.display = 'block';

    link.addEventListener('mouseleave', hideQrCode, { once: true });
}

function hideQrCode() {
    if (qrCodeDiv) {
        qrCodeDiv.style.display = 'none';
    }
}

function init() {
    createQrCodeDiv();
    initializeSettings();
    
    document.body.addEventListener('mouseenter', (event) => {
        if (event.target.tagName === 'A') {
            showQrCode(event);
        }
    }, true);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
} 