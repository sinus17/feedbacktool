// Netlify serverless function for URL shortener redirects
exports.handler = async (event, context) => {
  // This won't work for swipe.fm domain routing
  // Netlify Functions can't intercept domain requests like Edge Functions can
  
  // We need to use static redirects in netlify.toml
  // OR use a reverse proxy approach
  
  return {
    statusCode: 404,
    body: 'This function is not used - redirects handled in netlify.toml'
  };
};
