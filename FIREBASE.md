# Firebase setup (Session Groups persistence)

1. Open [Firebase Console](https://console.firebase.google.com) and create/select a project.
2. Enable **Authentication → Sign-in method → Anonymous**.
3. Create a **Firestore** database (start in test mode, or deploy `firestore.rules` from this repo).
4. Add a **Web app** and copy the config into `firebase-config.js`.
5. Deploy rules (after `firebase login` / `firebase use <projectId>`):

```bash
firebase deploy --only firestore:rules
```

Until config is filled in, the app keeps using **localStorage** and shows “local only” in Session Groups.
