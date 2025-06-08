// firebase/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth"; // Import getAuth
import { getFirestore } from "firebase/firestore"; // Import Firestore
import { FirebaseOptions } from "firebase/app";

Your Firebase config details
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyCQZfnDyWs5I5vuOageLyH4Lsh0bzj6eYs",
  authDomain: "fir-auth-cca62.firebaseapp.com",
  projectId: "fir-auth-cca62",
  storageBucket: "fir-auth-cca62.firebasestorage.app",
  messagingSenderId: "578289855665",
  appId: "1:578289855665:web:630300dd824cda66b5c690",
  measurementId: "G-CFP9T88FJ6",
};

// const firebaseConfig = {
//   apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
//   authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
//   projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
//   storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
//   appId: process.env.REACT_APP_FIREBASE_APP_ID,
//   measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
// };

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firestore and Authentication
const db = getFirestore(app);
const auth = getAuth(app); // Initialize Authentication

// For analytics (only on client-side)
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { app, analytics, db, auth }; // Export auth and db
