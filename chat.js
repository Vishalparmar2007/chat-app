const messageList = document.getElementById('message-list');
const composerForm = document.getElementById('composer-form');
const textInput = document.getElementById('text-input');
const sendBtn = document.getElementById('send-btn');
const usernameLabel = document.getElementById('current-username');
const avatarLabel = document.getElementById('current-avatar');
const logoutBtn = document.getElementById('logout-btn');

const ROOM = 'general'; // single shared room for the MVP
let currentUser = null;
let currentUsername = '';

// ---------- Auth guard ----------
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }
  currentUser = user;

  const profileDoc = await db.collection('users').doc(user.uid).get();
  currentUsername = profileDoc.exists ? profileDoc.data().username : user.email;

  usernameLabel.textContent = currentUsername;
  avatarLabel.textContent = currentUsername.charAt(0).toUpperCase();

  listenForMessages();
});

logoutBtn.addEventListener('click', () => auth.signOut());

// ---------- Sending messages ----------
composerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = textInput.value.trim();
  if (!text) return;

  sendBtn.disabled = true;

  try {
    await db.collection('rooms').doc(ROOM).collection('messages').add({
      uid: currentUser.uid,
      username: currentUsername,
      text: text,
      mediaUrl: null,
      mediaType: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    textInput.value = '';
  } catch (err) {
    console.error(err);
    alert('Could not send message. Please try again.');
  }

  sendBtn.disabled = false;
});

// Enter to send, Shift+Enter for a new line
textInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    composerForm.requestSubmit();
  }
});

// ---------- Receiving messages in real time ----------
function listenForMessages() {
  db.collection('rooms').doc(ROOM).collection('messages')
    .orderBy('createdAt', 'asc')
    .limitToLast(100)
    .onSnapshot((snapshot) => {
      messageList.innerHTML = '';

      if (snapshot.empty) {
        messageList.innerHTML = '<div class="empty-state">No messages yet — say hello 👋</div>';
        return;
      }

      snapshot.forEach((doc) => {
        renderMessage(doc.data());
      });

      messageList.scrollTop = messageList.scrollHeight;
    }, (err) => {
      console.error(err);
    });
}

function renderMessage(msg) {
  const row = document.createElement('div');
  row.className = 'message-row';

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = (msg.username || '?').charAt(0).toUpperCase();

  const body = document.createElement('div');
  body.className = 'message-body';

  const meta = document.createElement('div');
  meta.className = 'message-meta';
  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = msg.username || 'Unknown';
  const time = document.createElement('span');
  time.className = 'time';
  time.textContent = formatTime(msg.createdAt);
  meta.appendChild(name);
  meta.appendChild(time);
  body.appendChild(meta);

  if (msg.text) {
    const textEl = document.createElement('div');
    textEl.className = 'message-text';
    textEl.textContent = msg.text; // textContent avoids any HTML injection
    body.appendChild(textEl);
  }

  row.appendChild(avatar);
  row.appendChild(body);
  messageList.appendChild(row);
}

function formatTime(timestamp) {
  if (!timestamp || !timestamp.toDate) return '';
  const date = timestamp.toDate();
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
