import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyClozThfUdOOXnC0gkHz_DCVP1t75B5hro",
  authDomain: "gmshooter.firebaseapp.com",
  projectId: "gmshooter",
  storageBucket: "gmshooter.firebasestorage.app",
  messagingSenderId: "97079543510",
  appId: "1:97079543510:web:4db510e1cbfc6256546b77"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;

// Ensure this file is treated as a module
export {};