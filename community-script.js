// Global variables
let currentUser = null;
let currentFilter = 'all';
let posts = [];

// Wait for Firebase to be ready
window.addEventListener('firebaseReady', () => {
    initializeAuth();
    loadPosts();
});

// Authentication functions
function initializeAuth() {
    window.onAuthStateChanged(window.firebaseAuth, (user) => {
        if (user) {
            currentUser = user;
            showUserMenu(user);
            showPostCreator();
        } else {
            currentUser = null;
            showLoginButton();
            hidePostCreator();
        }
    });
}

function showUserMenu(user) {
    document.getElementById('loginBtn').style.display = 'none';
    document.getElementById('userMenu').style.display = 'flex';
    
    // Display user name (use display name or email)
    const userName = user.displayName || user.email.split('@')[0];
    document.getElementById('userName').textContent = userName;
}

function showLoginButton() {
    document.getElementById('loginBtn').style.display = 'block';
    document.getElementById('userMenu').style.display = 'none';
}

function showPostCreator() {
    document.getElementById('postCreator').style.display = 'block';
}

function hidePostCreator() {
    document.getElementById('postCreator').style.display = 'none';
}

// Modal functions
function showAuthModal() {
    document.getElementById('authOverlay').style.display = 'flex';
}

function hideAuthModal() {
    document.getElementById('authOverlay').style.display = 'none';
    clearAuthForms();
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
    
    // Update forms
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    document.getElementById(tabName + 'Form').classList.add('active');
}

function clearAuthForms() {
    document.querySelectorAll('.auth-form input').forEach(input => input.value = '');
    document.getElementById('authError').style.display = 'none';
}

// Authentication actions
async function signIn() {
    const email = document.getElementById('signinEmail').value;
    const password = document.getElementById('signinPassword').value;
    
    if (!email || !password) {
        showAuthError('Please fill in all fields');
        return;
    }
    
    try {
        await window.firebaseSignInWithEmailAndPassword(window.firebaseAuth, email, password);
        hideAuthModal();
        showToast('Successfully signed in!', 'success');
    } catch (error) {
        console.error('Sign in error:', error);
        showAuthError(getErrorMessage(error.code));
    }
}

async function signUp() {
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!email || !password || !confirmPassword) {
        showAuthError('Please fill in all fields');
        return;
    }
    
    if (password !== confirmPassword) {
        showAuthError('Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        showAuthError('Password must be at least 6 characters');
        return;
    }
    
    try {
        await window.firebaseCreateUserWithEmailAndPassword(window.firebaseAuth, email, password);
        hideAuthModal();
        showToast('Account created successfully!', 'success');
    } catch (error) {
        console.error('Sign up error:', error);
        showAuthError(getErrorMessage(error.code));
    }
}

async function signInWithGoogle() {
    try {
        await window.firebaseSignInWithPopup(window.firebaseAuth, window.googleProvider);
        hideAuthModal();
        showToast('Successfully signed in with Google!', 'success');
    } catch (error) {
        console.error('Google sign in error:', error);
        showAuthError(getErrorMessage(error.code));
    }
}

async function signInWithGithub() {
    try {
        await window.firebaseSignInWithPopup(window.firebaseAuth, window.githubProvider);
        hideAuthModal();
        showToast('Successfully signed in with GitHub!', 'success');
    } catch (error) {
        console.error('GitHub sign in error:', error);
        showAuthError(getErrorMessage(error.code));
    }
}

async function logout() {
    try {
        await window.firebaseSignOut(window.firebaseAuth);
        showToast('Successfully signed out!', 'success');
    } catch (error) {
        console.error('Sign out error:', error);
        showToast('Error signing out', 'error');
    }
}

function showAuthError(message) {
    const errorDiv = document.getElementById('authError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function getErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/user-not-found':
            return 'No account found with this email';
        case 'auth/wrong-password':
            return 'Incorrect password';
        case 'auth/email-already-in-use':
            return 'An account with this email already exists';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters';
        case 'auth/invalid-email':
            return 'Invalid email address';
        case 'auth/popup-closed-by-user':
            return 'Sign-in was cancelled';
        case 'auth/cancelled-popup-request':
            return 'Only one sign-in popup is allowed at a time';
        default:
            return 'An error occurred. Please try again.';
    }
}

// Post functions
async function createPost() {
    if (!currentUser) {
        showAuthModal();
        return;
    }
    
    const content = document.getElementById('postContent').value.trim();
    const category = document.getElementById('postCategory').value;
    
    if (!content) {
        showToast('Please enter some content for your post', 'error');
        return;
    }
    
    if (content.length > 1000) {
        showToast('Post content is too long (max 1000 characters)', 'error');
        return;
    }
    
    try {
        const post = {
            content: content,
            category: category,
            authorId: currentUser.uid,
            authorName: currentUser.displayName || currentUser.email.split('@')[0],
            authorEmail: currentUser.email,
            timestamp: window.firestoreServerTimestamp(),
            likes: 0,
            likedBy: []
        };
        
        await window.firestoreAddDoc(window.firestoreCollection(window.firebaseDb, 'posts'), post);
        
        // Clear the form
        document.getElementById('postContent').value = '';
        document.getElementById('postCategory').value = 'general';
        
        showToast('Post created successfully!', 'success');
        loadPosts(); // Reload posts
        
    } catch (error) {
        console.error('Error creating post:', error);
        showToast('Error creating post. Please try again.', 'error');
    }
}

async function loadPosts() {
    const container = document.getElementById('postsContainer');
    container.innerHTML = '<div class="loading">Loading posts...</div>';
    
    try {
        const q = window.firestoreQuery(
            window.firestoreCollection(window.firebaseDb, 'posts'),
            window.firestoreOrderBy('timestamp', 'desc'),
            window.firestoreLimit(50)
        );
        
        const querySnapshot = await window.firestoreGetDocs(q);
        posts = [];
        
        querySnapshot.forEach((doc) => {
            posts.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        renderPosts();
        
    } catch (error) {
        console.error('Error loading posts:', error);
        container.innerHTML = '<div class="loading">Error loading posts. Please try again later.</div>';
    }
}

function renderPosts() {
    const container = document.getElementById('postsContainer');
    
    // Filter posts based on current filter
    let filteredPosts = posts;
    if (currentFilter !== 'all') {
        filteredPosts = posts.filter(post => post.category === currentFilter);
    }
    
    if (filteredPosts.length === 0) {
        container.innerHTML = '<div class="loading">No posts found. Be the first to share something!</div>';
        return;
    }
    
    container.innerHTML = filteredPosts.map(post => createPostHTML(post)).join('');
}

function createPostHTML(post) {
    const timeAgo = formatTimeAgo(post.timestamp);
    const categoryLabel = getCategoryLabel(post.category);
    
    return `
        <div class="post" data-post-id="${post.id}">
            <div class="post-header">
                <div class="post-author">
                    <span class="post-author-name">${escapeHtml(post.authorName)}</span>
                    <span class="post-timestamp">${timeAgo}</span>
                </div>
                <div class="post-category">${categoryLabel}</div>
            </div>
            <div class="post-content">${escapeHtml(post.content)}</div>
            <div class="post-actions">
                <button class="post-action" onclick="likePost('${post.id}')">
                    <span>👍</span>
                    <span>${post.likes || 0}</span>
                </button>
                <button class="post-action" onclick="sharePost('${post.id}')">
                    <span>🔗</span>
                    <span>Share</span>
                </button>
            </div>
        </div>
    `;
}

function getCategoryLabel(category) {
    const labels = {
        'general': 'General',
        'tips': 'Tips & Strategies',
        'updates': 'Game Updates',
        'feedback': 'Feedback',
        'showcase': 'Showcase'
    };
    return labels[category] || 'General';
}

function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Just now';
    
    const now = new Date();
    const postTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffMs = now - postTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return postTime.toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Post actions
async function likePost(postId) {
    if (!currentUser) {
        showAuthModal();
        return;
    }
    
    try {
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        
        const userHasLiked = post.likedBy && post.likedBy.includes(currentUser.uid);
        const newLikes = userHasLiked ? (post.likes - 1) : (post.likes + 1);
        const newLikedBy = userHasLiked 
            ? (post.likedBy || []).filter(uid => uid !== currentUser.uid)
            : [...(post.likedBy || []), currentUser.uid];
        
        const postRef = window.firestoreDoc(window.firebaseDb, 'posts', postId);
        await window.firestoreUpdateDoc(postRef, {
            likes: newLikes,
            likedBy: newLikedBy
        });
        
        // Update local data
        post.likes = newLikes;
        post.likedBy = newLikedBy;
        renderPosts();
        
    } catch (error) {
        console.error('Error liking post:', error);
        showToast('Error updating like. Please try again.', 'error');
    }
}

function sharePost(postId) {
    const url = `${window.location.href}#post-${postId}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'GlitchRealm Community Post',
            url: url
        }).catch(err => console.log('Error sharing:', err));
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(url).then(() => {
            showToast('Post link copied to clipboard!', 'success');
        }).catch(() => {
            showToast('Unable to copy link', 'error');
        });
    }
}

// Filter functions
function filterPosts(category) {
    currentFilter = category;
    
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Re-render posts with new filter
    renderPosts();
}

// Toast notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// Utility functions
function handleKeyPress(event, action) {
    if (event.key === 'Enter') {
        if (event.shiftKey) {
            // Allow new line with Shift+Enter
            return;
        } else {
            event.preventDefault();
            if (action === 'createPost') {
                createPost();
            }
        }
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Add keyboard shortcut for post creation
    const postTextarea = document.getElementById('postContent');
    if (postTextarea) {
        postTextarea.addEventListener('keydown', function(event) {
            handleKeyPress(event, 'createPost');
        });
    }
    
    // Close modal when clicking outside
    document.getElementById('authOverlay').addEventListener('click', function(event) {
        if (event.target === this) {
            hideAuthModal();
        }
    });
    
    // Auto-resize textarea
    if (postTextarea) {
        postTextarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 200) + 'px';
        });
    }
});

// Refresh posts every 30 seconds
setInterval(() => {
    if (currentUser) {
        loadPosts();
    }
}, 30000);
