/*
  Google Consent Mode v2 + Google CMP (Funding Choices) loader
  - Sets default consent to denied for EEA/UK/CH until the user makes a choice
  - Loads Funding Choices message for your AdSense/Ad Manager publisher ID
  - Works with both 2-choice (Consent/Manage) and 3-choice (Consent/Do not consent/Manage) messages

  Setup:
  1) Replace PUB_ID below with your AdSense/Ad Manager Publisher ID (e.g., "pub-1234567890123456").
  2) In Funding Choices UI (https://fundingchoices.google.com/), create your message (2-choice or 3-choice).
  3) Deploy this file and include it early in <head> (before analytics/ads tags) on all pages.
  4) Optional: Add a Manage Consent link on your site and call window.openConsentManager().
*/

(function initConsent() {
  // Publisher ID for Google Funding Choices/AdSense
  var PUB_ID = 'pub-7271783548299942';

  // Define dataLayer/gtag early so Consent Mode calls buffer safely
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function(){ dataLayer.push(arguments); };

  // Set default consent to denied in EEA, UK, Switzerland
  // List from Google: EU27 + EEA + UK + CH
  var EEA_REGIONS = [
    'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE',
    'IS','LI','NO', // EEA (non‑EU)
    'GB',           // United Kingdom
    'CH'            // Switzerland
  ];

  try {
    window.gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied'
    }, { region: EEA_REGIONS });
  } catch (e) {
    // Non-fatal
  }

  // Load Funding Choices (Google CMP) script for your publisher id
  // ers=1 enables European regulations support
  var fcSrc = 'https://fundingchoicesmessages.google.com/i/' + encodeURIComponent(PUB_ID) + '?ers=1';
  var s = document.createElement('script');
  s.async = true;
  s.src = fcSrc;
  document.head.appendChild(s);

  // Required shim per Google snippet to signal FC presence
  (function signalGooglefcPresent() {
    if (!window.frames['googlefcPresent']) {
      if (document.body) {
        var iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.name = 'googlefcPresent';
        document.body.appendChild(iframe);
      } else {
        setTimeout(signalGooglefcPresent, 50);
      }
    }
  })();

  // Optional: helper to open consent manager (Manage choices) later
  window.openConsentManager = function() {
    try {
      if (window.googlefc && typeof window.googlefc.showConsentTool === 'function') {
        window.googlefc.showConsentTool();
      } else {
        // If not available yet, try again shortly
        setTimeout(function(){
          if (window.googlefc && typeof window.googlefc.showConsentTool === 'function') {
            window.googlefc.showConsentTool();
          }
        }, 500);
      }
    } catch (e) {
      // Non-fatal
      console.warn('Consent manager not available yet', e);
    }
  };
})();
