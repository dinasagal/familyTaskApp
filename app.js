import { db } from "./firebase.js";
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

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ====================
// GLOBAL STATE (Exposed)
// ====================

export let currentUser = null;
export let currentUserRole = null;
export let currentFamilyId = null;

let familyMembers = [];
let memberMap = new Map();
let archiveVisible = false;

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

// Tasks module elements
const taskForm = document.getElementById("task-form");
const assignedUserWrapper = document.getElementById("assigned-user-wrapper");
const assignedUserSelect = document.getElementById("assigned-user");
const taskCategorySelect = document.getElementById("task-category");
const tasksList = document.getElementById("tasks-list");
const tasksEmpty = document.getElementById("tasks-empty");
const archiveToggle = document.getElementById("archive-toggle");
const archiveSection = document.getElementById("archive-section");
const archiveList = document.getElementById("archive-list");
const archiveEmpty = document.getElementById("archive-empty");

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
      loadTasks();
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

    // If parent, enable family settings access via sidebar
    if (userData.role === "parent") {
      navSettings.classList.remove("hidden");
      await renderFamilyMembers();
    } else {
      navSettings.classList.add("hidden");
      familyMembers = [
        {
          uid: currentUser.uid,
          email: currentUser.email,
          name: userData?.name || "",
          role: userData?.role || "child",
        },
      ];
      memberMap = new Map(familyMembers.map((member) => [member.uid, member]));
      populateAssigneeOptions();
    }

    // Show default section (Tasks)
    showSection("tasks");
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
  tasksList.innerHTML = "";
  archiveList.innerHTML = "";
  tasksEmpty.classList.add("hidden");
  archiveEmpty.classList.add("hidden");
  archiveSection.classList.add("hidden");
  archiveVisible = false;
  archiveToggle.textContent = "Show Archive";
};

const renderFamilyMembers = async () => {
  try {
    const members = await loadFamilyMembers();
    familyMembers = members;
    memberMap = new Map(members.map((member) => [member.uid, member]));
    populateAssigneeOptions();
    
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
// TASKS MODULE
// ====================

const populateAssigneeOptions = () => {
  if (!assignedUserSelect) {
    return;
  }

  assignedUserSelect.innerHTML = "";

  if (currentUserRole === "parent") {
    assignedUserWrapper.classList.remove("hidden");
    familyMembers.forEach((member) => {
      const option = document.createElement("option");
      option.value = member.uid;
      option.textContent = member.name ? `${member.name} (${member.email})` : member.email;
      assignedUserSelect.appendChild(option);
    });
  } else {
    assignedUserWrapper.classList.add("hidden");
    if (currentUser) {
      const option = document.createElement("option");
      option.value = currentUser.uid;
      option.textContent = "You";
      assignedUserSelect.appendChild(option);
    }
  }
};

const categoryColors = {
  Home: "#60a5fa",
  School: "#34d399",
  Chores: "#fbbf24",
  Health: "#f472b6",
  Other: "#a78bfa",
};

const getCategoryColor = (category) => {
  return categoryColors[category] || "#cbd5f5";
};

const getAssigneeName = (uid) => {
  const member = memberMap.get(uid);
  if (!member) {
    return "Unknown";
  }
  return member.name ? member.name : member.email;
};

const fetchTasks = async (status) => {
  if (!currentFamilyId) {
    return [];
  }

  const tasksRef = collection(db, "tasks");
  
  let tasksQuery;
  if (currentUserRole === "child") {
    // Children can only read tasks assigned to them
    tasksQuery = query(
      tasksRef,
      where("familyId", "==", currentFamilyId),
      where("status", "==", status),
      where("assignedUserUid", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );
  } else {
    // Parents can read all family tasks
    tasksQuery = query(
      tasksRef,
      where("familyId", "==", currentFamilyId),
      where("status", "==", status),
      orderBy("createdAt", "desc")
    );
  }

  const snapshot = await getDocs(tasksQuery);
  const tasks = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));

  return tasks;
};

const renderTaskList = (tasks, container, emptyEl, isArchive) => {
  container.innerHTML = "";

  if (tasks.length === 0) {
    emptyEl.classList.remove("hidden");
    return;
  }

  emptyEl.classList.add("hidden");

  tasks.forEach((task) => {
    const card = document.createElement("div");
    card.className = "task-card";

    const stripe = document.createElement("div");
    stripe.className = "task-stripe";
    stripe.style.background = task.categoryColor || "#cbd5f5";

    const content = document.createElement("div");
    content.className = "task-content";

    const title = document.createElement("h4");
    title.className = "task-title";
    title.textContent = task.title;

    const description = document.createElement("p");
    description.className = "muted";
    description.textContent = task.content || "";

    const meta = document.createElement("div");
    meta.className = "task-meta";

    const assigned = document.createElement("span");
    assigned.textContent = `Assigned: ${getAssigneeName(task.assignedUserUid)}`;

    const due = document.createElement("span");
    due.textContent = task.dueDate ? `Due: ${task.dueDate}` : "No due date";

    const category = document.createElement("span");
    category.textContent = task.category || "Other";

    meta.appendChild(assigned);
    meta.appendChild(due);
    meta.appendChild(category);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const canEdit = currentUserRole === "parent" || task.assignedUserUid === currentUser.uid;

    if (!isArchive) {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.addEventListener("change", async () => {
        await markTaskCompleted(task.id);
      });
      actions.appendChild(checkbox);
    }

    if (canEdit) {
      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => editTask(task));
      actions.appendChild(editBtn);
    }

    if (isArchive && canEdit) {
      const restoreBtn = document.createElement("button");
      restoreBtn.textContent = "Restore";
      restoreBtn.addEventListener("click", async () => {
        await restoreTask(task.id);
      });
      actions.appendChild(restoreBtn);
    }

    if (canEdit) {
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", async () => {
        await deleteTask(task.id);
      });
      actions.appendChild(deleteBtn);
    }

    content.appendChild(title);
    content.appendChild(description);
    content.appendChild(meta);
    content.appendChild(actions);

    card.appendChild(stripe);
    card.appendChild(content);
    container.appendChild(card);
  });
};

const loadTasks = async () => {
  const openTasks = await fetchTasks("open");
  renderTaskList(openTasks, tasksList, tasksEmpty, false);

  if (archiveVisible) {
    const archivedTasks = await fetchTasks("completed");
    renderTaskList(archivedTasks, archiveList, archiveEmpty, true);
  }
};

const createTask = async (taskData) => {
  const tasksRef = collection(db, "tasks");
  await addDoc(tasksRef, {
    ...taskData,
    status: "open",
    createdAt: serverTimestamp(),
    completedAt: null,
  });
};

const editTask = async (task) => {
  const newTitle = window.prompt("Edit title", task.title);
  if (!newTitle) {
    return;
  }

  const newContent = window.prompt("Edit details", task.content || "");
  const newDue = window.prompt("Edit due date (YYYY-MM-DD)", task.dueDate || "");
  const newCategory = window.prompt("Edit category", task.category || "Other");
  const categoryColor = getCategoryColor(newCategory || "Other");

  const taskRef = doc(db, "tasks", task.id);
  await updateDoc(taskRef, {
    title: newTitle,
    content: newContent || "",
    dueDate: newDue || "",
    category: newCategory || "Other",
    categoryColor: categoryColor,
  });

  await loadTasks();
};

const markTaskCompleted = async (taskId) => {
  const taskRef = doc(db, "tasks", taskId);
  await updateDoc(taskRef, {
    status: "completed",
    completedAt: serverTimestamp(),
  });

  await loadTasks();
};

const restoreTask = async (taskId) => {
  const taskRef = doc(db, "tasks", taskId);
  await updateDoc(taskRef, {
    status: "open",
    completedAt: null,
  });

  await loadTasks();
};

const deleteTask = async (taskId) => {
  const taskRef = doc(db, "tasks", taskId);
  await deleteDoc(taskRef);

  await loadTasks();
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

const handleTaskSubmit = async (event) => {
  event.preventDefault();
  clearError();

  if (!currentFamilyId || !currentUser) {
    showError("Family not loaded yet.");
    return;
  }

  const title = taskForm.title.value.trim();
  const content = taskForm.content.value.trim();
  const dueDate = taskForm.dueDate.value;
  const category = taskCategorySelect.value;
  const assignedUserUid = assignedUserSelect.value || currentUser.uid;

  if (!title) {
    showError("Title is required.");
    return;
  }

  if (!assignedUserUid) {
    showError("Assigned user is required.");
    return;
  }

  if (currentUserRole === "child" && assignedUserUid !== currentUser.uid) {
    showError("Children can only assign tasks to themselves.");
    return;
  }

  const categoryColor = getCategoryColor(category);

  try {
    setStatus("Creating task…");
    await createTask({
      familyId: currentFamilyId,
      assignedUserUid,
      createdByUid: currentUser.uid,
      title,
      content,
      category,
      categoryColor,
      dueDate,
    });
    taskForm.reset();
    populateAssigneeOptions();
    setStatus("Task created.");
    await loadTasks();
  } catch (error) {
    showError(error.message);
    setStatus("Task creation failed.");
  }
};

const handleArchiveToggle = async () => {
  archiveVisible = !archiveVisible;
  archiveSection.classList.toggle("hidden", !archiveVisible);
  archiveToggle.textContent = archiveVisible ? "Hide Archive" : "Show Archive";
  if (archiveVisible) {
    await loadTasks();
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
  taskForm.addEventListener("submit", handleTaskSubmit);
  logoutBtn.addEventListener("click", handleLogout);

  archiveToggle.addEventListener("click", handleArchiveToggle);

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

init();
