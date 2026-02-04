import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC3kN4nXc-tu27S48aP1nsIOVYELL7cTAk",
  authDomain: "familytaskapp-66f6c.firebaseapp.com",
  projectId: "familytaskapp-66f6c",
  storageBucket: "familytaskapp-66f6c.firebasestorage.app",
  messagingSenderId: "243325498198",
  appId: "1:243325498198:web:2534c766fdf3bee2b09cf7"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
