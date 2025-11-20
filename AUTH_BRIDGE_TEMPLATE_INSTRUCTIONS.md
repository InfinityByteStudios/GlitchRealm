# Auth Bridge Template - Setup Instructions

## Overview
The `auth-bridge-template.html` file is a ready-to-use authentication bridge that uses **GlitchRealm's Firebase authentication** and securely passes auth tokens between domains using the PostMessage API.

**The Firebase configuration is already set up** - you only need to customize your domains and branding!

## Quick Start

### 1. Configure Your Domains

Open `auth-bridge-template.html` and find the `CONFIG` object (around line 150). Update the allowed domains:

```javascript
allowedDomains: [
    'https://yourdomain.com',
    'https://subdomain.yourdomain.com',
    // Add your domains here
],

// Where to redirect after successful auth
successRedirect: 'https://yourdomain.com',

// Where to redirect on error
errorRedirect: 'https://yourdomain.com/login',
```

### 2. Customize Branding

#### Change Logo/Brand Name
Find line ~140 and update:
```html
<div class="logo" id="logo">YourBrand</div>
```

#### Change Colors
Edit CSS variables at the top (around line 7):
```css
:root {
    --primary-color: #00fff9;        /* Main accent color */
    --secondary-color: #ff0080;      /* Secondary accent */
    --background-color: #0a0a0a;     /* Page background */
    --text-color: #ffffff;           /* Text color */
}
```

### 3. Deploy the File

Upload `auth-bridge-template.html` to your hosting:
- **Netlify**: Drag and drop into Netlify dashboard
- **Vercel**: Deploy via GitHub or drag & drop
- **GitHub Pages**: Push to `gh-pages` branch
- **Any static host**: Upload via FTP/SFTP

Recommended URL: `https://auth.yourdomain.com/bridge.html` or `https://yourdomain.com/auth-bridge.html`

## How to Use

### Method 1: Popup Window (Recommended)
```javascript
// On your main site
const authWindow = window.open(
    'https://yourdomain.com/auth-bridge.html?origin=' + encodeURIComponent(window.location.origin),
    'auth',
    'width=500,height=600'
);

// Listen for auth response
window.addEventListener('message', (event) => {
    if (event.origin !== 'https://yourdomain.com') return;
    
    if (event.data.type === 'AUTH_SUCCESS') {
        console.log('Token:', event.data.token);
        console.log('User:', event.data.user);
        
        // Store token and use it for API calls
        localStorage.setItem('authToken', event.data.token);
        
        // Update UI, redirect, etc.
        window.location.href = '/dashboard';
    }
});
```

### Method 2: iFrame
```html
<iframe 
    id="authBridge" 
    src="https://yourdomain.com/auth-bridge.html?origin=https://yourdomain.com"
    style="display:none;">
</iframe>

<script>
window.addEventListener('message', (event) => {
    if (event.origin !== 'https://yourdomain.com') return;
    
    if (event.data.type === 'AUTH_SUCCESS') {
        // Handle authentication
        console.log('Authenticated!', event.data.user);
    }
});
</script>
```

### Method 3: Direct Redirect
Simply redirect users to the bridge and it will auto-redirect back:
```javascript
window.location.href = 'https://yourdomain.com/auth-bridge.html';
```

## Important Notes

🔑 **GlitchRealm Firebase Integration**: This template uses GlitchRealm's `shared-sign-in` Firebase project. Users authenticate through GlitchRealm's authentication system, and your site receives the auth tokens.

🔒 **No Firebase Setup Required**: You don't need your own Firebase project - the configuration is already included and ready to use!

## URL Parameters

- **`origin`** (optional): The domain to send auth tokens to
  - Example: `?origin=https://yourdomain.com`
  - Must be in the `allowedDomains` list
  - If omitted, will redirect to `successRedirect` URL

## Security Features

✅ **Domain Whitelist**: Only allowed domains can receive auth tokens  
✅ **PostMessage API**: Secure cross-origin communication  
✅ **GlitchRealm Firebase Auth**: Industry-standard authentication via shared-sign-in project  
✅ **Token Validation**: Only sends valid Firebase ID tokens  

## Customization Options

### Messages
Edit the `messages` object in `CONFIG`:
```javascript
messages: {
    authenticating: 'Authenticating...',
    success: 'Authentication successful! Redirecting...',
    error: 'Authentication failed',
    noUser: 'No user signed in',
    invalidDomain: 'Invalid origin domain'
}
```

### Redirects
```javascript
successRedirect: 'https://yourdomain.com/dashboard',  // After auth success
errorRedirect: 'https://yourdomain.com/login',        // On auth error
```

### Visual Effects
To disable particle background, remove/comment out line ~158:
```javascript
// createParticles();  // Disable particles
```

## Troubleshooting

### Issue: "No user signed in" message
**Solution**: User needs to sign in first. Redirect them to your sign-in page before using the bridge.

### Issue: "Invalid origin domain" error
**Solution**: Add the requesting domain to the `allowedDomains` array.

### Issue: PostMessage not received
**Solutions**:
1. Check that the origin domain is whitelisted
2. Verify the event listener is set up before opening the popup
3. Make sure you're checking `event.origin` correctly
4. Open browser console to see PostMessage logs

### Issue: Token expired
**Solution**: Firebase ID tokens expire after 1 hour. Implement token refresh:
```javascript
// Get a fresh token
const token = await firebase.auth().currentUser.getIdToken(true);
```

## Integration Examples

### With React
```javascript
import { useEffect } from 'react';

function LoginButton() {
    useEffect(() => {
        const handleAuth = (event) => {
            if (event.origin !== 'https://yourdomain.com') return;
            if (event.data.type === 'AUTH_SUCCESS') {
                // Handle auth
                setUser(event.data.user);
                localStorage.setItem('token', event.data.token);
            }
        };
        
        window.addEventListener('message', handleAuth);
        return () => window.removeEventListener('message', handleAuth);
    }, []);
    
    const openAuth = () => {
        window.open(
            'https://yourdomain.com/auth-bridge.html?origin=' + 
            window.location.origin,
            'auth',
            'width=500,height=600'
        );
    };
    
    return <button onClick={openAuth}>Sign In</button>;
}
```

### With Vue
```javascript
export default {
    mounted() {
        window.addEventListener('message', this.handleAuth);
    },
    beforeUnmount() {
        window.removeEventListener('message', this.handleAuth);
    },
    methods: {
        handleAuth(event) {
            if (event.origin !== 'https://yourdomain.com') return;
            if (event.data.type === 'AUTH_SUCCESS') {
                this.$store.commit('setUser', event.data.user);
                localStorage.setItem('token', event.data.token);
            }
        },
        openAuth() {
            window.open(
                'https://yourdomain.com/auth-bridge.html?origin=' + 
                window.location.origin,
                'auth',
                'width=500,height=600'
            );
        }
    }
}
```

## Advanced Configuration

### Custom Token Claims
To access custom claims from the GlitchRealm Firebase token:
```javascript
// In the bridge, after getting the token
const decodedToken = await user.getIdTokenResult();
console.log('Custom claims:', decodedToken.claims);
```

### Using with Multiple Sites
You can use the same auth bridge for multiple domains by adding them all to the `allowedDomains` array. Each site will authenticate through GlitchRealm's shared authentication system.

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify Firebase configuration is correct
3. Ensure domains are whitelisted
4. Test with a simple HTML page first before integrating

## License
This template can be freely used and modified for your projects.
