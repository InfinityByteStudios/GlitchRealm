/**
 * GlitchRealm Portal - Main Script
 * Handles user authentication, profile management, and playtime tracking
 */

// Load header and footer
function loadHeaderFooter() {
    // Load header
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {
        fetch('header.html')
            .then(response => response.text())
            .then(data => {
                headerPlaceholder.innerHTML = data;
                setupAuthUI(); // Set up auth UI after header is loaded
            })
            .catch(error => console.error('Error loading header:', error));
    }
    
    // Load footer
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder) {
        fetch('footer.html')
            .then(response => response.text())
            .then(data => {
                footerPlaceholder.innerHTML = data;
            })
            .catch(error => console.error('Error loading footer:', error));
    }
}

// Set up authentication UI
function setupAuthUI() {
    // Get sign in button
    const signInBtn = document.getElementById('sign-in-btn');
    const userProfile = document.getElementById('user-profile');
    const signOutBtn = document.getElementById('sign-out-dropdown-btn');
    const authModal = document.getElementById('auth-modal');
    const closeModal = document.querySelector('.close-modal');
    
    // Auth tabs
    const authTabs = document.querySelectorAll('.auth-tab');
    const authForms = document.querySelectorAll('.auth-form');
    
    // Sign in form
    const signinForm = document.getElementById('signin-form');
    const signinEmail = document.getElementById('signin-email');
    const signinPassword = document.getElementById('signin-password');
    const signinButton = document.getElementById('signin-button');
    const signinError = document.getElementById('signin-error');
    
    // Sign up form
    const signupForm = document.getElementById('signup-form');
    const signupEmail = document.getElementById('signup-email');
    const signupPassword = document.getElementById('signup-password');
    const signupConfirmPassword = document.getElementById('signup-confirm-password');
    const signupButton = document.getElementById('signup-button');
    const signupError = document.getElementById('signup-error');
    
    // Forgot password
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const resetEmail = document.getElementById('reset-email');
    const resetButton = document.getElementById('reset-button');
    const resetError = document.getElementById('reset-error');
    const resetSuccess = document.getElementById('reset-success');
    const backToSigninLink = document.getElementById('back-to-signin-link');
    
    // Auth spinner
    const authSpinner = document.getElementById('auth-spinner');
    
    // Show auth modal when sign in button is clicked
    if (signInBtn) {
        signInBtn.addEventListener('click', () => {
            authModal.style.display = 'block';
        });
    }
    
    // Close modal when X is clicked
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            authModal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === authModal) {
            authModal.style.display = 'none';
        }
    });
    
    // Tab switching
    if (authTabs) {
        authTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs and forms
                authTabs.forEach(t => t.classList.remove('active'));
                authForms.forEach(f => f.classList.remove('active'));
                
                // Add active class to clicked tab
                tab.classList.add('active');
                
                // Show corresponding form
                const formId = tab.dataset.tab + '-form';
                document.getElementById(formId).classList.add('active');
                
                // Clear errors
                signinError.textContent = '';
                signupError.textContent = '';
            });
        });
    }
    
    // Forgot password link
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Hide signin form, show forgot password form
            signinForm.classList.remove('active');
            forgotPasswordForm.classList.add('active');
            
            // Clear errors
            resetError.textContent = '';
            resetSuccess.textContent = '';
        });
    }
    
    // Back to sign in link
    if (backToSigninLink) {
        backToSigninLink.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Hide forgot password form, show signin form
            forgotPasswordForm.classList.remove('active');
            signinForm.classList.add('active');
            
            // Clear errors
            signinError.textContent = '';
        });
    }
    
    // Sign out button
    if (signOutBtn) {
        signOutBtn.addEventListener('click', () => {
            window.firebaseAuth.signOut().then(() => {
                
                // Hide user profile, show sign in button
                userProfile.style.display = 'none';
                signInBtn.style.display = 'block';
                
                // Redirect to home page
                window.location.href = 'index.html';
            }).catch((error) => {
                console.error('Error signing out:', error);
            });
        });
    }
    
    // Sign in form submission
    if (signinButton) {
        signinButton.addEventListener('click', () => {
            const email = signinEmail.value.trim();
            const password = signinPassword.value;
            
            if (!email || !password) {
                signinError.textContent = 'Please enter both email and password.';
                return;
            }
            
            // Show spinner
            authSpinner.style.display = 'flex';
            
            // Sign in with email and password
            window.firebaseAuth.signInWithEmailAndPassword(window.firebaseAuth, email, password)
                .then((userCredential) => {
                    // Hide spinner
                    authSpinner.style.display = 'none';
                    
                    // Close modal
                    authModal.style.display = 'none';
                    
                    // Clear form
                    signinForm.reset();
                })
                .catch((error) => {
                    // Hide spinner
                    authSpinner.style.display = 'none';
                    
                    // Show error message
                    switch (error.code) {
                        case 'auth/user-not-found':
                        case 'auth/wrong-password':
                            signinError.textContent = 'Invalid email or password.';
                            break;
                        case 'auth/too-many-requests':
                            signinError.textContent = 'Too many failed login attempts. Please try again later.';
                            break;
                        default:
                            signinError.textContent = error.message;
                    }
                });
        });
    }
    
    // Sign up form submission
    if (signupButton) {
        signupButton.addEventListener('click', () => {
            const email = signupEmail.value.trim();
            const password = signupPassword.value;
            const confirmPassword = signupConfirmPassword.value;
            
            if (!email || !password || !confirmPassword) {
                signupError.textContent = 'Please fill in all fields.';
                return;
            }
            
            if (password !== confirmPassword) {
                signupError.textContent = 'Passwords do not match.';
                return;
            }
            
            if (password.length < 6) {
                signupError.textContent = 'Password must be at least 6 characters.';
                return;
            }
            
            // Show spinner
            authSpinner.style.display = 'flex';
            
            // Create user with email and password
            window.firebaseAuth.createUserWithEmailAndPassword(window.firebaseAuth, email, password)
                .then((userCredential) => {
                    // Hide spinner
                    authSpinner.style.display = 'none';
                    
                    // Close modal
                    authModal.style.display = 'none';
                    
                    // Clear form
                    signupForm.reset();
                })
                .catch((error) => {
                    // Hide spinner
                    authSpinner.style.display = 'none';
                    
                    // Show error message
                    switch (error.code) {
                        case 'auth/email-already-in-use':
                            signupError.textContent = 'This email is already in use.';
                            break;
                        case 'auth/invalid-email':
                            signupError.textContent = 'Please enter a valid email address.';
                            break;
                        default:
                            signupError.textContent = error.message;
                    }
                });
        });
    }
    
    // Reset password form submission
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            const email = resetEmail.value.trim();
            
            if (!email) {
                resetError.textContent = 'Please enter your email address.';
                return;
            }
            
            // Show spinner
            authSpinner.style.display = 'flex';
            
            // Send password reset email
            window.firebaseAuth.sendPasswordResetEmail(window.firebaseAuth, email)
                .then(() => {
                    // Hide spinner
                    authSpinner.style.display = 'none';
                    
                    // Show success message
                    resetSuccess.textContent = 'Password reset email sent. Check your inbox.';
                    resetError.textContent = '';
                    
                    // Clear form
                    resetEmail.value = '';
                })
                .catch((error) => {
                    // Hide spinner
                    authSpinner.style.display = 'none';
                    
                    // Show error message
                    resetSuccess.textContent = '';
                    
                    switch (error.code) {
                        case 'auth/user-not-found':
                            resetError.textContent = 'No account found with this email.';
                            break;
                        case 'auth/invalid-email':
                            resetError.textContent = 'Please enter a valid email address.';
                            break;
                        default:
                            resetError.textContent = error.message;
                    }
                });
        });
    }
}

// Initialize the user portal
function initializeUserPortal() {
    
    // DOM Elements
    const profileSection = document.getElementById('profile-section');
    const loginPrompt = document.getElementById('login-prompt');
    const userEmail = document.getElementById('user-email');
    const playtimeLoading = document.getElementById('playtime-loading');
    const playtimeList = document.getElementById('playtime-list');
    
    // Listen for auth state changes
    window.onAuthStateChanged(window.firebaseAuth, (user) => {
        if (user) {
            
            // Show profile section, hide login prompt
            profileSection.style.display = 'block';
            loginPrompt.style.display = 'none';
            
            // Update UI with user info
            userEmail.textContent = user.email;
            
            // Load user data (playtime, etc.)
            loadUserData(user.uid);
        } else {
            
            // Hide profile section, show login prompt
            profileSection.style.display = 'none';
            loginPrompt.style.display = 'block';
            
            // Clear playtime data
            playtimeLoading.style.display = 'block';
            playtimeList.style.display = 'none';
            playtimeLoading.innerHTML = '<p>Sign in to view your gameplay stats.</p>';
        }
    });
    
    // Set up event listeners
    setupEventListeners();
}

// Set up event listeners for buttons and forms
function setupEventListeners() {
    // Change Email button
    const changeEmailBtn = document.getElementById('change-email-btn');
    const changeEmailForm = document.getElementById('change-email-form');
    
    if (changeEmailBtn) {
        changeEmailBtn.addEventListener('click', () => {
            changeEmailForm.style.display = 'block';
        });
    }
    
    // Email change form submission
    const emailForm = document.getElementById('email-form');
    
    if (emailForm) {
        emailForm.addEventListener('submit', updateUserEmail);
    }
    
    // Cancel button for email change
    const cancelEmailBtn = document.getElementById('cancel-email-btn');
    
    if (cancelEmailBtn) {
        cancelEmailBtn.addEventListener('click', () => {
            changeEmailForm.style.display = 'none';
            document.getElementById('error-message').style.display = 'none';
        });
    }
    
    // Sign out button
    const signOutBtn = document.getElementById('sign-out-btn');
    
    if (signOutBtn) {
        signOutBtn.addEventListener('click', () => {
            window.firebaseAuth.signOut().then(() => {
                
                // Redirect to home page after sign out
                window.location.href = 'index.html';
            }).catch((error) => {
                console.error('Error signing out:', error);
            });
        });
    }
}

// Update user's email address
async function updateUserEmail(event) {
    event.preventDefault();
    
    const user = window.firebaseAuth.currentUser;
    const newEmail = document.getElementById('new-email').value;
    const password = document.getElementById('current-password').value;
    const errorMessage = document.getElementById('error-message');
    
    try {
        // Re-authenticate user before changing email
        const credential = window.EmailAuthProvider.credential(user.email, password);
        await window.reauthenticateWithCredential(user, credential);
        
        // Update email
        await window.updateEmail(user, newEmail);
        
        // Update UI
        document.getElementById('user-email').textContent = newEmail;
        document.getElementById('change-email-form').style.display = 'none';
        document.getElementById('email-form').reset();
        
    } catch (error) {
        console.error('Error updating email:', error);
        
        errorMessage.style.display = 'block';
        
        // Show user-friendly error message
        switch (error.code) {
            case 'auth/wrong-password':
                errorMessage.textContent = 'Incorrect password. Please try again.';
                break;
            case 'auth/email-already-in-use':
                errorMessage.textContent = 'This email is already in use by another account.';
                break;
            case 'auth/invalid-email':
                errorMessage.textContent = 'Please enter a valid email address.';
                break;
            default:
                errorMessage.textContent = 'Error updating email: ' + error.message;
        }
    }
}

// Load user data from Firestore
async function loadUserData(userId) {
    const playtimeList = document.getElementById('playtime-list');
    const playtimeLoading = document.getElementById('playtime-loading');
    const totalHoursElement = document.getElementById('total-hours');
    
    try {
        // Show loading spinner
        playtimeLoading.innerHTML = '<div class="spinner"></div><p>Loading your gameplay stats...</p>';
        
        // Load playtime data
        await loadPlaytimeData(userId);
        
        // Hide loading spinner (handled in loadPlaytimeData)
        
    } catch (error) {
        console.error('Error loading user data:', error);
        playtimeLoading.innerHTML = '<p>Error loading user data. Please try again later.</p>';
    }
}

// Load playtime data from Firestore
async function loadPlaytimeData(userId) {
    const playtimeList = document.getElementById('playtime-list');
    const playtimeLoading = document.getElementById('playtime-loading');
    const totalHoursElement = document.getElementById('total-hours');
    
    try {
        // Get both the global document and game-specific subcollection
        const db = window.firebaseFirestore;
        
        // Get both the global document and game-specific subcollection
        const globalRef = window.firestoreDoc(db, 'playtime', userId);
        const globalDoc = await window.firestoreGetDoc(globalRef);
        
        // Also get the games subcollection
        const gamesCollRef = window.firestoreCollection(db, 'playtime', userId, 'games');
        const gamesSnapshot = await window.firestoreGetDocs(gamesCollRef);
        
        // Process the playtime data
        let totalHours = 0;
        const gameMap = new Map(); // Use a Map to avoid duplicates
        
        // First, process the global document if it exists
        if (globalDoc.exists()) {
            const globalData = globalDoc.data();
            
            // Check if the document has games object
            if (globalData.games) {
                // Process each game in the games object
                Object.values(globalData.games).forEach(game => {
                    // Skip if no gameId
                    if (!game.gameId) return;
                    
                    // Calculate hours from totalMinutes if available
                    if (game.totalMinutes) {
                        game.hours = game.totalMinutes / 60;
                    } else {
                        game.hours = 0;
                    }
                    
                    // Add to map using gameId as key to avoid duplicates
                    gameMap.set(game.gameId, game);
                });
            }
        }
        
        // Then, process each game-specific document
        gamesSnapshot.forEach((doc) => {
            const gameData = doc.data();
            
            // Skip if no gameId
            if (!gameData.gameId) return;
            
            // Calculate hours from totalMinutes if available
            if (gameData.totalMinutes) {
                gameData.hours = gameData.totalMinutes / 60;
            } else {
                gameData.hours = 0;
            }
            
            // Add to map using gameId as key to avoid duplicates
            // This will override global data with game-specific data
            gameMap.set(gameData.gameId, gameData);
        });
        
        // Convert map values to array and calculate total hours
        const playtimeData = Array.from(gameMap.values());
        totalHours = playtimeData.reduce((sum, game) => sum + (game.hours || 0), 0);
        
        // Make sure all games are included in the list, even if they haven't been played yet
        const allGames = [
            { gameId: 'coderunner', gameName: 'CodeRunner', hours: 0, iconUrl: 'assets/game logos/coderunner logo.png' },
            { gameId: 'bytesurge', gameName: 'ByteSurge', hours: 0, iconUrl: 'assets/game logos/bytesurge.png' },
            { gameId: 'bytewars', gameName: 'NeuroCore: Byte Wars', hours: 0, iconUrl: 'assets/game logos/neurocore byte wars logo.png' },
            { gameId: 'shadowlight', gameName: 'ShadowLight', hours: 0, iconUrl: 'assets/game logos/shadowlight.png' }
        ];
        
        // Merge playtime data with all games list
        const mergedData = allGames.map(defaultGame => {
            // If we have playtime data for this game, use it, otherwise use the default
            const gameData = gameMap.get(defaultGame.gameId);
            return gameData ? { ...defaultGame, ...gameData } : defaultGame;
        });
        
        // Render the merged data
        renderPlaytimeList(mergedData);
        
        // Update total hours
        const totalHoursDisplay = formatPlaytime(totalHours);
        totalHoursElement.textContent = totalHoursDisplay;
        
        // Update the total hours label to match the units
        const totalPlaytimeLabel = document.querySelector('.total-playtime');
        if (totalPlaytimeLabel) {
            if (totalHours < 0.0167) { // Less than a minute
                totalPlaytimeLabel.innerHTML = `Total: <span id="total-hours" class="total-hours">${totalHoursDisplay}</span>`;
            } else if (totalHours < 1) { // Less than an hour
                totalPlaytimeLabel.innerHTML = `Total: <span id="total-hours" class="total-hours">${totalHoursDisplay}</span>`;
            } else {
                totalPlaytimeLabel.innerHTML = `Total: <span id="total-hours" class="total-hours">${totalHoursDisplay}</span>`;
            }
        }
        
        // Hide loading spinner
        playtimeLoading.style.display = 'none';
        playtimeList.style.display = 'block';
        
    } catch (error) {
        console.error('Error loading playtime data:', error);
        playtimeLoading.innerHTML = '<p>Error loading playtime data. Please try again later.</p>';
    }
}

// Helper function to format playtime based on duration
function formatPlaytime(hours) {
    if (hours < 0.001) { // Very small values
        return '0 seconds';
    } else if (hours < 0.0167) { // Less than a minute (0.0167 hours = 1 minute)
        const seconds = Math.round(hours * 3600);
        return seconds === 1 ? '1 second' : `${seconds} seconds`;
    } else if (hours < 1) { // Less than an hour
        const minutes = Math.round(hours * 60);
        return minutes === 1 ? '1 minute' : `${minutes} minutes`;
    } else {
        const hourValue = Math.round(hours * 10) / 10; // Round to 1 decimal
        return hourValue === 1 ? '1 hour' : `${hourValue.toFixed(1)} hours`;
    }
}

// Render playtime list
function renderPlaytimeList(playtimeData) {
    const playtimeList = document.getElementById('playtime-list');
    playtimeList.innerHTML = '';
    
    // Sort games by playtime (descending)
    playtimeData.sort((a, b) => b.hours - a.hours);
    
    playtimeData.forEach((game) => {
        // Commenting out this code to show all games even with 0 hours
        // if (game.hours === 0) {
        //     return;
        // }
        
        const listItem = document.createElement('li');
        listItem.className = 'playtime-item';
        
        // Game icon and name
        const gameInfo = document.createElement('div');
        gameInfo.className = 'game-info';
        
        const gameIcon = document.createElement('img');
        gameIcon.className = 'game-icon';
        
        // Determine the correct image URL based on gameId
        let imageUrl;
        if (game.iconUrl) {
            imageUrl = game.iconUrl;
        } else {
            // Fallback logic based on gameId
            switch(game.gameId) {
                case 'coderunner':
                    imageUrl = 'assets/game logos/coderunner logo.png';
                    break;
                case 'bytesurge':
                    imageUrl = 'assets/game logos/bytesurge.png';
                    break;
                case 'bytewars': // Updated ID to match what's in the GamePlaytimeTracker
                    imageUrl = 'assets/game logos/neurocore byte wars logo.png';
                    break;
                case 'shadowlight':
                    imageUrl = 'assets/game logos/shadowlight.png';
                    break;
                default:
                    imageUrl = 'assets/glitch realm favicon image.png';
            }
        }
        
        gameIcon.src = imageUrl;
        gameIcon.alt = game.gameName;
        
        const gameName = document.createElement('div');
        gameName.className = 'game-name';
        gameName.textContent = game.gameName;
        
        gameInfo.appendChild(gameIcon);
        gameInfo.appendChild(gameName);
        
        // Playtime display
        const gameTime = document.createElement('div');
        gameTime.className = 'game-time';
        
        // Format playtime based on duration
        let displayTime = typeof game.hours === 'number' ? 
            formatPlaytime(game.hours) : '0 seconds';
        
        gameTime.textContent = displayTime;
        
        listItem.appendChild(gameInfo);
        listItem.appendChild(gameTime);
        
        playtimeList.appendChild(listItem);
    });
}

// Call initialize function when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadHeaderFooter(); // Load header and footer
});
