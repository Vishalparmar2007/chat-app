# Nook — a simple chat website

A working chat website: email/password registration with a custom username,
login, and a real-time chat room where people can send text, photos, audio,
and video. Built with plain HTML/CSS/JS + Firebase (no server to run yourself).

## What's in this folder

```
chat-app/
├── index.html          → Login page
├── register.html        → Registration page (email + password + username)
├── chat.html             → The chat room
├── css/style.css         → All styling
├── js/firebase-config.js → Your Firebase project keys go here
├── js/login.js
├── js/register.js
└── js/chat.js
```

## Step 1 — Create your Firebase project (free)

1. Go to https://console.firebase.google.com and click **Add project**.
2. Give it a name (e.g. "nook-chat"), finish the setup wizard.
3. In the left sidebar, click **Build → Authentication → Get started**.
   Under "Sign-in method", enable **Email/Password**.
4. Click **Build → Firestore Database → Create database**. Start in
   **production mode**, pick a region close to you.
5. Click **Build → Storage → Get started**. Start in production mode too.
6. Click the ⚙️ gear icon (top left) → **Project settings**. Scroll to
   "Your apps", click the **</> (Web)** icon, register the app (no need for
   Firebase Hosting yet), and copy the `firebaseConfig` object it shows you.

## Step 2 — Add your config

Open `js/firebase-config.js` and replace the placeholder values with the
real ones you just copied.

## A note on file sharing (photos/audio/video)

Firebase Storage requires the "Blaze" (pay-as-you-go) billing plan, even
though it's still free at small scale (5GB storage, 1GB/day downloads
included free). If you haven't upgraded yet, this version of the code has
the attach-file button removed so text chat works right away without it.

**To turn file sharing back on later:**
1. In the Firebase Console, click "Upgrade project" on the Storage page and
   add a payment method (you can set a budget alert so you're never
   surprised — Project Settings → Usage and billing).
2. Finish creating Storage (production mode).
3. In `js/firebase-config.js`, uncomment the line `const storage = firebase.storage();`
4. Add back the Storage SDK script tag to `index.html`, `register.html`, and
   `chat.html`: `<script src="https://www.gstatic.com/firebasejs/10.13.0/firebase-storage-compat.js"></script>`
5. Ask Claude to restore the attach-button and file-upload code in `chat.html`/`chat.js`.

## Step 3 — Set security rules

By default, Firestore and Storage block everything. In the Firebase Console:

**Firestore → Rules**, replace the contents with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /usernames/{username} {
      allow read: if true;
      allow create: if request.auth != null
                    && request.resource.data.uid == request.auth.uid;
    }

    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == userId;
    }

    match /rooms/{roomId}/messages/{messageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
                    && request.resource.data.uid == request.auth.uid;
    }
  }
}
```

**Storage → Rules**, replace the contents with:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /uploads/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
                   && request.auth.uid == userId
                   && request.resource.size < 25 * 1024 * 1024; // 25MB max
    }
  }
}
```

Click **Publish** on both.

## Step 4 — Try it locally

You can't just double-click `index.html` (Firebase needs a real server
context). The easiest way: install [VS Code](https://code.visualstudio.com)
and its **Live Server** extension, then right-click `index.html` → "Open
with Live Server". Or, if you have Node installed, run this inside the
`chat-app` folder:

```
npx serve .
```

Then open the address it gives you, register an account, and start chatting.
Open the site in two different browsers (or one normal + one incognito
window) to test chatting between two users.

## Step 5 — Deploy it for free

1. Install the Firebase CLI: `npm install -g firebase-tools`
2. In the `chat-app` folder, run: `firebase login`
3. Run: `firebase init hosting`
   - Choose "Use an existing project" → select your project
   - Public directory: `.` (just a dot, meaning this folder)
   - Configure as a single-page app: **No**
   - Don't overwrite `index.html` if asked
4. Run: `firebase deploy`

Firebase will give you a live URL like `https://your-app.web.app` — that's
your chat website, live on the internet.

## How it works (quick tour)

- **Registration**: `register.js` checks the username isn't taken (stored as
  a document ID in a `usernames` collection so it's unique), creates the
  Firebase Auth account, then saves the username + email to a `users`
  collection.
- **Login**: `login.js` just calls Firebase Auth's sign-in function.
- **Chat**: `chat.js` listens to Firestore in real time (`onSnapshot`), so
  new messages appear instantly for everyone without refreshing. Files
  (photos/audio/video) are uploaded to Firebase Storage, and the message
  stored in Firestore just holds the resulting URL.

## Ideas to extend this

- Private 1-to-1 direct messages (a `chats/{uid1_uid2}/messages` collection)
- Multiple chat rooms/channels instead of one global room
- Typing indicators, read receipts, online/offline status
- Profile pictures (store in Storage under `avatars/{uid}`)
- Message editing/deleting

## A note on scope

This is a solid working foundation, but before treating it as a public
production app, budget time for: rate-limiting uploads, moderating content,
handling forgotten passwords (`auth.sendPasswordResetEmail`), and reviewing
the security rules above with your actual use case in mind.
