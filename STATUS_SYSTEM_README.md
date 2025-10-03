# System Status Management

## Overview
The system status feature allows authorized developers to update the platform status that displays on the support page. Users can see if the system is operational, degraded, or down, along with optional detailed descriptions.

## Files Created/Modified

### New Files:
1. **admin-status.html** - Admin panel for developers to update system status
   - Location: Root directory
   - Access: Only authorized developer UIDs can access

### Modified Files:
1. **support.html** - Added status display at the top
2. **firestore.rules** - Added rules for `/system/status` document

## How It Works

### For Users (Support Page):
- Status indicator shows at the top of the support page
- **Green** = All Systems Operational
- **Orange** = Degraded Performance
- **Red** = System Down
- If a description is provided, an "i" button appears to view details

### For Developers (Admin Panel):

#### Accessing the Admin Panel:
1. Navigate to `https://glitchrealm.ca/admin-status.html`
2. Sign in with an authorized developer account
3. If authorized, you'll see the status management form

#### Authorized Developer UIDs:
```
6iZDTXC78aVwX22qrY43BOxDRLt1
YR3c4TBw09aK7yYxd7vo0AmI6iG3
g14MPDZzUzR9ELP7TD6IZgk3nzx2
4oGjihtDjRPYI0LsTDhpXaQAJjk1
ZEkqLM6rNTZv1Sun0QWcKYOIbon1
```

#### Updating Status:
1. Select status type:
   - ✅ **Operational** - Everything working normally
   - ⚠️ **Degraded** - Some features may be slow
   - ❌ **Down** - System experiencing issues

2. Enter a status message (max 100 characters):
   - Example: "All Systems Operational"
   - Example: "Database experiencing slow response times"
   - Example: "Platform under maintenance"

3. Optionally add a description (max 1000 characters):
   - Explain what's affected
   - Provide expected resolution time
   - Include any workarounds
   - Example: "Our cloud database is experiencing higher than normal latency. Game loading may be slower. We're working with our provider to resolve this. Expected resolution: 2-3 hours."

4. Click "Update Status"

5. Preview updates in real-time as you type

## Firestore Structure

### Document Path:
```
/system/status
```

### Document Fields:
```javascript
{
  status: "operational" | "degraded" | "down",
  message: "All Systems Operational",
  description: "Optional detailed explanation...",
  updatedAt: "2025-10-02T14:30:00.000Z",
  updatedBy: "6iZDTXC78aVwX22qrY43BOxDRLt1"
}
```

## Security Rules

### Read Access:
- ✅ Public - Anyone can read the status

### Write Access:
- ✅ Developers only (UIDs listed in `isDeveloper()` function)
- ❌ Regular users cannot write

### Validation:
- Status must be: operational, degraded, or down
- Message: 1-100 characters
- Description: 0-1000 characters (optional)
- updatedAt: ISO timestamp string
- updatedBy: Valid UID

## Usage Examples

### Example 1: All Systems Operational
```
Status: operational
Message: All Systems Operational
Description: (leave empty)
```

### Example 2: Scheduled Maintenance
```
Status: degraded
Message: Scheduled Maintenance in Progress
Description: We're performing database optimizations. Game loading may be 2-3x slower than normal. Expected completion: 8:00 PM EST. All games remain accessible.
```

### Example 3: Major Outage
```
Status: down
Message: Authentication Service Unavailable
Description: Firebase authentication is currently down. Users cannot sign in or access their profiles. This is a third-party service issue. We're monitoring the situation. Check status.firebase.google.com for updates.
```

## Integration Points

### Support Page (support.html):
- Loads status from Firestore on page load
- Updates indicator color based on status
- Shows/hides description "i" button based on content
- Auto-refreshes when Firestore document updates (with listener)

### Admin Panel (admin-status.html):
- Real-time preview of changes
- Form validation
- Success/error messaging
- Loads current status on page load

## Deployment Steps

1. **Deploy Firestore Rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Upload Files:**
   - Upload `admin-status.html` to root directory
   - Modified `support.html` is already in place
   - Modified `firestore.rules` deployed in step 1

3. **Test:**
   - Visit support page to see default status
   - Sign in as developer and visit `/admin-status.html`
   - Update status and verify it appears on support page

## Adding New Developer UIDs

### In firestore.rules:
```javascript
function isDeveloper(userId) {
  return userId in [
    '6iZDTXC78aVwX22qrY43BOxDRLt1',
    'YR3c4TBw09aK7yYxd7vo0AmI6iG3', 
    'g14MPDZzUzR9ELP7TD6IZgk3nzx2',
    '4oGjihtDjRPYI0LsTDhpXaQAJjk1',
    'ZEkqLM6rNTZv1Sun0QWcKYOIbon1',
    'NEW_UID_HERE' // Add new UID
  ];
}
```

### In admin-status.html:
```javascript
const ADMIN_UIDS = [
  '6iZDTXC78aVwX22qrY43BOxDRLt1',
  'YR3c4TBw09aK7yYxd7vo0AmI6iG3', 
  'g14MPDZzUzR9ELP7TD6IZgk3nzx2',
  '4oGjihtDjRPYI0LsTDhpXaQAJjk1',
  'ZEkqLM6rNTZv1Sun0QWcKYOIbon1',
  'NEW_UID_HERE' // Add new UID
];
```

## Troubleshooting

### Status not showing on support page:
- Check browser console for errors
- Verify Firestore document exists at `/system/status`
- Check if firebaseCore is loaded properly

### Cannot access admin panel:
- Verify you're signed in
- Check if your UID is in the ADMIN_UIDS array
- Check browser console for auth errors

### Update fails:
- Verify Firestore rules are deployed
- Check that your UID is in isDeveloper() function
- Verify document structure matches validation rules

## Future Enhancements

- [ ] Add status history/changelog
- [ ] Email notifications to users when status changes
- [ ] Scheduled status updates
- [ ] Status page with incident timeline
- [ ] Integration with monitoring services
- [ ] Auto-status updates based on uptime monitors
