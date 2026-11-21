// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCPZfEYK2cLUizLnb9ORpCJmF9gzHN998U",
  authDomain: "fivepreceptsgame.firebaseapp.com",
  projectId: "fivepreceptsgame",
  storageBucket: "fivepreceptsgame.firebasestorage.app",
  messagingSenderId: "587040625445",
  appId: "1:587040625445:web:6a76f0be1230b778d180cc",
  measurementId: "G-E88SCHB9ZW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
