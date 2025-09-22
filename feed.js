import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

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

let currentUser = null;
let currentChatId = null;
let unsubscribeMessages = null; // Para limpiar listeners

// Elementos DOM
const logoutBtn = document.getElementById('logout-btn');
const userNameSpan = document.getElementById('user-name');
const chatPanel = document.getElementById('chat-panel');
const chatTitle = document.getElementById('chat-title');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');

// Verificar que los elementos existan
if (!logoutBtn) {
    console.error('El elemento logout-btn no se encontró. Verifica el ID en feed.html.');
}

// Verificar estado de autenticación
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'index.html';
    } else {
        currentUser = user;
        // Actualizar el nombre de usuario con el email de Firebase
        if (userNameSpan) {
            userNameSpan.textContent = user.email.split('@')[0] || 'Usuario';
        }
        console.log('Usuario logueado:', user.email);
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

// Función para seleccionar un chat (llamada desde HTML onclick)
window.selectChat = function(chatElement) {
    const chatId = chatElement.dataset.chatId;
    const chatName = chatElement.querySelector('h3').textContent;
    currentChatId = chatId;
    chatTitle.textContent = `Chat con ${chatName}`;
    chatPanel.classList.remove('hidden');
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
            senderName: currentUser.email.split('@')[0] || 'Usuario',
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
