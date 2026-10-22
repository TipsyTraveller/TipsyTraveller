// Import the functions you need from the SDKs you need
// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAnXustuhuDRODtgfSks4ajDAVunPE22xU",
    authDomain: "tipsy-travellers.firebaseapp.com",
    databaseURL: "https://tipsy-travellers-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "tipsy-travellers",
    storageBucket: "tipsy-travellers.firebasestorage.app",
    messagingSenderId: "118473368395",
    appId: "1:118473368395:web:164564ac4180a89a50fece",
    measurementId: "G-R9XLWYYY34"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const firestore = getFirestore(app);
