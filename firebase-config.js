// Paste your Firebase web app config from:
// https://console.firebase.google.com → Project settings → Your apps → SDK setup
window.FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// Shared classroom board document path in Firestore
window.FIREBASE_BOARD_PATH = { collection: "boards", doc: "crosstopics" };
