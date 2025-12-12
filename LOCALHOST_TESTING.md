# Localhost Testing Guide

## Testing Authentication on Localhost

The GlitchRealm authentication system now fully supports localhost testing. Here's how to use it:

### Quick Start

1. **Start a local server** (e.g., Live Server in VS Code)
   - Default port: `5500` (Live Server)
   - Or use any port: `http://localhost:3000`, `http://localhost:8080`, etc.

2. **Navigate to your local site**
   ```
   http://localhost:5500/
   http://localhost:5500/games.html
   http://localhost:5500/user-portal.html
   ```

3. **Sign In**
   - When you click "Sign In", you'll be directed to `/auth/` folder locally
   - After signing in, you'll be redirected back to the page you came from
   - The system automatically detects localhost and stays local

### How It Works

The auth system automatically detects localhost environments:

- **Hostname Detection**: Checks for `localhost`, `127.0.0.1`, or `192.168.x.x`
- **Return URL**: Keeps you on localhost after sign-in
- **Auth Bridge**: Opens popup on localhost origin (no cross-domain issues)

### Supported Localhost Patterns

✅ `http://localhost:5500/`
✅ `http://localhost:3000/`  
✅ `http://127.0.0.1:8080/`
✅ `http://192.168.1.100:5500/` (LAN IP)

### File Structure for Local Testing

```
/GlitchRealm
├── index.html
├── games.html
├── user-portal.html
├── auth/
│   ├── index.html (Sign in page)
│   └── signin.js (Updated with localhost support)
├── auth-bridge.html (OAuth popup handler)
└── auth-redirect-handler.js (Redirect logic)
```

### Troubleshooting

**Problem: Redirect still goes to .ca site**
- **Solution**: Clear your browser cache and sessionStorage
  ```javascript
  sessionStorage.clear();
  localStorage.clear();
  ```

**Problem: "Popup blocked" message**
- **Solution**: Allow popups for localhost in your browser settings

**Problem: Sign-in works but redirect fails**
- **Solution**: Check browser console for the return URL being used
- Ensure you started from a localhost page, not a production URL

### Development vs Production

The system automatically switches between environments:

| Environment | Auth Location | Return URL |
|------------|---------------|------------|
| **Localhost** | `http://localhost:PORT/auth/` | `http://localhost:PORT/page.html` |
| **Production** | `https://auth.glitchrealm.ca` | `https://glitchrealm.ca/page.html` |

### Testing Different Ports

If you're using a port other than 5500, the system will:
1. Try to detect it from the referrer
2. Fall back to port 5500 if not detected

To force a specific port, pass it in the URL:
```
http://localhost:3000/auth/?return=http://localhost:3000/games.html
```

### Security Note

Localhost URLs are only allowed when:
- Running on `localhost`, `127.0.0.1`, or private IP ranges (`192.168.x.x`)
- In production, only `*.glitchrealm.ca` domains are allowed

This ensures your production site remains secure while allowing flexible local development.
