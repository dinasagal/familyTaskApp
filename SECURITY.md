# Security Guide for Family Task App

## ✅ Issues Fixed

1. **Firebase configuration protected**: Moved to `firebase.config.js` (now gitignored)
2. **`.gitignore` created**: Prevents committing sensitive files
3. **Template provided**: `firebase.config.example.js` for other developers

## 🔒 Additional Security Recommendations

### 1. **Firebase API Keys (Important Note)**
Your Firebase API keys are **meant to be public** in client-side apps, but you need additional protections:

- ✅ **Firestore Security Rules**: Already implemented (good!)
- ⚠️ **Add domain restrictions**: In Firebase Console → Project Settings → Restrict allowed domains
- ⚠️ **Enable Firebase App Check**: Protects against abuse

### 2. **Domain Restrictions (High Priority)**
Go to [Firebase Console](https://console.firebase.google.com/):
1. Select your project: `familytaskapp-66f6c`
2. Go to: **Authentication → Settings → Authorized domains**
3. Add only: your production domain (e.g., `yourdomain.com`)
4. Remove unauthorized domains

### 3. **Firebase App Check (Recommended)**
Protects your backend from abuse:
```bash
# In Firebase Console:
1. Build → App Check
2. Register your web app
3. Use reCAPTCHA Enterprise or reCAPTCHA v3
4. Enforce App Check for Firestore
```

### 4. **Review Firestore Security Rules**
Your current rules look good! Make sure they're deployed:
```bash
# Deploy from Firebase Console or CLI:
firebase deploy --only firestore:rules
```

Key protections in your rules:
- ✅ Family-based access control
- ✅ Role-based permissions (parent/child)
- ✅ User can only access their own family data

### 5. **Additional Best Practices**

#### A. Environment Variables (for build tools)
If you use a build tool (Vite, Webpack, etc.), use environment variables:
```javascript
// .env (gitignored)
VITE_FIREBASE_API_KEY=your-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-domain.firebaseapp.com
```

#### B. Rate Limiting
Firebase Auth has built-in rate limiting, but consider:
- Monitor Firebase Usage tab for unusual spikes
- Set up billing alerts

#### C. Audit Logs
- Enable Firebase Audit Logs in GCP Console
- Monitor authentication attempts

#### D. Regular Security Reviews
- Review Firebase Console → Security regularly
- Check for suspicious authentication patterns
- Monitor Firestore usage

### 6. **Git History Cleanup (Critical!)**
Your API keys are already in Git history. To remove them:

```bash
# Option 1: Use BFG Repo-Cleaner (recommended)
# Download from: https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --replace-text passwords.txt
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force

# Option 2: Rotate your Firebase API keys
# In Firebase Console → Project Settings → Service Accounts → Manage Service Account Permissions
```

**IMPORTANT**: After cleaning git history, regenerate your Firebase API keys if this repo is already public!

### 7. **Rotate Firebase Keys (If Already Public)**
If your repo is already public:
1. Go to Google Cloud Console
2. Navigate to: APIs & Services → Credentials
3. Find your Firebase API key
4. Delete it and create a new one
5. Update your `firebase.config.js`

## 📋 Implementation Checklist

- [x] Move Firebase config to separate file
- [x] Create `.gitignore`
- [ ] Clean Git history (use BFG Repo-Cleaner)
- [ ] Rotate API keys if already public
- [ ] Add domain restrictions in Firebase Console
- [ ] Enable Firebase App Check
- [ ] Deploy Firestore security rules
- [ ] Set up billing alerts
- [ ] Document setup process for team

## 🚀 Next Steps for New Developers

When someone clones your repo, they should:
1. Copy `firebase.config.example.js` to `firebase.config.js`
2. Add their own Firebase credentials
3. Never commit `firebase.config.js`

## 📚 Resources
- [Firebase Security Best Practices](https://firebase.google.com/docs/rules/security)
- [Firebase App Check Documentation](https://firebase.google.com/docs/app-check)
- [BFG Repo Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
