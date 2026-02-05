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
// GLOBAL STATE (Exposed)
// ====================

export let currentUser = null;
export let currentUserRole = null;
export let currentFamilyId = null;

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

// Sidebar elements
const hamburgerBtn = document.getElementById("hamburger-btn");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const sidebarLogout = document.getElementById("sidebar-logout");
const navSettings = document.getElementById("nav-settings");
const navLinks = document.querySelectorAll(".nav-link");

// Sections
const authSection = document.getElementById("auth-section");
const tasksSection = document.getElementById("tasks-section");
const calendarSection = document.getElementById("calendar-section");
const messagesSection = document.getElementById("messages-section");

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
// SIDEBAR & NAVIGATION
// ====================

const toggleSidebar = () => {
  sidebar.classList.toggle("visible");
  sidebarOverlay.classList.toggle("visible");
};

const closeSidebar = () => {
  sidebar.classList.remove("visible");
  sidebarOverlay.classList.remove("visible");
};

const showSection = (sectionName) => {
  if (sectionName === "settings" && currentUserRole !== "parent") {
    return;
  }

  // Hide all sections
  authSection.classList.add("hidden");
  tasksSection.classList.add("hidden");
  calendarSection.classList.add("hidden");
  messagesSection.classList.add("hidden");
  familySettingsSection.classList.add("hidden");

  // Show selected section
  switch (sectionName) {
    case "tasks":
      tasksSection.classList.remove("hidden");
      break;
    case "calendar":
      calendarSection.classList.remove("hidden");
      break;
    case "messages":
      messagesSection.classList.remove("hidden");
      break;
    case "settings":
      familySettingsSection.classList.remove("hidden");
      if (currentUserRole === "parent") {
        renderFamilyMembers();
      }
      break;
    default:
      authSection.classList.remove("hidden");
  }

  // Update active nav link
  navLinks.forEach((link) => {
    if (link.dataset.section === sectionName) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  // Close sidebar on mobile after navigation
  if (window.innerWidth <= 768) {
    closeSidebar();
  }
};

// ====================
// RENDER UI
// ====================

const setLoggedInUI = async (userData) => {
  const profile = getCurrentUserProfile();
  
  // Update global state
  currentUser = profile.user;
  currentUserRole = userData?.role || null;
  currentFamilyId = userData?.familyId || null;
  
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

    // Show sidebar and main app
    sidebar.classList.remove("hidden");
    hamburgerBtn.classList.remove("hidden");
    authSection.classList.add("hidden");
    
    // Show default section (Tasks)
    showSection("tasks");

    // If parent, enable family settings access via sidebar
    if (userData.role === "parent") {
      navSettings.classList.remove("hidden");
      await renderFamilyMembers();
    } else {
      navSettings.classList.add("hidden");
    }
  } else {
    // User has no family - show create family form in auth section
    createFamilySection.classList.remove("hidden");
    familyPanel.classList.add("hidden");
    sidebar.classList.add("hidden");
    hamburgerBtn.classList.add("hidden");
    authSection.classList.remove("hidden");
    navSettings.classList.add("hidden");
  }
};

const setLoggedOutUI = () => {
  // Clear global state
  currentUser = null;
  currentUserRole = null;
  currentFamilyId = null;
  
  userEmail.textContent = "—";
  userUid.textContent = "—";
  userPanel.classList.add("hidden");
  createFamilySection.classList.add("hidden");
  familyPanel.classList.add("hidden");
  sidebar.classList.add("hidden");
  hamburgerBtn.classList.add("hidden");
  navSettings.classList.add("hidden");
  document.querySelector(".auth-toggle").classList.remove("hidden");
  setAuthView("login");
  
  // Show auth section
  authSection.classList.remove("hidden");
  tasksSection.classList.add("hidden");
  calendarSection.classList.add("hidden");
  messagesSection.classList.add("hidden");
  familySettingsSection.classList.add("hidden");
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

  // Sidebar toggle (mobile)
  hamburgerBtn.addEventListener("click", toggleSidebar);
  sidebarOverlay.addEventListener("click", closeSidebar);

  // Sidebar navigation
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      if (section) {
        showSection(section);
      }
    });
  });

  // Sidebar logout
  sidebarLogout.addEventListener("click", async (e) => {
    e.preventDefault();
    await handleLogout();
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
