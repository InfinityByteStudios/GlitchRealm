// Glitch Effect Settings Manager
(function() {
    'use strict';

    // Initialize glitch settings on page load
    function initGlitchSettings() {
        const savedSpeed = localStorage.getItem('glitchSpeed') || 'fast';
        applyGlitchSpeed(savedSpeed);
        
        // Set the radio button to match saved preference
        const radio = document.querySelector(`input[name="glitchSpeed"][value="${savedSpeed}"]`);
        if (radio) {
            radio.checked = true;
        }
        
        // Update preview when radio changes
        document.querySelectorAll('input[name="glitchSpeed"]').forEach(radio => {
            radio.addEventListener('change', function() {
                const previewGlitch = document.querySelector('.glitch-preview');
                if (previewGlitch) {
                    applyGlitchSpeedToElement(previewGlitch, this.value);
                }
            });
        });
    }

    // Apply glitch speed to a specific element
    function applyGlitchSpeedToElement(element,  speed) {
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
        glitchElements.forEach(element => {
            applyGlitchSpeedToElement(element, speed);
        });
    }

    // Open glitch settings modal
    window.openGlitchSettings = function() {
        const modal = document.getElementById('glitchSettingsModal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    };

    // Close glitch settings modal
    window.closeGlitchSettings = function() {
        const modal = document.getElementById('glitchSettingsModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    };

    // Save glitch settings
    window.saveGlitchSettings = function() {
        const selectedSpeed = document.querySelector('input[name="glitchSpeed"]:checked');
        if (selectedSpeed) {
            const speed = selectedSpeed.value;
            localStorage.setItem('glitchSpeed', speed);
            applyGlitchSpeed(speed);
            
            // Show success message
            const saveBtn = document.querySelector('.glitch-save-btn');
            const originalText = saveBtn.textContent;
            saveBtn.textContent = '✓ Saved!';
            saveBtn.style.background = 'linear-gradient(135deg, #00ff41 0%, #00cc33 100%)';
            
            setTimeout(() => {
                saveBtn.textContent = originalText;
                saveBtn.style.background = '';
                closeGlitchSettings();
            }, 1000);
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
