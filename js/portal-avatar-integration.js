/**
 * User Portal Avatar Integration
 * Connects Supabase avatar upload with existing Firebase auth and UI
 * ONLY ACTIVE ON USER PORTAL PAGE - Avatar changes only allowed from user-portal.html
 */

import { 
    supabase,
    ensureProfile,
    uploadAvatarComplete,
    deleteAvatar,
    getProfile,
    getAvatarUrl
} from './supabase-avatar.js';

// State
let currentUser = null;
let currentProfile = null;
let avatarFileInput = null;

/**
 * Initialize avatar upload functionality
 * Only runs on user-portal.html
 */
export function initializeAvatarUpload() {
    // Only enable upload on user portal page
    if (!window.location.pathname.includes('user-portal')) {
        return;
    }
    
    
    // Create hidden file input for avatar selection
    avatarFileInput = document.createElement('input');
    avatarFileInput.type = 'file';
    avatarFileInput.accept = 'image/*';
    avatarFileInput.style.display = 'none';
    document.body.appendChild(avatarFileInput);
    
    // Listen for file selection
    avatarFileInput.addEventListener('change', handleAvatarFileSelected);
    
    // Add click handlers to avatar upload overlays
    setupAvatarClickHandlers();
    
    // Listen for auth state changes
    if (window.firebaseAuth) {
        window.onAuthStateChanged(window.firebaseAuth, handleAuthChange);
    }
}

/**
 * Handle auth state changes
 */
async function handleAuthChange(user) {
    currentUser = user;
    
    if (user) {
        // Ensure profile exists in Supabase
        await ensureProfile(user);
        
        // Load current profile
        try {
            currentProfile = await getProfile(user.uid);
            updateAvatarDisplay();
        } catch (error) {
            console.error('Failed to load profile:', error);
        }
    } else {
        currentProfile = null;
    }
}

/**
 * Setup click handlers for avatar upload overlays
 */
function setupAvatarClickHandlers() {
    // Small avatar overlay (in profile trigger)
    const smallOverlay = document.querySelector('.avatar-upload-overlay');
    if (smallOverlay) {
        smallOverlay.addEventListener('click', (e) => {
            e.stopPropagation();
            openAvatarSelector();
        });
    }
    
    // Large avatar overlay (in profile menu)
    const largeOverlay = document.querySelector('.avatar-upload-overlay-large');
    if (largeOverlay) {
        largeOverlay.addEventListener('click', (e) => {
            e.stopPropagation();
            openAvatarSelector();
        });
    }
    
    // Dedicated portal avatar display overlay
    const portalOverlays = document.querySelectorAll('.user-avatar-large-container .avatar-upload-overlay-large');
    portalOverlays.forEach(overlay => {
        // Remove existing listeners by cloning
        const newOverlay = overlay.cloneNode(true);
        overlay.parentNode.replaceChild(newOverlay, overlay);
        
        newOverlay.addEventListener('click', (e) => {
            e.stopPropagation();
            openAvatarSelector();
        });
    });
}

/**
 * Open file selector
 */
function openAvatarSelector() {
    if (!currentUser) {
        showAuthMessage('Please sign in to change your avatar', 'error');
        return;
    }
    
    // Check if Supabase is configured
    if (!supabase) {
        showAuthMessage('⚠️ Avatar upload not configured yet. Please update supabase-config.js with your Supabase credentials. See AVATAR_IMPLEMENTATION.md for setup instructions.', 'error');
        console.error('Supabase not configured. Update supabase-config.js');
        return;
    }
    
    avatarFileInput.click();
}

/**
 * Handle avatar file selection
 */
async function handleAvatarFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Reset input
    event.target.value = '';
    
    // Validate file
    if (!file.type.startsWith('image/')) {
        showAuthMessage('Please select an image file', 'error');
        return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showAuthMessage('Image must be less than 5MB', 'error');
        return;
    }
    
    // Show crop modal if it exists, otherwise upload directly
    if (typeof showImageCropModal === 'function') {
        showImageCropModal(file, handleCroppedImage);
    } else {
        // Direct upload without crop
        await uploadAvatar(file);
    }
}

/**
 * Handle cropped image from modal
 */
async function handleCroppedImage(croppedBlob) {
    // Convert blob to file
    const file = new File([croppedBlob], 'avatar.png', { type: 'image/png' });
    await uploadAvatar(file);
}

/**
 * Upload avatar to Supabase
 */
async function uploadAvatar(file) {
    if (!currentUser) {
        showAuthMessage('Please sign in first', 'error');
        return;
    }
    
    try {
        // Show loading state
        showAuthMessage('Uploading avatar...', 'info');
        
        // Upload and update profile
        const avatarUrl = await uploadAvatarComplete(
            file,
            currentUser.uid,
            (progress) => {}
        );
        
        // Reload profile
        currentProfile = await getProfile(currentUser.uid);
        
        // Update UI
        updateAvatarDisplay();
        
        showAuthMessage('Avatar updated successfully!', 'success');
        
    } catch (error) {
        console.error('Avatar upload failed:', error);
        showAuthMessage('Failed to upload avatar: ' + error.message, 'error');
    }
}

/**
 * Update avatar display in UI
 */
function updateAvatarDisplay() {
    if (!currentUser) return;
    
    const avatarUrl = getAvatarUrl(currentUser, currentProfile);
    
    // Update small avatar (in profile trigger)
    const smallAvatar = document.querySelector('.user-avatar');
    if (smallAvatar) {
        smallAvatar.src = avatarUrl;
    }
    
    // Update large avatar (in profile menu)
    const largeAvatar = document.querySelector('.user-avatar-large');
    if (largeAvatar) {
        largeAvatar.src = avatarUrl;
    }
    
    // Update dedicated portal avatar display
    const portalAvatar = document.getElementById('portal-avatar-display');
    if (portalAvatar) {
        portalAvatar.src = avatarUrl;
    }
}

/**
 * Add revert avatar button to profile menu
 * Only shown on user portal page
 */
export function addRevertAvatarButton() {
    
    // Only add button on user portal page
    if (!window.location.pathname.includes('user-portal')) {
        return;
    }
    
    // Find the Profile Picture section first
    const profilePictureSection = document.querySelector('.portal-section');
    
    let revertContainer = profilePictureSection ? profilePictureSection.querySelector('.revert-avatar-container') : null;
    
    // If container doesn't exist, create it in the Profile Picture section
    if (!revertContainer && profilePictureSection) {
        revertContainer = document.createElement('div');
        revertContainer.className = 'revert-avatar-container';
        revertContainer.style.textAlign = 'center';
        revertContainer.style.marginTop = '15px';
        profilePictureSection.appendChild(revertContainer);
    }
    
    // Fallback: try profile-actions for backwards compatibility
    if (!revertContainer) {
        const profileActions = document.querySelector('.profile-actions');
        if (!profileActions) {
            return;
        }
        revertContainer = profileActions;
    }
    
    // Check if button already exists
    if (document.getElementById('revert-avatar-btn')) {
        return;
    }
    
    
    const revertBtn = document.createElement('button');
    revertBtn.id = 'revert-avatar-btn';
    revertBtn.className = 'btn-portal';
    revertBtn.style.background = 'rgba(255, 77, 109, 0.1)';
    revertBtn.style.borderColor = 'var(--primary-magenta)';
    revertBtn.style.color = 'var(--primary-magenta)';
    revertBtn.style.display = 'none'; // Hide by default
    revertBtn.innerHTML = `
        <span style="margin-right: 8px;">↺</span>
        <span>Use Default Avatar (Google/GitHub)</span>
        <span id="revert-info-icon" style="
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 1.5px solid var(--primary-magenta);
            font-size: 11px;
            font-weight: bold;
            margin-left: 8px;
            cursor: help;
            font-family: 'Rajdhani', sans-serif;
        " title="Click for information">i</span>
    `;
    
    revertBtn.addEventListener('click', async () => {
        if (!currentUser || !currentProfile?.avatar_storage_path) return;
        
        const providerName = currentUser.providerData?.[0]?.providerId === 'google.com' ? 'Google' : 
                            currentUser.providerData?.[0]?.providerId === 'github.com' ? 'GitHub' : 
                            'provider';
        
        if (!confirm(`Remove your custom avatar and use your ${providerName} profile picture instead?`)) {
            return;
        }
        
        try {
            showAuthMessage('Reverting avatar...', 'info');
            
            await deleteAvatar(currentUser.uid, currentProfile.avatar_storage_path);
            
            // Reload profile
            currentProfile = await getProfile(currentUser.uid);
            
            // Update UI
            updateAvatarDisplay();
            toggleRevertButton();
            
            showAuthMessage('Avatar reverted successfully!', 'success');
            
        } catch (error) {
            console.error('Failed to revert avatar:', error);
            showAuthMessage('Failed to revert avatar: ' + error.message, 'error');
        }
    });
    
    // Add info icon click handler
    // Use setTimeout to ensure the button is in DOM before adding the listener
    setTimeout(() => {
        const infoIcon = document.getElementById('revert-info-icon');
        if (infoIcon) {
            infoIcon.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent button click
                
                const providerName = currentUser?.providerData?.[0]?.providerId === 'google.com' ? 'Google' : 
                                    currentUser?.providerData?.[0]?.providerId === 'github.com' ? 'GitHub' : 
                                    'an OAuth provider';
                
                const message = `ℹ️ Revert to Provider Avatar

This button allows you to remove your custom uploaded avatar and use your ${providerName} profile picture instead.

✅ Works if you signed in with:
• Google
• GitHub

❌ Not available if you signed in with:
• Email/Password (no provider avatar available)

Note: You can only see this button when you have a custom avatar uploaded.`;
                
                alert(message);
            });
        }
    }, 100);
    
    // Append to container
    revertContainer.appendChild(revertBtn);
    
    // Update visibility based on current profile
    toggleRevertButton();
}

/**
 * Toggle revert button visibility
 */
function toggleRevertButton() {
    const revertBtn = document.getElementById('revert-avatar-btn');
    if (!revertBtn) {
        return;
    }
    
    
    // Always show the button
    revertBtn.style.display = 'flex';
    revertBtn.style.opacity = '1';
    revertBtn.disabled = false;
    
}

/**
 * Show auth message (uses existing function if available)
 */
function showAuthMessage(message, type) {
    if (typeof window.showAuthMessage === 'function') {
        window.showAuthMessage(message, type);
    } else {
    }
}

// Auto-initialize when script loads
// Only on user portal page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.location.pathname.includes('user-portal')) {
            setTimeout(() => {
                initializeAvatarUpload();
                addRevertAvatarButton();
            }, 1500);
        }
    });
} else {
    if (window.location.pathname.includes('user-portal')) {
        setTimeout(() => {
            initializeAvatarUpload();
            addRevertAvatarButton();
        }, 1500);
    }
}
