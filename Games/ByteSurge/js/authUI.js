// ByteSurge: Authentication UI System
// Login/logout interface and user profile display

const authUI = {
    initialized: false,
    
    init() {
        if (this.initialized) return;
        
        this.createAuthButton();
        this.updateUI();
        this.initialized = true;
        
        console.log('🎮 Auth UI initialized');
    },
    
    // Create floating auth button
    createAuthButton() {
        // Create auth container
        const authContainer = document.createElement('div');
        authContainer.id = 'auth-container';
        authContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            font-family: 'Courier New', monospace;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        // User profile display
        const userProfile = document.createElement('div');
        userProfile.id = 'user-profile';
        userProfile.style.cssText = `
            background: linear-gradient(145deg, #1a1a2e, #16213e);
            border: 1px solid #00ff00;
            border-radius: 8px;
            padding: 8px 12px;
            color: #ffffff;
            font-size: 12px;
            display: none;
            align-items: center;
            gap: 8px;
            max-width: 200px;
        `;
        
        // Auth button
        const authButton = document.createElement('button');
        authButton.id = 'auth-button';
        authButton.style.cssText = `
            background: linear-gradient(145deg, #2222aa, #3333ff);
            border: none;
            color: #ffffff;
            padding: 10px 16px;
            font-size: 12px;
            font-weight: bold;
            border-radius: 8px;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.3s ease;
            white-space: nowrap;
        `;
        
        authButton.addEventListener('mouseenter', () => {
            authButton.style.transform = 'scale(1.05)';
            authButton.style.boxShadow = '0 0 15px rgba(51, 51, 255, 0.6)';
        });
        
        authButton.addEventListener('mouseleave', () => {
            authButton.style.transform = 'scale(1)';
            authButton.style.boxShadow = 'none';
        });
        
        authContainer.appendChild(userProfile);
        authContainer.appendChild(authButton);
        document.body.appendChild(authContainer);
        
        // Add click handler
        authButton.addEventListener('click', () => {
            this.handleAuthClick();
        });
    },
    
    // Handle auth button click
    async handleAuthClick() {
        if (window.firebaseSystem && window.firebaseSystem.isSignedIn()) {
            // Show profile menu
            this.showProfileMenu();
        } else {
            // Show sign-in options
            this.showSignInMenu();
        }
    },
      // Show sign-in options
    showSignInMenu() {
        this.showModal('Sign In to ByteSurge', `
            <div style="text-align: center; color: #ffffff;">
                <p style="margin-bottom: 20px; color: #aaaaaa;">
                    Sign in to save your progress, compete on leaderboards, and sync across devices!
                </p>
                
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button id="google-signin" style="
                        background: linear-gradient(145deg, #db4437, #dd5144);
                        border: none;
                        color: #ffffff;
                        padding: 12px 20px;
                        font-size: 14px;
                        font-weight: bold;
                        border-radius: 8px;
                        cursor: pointer;
                        font-family: inherit;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                    ">
                        <span>🔑</span> Sign in with Google
                    </button>
                    
                    <button id="github-signin" style="
                        background: linear-gradient(145deg, #333333, #444444);
                        border: none;
                        color: #ffffff;
                        padding: 12px 20px;
                        font-size: 14px;
                        font-weight: bold;
                        border-radius: 8px;
                        cursor: pointer;
                        font-family: inherit;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                    ">
                        <span>🐙</span> Sign in with GitHub
                    </button>
                    
                    <button id="email-signin" style="
                        background: linear-gradient(145deg, #2222aa, #3333ff);
                        border: none;
                        color: #ffffff;
                        padding: 12px 20px;
                        font-size: 14px;
                        font-weight: bold;
                        border-radius: 8px;
                        cursor: pointer;
                        font-family: inherit;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                    ">
                        <span> </span> Sign in with Email
                    </button>
                    
                    <button id="anonymous-signin" style="
                        background: linear-gradient(145deg, #555555, #777777);
                        border: none;
                        color: #ffffff;
                        padding: 12px 20px;
                        font-size: 14px;
                        font-weight: bold;
                        border-radius: 8px;
                        cursor: pointer;
                        font-family: inherit;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                    ">
                        <span>👤</span> Play as Guest
                    </button>
                </div>
                
                <p style="margin-top: 15px; font-size: 11px; color: #666666;">
                    Guest mode saves locally only. Sign in for cloud sync!
                </p>
            </div>
        `, [
            {
                text: 'Cancel',
                style: 'secondary',
                action: () => this.closeModal()
            }
        ]);        // Add event listeners
        document.getElementById('google-signin').addEventListener('click', async () => {
            this.closeModal();
            try {
                await window.firebaseSystem.signInWithGoogle();
            } catch (error) {
                console.error('Google sign-in failed:', error);
                this.showToast('Google sign-in failed. Please try again.', '#ff0000');
            }
        });
        
        document.getElementById('github-signin').addEventListener('click', async () => {
            this.closeModal();
            try {
                await window.firebaseSystem.signInWithGitHub();
            } catch (error) {
                console.error('GitHub sign-in failed:', error);
                this.showToast('GitHub sign-in failed. Please try again.', '#ff0000');
            }
        });
        
        document.getElementById('email-signin').addEventListener('click', () => {
            this.closeModal();
            this.showEmailSignInForm();
        });
        
        document.getElementById('anonymous-signin').addEventListener('click', async () => {
            this.closeModal();
            try {
                await window.firebaseSystem.signInAnonymously();
            } catch (error) {
                console.error('Anonymous sign-in failed:', error);
                this.showToast('Anonymous sign-in failed. Please try again.', '#ff0000');
            }
        });
    },
    
    // Show profile menu
    showProfileMenu() {
        const user = window.firebaseSystem.getCurrentUser();
        const userName = user.displayName || user.email || 'Anonymous';
          this.showModal('Profile & Settings', `
            <div style="text-align: center; color: #ffffff;">
                <div style="margin-bottom: 20px;">
                    ${user.photoURL ? 
                        `<img src="${user.photoURL}" style="width: 50px; height: 50px; border-radius: 50%; margin-bottom: 10px;">` : 
                        '<div style="width: 50px; height: 50px; background: #333; border-radius: 50%; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; font-size: 20px;">👤</div>'
                    }
                    <div style="font-size: 16px; font-weight: bold;">${userName}</div>
                    <div style="font-size: 12px; color: #aaaaaa;">${user.email || 'Guest Account'}</div>
                      <div style="margin-top: 15px; padding: 10px; background: rgba(0,255,0,0.1); border: 1px solid #00ff00; border-radius: 6px;">
                        <div style="font-size: 12px; color: #00ff00; margin-bottom: 5px;">📋 Leaderboard Display Name:</div>
                        <div style="font-size: 14px; font-weight: bold; color: #ffffff;">"${user.displayName || user.email || 'Anonymous'}"</div>
                        <div style="font-size: 10px; color: #aaaaaa; margin-top: 3px;">This is how your name appears on the leaderboard</div>
                        <button id="change-display-name" style="
                            background: linear-gradient(145deg, #2222aa, #3333ff);
                            border: none;
                            color: #ffffff;
                            padding: 8px 16px;
                            font-size: 12px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-family: inherit;
                            margin-top: 8px;
                        ">✏️ Change Name</button>
                    </div>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button id="cloud-save" style="
                        background: linear-gradient(145deg, #2222aa, #3333ff);
                        border: none;
                        color: #ffffff;
                        padding: 10px 16px;
                        font-size: 14px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-family: inherit;
                    ">☁️ Save to Cloud</button>
                    
                    <button id="sign-out" style="
                        background: linear-gradient(145deg, #aa2222, #cc3333);
                        border: none;
                        color: #ffffff;
                        padding: 10px 16px;
                        font-size: 14px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-family: inherit;
                    ">🚪 Sign Out</button>
                </div>
            </div>
        `, [
            {
                text: 'Close',
                style: 'secondary',
                action: () => this.closeModal()
            }
        ]);        
        // Add event listeners
        const changeDisplayNameBtn = document.getElementById('change-display-name');
        if (changeDisplayNameBtn) {
            changeDisplayNameBtn.addEventListener('click', () => {
                this.showChangeDisplayNameModal();
            });
        }

        document.getElementById('cloud-save').addEventListener('click', async () => {
            if (window.cloudSaveSystem) {
                await window.cloudSaveSystem.autoSave();
                this.showToast('Game saved to cloud!', '#00ff00');
            }
        });
          document.getElementById('sign-out').addEventListener('click', async () => {
            this.closeModal();
            if (window.firebaseSystem) {
                await window.firebaseSystem.signOut();
                this.showToast('Signed out successfully', '#ffaa00');
            }
        });        // Add event listener for change display name button
        const changeNameButton = document.getElementById('change-display-name');
        if (changeNameButton) {
            changeNameButton.addEventListener('click', () => {
                this.showChangeDisplayNameModal();
            });
        }
    },

    // Show change display name modal
    showChangeDisplayNameModal() {
        const user = window.firebaseSystem.getCurrentUser();
        const currentName = user.displayName || user.email || 'Anonymous';
        
        this.showModal('✏️ Change Display Name', `
            <div style="text-align: center; color: #ffffff;">
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 14px; color: #aaaaaa; margin-bottom: 10px;">Current display name:</div>
                    <div style="font-size: 16px; font-weight: bold; color: #00ff00; margin-bottom: 20px;">"${currentName}"</div>
                    
                    <div style="text-align: left; margin-bottom: 15px;">
                        <label style="display: block; font-size: 12px; color: #aaaaaa; margin-bottom: 5px;">New Display Name:</label>
                        <input 
                            type="text" 
                            id="new-display-name" 
                            placeholder="Enter new name..."
                            maxlength="30"
                            style="
                                width: 100%;
                                padding: 10px;
                                font-size: 14px;
                                border: 1px solid #555;
                                border-radius: 4px;
                                background: rgba(255, 255, 255, 0.1);
                                color: #ffffff;
                                font-family: inherit;
                                box-sizing: border-box;
                            "
                        />
                    </div>                    <div style="font-size: 11px; color: #888; text-align: left; margin-bottom: 20px;">
                        • 3-30 characters allowed<br>
                        • No special characters (@, #, etc.)<br>
                        • Updates your leaderboard entries where possible<br>
                        • Always used for future score submissions
                    </div>
                </div>
            </div>
        `, [
            {
                text: 'Cancel',
                style: 'secondary',
                action: () => this.closeModal()
            },
            {
                text: 'Save Name',
                style: 'primary',
                action: () => this.handleChangeDisplayName()
            }
        ]);

        // Focus the input field and add enter key handler
        setTimeout(() => {
            const input = document.getElementById('new-display-name');
            if (input) {
                input.focus();
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.handleChangeDisplayName();
                    }
                });
            }
        }, 100);
    },

    // Handle display name change
    async handleChangeDisplayName() {
        const input = document.getElementById('new-display-name');
        const newName = input ? input.value.trim() : '';
        
        if (!newName) {
            this.showToast('Please enter a display name', '#ff0000');
            return;
        }

        if (newName.length < 3) {
            this.showToast('Display name must be at least 3 characters', '#ff0000');
            return;
        }

        if (newName.length > 30) {
            this.showToast('Display name must be 30 characters or less', '#ff0000');
            return;
        }

        // Check for invalid characters
        const invalidChars = /[<>@#$%^&*()+=\[\]{}|\\:";'?,./`~]/;
        if (invalidChars.test(newName)) {
            this.showToast('Display name contains invalid characters', '#ff0000');
            return;
        }        try {
            // Show loading state
            const saveButton = document.querySelector('.modal-actions button[style*="primary"]');
            if (saveButton) {
                saveButton.textContent = 'Updating...';
                saveButton.disabled = true;
            }
            
            // Update display name in Firebase Auth and all leaderboard entries
            await window.firebaseSystem.updateDisplayName(newName);
              // Close modal and show success
            this.closeModal();
            this.showToast(`Display name updated to "${newName}"! Your leaderboard entries will be updated where possible.`, '#00ff00');
            
            // Refresh the UI to show the new name
            this.updateUI();
              } catch (error) {
            console.error('Failed to update display name:', error);
            this.showToast('Failed to update display name. Please try again.', '#ff0000');
            
            // Reset button state on error
            const saveButton = document.querySelector('.modal-actions button[style*="primary"]');
            if (saveButton) {
                saveButton.textContent = 'Save Name';
                saveButton.disabled = false;
            }
        }
    },
    
    // Show leaderboard
    async showLeaderboard() {
        this.showModal('🏆 Leaderboard', '<div style="text-align: center; color: #ffffff;">Loading...</div>');
        
        try {
            const topScores = await window.leaderboardSystem.getTopScores(10);
            const userRank = await window.leaderboardSystem.getUserRank();
            
            let leaderboardHTML = '<div style="color: #ffffff;">';
              if (userRank) {
                leaderboardHTML += `<div style="margin-bottom: 20px; padding: 15px; background: linear-gradient(145deg, rgba(0, 255, 0, 0.15), rgba(0, 255, 0, 0.05)); border: 1px solid #00ff00; border-radius: 8px; text-align: center;">
                    <div style="color: #00ff00; font-size: 16px; font-weight: bold;">🏆 Your Rank: #${userRank}</div>
                    <div style="color: #aaaaaa; font-size: 12px; margin-top: 5px;">out of all players</div>
                </div>`;
            }
            
            leaderboardHTML += '<div style="text-align: left;">';
              if (topScores.length === 0) {
                leaderboardHTML += `
                    <div style="text-align: center; padding: 40px 20px; color: #aaaaaa;">
                        <div style="font-size: 48px; margin-bottom: 15px;">🏆</div>
                        <div style="font-size: 16px; margin-bottom: 10px;">No scores yet!</div>
                        <div style="font-size: 12px;">Be the first to submit a score and claim the top spot!</div>
                    </div>
                `;
            } else {                topScores.forEach((entry, index) => {
                    const rank = index + 1;
                    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
                    
                    // Debug logging for score data
                    console.log('Leaderboard entry:', entry);
                    
                    // Clean up display name - show only username part of email, or display name
                    let displayName = entry.displayName || 'Anonymous';
                    if (displayName.includes('@') && !entry.displayName) {
                        // If it's an email and no custom display name, show only the username part
                        displayName = displayName.split('@')[0];
                    }
                    // Limit display name length
                    if (displayName.length > 20) {
                        displayName = displayName.substring(0, 17) + '...';
                    }
                      // Handle distance and zone data
                    const distance = entry.distance || 0;
                    const zone = entry.zone || 1;
                    
                    leaderboardHTML += `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom: 8px; background: rgba(255, 255, 255, 0.08); border-radius: 8px; border-left: 3px solid ${rank <= 3 ? '#ffd700' : '#555555'};">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span style="min-width: 35px; font-weight: bold; color: ${rank <= 3 ? '#ffd700' : '#ffffff'};">${medal}</span>
                                <span style="font-weight: bold; color: #ffffff;">${displayName}</span>
                            </div>
                            <div style="text-align: right; font-size: 12px;">
                                <div style="color: #00ff00; font-weight: bold; font-size: 14px;">${distance.toLocaleString()}m</div>
                                <div style="color: #aaaaaa;">Zone ${zone}</div>
                            </div>
                        </div>
                    `;
                });
            }
            
            leaderboardHTML += '</div></div>';
            
            // Update modal content
            const modalContent = document.querySelector('#auth-modal .modal-content');
            if (modalContent) {
                modalContent.innerHTML = leaderboardHTML;
            }
            
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
            const modalContent = document.querySelector('#auth-modal .modal-content');
            if (modalContent) {
                modalContent.innerHTML = '<div style="color: #ff0000; text-align: center;">Failed to load leaderboard</div>';
            }
        }
    },
    
    // Sign in with Google
    async signInWithGoogle() {
        try {
            this.showToast('Signing in...', '#3333ff');
            const user = await window.firebaseSystem.signInWithGoogle();
            this.showToast(`Welcome, ${user.displayName || 'Player'}!`, '#00ff00');
        } catch (error) {
            console.error('Google sign-in failed:', error);
            this.showToast('Sign-in failed. Please try again.', '#ff0000');
        }
    },
    
    // Sign in anonymously
    async signInAnonymously() {
        try {
            this.showToast('Signing in as guest...', '#3333ff');
            await window.firebaseSystem.signInAnonymously();
            this.showToast('Playing as guest!', '#00ff00');
        } catch (error) {
            console.error('Anonymous sign-in failed:', error);
            this.showToast('Failed to sign in. Please try again.', '#ff0000');
        }
    },
    
    // Update UI based on auth state
    updateUI() {
        const authButton = document.getElementById('auth-button');
        const userProfile = document.getElementById('user-profile');
        
        if (!authButton || !userProfile) return;
        
        if (window.firebaseSystem && window.firebaseSystem.isSignedIn()) {
            const user = window.firebaseSystem.getCurrentUser();
            const userName = user.displayName || user.email || 'Guest';
            
            authButton.textContent = '⚙️';
            authButton.title = 'Profile & Settings';
            
            userProfile.style.display = 'flex';
            userProfile.innerHTML = `
                ${user.photoURL ? 
                    `<img src="${user.photoURL}" style="width: 20px; height: 20px; border-radius: 50%;">` : 
                    '<span style="color: #00ff00;">👤</span>'
                }
                <span style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${userName}
                </span>
            `;
        } else {
            authButton.textContent = '🔑 Sign In';
            authButton.title = 'Sign in to save progress';
            userProfile.style.display = 'none';
        }
    },
    
    // Show modal dialog
    showModal(title, content, buttons = []) {
        // Remove existing modal
        this.closeModal();
        
        const overlay = document.createElement('div');
        overlay.id = 'auth-modal';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 20000;
            font-family: 'Courier New', monospace;
        `;
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: linear-gradient(145deg, #1a1a2e, #16213e);
            border: 2px solid #00ff00;
            border-radius: 15px;
            padding: 30px;
            max-width: 450px;
            min-width: 350px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 0 30px rgba(0, 255, 0, 0.5);
        `;
          modal.innerHTML = `
            <h2 style="color: #00ff00; margin: 0 0 20px 0; text-align: center;">${title}</h2>
            <div class="modal-content">${content}</div>
            ${buttons.length > 0 ? `
                <div style="display: flex; gap: 10px; margin-top: 20px; justify-content: center;">
                    ${buttons.map((btn, index) => `
                        <button class="modal-btn" data-button-index="${index}" style="
                            background: ${btn.style === 'secondary' ? 'linear-gradient(145deg, #555555, #777777)' : 'linear-gradient(145deg, #2222aa, #3333ff)'};
                            border: none;
                            color: #ffffff;
                            padding: 10px 20px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-family: inherit;
                        ">${btn.text}</button>
                    `).join('')}
                </div>
            ` : ''}
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Add button event listeners
        buttons.forEach((btn, index) => {
            const buttonElement = modal.querySelector(`[data-button-index="${index}"]`);
            if (buttonElement) {
                buttonElement.addEventListener('click', btn.action);
            }
        });
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeModal();
            }
        });
    },
    
    // Close modal
    closeModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) {
            document.body.removeChild(modal);
        }
    },
    
    // Show toast notification
    showToast(message, color = '#00ff00') {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: linear-gradient(145deg, #1a1a2e, #16213e);
            border: 1px solid ${color};
            color: ${color};
            padding: 12px 20px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            z-index: 25000;
            animation: slideInToast 0.3s ease-out;
            box-shadow: 0 0 15px ${color}33;
        `;
        
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Add animation styles
        if (!document.querySelector('#toast-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-styles';
            style.textContent = `
                @keyframes slideInToast {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 3000);
    },
    
    // Show email sign-in form
    showEmailSignInForm() {
        this.showModal('Email Sign In', `
            <div style="color: #ffffff;">
                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <button id="signin-tab" class="auth-tab active" style="
                        flex: 1;
                        background: linear-gradient(145deg, #2222aa, #3333ff);
                        border: none;
                        color: #ffffff;
                        padding: 10px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-family: inherit;
                        font-size: 14px;
                    ">Sign In</button>
                    <button id="signup-tab" class="auth-tab" style="
                        flex: 1;
                        background: linear-gradient(145deg, #555555, #777777);
                        border: none;
                        color: #ffffff;
                        padding: 10px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-family: inherit;
                        font-size: 14px;
                    ">Create Account</button>
                </div>
                
                <div id="signin-form" class="auth-form">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: #aaaaaa;">Email:</label>
                        <input type="email" id="signin-email" style="
                            width: 100%;
                            padding: 10px;
                            border: 1px solid #555;
                            border-radius: 6px;
                            background: #333;
                            color: #fff;
                            font-family: inherit;
                            box-sizing: border-box;
                        " placeholder="Enter your email">
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; color: #aaaaaa;">Password:</label>
                        <input type="password" id="signin-password" style="
                            width: 100%;
                            padding: 10px;
                            border: 1px solid #555;
                            border-radius: 6px;
                            background: #333;
                            color: #fff;
                            font-family: inherit;
                            box-sizing: border-box;
                        " placeholder="Enter your password">
                    </div>
                    
                    <button id="signin-submit" style="
                        width: 100%;
                        background: linear-gradient(145deg, #2222aa, #3333ff);
                        border: none;
                        color: #ffffff;
                        padding: 12px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-family: inherit;
                        font-size: 14px;
                        font-weight: bold;
                        margin-bottom: 10px;
                    ">Sign In</button>
                    
                    <button id="forgot-password" style="
                        width: 100%;
                        background: transparent;
                        border: 1px solid #555;
                        color: #aaaaaa;
                        padding: 8px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-family: inherit;
                        font-size: 12px;
                    ">Forgot Password?</button>
                </div>
                
                <div id="signup-form" class="auth-form" style="display: none;">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: #aaaaaa;">Display Name:</label>
                        <input type="text" id="signup-name" style="
                            width: 100%;
                            padding: 10px;
                            border: 1px solid #555;
                            border-radius: 6px;
                            background: #333;
                            color: #fff;
                            font-family: inherit;
                            box-sizing: border-box;
                        " placeholder="Your name (optional)">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: #aaaaaa;">Email:</label>
                        <input type="email" id="signup-email" style="
                            width: 100%;
                            padding: 10px;
                            border: 1px solid #555;
                            border-radius: 6px;
                            background: #333;
                            color: #fff;
                            font-family: inherit;
                            box-sizing: border-box;
                        " placeholder="Enter your email">
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; color: #aaaaaa;">Password:</label>
                        <input type="password" id="signup-password" style="
                            width: 100%;
                            padding: 10px;
                            border: 1px solid #555;
                            border-radius: 6px;
                            background: #333;
                            color: #fff;
                            font-family: inherit;
                            box-sizing: border-box;
                        " placeholder="Create a password (min 6 characters)">
                    </div>
                    
                    <button id="signup-submit" style="
                        width: 100%;
                        background: linear-gradient(145deg, #228822, #33aa33);
                        border: none;
                        color: #ffffff;
                        padding: 12px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-family: inherit;
                        font-size: 14px;
                        font-weight: bold;
                    ">Create Account</button>
                </div>
                
                <div id="auth-error" style="
                    margin-top: 15px;
                    padding: 10px;
                    background: rgba(255, 0, 0, 0.1);
                    border: 1px solid #ff0000;
                    border-radius: 6px;
                    color: #ff0000;
                    font-size: 12px;
                    display: none;
                "></div>
            </div>
        `, [
            {
                text: 'Back',
                style: 'secondary',
                action: () => {
                    this.closeModal();
                    this.showSignInMenu();
                }
            },
            {
                text: 'Cancel',
                style: 'secondary',
                action: () => this.closeModal()
            }
        ]);
        
        // Add tab switching
        document.getElementById('signin-tab').addEventListener('click', () => {
            this.switchAuthTab('signin');
        });
        
        document.getElementById('signup-tab').addEventListener('click', () => {
            this.switchAuthTab('signup');
        });
        
        // Add form submissions
        document.getElementById('signin-submit').addEventListener('click', async () => {
            await this.handleEmailSignIn();
        });
        
        document.getElementById('signup-submit').addEventListener('click', async () => {
            await this.handleEmailSignUp();
        });
        
        document.getElementById('forgot-password').addEventListener('click', async () => {
            await this.handleForgotPassword();
        });
        
        // Add enter key support
        const addEnterKeyListener = (elementId, handler) => {
            document.getElementById(elementId).addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handler();
                }
            });
        };
        
        addEnterKeyListener('signin-email', () => document.getElementById('signin-submit').click());
        addEnterKeyListener('signin-password', () => document.getElementById('signin-submit').click());
        addEnterKeyListener('signup-email', () => document.getElementById('signup-submit').click());
        addEnterKeyListener('signup-password', () => document.getElementById('signup-submit').click());
    },
    
    // Switch between sign-in and sign-up tabs
    switchAuthTab(tab) {
        const signinTab = document.getElementById('signin-tab');
        const signupTab = document.getElementById('signup-tab');
        const signinForm = document.getElementById('signin-form');
        const signupForm = document.getElementById('signup-form');
        const errorDiv = document.getElementById('auth-error');
        
        // Hide error
        errorDiv.style.display = 'none';
        
        if (tab === 'signin') {
            signinTab.style.background = 'linear-gradient(145deg, #2222aa, #3333ff)';
            signupTab.style.background = 'linear-gradient(145deg, #555555, #777777)';
            signinForm.style.display = 'block';
            signupForm.style.display = 'none';
        } else {
            signinTab.style.background = 'linear-gradient(145deg, #555555, #777777)';
            signupTab.style.background = 'linear-gradient(145deg, #228822, #33aa33)';
            signinForm.style.display = 'none';
            signupForm.style.display = 'block';
        }
    },
    
    // Handle email sign-in
    async handleEmailSignIn() {
        const email = document.getElementById('signin-email').value.trim();
        const password = document.getElementById('signin-password').value;
        const errorDiv = document.getElementById('auth-error');
        
        if (!email || !password) {
            this.showAuthError('Please enter both email and password.');
            return;
        }
        
        try {
            errorDiv.style.display = 'none';
            const user = await window.firebaseSystem.signInWithEmail(email, password);
            this.closeModal();
            this.showToast(`Welcome back, ${user.displayName || user.email}!`, '#00ff00');
        } catch (error) {
            this.showAuthError(this.getAuthErrorMessage(error));
        }
    },
    
    // Handle email sign-up
    async handleEmailSignUp() {
        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const errorDiv = document.getElementById('auth-error');
        
        if (!email || !password) {
            this.showAuthError('Please enter both email and password.');
            return;
        }
        
        if (password.length < 6) {
            this.showAuthError('Password must be at least 6 characters long.');
            return;
        }
        
        try {
            errorDiv.style.display = 'none';
            const user = await window.firebaseSystem.createAccountWithEmail(email, password, name);
            this.closeModal();
            this.showToast(`Welcome to ByteSurge, ${user.displayName || user.email}!`, '#00ff00');
        } catch (error) {
            this.showAuthError(this.getAuthErrorMessage(error));
        }
    },
    
    // Handle forgot password
    async handleForgotPassword() {
        const email = document.getElementById('signin-email').value.trim();
        
        if (!email) {
            this.showAuthError('Please enter your email address first.');
            return;
        }
        
        try {
            await window.firebaseSystem.resetPassword(email);
            this.showToast('Password reset email sent! Check your inbox.', '#00ff00');
            this.closeModal();
        } catch (error) {
            this.showAuthError(this.getAuthErrorMessage(error));
        }
    },
    
    // Show authentication error
    showAuthError(message) {
        const errorDiv = document.getElementById('auth-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    },
    
    // Get user-friendly error message
    getAuthErrorMessage(error) {
        switch (error.code) {
            case 'auth/user-not-found':
                return 'No account found with this email address.';
            case 'auth/wrong-password':
                return 'Incorrect password. Please try again.';
            case 'auth/email-already-in-use':
                return 'An account with this email already exists.';
            case 'auth/weak-password':
                return 'Password is too weak. Please choose a stronger password.';
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            case 'auth/too-many-requests':
                return 'Too many failed attempts. Please try again later.';
            default:
                return error.message || 'An error occurred. Please try again.';
        }
    },

    // ...existing code...
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    authUI.init();
});

// Export to global scope
window.authUI = authUI;
