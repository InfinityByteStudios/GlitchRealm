# Playtime LocalStorage Integration Guide

This guide explains how to integrate the new localStorage-based playtime tracking system with GlitchRealm's Firestore sync.

## Overview

The system consists of two main components:

1. **LocalPlaytimeTracker** (`playtime-local-storage.js`) - Tracks playtime and saves to localStorage
2. **GlitchRealmPlaytimeSync** (`glitchrealm-playtime-sync.js`) - Reads from localStorage and syncs to Firestore

## How It Works

1. Games use `LocalPlaytimeTracker` to track playtime locally
2. Data is saved to localStorage with a `needsSync` flag
3. GlitchRealm pages include the sync utility
4. The sync utility automatically detects and syncs unsynced data to Firestore
5. Data is marked as synced after successful upload

## Implementation

### For Games (External Sites)

Include the local tracker in your game:

```html
<script src="https://glitchrealm.com/playtime-local-storage.js"></script>
<script>
// Initialize tracker for your game
const tracker = new LocalPlaytimeTracker('your-game-id', 'Your Game Name');

// The tracker automatically starts tracking and saves to localStorage
// No Firebase configuration needed!
</script>
```

### For GlitchRealm Pages

Include the sync utility on pages where Firebase is available:

```html
<!-- After Firebase is loaded -->
<script src="glitchrealm-playtime-sync.js"></script>

<!-- The sync utility automatically:
     - Detects when users sign in
     - Syncs localStorage data to Firestore
     - Runs periodic syncs every 5 minutes
     - Listens for playtime update events
-->
```

## Data Structure

### LocalStorage Format

```json
{
  "games": {
    "game-id-1": {
      "gameId": "game-id-1",
      "gameName": "Game Name",
      "totalMinutes": 45.5,
      "sessionCount": 3,
      "lastPlayed": "2025-10-15T10:30:00.000Z",
      "needsSync": true
    }
  },
  "lastUpdated": "2025-10-15T10:30:00.000Z",
  "needsSync": true
}
```

### Firestore Structure (Unchanged)

The sync utility maintains the existing Firestore structure:
- Global document: `/playtime/{userId}`
- Individual games: `/playtime/{userId}/games/{gameId}`

## Features

### LocalPlaytimeTracker Features

- **Offline tracking** - Works without internet connection
- **Idle detection** - Stops counting when user is inactive (3+ minutes)
- **Activity monitoring** - Tracks mouse, keyboard, touch events
- **Auto-save** - Saves to localStorage every 30 seconds
- **Visibility handling** - Saves when tab becomes hidden
- **Event dispatching** - Notifies when data is updated

### GlitchRealmPlaytimeSync Features

- **Auto-sync** - Syncs every 5 minutes when user is signed in
- **Event-driven** - Syncs when playtime data is updated
- **Batch operations** - Efficient Firestore batch writes
- **Error handling** - Graceful error handling and retry logic
- **Status monitoring** - Provides sync status information

## API Reference

### LocalPlaytimeTracker

```javascript
// Constructor
const tracker = new LocalPlaytimeTracker(gameId, gameName);

// Methods
tracker.startTracking();  // Start tracking (auto-called)
tracker.stopTracking();   // Stop tracking
tracker.destroy();        // Clean up resources

// Static methods
LocalPlaytimeTracker.getAllPlaytimeData();  // Get all localStorage data
LocalPlaytimeTracker.markAsSynced(gameId);  // Mark as synced
```

### GlitchRealmPlaytimeSync

```javascript
// Access the global instance
const sync = window.glitchRealmSync;

// Methods
await sync.forceSyncNow();     // Force immediate sync
const status = sync.getSyncStatus();  // Get sync status
sync.clearLocalData();         // Clear all local data
```

### Events

```javascript
// Listen for playtime updates
window.addEventListener('playtimeDataUpdated', (event) => {
  console.log('Game:', event.detail.gameName);
  console.log('Total minutes:', event.detail.totalMinutes);
});

// Listen for sync completion
window.addEventListener('playtimeSyncComplete', (event) => {
  if (event.detail.success) {
    console.log('Synced', event.detail.gamesSynced, 'games');
  } else {
    console.error('Sync failed:', event.detail.error);
  }
});
```

## Migration from Existing System

The new system is designed to work alongside the existing playtime tracking. To migrate:

1. Deploy the new files to your CDN
2. Update game pages to use `LocalPlaytimeTracker`
3. Include `glitchrealm-playtime-sync.js` on GlitchRealm pages
4. The sync utility will handle merging with existing Firestore data

## Testing

### Test LocalStorage Tracking

```javascript
// Check localStorage data
const data = LocalPlaytimeTracker.getAllPlaytimeData();
console.log('Local playtime data:', data);
```

### Test Sync Status

```javascript
// Check sync status
const status = glitchRealmSync.getSyncStatus();
console.log('Sync status:', status);

// Force sync
await glitchRealmSync.forceSyncNow();
```

## Benefits

1. **Offline Support** - Games work without internet connection
2. **Reduced Firebase Calls** - Less frequent Firestore writes
3. **Better Performance** - No Firebase initialization needed in games
4. **Reliability** - Data is preserved locally even if sync fails
5. **Flexibility** - Games can be hosted anywhere without Firebase config

## Considerations

1. **Storage Limits** - localStorage has ~5-10MB limit per domain
2. **Privacy** - Data persists in browser until manually cleared
3. **Cross-device** - Data doesn't sync between devices until uploaded to Firestore
4. **Browser Support** - Requires localStorage support (IE8+)

## Troubleshooting

### Common Issues

1. **Data not syncing** - Check if user is signed in to GlitchRealm
2. **localStorage full** - Clear old data or increase cleanup frequency
3. **Sync errors** - Check browser console for Firestore errors
4. **Missing data** - Verify game ID matches between tracker and Firestore

### Debug Commands

```javascript
// Check localStorage directly
localStorage.getItem('glitchrealm_playtime_data');

// Force sync with logging
glitchRealmSync.forceSyncNow().then(() => console.log('Sync complete'));

// Clear all data (testing only)
glitchRealmSync.clearLocalData();
```