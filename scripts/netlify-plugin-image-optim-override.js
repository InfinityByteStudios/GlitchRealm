// Override for netlify-plugin-image-optim to prevent build failures
// This is a no-op plugin that does nothing but prevents the broken plugin from running

module.exports = {
  onPreBuild: async () => {
  },
  onPostBuild: async () => {
  }
};
