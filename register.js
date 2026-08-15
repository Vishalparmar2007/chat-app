const form = document.getElementById('register-form');
const errorBox = document.getElementById('form-error');
const submitBtn = document.getElementById('submit-btn');

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.add('visible');
}

function clearError() {
  errorBox.textContent = '';
  errorBox.classList.remove('visible');
}

// Usernames must be simple and URL/Firestore-safe: letters, numbers, underscores
function isValidUsername(username) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const username = document.getElementById('username').value.trim();
  const usernameLower = username.toLowerCase();

  if (!isValidUsername(username)) {
    showError('Username must be 3-20 characters: letters, numbers, underscores only.');
    return;
  }

  if (password.length < 6) {
    showError('Password must be at least 6 characters.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account...';

  try {
    // 1. Check the username isn't already taken
    const usernameDoc = await db.collection('usernames').doc(usernameLower).get();
    if (usernameDoc.exists) {
      showError('That username is already taken. Please choose another.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create account';
      return;
    }

    // 2. Create the auth account (email + password)
    const credential = await auth.createUserWithEmailAndPassword(email, password);
    const uid = credential.user.uid;

    // 3. Reserve the username and save the user's profile
    const batch = db.batch();
    batch.set(db.collection('usernames').doc(usernameLower), { uid });
    batch.set(db.collection('users').doc(uid), {
      username: username,
      usernameLower: usernameLower,
      email: email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    await batch.commit();

    window.location.href = 'chat.html';
  } catch (err) {
    console.error(err);
    if (err.code === 'auth/email-already-in-use') {
      showError('An account with that email already exists.');
    } else if (err.code === 'auth/invalid-email') {
      showError('Please enter a valid email address.');
    } else if (err.code === 'auth/weak-password') {
      showError('Password is too weak. Use at least 6 characters.');
    } else {
      showError('Something went wrong. Please try again.');
    }
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create account';
  }
});
