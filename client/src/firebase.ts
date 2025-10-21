import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Your web app's Firebase configuration
// Replace with your actual config from Firebase console
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "gmshooter.firebaseapp.com",
  projectId: "gmshooter",
  storageBucket: "gmshooter.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;

// Ensure this file is treated as a module
export {};