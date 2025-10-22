// Override for netlify-plugin-image-optim to prevent build failures
// This is a no-op plugin that does nothing but prevents the broken plugin from running

module.exports = {
  onPreBuild: async () => {
    console.log('[Image Optim Override] Skipping image optimization (using Netlify built-in instead)');
  },
  onPostBuild: async () => {
    console.log('[Image Optim Override] Image optimization handled by Netlify');
  }
};
