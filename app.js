import { auth, db } from "./firebase.js";

const statusEl = document.getElementById("status");

const setStatus = (text) => {
  statusEl.textContent = text;
};

const init = async () => {
  if (!auth || !db) {
    setStatus("Firebase not initialized.");
    return;
  }

  setStatus("Firebase initialized. App ready.");
};

init();
