// Glitch Effect Settings Manager
(function() {
    'use strict';

    function getSavedSpeed() {
        const value = localStorage.getItem('glitchSpeed');
        if (value === 'stopped' || value === 'slow' || value === 'fast') {
            return value;
        }
        return 'fast';
    }

    // Apply glitch speed to a specific element
    function applyGlitchSpeedToElement(element, speed) {
        if (!element) return;

        element.classList.remove('glitch-stopped', 'glitch-slow', 'glitch-fast');

        if (speed === 'stopped') {
            element.classList.add('glitch-stopped');
        } else if (speed === 'slow') {
            element.classList.add('glitch-slow');
        } else {
            element.classList.add('glitch-fast');
        }
    }

    // Apply glitch speed to all glitch elements on the page
    function applyGlitchSpeed(speed) {
        const glitchElements = document.querySelectorAll('.glitch, .glitch-large');
        glitchElements.forEach(element => applyGlitchSpeedToElement(element, speed));
    }

    // Initialize the preview element
    function initPreview(speed) {
        const previewGlitch = document.querySelector('.glitch-preview');
        if (!previewGlitch) return;

        if (!previewGlitch.getAttribute('data-text')) {
            previewGlitch.setAttribute('data-text', previewGlitch.textContent);
        }

        applyGlitchSpeedToElement(previewGlitch, speed);
    }

    // Initialize the radio inputs inside the modal
    function initRadios(speed) {
        const radios = document.querySelectorAll('input[name="glitchSpeed"]');
        if (!radios.length) return;

        radios.forEach(radio => {
            radio.checked = (radio.value === speed);

            // Update preview live when user changes option
            radio.addEventListener('change', function() {
                const newSpeed = this.value;
                const previewGlitch = document.querySelector('.glitch-preview');
                if (previewGlitch) {
                    applyGlitchSpeedToElement(previewGlitch, newSpeed);
                }
            });
        });
    }

    // Initialize glitch settings on page load
    function initGlitchSettings() {
        const speed = getSavedSpeed();

        // Apply to all existing glitch text
        applyGlitchSpeed(speed);

        // Initialize preview and radios once they appear in the DOM (header injection)
        function tryInit() {
            initPreview(speed);
            initRadios(speed);
        }
        tryInit();

        // Watch for dynamically injected elements (header component)
        if (!document.querySelector('.glitch-preview') || !document.querySelector('input[name="glitchSpeed"]')) {
            const observer = new MutationObserver(() => {
                if (document.querySelector('.glitch-preview') && document.querySelector('input[name="glitchSpeed"]')) {
                    tryInit();
                    observer.disconnect();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            // Safety timeout to stop observing
            setTimeout(() => observer.disconnect(), 10000);
        }
    }

    // Open glitch settings modal
    window.openGlitchSettings = function() {
        const modal = document.getElementById('glitchSettingsModal');
        if (!modal) return;

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        const speed = getSavedSpeed();
        initPreview(speed);
        initRadios(speed);
    };

    // Close glitch settings modal
    window.closeGlitchSettings = function() {
        const modal = document.getElementById('glitchSettingsModal');
        if (!modal) return;

        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    };

    // Save glitch settings
    window.saveGlitchSettings = function() {
        const selectedSpeed = document.querySelector('input[name="glitchSpeed"]:checked');
        const speed = selectedSpeed ? selectedSpeed.value : 'fast';

        localStorage.setItem('glitchSpeed', speed);
        applyGlitchSpeed(speed);
        initPreview(speed);

        const saveBtn = document.querySelector('.glitch-save-btn');
        if (saveBtn) {
            const originalText = saveBtn.textContent;
            saveBtn.textContent = '✓ Saved!';
            saveBtn.style.background = 'linear-gradient(135deg, #00ff41 0%, #00cc33 100%)';

            setTimeout(() => {
                saveBtn.textContent = originalText;
                saveBtn.style.background = '';
                closeGlitchSettings();
            }, 800);
        } else {
            closeGlitchSettings();
        }
    };

    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('glitchSettingsModal');
        if (e.target === modal) {
            closeGlitchSettings();
        }
    });

    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGlitchSettings);
    } else {
        initGlitchSettings();
    }
})();
