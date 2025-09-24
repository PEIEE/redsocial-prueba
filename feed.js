import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, doc, setDoc, getDoc, where, limit, updateDoc, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// Configuración de Firebase (sin cambios)
const firebaseConfig = { /* ... */ };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentUserAvatar = 'default-avatar.png';
let currentChatId = null;
let unsubscribeMessages = null;
let unsubscribeFriends = null;
let unsubscribeRequests = null;

// Elementos DOM (actualizados para la nueva estructura)
const logoutBtn = document.getElementById('logout-btn');
const userNameSpan = document.getElementById('user-name');
const userAvatar = document.getElementById('user-avatar');
const profilePanel = document.getElementById('profile-panel');
const displayNameInput = document.getElementById('display-name');
const avatarUpload = document.getElementById('avatar-upload');
const saveProfileBtn = document.getElementById('save-profile');
const chatContent = document.getElementById('chat-content');
const chatTitle = document.getElementById('chat-title');
const chatUserAvatar = document.getElementById('chat-user-avatar');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const attachBtn = document.getElementById('attach-btn');
const attachUpload = document.getElementById('attach-upload');
const userSearch = document.getElementById('user-search');
const searchResults = document.getElementById('search-results');
const friendsList = document.getElementById('friends-list');
const requestsSection = document.getElementById('requests-section');
const requestsList = document.getElementById('requests-list');
const welcomeSection = document.querySelector('.welcome-section');
const reelsSection = document.querySelector('.reels-section');
const profileSidebar = document.getElementById('profile-sidebar');
const friendAvatar = document.getElementById('friend-avatar');
const friendName = document.getElementById('friend-name');
const friendGame = document.getElementById('friend-game');
const friendJoined = document.getElementById('friend-joined');

// Estado de autenticación (cargar perfil, amigos, solicitudes)
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'index.html';
    } else {
        currentUser = user;
        loadUserProfile(user);
        loadFriends();
        loadRequests();
    }
});

// Cerrar sesión (sin cambios)
logoutBtn.addEventListener('click', async () => { /* ... */ });

// Cargar perfil del usuario (añadir currentUserAvatar)
async function loadUserProfile(user) {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const data = userSnap.data();
        userNameSpan.textContent = data.displayName || user.email.split('@')[0] || 'Usuario';
        userAvatar.src = data.avatarUrl || 'default-avatar.png';
        currentUserAvatar = userAvatar.src;
        displayNameInput.value = data.displayName || '';
    } else {
        userNameSpan.textContent = user.email.split('@')[0] || 'Usuario';
        userAvatar.src = 'default-avatar.png';
        currentUserAvatar = userAvatar.src;
    }
}

// Subir avatar (sin cambios)
async function uploadAvatar(file) { /* ... */ }

// Guardar perfil (sin cambios)
saveProfileBtn.addEventListener('click', async () => { /* ... */ });

// Alternar panel de perfil (sin cambios)
[userNameSpan, userAvatar].forEach(element => { /* ... */ });

// Búsqueda de usuarios (sin cambios)
userSearch.addEventListener('input', async (e) => { /* ... */ });

// Agregar amigo (sin cambios)
window.addFriend = async function(receiverUid) { /* ... */ };

// Cargar amigos (ahora en dm-sidebar, añadir estado/juego ficticio)
function loadFriends() {
    if (unsubscribeFriends) unsubscribeFriends();
    const friendshipsRef = collection(db, 'friendships');
    const q = query(friendshipsRef, where('userUid1', '==', currentUser.uid));
    unsubscribeFriends = onSnapshot(q, (snapshot) => {
        friendsList.innerHTML = '';
        snapshot.forEach((doc) => {
            const friendship = doc.data();
            const friendUid = friendship.userUid1 === currentUser.uid ? friendship.userUid2 : friendship.userUid1;
            loadFriendProfile(friendUid, (friend) => {
                // Estado/juego/fecha de ingreso ficticios (añadir a Firebase en la app real)
                friend.status = 'online'; // o 'offline'
                friend.game = 'Papers, Please'; // o ''
                friend.joined = '21 octubre 2020';

                const friendItem = document.createElement('div');
                friendItem.classList.add('friend-item');
                friendItem.innerHTML = `
                    <div class="avatar-wrapper">
                        <img src="${friend.avatarUrl || 'default-avatar.png'}" alt="${friend.displayName}" class="friend-avatar">
                        <div class="status-dot ${friend.status}"></div>
                    </div>
                    <div class="friend-info">
                        <span class="friend-name">${friend.displayName}</span>
                        <span class="friend-status">${friend.game ? `Jugando a ${friend.game}` : friend.status.charAt(0).toUpperCase() + friend.status.slice(1)}</span>
                    </div>
                `;
                friendItem.onclick = () => openPrivateChat(friendUid, friend.displayName, friend.avatarUrl || 'default-avatar.png', friend.game, friend.joined);
                friendsList.appendChild(friendItem);
            });
        });
    });
}

// Cargar perfil de amigo (sin cambios)
async function loadFriendProfile(friendUid, callback) { /* ... */ }

// Abrir chat privado (mostrar chat-main, llenar profile-sidebar, ocultar bienvenida/reels)
window.openPrivateChat = function(friendUid, friendName, friendAvatarUrl, friendGameText, friendJoinedDate) {
    const chatId = [currentUser.uid, friendUid].sort().join('_');
    currentChatId = chatId;
    chatTitle.textContent = friendName;
    chatUserAvatar.src = friendAvatarUrl;
    welcomeSection.classList.add('hidden');
    reelsSection.classList.add('hidden');
    chatContent.classList.remove('hidden');
    profileSidebar.classList.remove('hidden');
    // Llenar barra lateral de perfil
    friendAvatar.src = friendAvatarUrl;
    friendName.textContent = friendName;
    friendGame.textContent = friendGameText ? `Jugando a ${friendGameText}` : 'En línea';
    friendJoined.textContent = friendJoinedDate;
    loadChatMessages(chatId);
    messageInput.placeholder = `Enviar mensaje a @${friendName}`;
    messageInput.focus();
};

// Cargar solicitudes (sin cambios)
function loadRequests() { /* ... */ };

// Aceptar solicitud (actualizar amigos)
window.acceptRequest = async function(requestId, senderUid) { /* ... */ };

// Rechazar solicitud (sin cambios)
window.rejectRequest = async function(requestId) { /* ... */ };

// Cerrar chat (ocultar chat/perfil, mostrar bienvenida)
window.closeChat = function() {
    if (unsubscribeMessages) unsubscribeMessages();
    chatContent.classList.add('hidden');
    profileSidebar.classList.add('hidden');
    welcomeSection.classList.remove('hidden');
    // reelsSection.classList.remove('hidden'); // Descomentar si quieres volver a mostrar reels
    messagesContainer.innerHTML = '';
    currentChatId = null;
    messageInput.value = '';
};

// Cargar mensajes de chat (añadir avatares, separadores de fecha, soporte para imágenes)
function loadChatMessages(chatId) {
    if (unsubscribeMessages) unsubscribeMessages();
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        messagesContainer.innerHTML = '';
        let lastDate = null;
        snapshot.forEach((doc) => {
            const message = doc.data();
            const messageDate = new Date(message.timestamp.toDate()).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
            if (messageDate !== lastDate) {
                const separator = document.createElement('div');
                separator.classList.add('date-separator');
                separator.textContent = messageDate; // ej. "24 de septiembre de 2025"
                messagesContainer.appendChild(separator);
                lastDate = messageDate;
            }
            const isSent = message.senderId === currentUser.uid;
            const avatarSrc = isSent ? currentUserAvatar : chatUserAvatar.src;
            const messageElement = document.createElement('div');
            messageElement.classList.add('message', isSent ? 'sent' : 'received');
            messageElement.innerHTML = `
                <img class="message-avatar" src="${avatarSrc}">
                <div class="message-body">
                    <div class="message-header">
                        <strong>${message.senderName}</strong>
                        <small>${new Date(message.timestamp.toDate()).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</small>
                    </div>
                    ${message.type === 'image' ? `<img src="${message.text}" alt="Imagen" class="message-image">` : `<p>${message.text}</p>`}
                </div>
            `;
            messagesContainer.appendChild(messageElement);
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

// Enviar mensaje (sin cambios, pero añadir type: 'text')
window.sendMessage = async function() {
    const text = messageInput.value.trim();
    if (!text || !currentChatId) return;
    try {
        await addDoc(collection(db, 'chats', currentChatId, 'messages'), {
            text: text,
            type: 'text',
            senderId: currentUser.uid,
            senderName: userNameSpan.textContent,
            timestamp: serverTimestamp()
        });
        messageInput.value = '';
    } catch (error) {
        console.error('Error al enviar mensaje:', error);
    }
};

// Enviar con Enter (sin cambios)
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Subir adjunto (disparar archivo, subir a Cloudinary, enviar como mensaje de imagen)
attachBtn.addEventListener('click', () => attachUpload.click());
attachUpload.addEventListener('change', async () => {
    const file = attachUpload.files[0];
    if (!file || !currentChatId) return;
    const imageUrl = await uploadAvatar(file); // Reutilizar función de subida (es para imágenes)
    try {
        await addDoc(collection(db, 'chats', currentChatId, 'messages'), {
            text: imageUrl,
            type: 'image',
            senderId: currentUser.uid,
            senderName: userNameSpan.textContent,
            timestamp: serverTimestamp()
        });
        attachUpload.value = '';
    } catch (error) {
        console.error('Error al enviar imagen:', error);
    }
});

// Marcadores para botones GIF/emoji/juego (añadir lógica si es necesario, ej. abrir selectores)
document.getElementById('gif-btn').addEventListener('click', () => alert('Selector de GIF no implementado'));
document.getElementById('emoji-btn').addEventListener('click', () => alert('Selector de emoji no implementado'));
document.getElementById('game-btn').addEventListener('click', () => alert('Funciones de juego no implementadas'));
