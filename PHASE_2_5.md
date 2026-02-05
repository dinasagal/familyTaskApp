# Phase 2.5 — Add Family Members (Child Users)

## Overview
Parents can now add child users to their family. When a child is added, the system:
1. Creates a Firebase Auth account with their email/password
2. Creates a user doc with role="child" and same familyId
3. Adds them to the family's memberUids list

## Features

### Parent Actions
- **Add Child User**: Form with email, password, optional name
- **View Family Members**: List showing all members and their roles

### Child Actions
- **Login**: Child can login with email/password provided by parent
- **See Family**: Dashboard shows family name and role

## Flow

```
Parent (has family)
  ↓
[Family Settings Section]
  ↓
[Add Child Form]
  ↓
Create Auth Account + User Doc + Add to Family
  ↓
Child can now login
  ↓
Child sees dashboard with family name
```

## Code Structure

### index.html
- **Family Settings Section**: Shows only to parent users
- **Add Child Form**: Email, password, optional name
- **Family Members List**: Shows all members with roles

### app.js
- `loadFamilyMembers(familyId)`: Fetches and displays family members
- `addChildHandler()`: Creates child account, user doc, updates family
- Updated `setLoggedInUI()`: Shows family settings for parents only

### Firestore Rules (FIRESTORE_RULES.txt)
- Parents can create child user docs with role="child"
- Parents can read all family member docs
- Users can read/update their own docs
- Family members can read/update family doc

## Testing

1. **Register as parent**: Email, password
2. **Create family**: E.g. "The Smiths"
3. **Add child**: Child email, password, optional name
4. **Verify**: Child appears in "Family Members" list
5. **Login as child**: Use email/password from step 3
6. **Check child dashboard**: Shows family name, role=child

## Status
✅ Complete - Ready for Phase 3 (Sidebar Navigation)
