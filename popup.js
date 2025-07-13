document.addEventListener('DOMContentLoaded', () => {
    const domainsTextarea = document.getElementById('domains');
    const sizeInput = document.getElementById('size');
    const saveButton = document.getElementById('save');
    const statusDiv = document.createElement('div');
    statusDiv.id = 'status';
    statusDiv.style.marginTop = '5px';
    saveButton.insertAdjacentElement('afterend', statusDiv);

    // Load saved settings
    chrome.storage.sync.get(['allowedDomains', 'qrSize'], (result) => {
        if (result.allowedDomains) {
            domainsTextarea.value = result.allowedDomains.join('\\n');
        }
        if (result.qrSize) {
            sizeInput.value = result.qrSize;
        } else {
            sizeInput.value = 150; // Default size
        }
    });

    // Save settings
    saveButton.addEventListener('click', () => {
        const domains = domainsTextarea.value.split('\n').map(d => d.trim()).filter(d => d);
        const size = parseInt(sizeInput.value, 10);

        if (isNaN(size) || size < 50 || size > 500) {
            statusDiv.textContent = 'Invalid size. Must be between 50 and 500.';
            setTimeout(() => {
                statusDiv.textContent = '';
            }, 2000);
            return;
        }

        chrome.storage.sync.set({ allowedDomains: domains, qrSize: size }, () => {
            statusDiv.textContent = 'Settings saved!';
            setTimeout(() => {
                statusDiv.textContent = '';
                window.close();
            }, 1000);
        });
    });
}); 