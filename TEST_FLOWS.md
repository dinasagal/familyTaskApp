# Phase 2.5 — Test Flows

## Flow 1: Parent with Multiple Children ✅
**Goal:** Verify parent can add multiple children and they all appear in family members list

1. Register: `parent@test.com` / `password123`
2. Create family: `The Johnsons`
3. Add child 1: `sarah@test.com` / `child123` / name: `Sarah`
4. Verify: Sarah appears in family members list as `sarah@test.com (child)`
5. Add child 2: `tom@test.com` / `child123` / name: `Tom`
6. Verify: Both Sarah and Tom appear in list
7. Verify: Parent name should also be in list as `parent@test.com (parent)`

**Expected Result:** All 3 members (1 parent + 2 children) visible in "Family Members" section

---

## Flow 2: Child Cannot See Family Settings ✅
**Goal:** Verify children have read-only access (no "Add Child User" section)

1. Login as child: `sarah@test.com` / `child123` (from Flow 1)
2. Check dashboard:
   - Should see: "Family: The Johnsons" ✅
   - Should see: "Role: child" ✅
   - Should NOT see: "Family Settings (Parent Only)" section ✅
   - Should NOT see: "Add Child User" form ✅

**Expected Result:** Family Settings completely hidden for child users

---

## Flow 3: Switch Users (Parent ↔ Child) ✅
**Goal:** Verify logout/login switching works correctly

1. Logged in as parent: `parent@test.com`
2. Click "Logout" button
3. Verify: Auth section reappears, form cleared
4. Login as child: `sarah@test.com` / `child123`
5. Verify: Dashboard shows "Role: child"
6. Logout again
7. Login as parent again: `parent@test.com` / `password123`
8. Verify: Dashboard shows "Role: parent" + Family Settings visible

**Expected Result:** UI correctly reflects each user's role and permissions

---

## Flow 4: Duplicate Email Prevention ✅
**Goal:** Verify Firebase rejects duplicate email registrations

1. Register: `parent2@test.com` / `password456`
2. Create family: `The Smiths`
3. Try to add child with existing email: `parent2@test.com` / `child123`
4. Check error message in red below form

**Expected Result:** Error message: "Firebase: Error (auth/email-already-in-use)"

---

## Flow 5: Password Too Short ✅
**Goal:** Verify client-side validation for passwords

1. On Register form:
2. Email: `test@test.com`
3. Password: `123` (only 3 chars, min is 6)
4. Try to submit

**Expected Result:** HTML5 validation prevents submit (browser shows "at least 6 characters")

---

## Flow 6: Wrong Login Credentials ✅
**Goal:** Verify login rejects invalid passwords

1. Register: `user@test.com` / `password789`
2. Logout
3. Try login with: `user@test.com` / `wrongpassword`
4. Check error message

**Expected Result:** Error message: "Firebase: Error (auth/invalid-credential)"

---

## Flow 7: Second Parent (Separate Family) ✅
**Goal:** Verify multiple families can exist independently

1. Register new account: `dad@test.com` / `parentpass`
2. Create family: `The Williamson Family`
3. Verify: Family ID displayed (different from Flow 1)
4. Add child: `kid@test.com` / `kidpass` / name: `Alex`
5. Verify: Alex in family members, belongs to correct family
6. Login as `kid@test.com` / `kidpass`
7. Verify: Dashboard shows "Family: The Williamson Family"
8. (Do NOT show "The Johnsons" from Flow 1)

**Expected Result:** Each family is completely isolated, children only see their own family

---

## Flow 8: Child Cannot Add Children ✅
**Goal:** Verify Firestore rules prevent child from adding family members

1. Login as child: `sarah@test.com` / `child123` (from Flow 1)
2. (Family Settings hidden, but test Firestore rules directly via DevTools console)
3. Open Console and try to call auth function (if exposed):
   ```javascript
   // This would fail at Firestore level:
   // addFamilyMember("hacker@test.com", "pass", "Hacker")
   ```

**Expected Result:** Firestore security rule blocks any child from creating new users

---

## Flow 9: Parent Cannot Create Duplicate Family ✅
**Goal:** Verify each parent/user has exactly one family (optional constraint)

1. Login as parent: `parent@test.com` (from Flow 1, already has family "The Johnsons")
2. Try to create another family: `Another Family`
3. Check result (should either):
   - Allow creation (current behavior - user can have multiple families)
   - Show error (if you add UI constraint later)

**Current Expected Result:** New family created, parent's familyId updated to new family (old family orphaned - future phase to prevent this)

---

## Flow 10: Empty Family Members After Registration ✅
**Goal:** Verify new parent sees empty member list until adding children

1. Register: `parent3@test.com` / `pass123`
2. Create family: `The Millers`
3. Verify: "Family Members" section is HIDDEN (no members to show)
4. Add first child: `child1@test.com` / `pass123` / name: `Child One`
5. Verify: Section now APPEARS with one member

**Expected Result:** Section visibility toggles based on member count

---

## Flow 11: Non-Existent Family on Login ✅
**Goal:** Verify user without family sees "Create Family" form (not family panel)

1. Register: `solo@test.com` / `password`
2. After registration, should see:
   - User panel: Shows "Logged in as: solo@test.com" ✅
   - Family section: "Create Family" form visible ✅
   - Family panel: HIDDEN ✅
   - Family Settings: HIDDEN ✅

**Expected Result:** Correct UI state for user without family

---

## Flow 12: Login After Family Created ✅
**Goal:** Verify existing user sees family info on login

1. Register: `newparent@test.com` / `pass123`
2. Create family: `Test Family`
3. Note family ID (e.g., `abc123def456`)
4. Logout
5. Login with: `newparent@test.com` / `pass123`
6. Verify on login:
   - User panel shown ✅
   - Family panel shows "Family: Test Family" ✅
   - Family ID matches ✅
   - Role shows "parent" ✅
   - Family Settings visible ✅

**Expected Result:** All family data restored from Firestore on login

---

## Test Checklist

- [ ] Flow 1: Multiple children added
- [ ] Flow 2: Child sees no Family Settings
- [ ] Flow 3: Logout/login switching works
- [ ] Flow 4: Duplicate email rejected
- [ ] Flow 5: Password validation enforced
- [ ] Flow 6: Wrong password rejected
- [ ] Flow 7: Second family completely isolated
- [ ] Flow 8: Child cannot add family members (Firestore rules)
- [ ] Flow 9: Parent can create multiple families
- [ ] Flow 10: Family members list visibility correct
- [ ] Flow 11: New user sees create family form
- [ ] Flow 12: Login restores family info

---

## Notes

- Clear browser cache between flows if needed (DevTools → Network → Disable cache)
- Check browser console for any JavaScript errors
- Firestore rules are deployed in Firebase Console
- All data persists in Firestore (won't clear between tests)

## Next Phase (Phase 3)

Once all flows pass:
- [ ] Sidebar navigation with 5 sections
- [ ] Tasks board (create, list, filter, complete)
- [ ] Welcome message with username
