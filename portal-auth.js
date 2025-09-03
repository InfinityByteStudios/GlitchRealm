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
                
                // Always route to standalone Sign In with redirect back to current page
                const currentUrl = window.location.href;
                try { sessionStorage.setItem('gr.returnTo', currentUrl); } catch {}
                const target = `Sign In/index.html?redirect=${encodeURIComponent(currentUrl)}`;
                console.log('Redirecting to standalone sign-in:', target);
                window.location.href = target;
            });
            
            console.log('Event listener attached to sign-in button');
        }
    };
    
    // Wait for header to load
    setTimeout(setupHeaderSignIn, 1000);
});
