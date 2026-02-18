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
  deleteChildUser,
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
let activeSection = "auth";

// Calendar module state
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedCalendarUserUid = null;
let calendarEvents = [];

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
const settingsFamilyName = document.getElementById("settings-family-name");

// Sidebar elements
const hamburgerBtn = document.getElementById("hamburger-btn");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const sidebarLogout = document.getElementById("sidebar-logout");
const navSettings = document.getElementById("nav-settings");
const navLinks = document.querySelectorAll(".nav-link");
const installButtonWrapper = document.getElementById("install-button-wrapper");
const installButton = document.getElementById("install-button");

// PWA elements
const offlineBanner = document.getElementById("offline-banner");
const appDiv = document.getElementById("app");

// Sections
const authSection = document.getElementById("auth-section");
const tasksSection = document.getElementById("tasks-section");
const calendarSection = document.getElementById("calendar-section");
const messagesSection = document.getElementById("messages-section");

// Tasks module elements
const newTaskBtn = document.getElementById("new-task-btn");
const taskFormCard = document.getElementById("task-form-card");
const taskForm = document.getElementById("task-form");
const cancelTaskBtn = document.getElementById("cancel-task-btn");
const assignedUserWrapper = document.getElementById("assigned-user-wrapper");
const assignedUserSelect = document.getElementById("assigned-user");
const taskCategorySelect = document.getElementById("task-category");
const tasksList = document.getElementById("tasks-list");
const tasksEmpty = document.getElementById("tasks-empty");
const archiveToggle = document.getElementById("archive-toggle");
const archiveSection = document.getElementById("archive-section");
const archiveList = document.getElementById("archive-list");
const archiveEmpty = document.getElementById("archive-empty");

// Calendar module elements
const calendarUserSelector = document.getElementById("calendar-user-selector");
const calendarUserSelect = document.getElementById("calendar-user-select");
const calendarPrevBtn = document.getElementById("calendar-prev");
const calendarNextBtn = document.getElementById("calendar-next");
const calendarMonthYear = document.getElementById("calendar-month-year");
const calendarDaysContainer = document.getElementById("calendar-days-container");
const eventModal = document.getElementById("event-modal");
const eventForm = document.getElementById("event-form");
const eventModalTitle = document.getElementById("event-modal-title");
const eventIdInput = document.getElementById("event-id");
const eventTitleInput = document.getElementById("event-title");
const eventDescriptionInput = document.getElementById("event-description");
const eventDateInput = document.getElementById("event-date");
const eventTimeInput = document.getElementById("event-time");
const eventUserWrapper = document.getElementById("event-user-wrapper");
const eventUserSelect = document.getElementById("event-user-select");
const eventDeleteBtn = document.getElementById("event-delete-btn");
const eventCancelBtn = document.getElementById("event-cancel-btn");

// Message board module elements
const messageForm = document.getElementById("message-form");
const messageText = document.getElementById("message-text");
const messageCharCount = document.getElementById("message-char-count");
const messagesList = document.getElementById("messages-list");
const messagesEmpty = document.getElementById("messages-empty");

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
      loadCalendar();
      break;
    case "messages":
      messagesSection.classList.remove("hidden");
      loadMessages();
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

  activeSection = sectionName;

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
    settingsFamilyName.textContent = userData.familyName || "—";
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

    // Preserve current section across auth refreshes (e.g., add child flow)
    const sectionToShow =
      activeSection && activeSection !== "auth" ? activeSection : "tasks";

    if (sectionToShow === "settings" && userData.role !== "parent") {
      return;
    }

    showSection(sectionToShow);
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
  settingsFamilyName.textContent = "—";
  sidebar.classList.add("hidden");
  hamburgerBtn.classList.add("hidden");
  navSettings.classList.add("hidden");
  document.querySelector(".auth-toggle").classList.remove("hidden");
  setAuthView("login");
  
  // Show auth section
  activeSection = "auth";
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
  
  // Reset calendar state
  selectedCalendarUserUid = null;
  calendarEvents = [];
  currentMonth = new Date().getMonth();
  currentYear = new Date().getFullYear();
  calendarDaysContainer.innerHTML = "";
  
  // Reset message board state
  messageText.value = "";
  messageCharCount.textContent = "0 / 500";
  messagesList.innerHTML = "";
  messagesEmpty.classList.add("hidden");
};

const renderFamilyMembers = async () => {
  try {
    const members = await loadFamilyMembers();
    settingsFamilyName.textContent = familyName.textContent || "—";
    familyMembers = members;
    memberMap = new Map(members.map((member) => [member.uid, member]));
    populateAssigneeOptions();
    populateCalendarUserSelect();
    
    // Set default calendar user to first non-deleted member
    const activeMember = members.find((m) => !m.isDeleted);
    if (!selectedCalendarUserUid && activeMember) {
      selectedCalendarUserUid = activeMember.uid;
      calendarUserSelect.value = selectedCalendarUserUid;
    }
    
    if (members.length === 0) {
      familyMembersSection.classList.add("hidden");
      return;
    }
    
    familyMembersList.innerHTML = "";
    
    members.forEach((member) => {
      const listItem = document.createElement("li");
      const isDeleted = member.isDeleted || false;
      
      // Display member info
      const memberName = member.name && member.name !== "—" ? member.name : member.email;
      const displayText = isDeleted 
        ? `${memberName} (${member.role || "—"}) [Deleted]`
        : `${memberName} (${member.role || "—"})`;
      
      const textSpan = document.createElement("span");
      textSpan.textContent = displayText;
      textSpan.className = isDeleted ? "deleted-member" : "";
      listItem.appendChild(textSpan);
      
      // Add delete button for parents managing children (not deleted)
      if (currentUserRole === "parent" && member.role === "child" && !isDeleted && member.uid !== currentUser.uid) {
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "member-delete-btn";
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          
          // Confirmation dialog
          const childDisplayName = member.name && member.name !== "—" ? member.name : member.email;
          if (!confirm(`Are you sure you want to remove "${childDisplayName}" from the family?\n\nTheir tasks, events, and messages will remain but will be marked as belonging to a deleted user.`)) {
            return;
          }
          
          try {
            setStatus("Removing child user…");
            await deleteChildUser(member.uid);
            await renderFamilyMembers();
            setStatus(`"${childDisplayName}" has been removed from the family.`);
          } catch (error) {
            showError(error.message);
            setStatus("Failed to remove child user.");
          }
        });
        listItem.appendChild(deleteBtn);
      }
      
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
      // Exclude deleted members from assignee options
      if (member.isDeleted) {
        return;
      }
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
  if (member.isDeleted) {
    return "[Deleted User]";
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

const openTaskForm = () => {
  taskFormCard.classList.remove("task-form-collapsed");
  newTaskBtn.classList.add("hidden");
  
  // Focus on first input after animation starts
  setTimeout(() => {
    const firstInput = taskForm.querySelector('input[name="title"]');
    if (firstInput) {
      firstInput.focus();
    }
  }, 100);
};

const closeTaskForm = () => {
  taskFormCard.classList.add("task-form-collapsed");
  taskForm.reset();
  populateAssigneeOptions();
  newTaskBtn.classList.remove("hidden");
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
// CALENDAR MODULE
// ====================

const populateCalendarUserSelect = () => {
  calendarUserSelect.innerHTML = "";
  familyMembers.forEach((member) => {
    // Exclude deleted members from calendar selection
    if (member.isDeleted) {
      return;
    }
    const option = document.createElement("option");
    option.value = member.uid;
    option.textContent = member.name ? member.name : member.email;
    calendarUserSelect.appendChild(option);
  });
};

const populateEventUserSelect = () => {
  eventUserSelect.innerHTML = "";
  familyMembers.forEach((member) => {
    // Exclude deleted members from event user selection
    if (member.isDeleted) {
      return;
    }
    const option = document.createElement("option");
    option.value = member.uid;
    option.textContent = member.name ? member.name : member.email;
    eventUserSelect.appendChild(option);
  });
};

const fetchEvents = async (userUid) => {
  if (!currentFamilyId || !userUid) {
    return [];
  }

  const eventsRef = collection(db, "events");
  const eventsQuery = query(
    eventsRef,
    where("familyId", "==", currentFamilyId),
    where("userUid", "==", userUid),
    orderBy("datetime", "asc")
  );

  const snapshot = await getDocs(eventsQuery);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
};

const renderCalendar = () => {
  // Update header
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  calendarMonthYear.textContent = `${monthNames[currentMonth]} ${currentYear}`;

  // Clear days
  calendarDaysContainer.innerHTML = "";

  // Calculate calendar dates
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const today = new Date();
  const isCurrentMonth =
    today.getMonth() === currentMonth && today.getFullYear() === currentYear;
  const todayDate = today.getDate();

  // Group events by day
  const eventsByDay = {};
  calendarEvents.forEach((event) => {
    if (!event.datetime || !event.datetime.toDate) return;
    const eventDate = event.datetime.toDate();
    if (
      eventDate.getMonth() === currentMonth &&
      eventDate.getFullYear() === currentYear
    ) {
      const day = eventDate.getDate();
      if (!eventsByDay[day]) {
        eventsByDay[day] = [];
      }
      eventsByDay[day].push(event);
    }
  });

  // Render previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const dayEl = document.createElement("div");
    dayEl.className = "calendar-day other-month";
    dayEl.innerHTML = `<div class="calendar-day-number">${day}</div>`;
    calendarDaysContainer.appendChild(dayEl);
  }

  // Render current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEl = document.createElement("div");
    dayEl.className = "calendar-day";

    if (isCurrentMonth && day === todayDate) {
      dayEl.classList.add("today");
    }

    const dayNumber = document.createElement("div");
    dayNumber.className = "calendar-day-number";
    dayNumber.textContent = day;
    dayEl.appendChild(dayNumber);

    // Add events for this day
    if (eventsByDay[day]) {
      eventsByDay[day].forEach((event) => {
        const eventEl = document.createElement("div");
        eventEl.className = "calendar-event";
        let eventText = event.title;
        if (event.datetime && event.datetime.toDate) {
          const eventDate = event.datetime.toDate();
          const hours = eventDate.getHours();
          const minutes = eventDate.getMinutes();
          if (hours !== 0 || minutes !== 0) {
            const timeStr = `${hours % 12 || 12}:${String(minutes).padStart(
              2,
              "0"
            )}${hours >= 12 ? "pm" : "am"}`;
            eventText = `${timeStr} ${eventText}`;
          }
        }
        eventEl.textContent = eventText;
        eventEl.addEventListener("click", (e) => {
          e.stopPropagation();
          openEventModal(event);
        });
        dayEl.appendChild(eventEl);
      });
    }

    // Click empty day to add event
    dayEl.addEventListener("click", () => {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(
        2,
        "0"
      )}-${String(day).padStart(2, "0")}`;
      openEventModal(null, dateStr);
    });

    calendarDaysContainer.appendChild(dayEl);
  }

  // Render next month days to fill grid
  const totalCells = calendarDaysContainer.children.length;
  const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let day = 1; day <= remainingCells; day++) {
    const dayEl = document.createElement("div");
    dayEl.className = "calendar-day other-month";
    dayEl.innerHTML = `<div class="calendar-day-number">${day}</div>`;
    calendarDaysContainer.appendChild(dayEl);
  }
};

const loadCalendar = async () => {
  // Determine which user calendar to show
  if (currentUserRole === "parent") {
    calendarUserSelector.classList.remove("hidden");
    populateCalendarUserSelect();
    if (!selectedCalendarUserUid && familyMembers.length > 0) {
      selectedCalendarUserUid = familyMembers[0].uid;
      calendarUserSelect.value = selectedCalendarUserUid;
    }
  } else {
    calendarUserSelector.classList.add("hidden");
    selectedCalendarUserUid = currentUser.uid;
  }

  if (!selectedCalendarUserUid) {
    return;
  }

  // Fetch and render
  calendarEvents = await fetchEvents(selectedCalendarUserUid);
  renderCalendar();
};

const openEventModal = (event = null, dateStr = null) => {
  eventModal.classList.remove("hidden");

  if (event) {
    // Edit mode
    eventModalTitle.textContent = "Edit Event";
    eventIdInput.value = event.id;
    eventTitleInput.value = event.title;
    eventDescriptionInput.value = event.description || "";

    if (event.datetime && event.datetime.toDate) {
      const eventDate = event.datetime.toDate();
      const dateStr = `${eventDate.getFullYear()}-${String(
        eventDate.getMonth() + 1
      ).padStart(2, "0")}-${String(eventDate.getDate()).padStart(2, "0")}`;
      eventDateInput.value = dateStr;

      const hours = eventDate.getHours();
      const minutes = eventDate.getMinutes();
      if (hours !== 0 || minutes !== 0) {
        eventTimeInput.value = `${String(hours).padStart(2, "0")}:${String(
          minutes
        ).padStart(2, "0")}`;
      } else {
        eventTimeInput.value = "";
      }
    }

    eventDeleteBtn.classList.remove("hidden");
  } else {
    // Add mode
    eventModalTitle.textContent = "Add Event";
    eventIdInput.value = "";
    eventTitleInput.value = "";
    eventDescriptionInput.value = "";
    eventDateInput.value = dateStr || "";
    eventTimeInput.value = "";
    eventDeleteBtn.classList.add("hidden");
  }

  // Show user selector for parents
  if (currentUserRole === "parent") {
    eventUserWrapper.classList.remove("hidden");
    populateEventUserSelect();
    eventUserSelect.value = selectedCalendarUserUid;
  } else {
    eventUserWrapper.classList.add("hidden");
  }
};

const closeEventModal = () => {
  eventModal.classList.add("hidden");
  eventForm.reset();
};

const createEvent = async (eventData) => {
  const eventsRef = collection(db, "events");
  await addDoc(eventsRef, {
    ...eventData,
    familyId: currentFamilyId,
    createdAt: serverTimestamp(),
  });
};

const updateEvent = async (eventId, eventData) => {
  const eventRef = doc(db, "events", eventId);
  await updateDoc(eventRef, eventData);
};

const deleteEvent = async (eventId) => {
  const eventRef = doc(db, "events", eventId);
  await deleteDoc(eventRef);
};

// ====================
// MESSAGE BOARD MODULE
// ====================

const formatTimeAgo = (timestamp) => {
  if (!timestamp || !timestamp.toDate) return "just now";
  
  const date = timestamp.toDate();
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
};

const fetchMessages = async () => {
  if (!currentFamilyId) {
    return [];
  }

  const messagesRef = collection(db, "messages");
  const messagesQuery = query(
    messagesRef,
    where("familyId", "==", currentFamilyId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(messagesQuery);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
};

const renderMessages = (messages) => {
  messagesList.innerHTML = "";

  if (messages.length === 0) {
    messagesEmpty.classList.remove("hidden");
    return;
  }

  messagesEmpty.classList.add("hidden");

  messages.forEach((message) => {
    const card = document.createElement("div");
    card.className = "message-card";
    
    // Highlight own messages
    if (message.authorUid === currentUser.uid) {
      card.classList.add("own");
    }

    // Header: author + time
    const header = document.createElement("div");
    header.className = "message-header";

    const author = document.createElement("span");
    author.className = "message-author";
    if (message.authorUid === currentUser.uid) {
      author.classList.add("own");
    }
    // Check if the author has been deleted
    const authorMember = memberMap.get(message.authorUid);
    if (authorMember && authorMember.isDeleted) {
      author.textContent = "[Deleted User]";
    } else {
      author.textContent = message.authorName || message.authorUid;
    }
    header.appendChild(author);

    const time = document.createElement("span");
    time.className = "message-time";
    time.textContent = formatTimeAgo(message.createdAt);
    header.appendChild(time);

    card.appendChild(header);

    // Message text
    const text = document.createElement("div");
    text.className = "message-text";
    text.textContent = message.text;
    card.appendChild(text);

    // Actions
    const actions = document.createElement("div");
    actions.className = "message-actions";

    // Delete button: show for parent on all, show for child on own only
    const canDelete =
      currentUserRole === "parent" || message.authorUid === currentUser.uid;

    if (canDelete) {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "message-delete-btn";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", async () => {
        if (!confirm("Delete this message?")) return;
        try {
          await deleteMessage(message.id);
          await loadMessages();
          setStatus("Message deleted.");
        } catch (error) {
          showError(error.message);
          setStatus("Delete failed.");
        }
      });
      actions.appendChild(deleteBtn);
    }

    card.appendChild(actions);
    messagesList.appendChild(card);
  });
};

const loadMessages = async () => {
  const messages = await fetchMessages();
  renderMessages(messages);
};

const createMessage = async (text) => {
  const messagesRef = collection(db, "messages");
  await addDoc(messagesRef, {
    familyId: currentFamilyId,
    authorUid: currentUser.uid,
    authorName: currentUser.name || currentUser.email,
    text,
    createdAt: serverTimestamp(),
  });
};

const deleteMessage = async (messageId) => {
  const messageRef = doc(db, "messages", messageId);
  await deleteDoc(messageRef);
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
    settingsFamilyName.textContent = fName;
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
    setStatus("Task created.");
    await loadTasks();
    closeTaskForm();
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

const handleMessageSubmit = async (event) => {
  event.preventDefault();
  clearError();

  const text = messageText.value.trim();

  if (!text) {
    showError("Message cannot be empty.");
    return;
  }

  try {
    setStatus("Posting message…");
    await createMessage(text);
    messageText.value = "";
    messageCharCount.textContent = "0 / 500";
    setStatus("Message posted.");
    await loadMessages();
  } catch (error) {
    showError(error.message);
    setStatus("Message posting failed.");
  }
};

const handleMessageTextInput = () => {
  const count = messageText.value.length;
  messageCharCount.textContent = `${count} / 500`;
};

const handleCalendarUserChange = async () => {
  selectedCalendarUserUid = calendarUserSelect.value;
  await loadCalendar();
};

const handleCalendarPrev = () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar();
};

const handleCalendarNext = () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar();
};

const handleEventSubmit = async (event) => {
  event.preventDefault();

  const title = eventTitleInput.value.trim();
  const description = eventDescriptionInput.value.trim();
  const dateStr = eventDateInput.value;
  const timeStr = eventTimeInput.value;

  if (!title || !dateStr) {
    showError("Title and date are required.");
    return;
  }

  // Build datetime
  let datetime;
  if (timeStr) {
    datetime = new Date(`${dateStr}T${timeStr}`);
  } else {
    datetime = new Date(`${dateStr}T00:00`);
  }

  // Determine userUid
  let userUid;
  if (currentUserRole === "parent") {
    userUid = eventUserSelect.value;
  } else {
    userUid = currentUser.uid;
  }

  const eventData = {
    title,
    description,
    datetime,
    userUid,
  };

  try {
    const eventId = eventIdInput.value;
    if (eventId) {
      // Update existing event
      await updateEvent(eventId, eventData);
      setStatus("Event updated.");
    } else {
      // Create new event
      await createEvent(eventData);
      setStatus("Event created.");
    }
    closeEventModal();
    await loadCalendar();
  } catch (error) {
    showError(error.message);
    setStatus("Event save failed.");
  }
};

const handleEventDelete = async () => {
  const eventId = eventIdInput.value;
  if (!eventId) return;

  if (!confirm("Delete this event?")) return;

  try {
    await deleteEvent(eventId);
    setStatus("Event deleted.");
    closeEventModal();
    await loadCalendar();
  } catch (error) {
    showError(error.message);
    setStatus("Event delete failed.");
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
// PWA MODULE
// ====================

let deferredPrompt = null;

const registerServiceWorker = async () => {
  if (!navigator.serviceWorker) {
    console.log("Service Worker not supported");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register("/service-worker.js", {
      scope: "/",
    });
    console.log("Service Worker registered:", registration);
  } catch (error) {
    console.error("Service Worker registration failed:", error);
  }
};

const setupInstallPrompt = () => {
  // Listen for beforeinstallprompt event
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installButtonWrapper.classList.remove("hidden");
    console.log("Install prompt ready");
  });

  // Listen for app installed event
  window.addEventListener("appinstalled", () => {
    console.log("App installed");
    installButtonWrapper.classList.add("hidden");
    deferredPrompt = null;
    setStatus("App installed successfully!");
  });
};

const handleInstallClick = async () => {
  if (!deferredPrompt) return;

  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log("Install outcome:", outcome);
    deferredPrompt = null;
    installButtonWrapper.classList.add("hidden");
  } catch (error) {
    console.error("Install failed:", error);
  }
};

const setupOfflineDetection = () => {
  // Check initial online status
  const updateOnlineStatus = () => {
    if (navigator.onLine) {
      offlineBanner.classList.add("hidden");
      appDiv.classList.remove("offline");
    } else {
      offlineBanner.classList.remove("hidden");
      appDiv.classList.add("offline");
    }
  };

  // Initial check
  updateOnlineStatus();

  // Listen for online/offline events
  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);
};

// ====================
// INIT
// ====================

const init = () => {
  setStatus("Loading…");

  // Register service worker
  registerServiceWorker();

  // Setup install prompt
  setupInstallPrompt();

  // Setup offline detection
  setupOfflineDetection();

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

  // Install button
  installButton.addEventListener("click", handleInstallClick);

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

  // Task form collapsible handlers
  newTaskBtn.addEventListener("click", openTaskForm);
  cancelTaskBtn.addEventListener("click", closeTaskForm);

  archiveToggle.addEventListener("click", handleArchiveToggle);

  // Message board event listeners
  messageForm.addEventListener("submit", handleMessageSubmit);
  messageText.addEventListener("input", handleMessageTextInput);

  // Calendar event listeners
  calendarUserSelect.addEventListener("change", handleCalendarUserChange);
  calendarPrevBtn.addEventListener("click", handleCalendarPrev);
  calendarNextBtn.addEventListener("click", handleCalendarNext);
  eventForm.addEventListener("submit", handleEventSubmit);
  eventDeleteBtn.addEventListener("click", handleEventDelete);
  eventCancelBtn.addEventListener("click", closeEventModal);

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
