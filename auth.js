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

// ====================
// STATE
// ====================

export let currentUser = null;
export let currentUserData = null;

// ====================
// AUTH STATE LISTENER
// ====================

export const setupAuthListener = (callback) => {
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    
    if (user) {
      // Fetch user doc
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        currentUserData = userSnap.data();
      }
    } else {
      currentUserData = null;
    }
    
    // Call UI callback
    callback(user, currentUserData);
  });
};

// ====================
// REGISTER
// ====================

export const register = async (email, password) => {
  try {
    // Create Firebase Auth user
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create user doc in Firestore
    const userRef = doc(db, "users", credential.user.uid);
    await setDoc(userRef, {
      email: email,
      role: null,
      familyId: null,
      createdAt: serverTimestamp(),
    });
    
    return credential.user;
  } catch (error) {
    throw new Error(error.message);
  }
};

// ====================
// LOGIN
// ====================

export const login = async (email, password) => {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  } catch (error) {
    throw new Error(error.message);
  }
};

// ====================
// LOGOUT
// ====================

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw new Error(error.message);
  }
};

// ====================
// CREATE FAMILY
// ====================

export const createFamily = async (familyName) => {
  if (!currentUser) {
    throw new Error("Not authenticated.");
  }
  
  try {
    // Create family doc
    const familiesRef = collection(db, "families");
    const familyDoc = await addDoc(familiesRef, {
      name: familyName,
      createdAt: serverTimestamp(),
      createdByUid: currentUser.uid,
      memberUids: [currentUser.uid],
    });
    
    const newFamilyId = familyDoc.id;
    
    // Update user doc
    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, {
      familyId: newFamilyId,
      familyName: familyName,
      role: "parent",
    });
    
    // Update local state
    currentUserData = {
      ...currentUserData,
      familyId: newFamilyId,
      familyName: familyName,
      role: "parent",
    };
    
    return newFamilyId;
  } catch (error) {
    throw new Error(error.message);
  }
};

// ====================
// ADD FAMILY MEMBER (CHILD)
// ====================

export const addFamilyMember = async (childEmail, childPassword, childName = "", parentPassword) => {
  if (!currentUser) {
    throw new Error("Not authenticated.");
  }
  
  if (currentUserData?.role !== "parent") {
    throw new Error("Only parents can add family members.");
  }
  
  if (!currentUserData?.familyId) {
    throw new Error("You must have a family to add members.");
  }
  
  if (!parentPassword) {
    throw new Error("Parent password required to add children.");
  }
  
  try {
    const familyId = currentUserData.familyId;
    const familyName = currentUserData.familyName;
    const parentEmail = currentUser.email;
    const parentUid = currentUser.uid;
    
    // Step 1: Create Firebase Auth account for child
    const childCredential = await createUserWithEmailAndPassword(
      auth,
      childEmail,
      childPassword
    );
    
    const childUid = childCredential.user.uid;
    
    // Step 2: Create child's user doc in Firestore (while child is logged in - Firestore rules allow it)
    const childUserRef = doc(db, "users", childUid);
    await setDoc(childUserRef, {
      email: childEmail,
      name: childName || "—",
      role: "child",
      familyId: familyId,
      familyName: familyName,
      createdAt: serverTimestamp(),
    });
    
    // Step 3: Re-authenticate as parent (so parent context is used for family update)
    const parentCredential = await signInWithEmailAndPassword(auth, parentEmail, parentPassword);
    
    // Step 4: Add child to family memberUids (now parent is authenticated)
    const familyRef = doc(db, "families", familyId);
    const familySnap = await getDoc(familyRef);
    
    if (familySnap.exists()) {
      const familyData = familySnap.data();
      const memberUids = familyData.memberUids || [];
      
      if (!memberUids.includes(childUid)) {
        memberUids.push(childUid);
        await updateDoc(familyRef, { memberUids });
      }
    }
    
    // Update local state
    currentUser = parentCredential.user;
    
    return childCredential.user;

  } catch (error) {
    throw new Error(error.message);
  }
};

// ====================
// GET CURRENT USER PROFILE
// ====================

export const getCurrentUserProfile = () => {
  return {
    user: currentUser,
    data: currentUserData,
  };
};

// ====================
// LOAD FAMILY MEMBERS
// ====================

export const loadFamilyMembers = async () => {
  if (!currentUserData?.familyId) {
    return [];
  }
  
  try {
    const familyRef = doc(db, "families", currentUserData.familyId);
    const familySnap = await getDoc(familyRef);
    
    if (!familySnap.exists()) {
      return [];
    }
    
    const familyData = familySnap.data();
    const memberUids = familyData.memberUids || [];
    const members = [];
    
    for (const uid of memberUids) {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        members.push({
          uid: uid,
          ...userSnap.data(),
        });
      }
    }
    
    return members;
  } catch (error) {
    console.error("Error loading family members:", error);
    return [];
  }
};
