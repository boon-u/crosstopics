// Firebase web app config (safe to ship client-side; security is Firestore rules)
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDn9y3Syy6WpJdrrp0TUZ6zzpZ7QeTKv1Y",
  authDomain: "boon-projs.firebaseapp.com",
  projectId: "boon-projs",
  storageBucket: "boon-projs.firebasestorage.app",
  messagingSenderId: "591708900972",
  appId: "1:591708900972:web:bf449eec3aba13a8471249",
  measurementId: "G-T0M85CJTB7",
};

// Shared classroom board document path in Firestore
// Collection is separate from Boonverse (skills / logs)
window.FIREBASE_BOARD_PATH = { collection: "crosstopics", doc: "session" };
