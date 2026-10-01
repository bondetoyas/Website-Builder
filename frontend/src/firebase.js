// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "dora-ai---yt-39fc7.firebaseapp.com",
  projectId: "dora-ai---yt-39fc7",
  storageBucket: "dora-ai---yt-39fc7.firebasestorage.app",
  messagingSenderId: "172008590839",
  appId: "1:172008590839:web:2e296f9aa9d82f270f32f2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app)
const provider = new GoogleAuthProvider()

export {auth, provider}