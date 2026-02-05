import {
  register,
  login,
  logout,
  createFamily,
  addFamilyMember,
  getCurrentUserProfile,
  loadFamilyMembers,
  setupAuthListener,
} from "./auth.js";

// ====================
// DOM ELEMENTS
// ====================

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
const familySettingsSection = document.getElementById("family-settings-section");
const addChildForm = document.getElementById("add-child-form");
const familyMembersSection = document.getElementById("family-members-section");
const familyMembersList = document.getElementById("family-members-list");

// ====================
// UI HELPERS
// ====================

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

// ====================
// RENDER UI
// ====================

const setLoggedInUI = async (userData) => {
  const profile = getCurrentUserProfile();
  
  userEmail.textContent = profile.user.email;
  userUid.textContent = profile.user.uid;
  userPanel.classList.remove("hidden");
  loginForm.classList.add("hidden");
  registerForm.classList.add("hidden");
  document.querySelector(".auth-toggle").classList.add("hidden");

  if (userData?.familyId) {
    // User has a family
    familyName.textContent = userData.familyName || "—";
    familyId.textContent = userData.familyId;
    userRole.textContent = userData.role || "—";
    familyPanel.classList.remove("hidden");
    createFamilySection.classList.add("hidden");

    // If parent, show family settings
    if (userData.role === "parent") {
      familySettingsSection.classList.remove("hidden");
      await renderFamilyMembers();
    } else {
      familySettingsSection.classList.add("hidden");
    }
  } else {
    // User has no family - show create family form
    createFamilySection.classList.remove("hidden");
    familyPanel.classList.add("hidden");
    familySettingsSection.classList.add("hidden");
  }
};

const setLoggedOutUI = () => {
  userEmail.textContent = "—";
  userUid.textContent = "—";
  userPanel.classList.add("hidden");
  createFamilySection.classList.add("hidden");
  familyPanel.classList.add("hidden");
  familySettingsSection.classList.add("hidden");
  document.querySelector(".auth-toggle").classList.remove("hidden");
  setAuthView("login");
};

const renderFamilyMembers = async () => {
  try {
    const members = await loadFamilyMembers();
    
    if (members.length === 0) {
      familyMembersSection.classList.add("hidden");
      return;
    }
    
    familyMembersList.innerHTML = "";
    
    members.forEach((member) => {
      const listItem = document.createElement("li");
      listItem.textContent = `${member.email} (${member.role || "—"})`;
      familyMembersList.appendChild(listItem);
    });
    
    familyMembersSection.classList.remove("hidden");
  } catch (error) {
    console.error("Error rendering family members:", error);
  }
};

// ====================
// EVENT HANDLERS
// ====================

const handleLoginSubmit = async (event) => {
  event.preventDefault();
  clearError();

  const email = loginForm.email.value.trim();
  const password = loginForm.password.value.trim();

  try {
    setStatus("Signing in…");
    await login(email, password);
  } catch (error) {
    showError(error.message);
    setStatus("Login failed.");
  }
};

const handleRegisterSubmit = async (event) => {
  event.preventDefault();
  clearError();

  const email = registerForm.email.value.trim();
  const password = registerForm.password.value.trim();

  try {
    setStatus("Creating account…");
    await register(email, password);
    setStatus("Account created. Please log in.");
    loginForm.reset();
    registerForm.reset();
    setAuthView("login");
  } catch (error) {
    showError(error.message);
    setStatus("Registration failed.");
  }
};

const handleCreateFamily = async (event) => {
  event.preventDefault();
  clearError();

  const fName = createFamilyForm.familyName.value.trim();

  try {
    setStatus("Creating family…");
    const newFamilyId = await createFamily(fName);
    setStatus("Family created.");
    createFamilyForm.reset();

    // Update UI
    const profile = getCurrentUserProfile();
    familyName.textContent = fName;
    familyId.textContent = newFamilyId;
    userRole.textContent = "parent";
    createFamilySection.classList.add("hidden");
    familyPanel.classList.remove("hidden");
    familySettingsSection.classList.remove("hidden");
  } catch (error) {
    showError(error.message);
    setStatus("Family creation failed.");
  }
};

const handleAddChild = async (event) => {
  event.preventDefault();
  clearError();

  const childEmail = addChildForm.childEmail.value.trim();
  const childPassword = addChildForm.childPassword.value.trim();
  const childName = addChildForm.childName.value.trim();
  const parentPassword = addChildForm.parentPassword.value.trim();

  try {
    setStatus("Creating child account…");
    await addFamilyMember(childEmail, childPassword, childName, parentPassword);
    setStatus("Child account created successfully!");
    addChildForm.reset();
    await renderFamilyMembers();
  } catch (error) {
    showError(error.message);
    setStatus("Child account creation failed.");
  }
};

const handleLogout = async () => {
  clearError();
  try {
    setStatus("Signing out…");
    await logout();
  } catch (error) {
    showError(error.message);
    setStatus("Logout failed.");
  }
};

// ====================
// INIT
// ====================

const init = () => {
  setStatus("Loading…");

  // Toggle auth views
  toggleButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      clearError();
      setAuthView(btn.dataset.target);
    });
  });

  // Form submissions
  loginForm.addEventListener("submit", handleLoginSubmit);
  registerForm.addEventListener("submit", handleRegisterSubmit);
  createFamilyForm.addEventListener("submit", handleCreateFamily);
  addChildForm.addEventListener("submit", handleAddChild);
  logoutBtn.addEventListener("click", handleLogout);

  // Auth state listener
  setupAuthListener((user, userData) => {
    clearError();
    if (user) {
      setLoggedInUI(userData);
      setStatus("Signed in.");
    } else {
      setLoggedOutUI();
      setStatus("Signed out.");
    }
  });
};

init();init();
