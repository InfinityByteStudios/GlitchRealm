// Lazy-loaded Game Launcher - Only loads when needed
// Use: <button data-game-launch="coderunner">Play</button>

(function() {
  let launcherLoaded = false;
  
  async function loadGameLauncher() {
    if (launcherLoaded) return;
    launcherLoaded = true;
    
    // Dynamically import the full game launcher
    const script = document.createElement('script');
    script.src = '/game-launcher.js';
    script.async = true;
    document.head.appendChild(script);
    
    return new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
    });
  }
  
  // Detect when user is about to click a game launch button
  document.addEventListener('DOMContentLoaded', () => {
    const launchButtons = document.querySelectorAll('[data-game-launch]');
    
    if (launchButtons.length === 0) return; // No games on this page
    
    // Preload on hover (saves ~200ms on click)
    launchButtons.forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        loadGameLauncher();
      }, { once: true, passive: true });
      
      btn.addEventListener('touchstart', () => {
        loadGameLauncher();
      }, { once: true, passive: true });
    });
    
    // Fallback: load on first click
    launchButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (!launcherLoaded) {
          e.preventDefault();
          await loadGameLauncher();
          // Re-trigger click after load
          setTimeout(() => btn.click(), 100);
        }
      }, { once: true });
    });
  });
})();
