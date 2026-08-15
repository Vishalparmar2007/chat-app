const conversationList = document.getElementById('conversation-list');
const newChatForm = document.getElementById('new-chat-form');
const newChatInput = document.getElementById('new-chat-input');
const newChatError = document.getElementById('new-chat-error');
const chatHeaderTitle = document.getElementById('chat-header-title');
const messageList = document.getElementById('message-list');
const composerForm = document.getElementById('composer-form');
const textInput = document.getElementById('text-input');
const sendBtn = document.getElementById('send-btn');
const usernameLabel = document.getElementById('current-username');
const avatarLabel = document.getElementById('current-avatar');
const logoutBtn = document.getElementById('logout-btn');

let currentUser = null;
let currentUsername = '';
let activeChatId = null;
let activeOtherUid = null;
let messagesUnsub = null;

function getChatId(uidA, uidB) {
  return [uidA, uidB].sort().join('_');
}

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

  listenForConversations();
});

logoutBtn.addEventListener('click', () => auth.signOut());

// ---------- Starting a new conversation ----------
newChatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  newChatError.textContent = '';

  const typedUsername = newChatInput.value.trim();
  const usernameLower = typedUsername.toLowerCase();
  if (!typedUsername) return;

  if (usernameLower === currentUsername.toLowerCase()) {
    newChatError.textContent = "You can't message yourself.";
    return;
  }

  try {
    const usernameDoc = await db.collection('usernames').doc(usernameLower).get();
    if (!usernameDoc.exists) {
      newChatError.textContent = 'No user found with that username.';
      return;
    }

    const otherUid = usernameDoc.data().uid;
    const otherProfileDoc = await db.collection('users').doc(otherUid).get();
    const otherUsername = otherProfileDoc.exists ? otherProfileDoc.data().username : typedUsername;

    const chatId = getChatId(currentUser.uid, otherUid);
    const chatRef = db.collection('chats').doc(chatId);
    const chatDoc = await chatRef.get();

    if (!chatDoc.exists) {
      await chatRef.set({
        participants: [currentUser.uid, otherUid],
        participantNames: {
          [currentUser.uid]: currentUsername,
          [otherUid]: otherUsername
        },
        lastMessage: null,
        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    newChatInput.value = '';
    openChat(chatId, otherUid, otherUsername);
  } catch (err) {
    console.error(err);
    newChatError.textContent = 'Something went wrong. Please try again.';
  }
});

// ---------- Conversation list (sidebar) ----------
function listenForConversations() {
  db.collection('chats')
    .where('participants', 'array-contains', currentUser.uid)
    .onSnapshot((snapshot) => {
      const chats = [];
      snapshot.forEach((doc) => chats.push({ id: doc.id, ...doc.data() }));

      // Sort newest conversation first (done here instead of in the query
      // so we don't need a Firestore composite index)
      chats.sort((a, b) => {
        const aTime = a.lastMessageAt ? a.lastMessageAt.toMillis() : 0;
        const bTime = b.lastMessageAt ? b.lastMessageAt.toMillis() : 0;
        return bTime - aTime;
      });

      renderConversationList(chats);
    }, (err) => console.error(err));
}

function renderConversationList(chats) {
  conversationList.innerHTML = '';

  if (chats.length === 0) {
    conversationList.innerHTML = '<div class="empty-state small">No conversations yet</div>';
    return;
  }

  chats.forEach((chat) => {
    const otherUid = chat.participants.find((uid) => uid !== currentUser.uid);
    const otherUsername = (chat.participantNames && chat.participantNames[otherUid]) || 'Unknown';

    const item = document.createElement('div');
    item.className = 'conversation-item' + (chat.id === activeChatId ? ' active' : '');

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = otherUsername.charAt(0).toUpperCase();

    const info = document.createElement('div');
    info.className = 'conversation-info';
    const name = document.createElement('div');
    name.className = 'conversation-name';
    name.textContent = otherUsername;
    const preview = document.createElement('div');
    preview.className = 'conversation-preview';
    preview.textContent = chat.lastMessage || 'Say hello 👋';
    info.appendChild(name);
    info.appendChild(preview);

    item.appendChild(avatar);
    item.appendChild(info);
    item.addEventListener('click', () => openChat(chat.id, otherUid, otherUsername));

    conversationList.appendChild(item);
  });
}

// ---------- Opening a conversation ----------
function openChat(chatId, otherUid, otherUsername) {
  activeChatId = chatId;
  activeOtherUid = otherUid;

  chatHeaderTitle.textContent = '@' + otherUsername;
  textInput.disabled = false;
  sendBtn.disabled = false;

  document.querySelectorAll('.conversation-item').forEach((el) => el.classList.remove('active'));
  // Re-render the list so the active state highlights correctly
  listenForConversations();

  if (messagesUnsub) messagesUnsub();

  messagesUnsub = db.collection('chats').doc(chatId).collection('messages')
    .orderBy('createdAt', 'asc')
    .limitToLast(100)
    .onSnapshot((snapshot) => {
      messageList.innerHTML = '';

      if (snapshot.empty) {
        messageList.innerHTML = '<div class="empty-state">No messages yet — say hello 👋</div>';
        return;
      }

      snapshot.forEach((doc) => renderMessage(doc.data()));
      messageList.scrollTop = messageList.scrollHeight;
    }, (err) => console.error(err));
}

// ---------- Sending messages ----------
composerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!activeChatId) return;

  const text = textInput.value.trim();
  if (!text) return;

  sendBtn.disabled = true;

  try {
    await db.collection('chats').doc(activeChatId).collection('messages').add({
      uid: currentUser.uid,
      username: currentUsername,
      text: text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('chats').doc(activeChatId).update({
      lastMessage: text,
      lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    textInput.value = '';
  } catch (err) {
    console.error(err);
    alert('Could not send message. Please try again.');
  }

  sendBtn.disabled = false;
});

textInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    composerForm.requestSubmit();
  }
});

// ---------- Rendering a message ----------
function renderMessage(msg) {
  const row = document.createElement('div');
  row.className = 'message-row' + (msg.uid === currentUser.uid ? ' own' : '');

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
    textEl.textContent = msg.text;
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
