/**
 * Network Status Monitor
 * Shows a toast notification when connection is lost/restored
 * Auto-included in the main application
 */

(function() {
    'use strict';

    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'network-status-toast';
    toast.innerHTML = `
        <div class="network-status-icon"></div>
        <span class="network-status-message"></span>
        <button class="network-status-close" aria-label="Close">&times;</button>
    `;

    // Add to body when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            document.body.appendChild(toast);
            initNetworkMonitor();
        });
    } else {
        document.body.appendChild(toast);
        initNetworkMonitor();
    }

    function initNetworkMonitor() {
        const icon = toast.querySelector('.network-status-icon');
        const message = toast.querySelector('.network-status-message');
        const closeBtn = toast.querySelector('.network-status-close');
        
        let hideTimeout;

        function showToast(isOnline) {
            clearTimeout(hideTimeout);
            
            toast.classList.remove('offline', 'online');
            toast.classList.add(isOnline ? 'online' : 'offline');
            
            if (isOnline) {
                icon.innerHTML = '✓';
                icon.classList.remove('pulse');
                message.textContent = 'Connection restored';
                
                // Auto-hide after 3 seconds for online status
                hideTimeout = setTimeout(() => {
                    hideToast();
                }, 3000);
            } else {
                icon.innerHTML = '⚠';
                icon.classList.add('pulse');
                message.textContent = 'No internet connection';
                
                // Keep offline notification visible
            }
            
            toast.classList.add('show');
        }

        function hideToast() {
            toast.classList.remove('show');
        }

        // Handle close button
        closeBtn.addEventListener('click', hideToast);

        // Monitor network status
        window.addEventListener('online', () => {
            showToast(true);
        });

        window.addEventListener('offline', () => {
            showToast(false);
        });

        // Initial check - only show if offline
        if (!navigator.onLine) {
            showToast(false);
        }

        // Periodic connection check (fallback for browsers that don't fire events reliably)
        let wasOnline = navigator.onLine;
        setInterval(() => {
            const isOnline = navigator.onLine;
            if (isOnline !== wasOnline) {
                wasOnline = isOnline;
                showToast(isOnline);
            }
        }, 5000);
    }

    // Expose API for manual control
    window.NetworkStatus = {
        show: (isOnline) => {
            const event = new Event(isOnline ? 'online' : 'offline');
            window.dispatchEvent(event);
        },
        hide: () => {
            toast.classList.remove('show');
        }
    };
})();
