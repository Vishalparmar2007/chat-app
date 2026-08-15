const form = document.getElementById('login-form');
const errorBox = document.getElementById('form-error');
const submitBtn = document.getElementById('submit-btn');

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.add('visible');
}

// If already logged in, skip straight to chat
auth.onAuthStateChanged((user) => {
  if (user) window.location.href = 'chat.html';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.classList.remove('visible');

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging in...';

  try {
    await auth.signInWithEmailAndPassword(email, password);
    window.location.href = 'chat.html';
  } catch (err) {
    console.error(err);
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
      showError('Incorrect email or password.');
    } else {
      showError('Something went wrong. Please try again.');
    }
    submitBtn.disabled = false;
    submitBtn.textContent = 'Log in';
  }
});
