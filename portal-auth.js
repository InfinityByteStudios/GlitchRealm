// User Portal Auth Integration
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing user portal auth integration...');
    
    // Set up sign-in button in header
    const setupHeaderSignIn = function() {
        const signInBtn = document.getElementById('sign-in-btn');
        if (signInBtn) {
            // Check if listener is already attached by header.html inline script
            if (signInBtn.dataset.listenerAttached === 'true') {
                console.log('Sign-in button listener already attached in header.html, skipping duplicate');
                return;
            }
            
            console.log('Found sign-in button in header, attaching event listener');
            
            signInBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Sign-in button in header clicked');
                
                // Detect localhost vs production
                const isDev = window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1' || 
                             window.location.hostname.startsWith('192.168.');
                
                // Store current URL as return destination
                const returnUrl = window.location.href;
                sessionStorage.setItem('gr.returnTo', returnUrl);
                
                // Redirect to auth (local folder or subdomain)
                if (isDev) {
                    window.location.href = `/auth/?return=${encodeURIComponent(returnUrl)}`;
                } else {
                    window.location.href = `https://auth.glitchrealm.ca/?return=${encodeURIComponent(returnUrl)}`;
                }
            });
            
            signInBtn.dataset.listenerAttached = 'true';
            console.log('Event listener attached to sign-in button');
        }
    };
    
    // Wait for header to load
    setTimeout(setupHeaderSignIn, 1000);
});
