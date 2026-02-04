import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  addDoc,
  collection,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const statusEl = document.getElementById("status");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const authError = document.getElementById("auth-error");
const userPanel = document.getElementById("user-panel");
const userEmail = document.getElementById("user-email");
const userUid = document.getElementById("user-uid");
const logoutBtn = document.getElementById("logout-btn");
const toggleButtons = document.querySelectorAll(".toggle-btn");
const createFamilySection = document.getElementById("create-family-section");
const createFamilyForm = document.getElementById("create-family-form");
const familyPanel = document.getElementById("family-panel");
const familyName = document.getElementById("family-name");
const familyId = document.getElementById("family-id");
const userRole = document.getElementById("user-role");

const setStatus = (text) => {
  statusEl.textContent = text;
};

const showError = (message) => {
  authError.textContent = message;
  authError.classList.remove("hidden");
};

const clearError = () => {
  authError.textContent = "";
  authError.classList.add("hidden");
};

const setAuthView = (view) => {
  toggleButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.target === view);
  });

  if (view === "login") {
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
  } else {
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
  }
};

const setLoggedInUI = async (user) => {
  userEmail.textContent = user.email;
  userUid.textContent = user.uid;
  userPanel.classList.remove("hidden");
  loginForm.classList.add("hidden");
  registerForm.classList.add("hidden");
  document.querySelector(".auth-toggle").classList.add("hidden");

  // Fetch user doc to check family status
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const userData = userSnap.data();
    if (userData.familyId) {
      // User has a family
      familyName.textContent = userData.familyName || "—";
      familyId.textContent = userData.familyId;
      userRole.textContent = userData.role || "—";
      familyPanel.classList.remove("hidden");
      createFamilySection.classList.add("hidden");
    } else {
      // User has no family - show create family form
      createFamilySection.classList.remove("hidden");
      familyPanel.classList.add("hidden");
    }
  }
};

const setLoggedOutUI = () => {
  userEmail.textContent = "—";
  userUid.textContent = "—";
  userPanel.classList.add("hidden");
  createFamilySection.classList.add("hidden");
  familyPanel.classList.add("hidden");
  document.querySelector(".auth-toggle").classList.remove("hidden");
  setAuthView("login");
};

const createUserDoc = async (user) => {
  const userRef = doc(db, "users", user.uid);
  await setDoc(userRef, {
    email: user.email,
    role: null,
    familyId: null,
    createdAt: serverTimestamp(),
  });
};

const createFamilyHandler = async (event) => {
  event.preventDefault();
  clearError();

  const fName = createFamilyForm.familyName.value.trim();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    showError("Not authenticated.");
    return;
  }

  try {
    setStatus("Creating family…");

    // Create family doc
    const familiesRef = collection(db, "families");
    const familyDoc = await addDoc(familiesRef, {
      name: fName,
      createdAt: serverTimestamp(),
      createdByUid: currentUser.uid,
      memberUids: [currentUser.uid],
    });

    const newFamilyId = familyDoc.id;

    // Update user doc
    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, {
      familyId: newFamilyId,
      familyName: fName,
      role: "parent",
    });

    setStatus("Family created.");
    createFamilyForm.reset();

    // Update UI
    familyName.textContent = fName;
    familyId.textContent = newFamilyId;
    userRole.textContent = "parent";
    createFamilySection.classList.add("hidden");
    familyPanel.classList.remove("hidden");
  } catch (error) {
    showError(error.message);
    setStatus("Family creation failed.");
  }
};

const init = async () => {
  if (!auth || !db) {
    setStatus("Firebase not initialized.");
    return;
  }

  toggleButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      clearError();
      setAuthView(btn.dataset.target);
    });
  });

  createFamilyForm.addEventListener("submit", createFamilyHandler);

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError();

    const email = loginForm.email.value.trim();
    const password = loginForm.password.value.trim();

    try {
      setStatus("Signing in…");
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      showError(error.message);
      setStatus("Login failed.");
    }
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError();

    const email = registerForm.email.value.trim();
    const password = registerForm.password.value.trim();

    try {
      setStatus("Creating account…");
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await createUserDoc(credential.user);
      setStatus("Account created.");
    } catch (error) {
      showError(error.message);
      setStatus("Registration failed.");
    }
  });

  logoutBtn.addEventListener("click", async () => {
    clearError();
    try {
      setStatus("Signing out…");
      await signOut(auth);
    } catch (error) {
      showError(error.message);
      setStatus("Logout failed.");
    }
  });

  onAuthStateChanged(auth, async (user) => {
    clearError();
    if (user) {
      await setLoggedInUI(user);
      setStatus("Signed in.");
    } else {
      setLoggedOutUI();
      setStatus("Signed out.");
    }
  });
};

init();
