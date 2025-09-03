// Firebase configuration for GlitchRealm Sign In
const firebaseConfig = {
  apiKey: "AIzaSyCo5hr7ULHLL_0UAAst74g8ePZxkB7OHFQ",
  authDomain: "shared-sign-in.firebaseapp.com",
  databaseURL: "https://shared-sign-in-default-rtdb.firebaseio.com",
  projectId: "shared-sign-in",
  storageBucket: "shared-sign-in.firebasestorage.app",
  messagingSenderId: "332039027753",
  appId: "1:332039027753:web:aa7c6877d543bb90363038",
  measurementId: "G-KK5XVVLMVN"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
// Localize recaptcha and SMS to user's language
firebase.auth().useDeviceLanguage();
