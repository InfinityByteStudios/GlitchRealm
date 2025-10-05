// Firestore Security Rules for GlitchRealm Game Reviews
// These rules support auto-approval of clean reviews and pending approval for reviews with blocked language

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Game Reviews Collection
    match /gameReviews/{reviewId} {
      // Allow public read access to approved reviews only
      allow read: if resource.data.moderationStatus == 'approved';
      
      // Allow authenticated users to read their own reviews regardless of status
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      
      // Allow authenticated users to create reviews
      allow create: if request.auth != null 
        && request.auth.uid != null
        && isValidReviewData(request.resource.data)
        && request.resource.data.userId == request.auth.uid;
      
      // Allow users to update their own reviews
      allow update: if request.auth != null 
        && request.auth.uid != null
        && resource.data.userId == request.auth.uid
        && isValidReviewUpdate(request.resource.data, resource.data);
      
      // Allow users to delete their own reviews
      allow delete: if request.auth != null 
        && request.auth.uid != null
        && resource.data.userId == request.auth.uid;
    }
    
    // Helper function to validate review data structure
    function isValidReviewData(data) {
      return data.keys().hasAll(['gameId', 'gameName', 'developer', 'userId', 'userDisplayName', 'rating', 'comment', 'createdAt', 'updatedAt', 'moderationStatus'])
        && data.gameId is string
        && data.gameName is string  
        && data.developer is string
        && data.userId is string
        && data.userDisplayName is string
        && data.rating is int
        && data.rating >= 1 
        && data.rating <= 5
        && data.comment is string
        && data.comment.size() <= 500
        && data.moderationStatus is string
        && data.moderationStatus in ['approved', 'pending']
        && data.createdAt is timestamp
        && data.updatedAt is timestamp;
    }
    
    // Helper function to validate review updates
    function isValidReviewUpdate(newData, oldData) {
      return newData.keys().hasAll(['gameId', 'gameName', 'developer', 'userId', 'userDisplayName', 'rating', 'comment', 'createdAt', 'updatedAt', 'moderationStatus'])
        && newData.gameId == oldData.gameId
        && newData.gameName == oldData.gameName
        && newData.developer == oldData.developer
        && newData.userId == oldData.userId
        && newData.userDisplayName == oldData.userDisplayName
        && newData.rating is int
        && newData.rating >= 1 
        && newData.rating <= 5
        && newData.comment is string
        && newData.comment.size() <= 500
        && newData.moderationStatus == oldData.moderationStatus // Don't allow changing moderation status
        && newData.createdAt == oldData.createdAt
        && newData.updatedAt is timestamp;
    }
  }
}
