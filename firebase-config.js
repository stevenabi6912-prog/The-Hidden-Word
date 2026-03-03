// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAGfjPCCmevZSySWkduIxthuMbB8oFW-oA",
  authDomain: "the-hidden-word-ffe4c.firebaseapp.com",
  projectId: "the-hidden-word-ffe4c",
  storageBucket: "the-hidden-word-ffe4c.firebasestorage.app",
  messagingSenderId: "806886510855",
  appId: "1:806886510855:web:33e6fc764fa1019439b5a2",
  measurementId: "G-T08X8ZSZET"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);