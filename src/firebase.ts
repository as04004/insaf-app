import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { initializeFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyALzoEDRpJ-UHodVyjMMc97jNaZsXbCY1M",
  authDomain: "insaf-7e2f1.firebaseapp.com",
  projectId: "insaf-7e2f1",
  storageBucket: "insaf-7e2f1.firebasestorage.app",
  messagingSenderId: "113267480728",
  appId: "1:113267480728:web:0e890f971cb33d110a98ed",
  measurementId: "G-K7B3MXZY60"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with long polling to avoid WebSocket issues in some environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

// Analytics only works in browser environment
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
export default app;
