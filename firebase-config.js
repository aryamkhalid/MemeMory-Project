import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDb411kL9-D9Y6ofw_du3W0UN6cOB0yZx4",
  authDomain: "memory-1bcad.firebaseapp.com",
  projectId: "memory-1bcad",
  storageBucket: "memory-1bcad.firebasestorage.app",
  messagingSenderId: "559326143498",
  appId: "1:559326143498:web:f37d425d6fcd55c8042bf3",
  measurementId: "G-ZLK4CXDSCF"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
