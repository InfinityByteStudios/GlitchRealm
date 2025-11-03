# Auth Subdomain Deployment Checklist

Use this checklist to track your deployment progress.

## Pre-Deployment
- [x] Auth folder created with all necessary files
- [x] Main site netlify.toml updated with redirects
- [ ] Review auth/index.html for any custom changes needed
- [ ] Verify Firebase config in auth/index.html matches your project

## Netlify Deployment
- [ ] Created new Netlify site (or configured existing site)
- [ ] Set base directory to `auth` (if using Git deploy)
- [ ] Deployed successfully
- [ ] Site is accessible at [your-site].netlify.app
- [ ] No build errors in deploy log

## Domain Configuration
- [ ] Added custom domain `auth.glitchrealm.ca` in Netlify
- [ ] Got DNS configuration instructions from Netlify
- [ ] Added CNAME record to DNS provider
- [ ] DNS propagation complete (use https://dnschecker.org)
- [ ] Site accessible at https://auth.glitchrealm.ca
- [ ] SSL certificate provisioned (green padlock)

## Firebase Configuration
- [ ] Opened Firebase Console
- [ ] Navigated to Authentication → Settings → Authorized domains
- [ ] Added `auth.glitchrealm.ca` to authorized domains
- [ ] Saved changes

## Testing - Basic
- [ ] https://auth.glitchrealm.ca loads
- [ ] CSS/styles display correctly
- [ ] No console errors
- [ ] Firebase initialized without errors
- [ ] Page is mobile-responsive

## Testing - Authentication
- [ ] Email/password sign-in works
- [ ] Email/password sign-up works
- [ ] Google sign-in works
- [ ] GitHub sign-in works
- [ ] Error messages display correctly
- [ ] "Forgot password" link works

## Testing - Redirects & Integration
- [ ] glitchrealm.ca/signin redirects to auth.glitchrealm.ca
- [ ] glitchrealm.caauth.glitchrealm.ca redirects to auth.glitchrealm.ca
- [ ] glitchrealm.ca/login redirects to auth.glitchrealm.ca
- [ ] After sign-in, user is returned to main site
- [ ] Auth state persists on main site after sign-in
- [ ] User can access protected pages (user-portal.html)
- [ ] Sign-out from main site works correctly

## Testing - Guest Mode
- [ ] "Continue as Guest" button works
- [ ] Redirects to https://glitchrealm.ca
- [ ] Guest can access games
- [ ] Guest cannot access protected features

## Cross-Browser Testing
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Chrome
- [ ] Mobile Safari

## Security Check
- [ ] HTTPS enabled (green padlock)
- [ ] SSL certificate valid
- [ ] No mixed content warnings
- [ ] Security headers present (check with securityheaders.com)
- [ ] Firebase rules enforce auth where needed

## Performance
- [ ] Page loads in < 3 seconds
- [ ] CSS loads quickly
- [ ] No 404 errors for assets
- [ ] Images optimized

## Documentation
- [ ] Updated any internal docs with new auth URL
- [ ] Team members notified of change
- [ ] Support docs updated if applicable

## Monitoring (First 24 Hours)
- [ ] Check Netlify analytics for traffic
- [ ] Monitor Firebase auth usage
- [ ] Review error logs
- [ ] Check for user reports/issues
- [ ] Verify redirects working in production

## Rollback Plan (If Needed)
- [ ] Remove CNAME record for auth.glitchrealm.ca
- [ ] Remove redirects from main netlify.toml
- [ ] Revert to auth.glitchrealm.ca on main domain
- [ ] Notify users if necessary

---

## Notes
(Add any issues, observations, or important details here)

- 
- 
- 

---

## Completion
- [ ] All tests passed
- [ ] No critical issues
- [ ] Monitoring in place
- [ ] Documentation updated
- [ ] Deployment successful! 🎉

**Deployed by:** _______________  
**Date:** _______________  
**Netlify Site URL:** _______________
