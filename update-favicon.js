// Script to update favicon references in all HTML files
const fs = require('fs');
const path = require('path');

// Main HTML files to update (excluding game-specific ones)
const htmlFiles = [
  'about.html',
  'contact.html',
  'credits.html',
  'footer.html',
  'forgot-password.html',
  'games.html',
  'header.html',
  'index.html',
  'privacy-policy.html',
  'projects.html',
  'signin.html',
  'terms-of-service.html',
  'test-dropdown.html',
  'test-modal.html',
  'user-portal.html'
];

// Update favicon references
htmlFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  try {
    // Read file content
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace favicon references
  const oldFavicon = 'assets/favicon.ico';
    const newFavicon = 'assets/game logos/glitchbot with words.png';
    
    // Case-insensitive replacement
    const regex = new RegExp(oldFavicon.replace(/\./g, '\\.'), 'i');
    const updatedContent = content.replace(regex, newFavicon);
    
    // Also replace lowercase reference that might be in JavaScript
    const lowercaseReplacement = content.replace(
  /'assets\/favicon-192\.png'/g, 
      "'assets/game logos/glitchbot with words.png'"
    );
    
    // Write updated content back to file
    fs.writeFileSync(filePath, lowercaseReplacement, 'utf8');
    
    console.log(`Updated favicon in: ${file}`);
  } catch (error) {
    console.error(`Error updating ${file}: ${error.message}`);
  }
});

console.log('Favicon update complete!');
