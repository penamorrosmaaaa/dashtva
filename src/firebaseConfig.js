// src/firebaseConfig.js

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCR...tu_api",
  authDomain: "my-timebox-project.firebaseapp.com",
  projectId: "my-timebox-project",
  storageBucket: "my-timebox-project.appspot.com", // ✅ CORRECTO
  messagingSenderId: "338798659890",
  appId: "1:338798659890:web:7681a1e4fdb7e86425af2b",
  measurementId: "G-E4DJTTLEWE"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const storage = getStorage(app);
