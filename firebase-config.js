// ============================================
// PASTE YOUR FIREBASE PROJECT CONFIG HERE
// ============================================
// You get this object from:
// Firebase Console → Project settings → General tab → "Your apps" → SDK setup and configuration
//
// It looks like this (with your own real values):
// const firebaseConfig = {
//   apiKey: "AIzaSyABCDEF1234567890",
//   authDomain: "your-app.firebaseapp.com",
//   projectId: "your-app",
//   storageBucket: "your-app.appspot.com",
//   messagingSenderId: "1234567890",
//   appId: "1:1234567890:web:abcdef123456"
// };

const firebaseConfig = {
  apiKey: "AIzaSyCJZe1ktWjipX1_AGH-tGTbm1WavgndFKk",
  authDomain: "chat-app-eaddd.firebaseapp.com",
  projectId: "chat-app-eaddd",
  storageBucket: "chat-app-eaddd.firebasestorage.app",
  messagingSenderId: "768213359232",
  appId: "1:768213359232:web:6cdd3ca34667a66eb42465"
};

// Initialize Firebase (using the compat SDK loaded in each HTML page)
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// Storage requires the Blaze (pay-as-you-go) plan on Firebase.
// Once you've upgraded and set up Storage in the console, uncomment this
// line and switch chat.js back to the version with file uploads enabled.
// const storage = firebase.storage();
