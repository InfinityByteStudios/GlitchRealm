// Script to update favicon references in selected HTML files
const fs = require('fs');
const path = require('path');

// Files to update (top-level, non-game pages)
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
  'user-portal.html',
  'submit-game.html'
];

// Canonical new favicon to use
const newFavicon = 'assets/favicon.ico';

// Generic pattern replace: any filename or URL that contains 'glitch' and 'favicon' (case-insensitive)
const pattern = /(?:assets\/)?.*glitch[^\s"']*favicon[^\s"']*\.(?:png|svg|ico)/gi;

htmlFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(pattern, newFavicon);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated favicon in: ${file}`);
  } catch (err) {
    console.error(`Failed to update ${file}: ${err.message}`);
  }
});

console.log('Favicon update script finished.');
