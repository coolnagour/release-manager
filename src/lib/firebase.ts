// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  "projectId": "release-manager-mjfnk",
  "appId": "1:842733479869:web:58c42619f93240b22294d4",
  "storageBucket": "release-manager-mjfnk.firebasestorage.app",
  "apiKey": "AIzaSyA10uDUaS1tXoCZxLPB8QiuBuy-otX-lMg",
  "authDomain": "release-manager-mjfnk.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "842733479869"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
