import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';

// Config de Firebase desde variables de entorno
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // Inicializar Firestore
const storage = getStorage(app); // Inicializar Storage

let currentUser = null;
let currentChatId = null;
let unsubscribeMessages = null; // Para limpiar listeners

// Elementos DOM
const logoutBtn = document.getElementById('logout-btn');
const userNameSpan = document.getElementById('user-name');
const userAvatar = document.getElementById('user-avatar');
const profilePanel = document.getElementById('profile-panel');
const displayNameInput = document.getElementById('display-name');
const avatarUpload = document.getElementById('avatar-upload');
const saveProfileBtn = document.getElementById('save-profile');
const chatPanel = document.getElementById('chat-panel');
const chatTitle = document.getElementById('chat-title');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const profileBtn = document.getElementById('profile-btn');

// Verificar que los elementos existan
if (!logoutBtn || !profileBtn || !profilePanel) {
    console.error('Faltan elementos en feed.html. Verifica los IDs: logout-btn, profile-btn, profile-panel.');
}

// Verificar estado de autenticación
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'index.html';
    } else {
        currentUser = user;
        loadUserProfile(user);
    }
});

// Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Error al cerrar sesión:', error.message);
        }
    });
}

// Función para cargar el perfil del usuario
async function loadUserProfile(user) {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const data = userSnap.data();
        userNameSpan.textContent = data.displayName || user.email.split('@')[0] || 'Usuario';
        userAvatar.src = data.avatarUrl || 'default-avatar.png';
        displayNameInput.value = data.displayName || '';
    } else {
        userNameSpan.textContent = user.email.split('@')[0] || 'Usuario';
        userAvatar.src = 'default-avatar.png';
    }
}

// Función para guardar el perfil
saveProfileBtn.addEventListener('click', async () => {
    const displayName = displayNameInput.value.trim();
    let avatarUrl = userAvatar.src;
    if (avatarUpload.files[0]) {
        avatarUrl = await uploadAvatar(avatarUpload.files[0]);
    }
    if (displayName || avatarUrl !== 'default-avatar.png') {
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, { displayName, avatarUrl }, { merge: true });
        loadUserProfile(currentUser); // Recargar perfil
        profilePanel.classList.add('hidden');
    }
});

// Función para subir avatar a Storage
async function uploadAvatar(file) {
    const storageRef = ref(storage, `avatars/${currentUser.uid}/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    return new Promise((resolve, reject) => {
        uploadTask.on('state_changed', () => {}, reject, async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
        });
    });
}

// Abrir/cerrar panel de perfil
profileBtn.addEventListener('click', () => {
    profilePanel.classList.toggle('hidden');
    if (!profilePanel.classList.contains('hidden')) {
        chatPanel.classList.add('hidden'); // Cerrar chat si está abierto
        if (unsubscribeMessages) {
            unsubscribeMessages(); // Limpiar listener de chat
        }
    }
});

// Función para seleccionar un chat (llamada desde HTML onclick)
window.selectChat = function(chatElement) {
    const chatId = chatElement.dataset.chatId;
    const chatName = chatElement.querySelector('h3').textContent;
    currentChatId = chatId;
    chatTitle.textContent = `Chat con ${chatName}`;
    chatPanel.classList.remove('hidden');
    profilePanel.classList.add('hidden'); // Cerrar panel de perfil si está abierto
    loadChatMessages(chatId);
    messageInput.focus();
};

// Función para cerrar el chat
window.closeChat = function() {
    if (unsubscribeMessages) {
        unsubscribeMessages(); // Limpiar listener
    }
    chatPanel.classList.add('hidden');
    messagesContainer.innerHTML = '';
    currentChatId = null;
    messageInput.value = '';
};

// Función para cargar mensajes del chat en tiempo real
function loadChatMessages(chatId) {
    if (unsubscribeMessages) {
        unsubscribeMessages(); // Limpiar listener anterior
    }

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        messagesContainer.innerHTML = '';
        snapshot.forEach((doc) => {
            const message = doc.data();
            const messageElement = document.createElement('div');
            messageElement.classList.add('message');
            messageElement.classList.add(message.senderId === currentUser.uid ? 'sent' : 'received');
            messageElement.innerHTML = `
                <strong>${message.senderName}:</strong> ${message.text}
                <small>${new Date(message.timestamp.toDate()).toLocaleTimeString()}</small>
            `;
            messagesContainer.appendChild(messageElement);
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll al final
    });
}

// Función para enviar mensaje
window.sendMessage = async function() {
    const text = messageInput.value.trim();
    if (!text || !currentChatId) return;

    try {
        await addDoc(collection(db, 'chats', currentChatId, 'messages'), {
            text: text,
            senderId: currentUser.uid,
            senderName: userNameSpan.textContent, // Usar nombre personalizado
            timestamp: serverTimestamp()
        });
        messageInput.value = '';
    } catch (error) {
        console.error('Error al enviar mensaje:', error);
    }
};

// Event listener para enviar con Enter
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
