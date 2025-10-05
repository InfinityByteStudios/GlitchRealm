// User Portal Auth Integration
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing user portal auth integration...');
    
    // Set up sign-in button in header
    const setupHeaderSignIn = function() {
        const signInBtn = document.getElementById('sign-in-btn');
        if (signInBtn) {
            console.log('Found sign-in button in header, attaching event listener');
            
            signInBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Sign-in button in header clicked');
                
                // Get auth overlay
                const authOverlay = document.getElementById('signin-modal');
                if (authOverlay) {
                    console.log('Found auth overlay, displaying it');
                    authOverlay.style.display = 'flex';
                    document.body.style.overflow = 'hidden';
                } else {
                    console.log('Auth overlay not found, redirecting to signin page');
                    window.location.href = 'signin.html';
                }
            });
            
            console.log('Event listener attached to sign-in button');
        }
    };
    
    // Wait for header to load
    setTimeout(setupHeaderSignIn, 1000);
});
