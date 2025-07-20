# GlitchRealm Community

A cyberpunk-themed community platform for GlitchRealm gamers to connect, share strategies, and discuss games.

## Features

### 🎮 **Community Hub**
- **Modern Interface**: Cyberpunk-themed design matching the main GlitchRealm aesthetic
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Real-time Updates**: Posts refresh automatically to show latest community activity

### 🔐 **Authentication System**
- **Multiple Sign-in Options**: Email/password, Google, and GitHub authentication
- **Secure Firebase Integration**: Using dedicated community Firebase project
- **User Management**: Automatic user session handling with secure logout

### 📝 **Post Management**
- **Rich Post Creation**: Text posts with category selection
- **Post Categories**: 
  - General Discussion
  - Tips & Strategies  
  - Game Updates
  - Feedback
  - Player Showcase
- **Content Filtering**: Filter posts by category
- **Character Limit**: 1000 characters per post to maintain quality

### 💬 **Social Features**
- **Like System**: Users can like/unlike posts with real-time updates
- **Share Functionality**: Copy post links to clipboard or use native sharing
- **Author Attribution**: Clear author names and timestamps
- **Engagement Tracking**: Like counts and user interaction history

### 🛡️ **Security & Moderation**
- **Firestore Security Rules**: Comprehensive database security
- **Content Validation**: Input sanitization and XSS protection
- **User Authentication**: Only authenticated users can create posts
- **Author Controls**: Users can only edit/delete their own posts

## Technical Stack

- **Frontend**: HTML5, CSS3 (Custom Cyberpunk Theme), Vanilla JavaScript
- **Backend**: Firebase Authentication, Firestore Database
- **Security**: Firebase Security Rules, Input Validation
- **Design**: Responsive CSS Grid/Flexbox, Custom Animations

## Firebase Configuration

The community uses a dedicated Firebase project:
- **Project ID**: `glitchrealm-community`
- **Auth Domain**: `glitchrealm-community.firebaseapp.com`
- **Database**: Firestore with custom security rules
- **Analytics**: Google Analytics integration

## File Structure

```
GlitchRealm Community/
├── index.html                 # Main community page
├── community-styles.css       # Custom CSS styles
├── community-script.js        # JavaScript functionality
├── firestore.rules           # Database security rules
├── firestore.indexes.json    # Database query optimization
└── README.md                 # This file
```

## Setup Instructions

### 1. Firebase Setup
1. The Firebase project is already configured in the code
2. Deploy the Firestore rules: `firebase deploy --only firestore:rules`
3. Deploy the Firestore indexes: `firebase deploy --only firestore:indexes`

### 2. Local Development
1. Open `index.html` in a web browser
2. The app connects automatically to the Firebase backend
3. Sign in to test posting and interaction features

### 3. Authentication Methods
- **Email/Password**: Standard email registration and login
- **Google**: One-click Google account integration
- **GitHub**: Developer-friendly GitHub authentication

## Usage Guide

### For Users
1. **Access**: Navigate to the community page
2. **Sign In**: Use any of the three authentication methods
3. **Create Posts**: Click in the post creation area (appears after login)
4. **Engage**: Like posts, share links, filter by category
5. **Stay Updated**: Posts refresh automatically every 30 seconds

### For Developers
1. **Customization**: Edit `community-styles.css` for theme changes
2. **Features**: Add new functionality in `community-script.js`
3. **Security**: Modify `firestore.rules` for new data patterns
4. **Performance**: Update `firestore.indexes.json` for new queries

## Security Features

### Database Security
- Users can only create posts with their own UID
- Post editing restricted to original authors
- Like system prevents abuse through user tracking
- Input validation prevents malicious content

### Frontend Security
- XSS protection through HTML escaping
- Input length limits prevent spam
- Rate limiting through Firebase backend
- Secure authentication token handling

## Performance Optimizations

### Database Queries
- Indexed queries for fast post retrieval
- Pagination support (50 posts max per load)
- Optimized filtering by category
- Efficient timestamp-based ordering

### Frontend Performance
- Lazy loading of authentication state
- Debounced user interactions
- Efficient DOM updates
- Minimal bundle size with vanilla JS

## Future Enhancements

### Planned Features
- **User Profiles**: Detailed user pages with post history
- **Comment System**: Nested comments on posts
- **Moderation Tools**: Report system and admin controls
- **Rich Media**: Image uploads and embedded content
- **Notifications**: Real-time post notifications
- **Search**: Full-text search across posts

### Technical Improvements
- **Real-time Updates**: WebSocket integration for live updates
- **Progressive Web App**: Offline support and native app features
- **Advanced Analytics**: User engagement and content insights
- **Content Moderation**: Automated content filtering

## Integration

The community platform integrates seamlessly with the main GlitchRealm website:
- **Consistent Design**: Matches cyberpunk theme and navigation
- **Shared Assets**: Uses same fonts, colors, and favicon
- **User Experience**: Natural transition from games to community
- **Cross-linking**: Easy navigation between sections

## Support

For technical issues or feature requests, users can:
1. Create a post in the "Feedback" category
2. Contact through the main GlitchRealm website
3. Report bugs through the community platform

---

**Built with 💚 for the GlitchRealm Community**
