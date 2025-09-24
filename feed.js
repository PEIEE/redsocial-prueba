import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, doc, setDoc, getDoc, where, limit, updateDoc, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// Configuración de Firebase usando variables de entorno
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentUserAvatar = '/default-avatar.png'; // Ruta ajustada
let currentChatId = null;
let unsubscribeMessages = null;
let unsubscribeFriends = null;
let unsubscribeRequests = null;

// Elementos DOM
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

// Estado de autenticación
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

// Cerrar sesión
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
});

// Cargar perfil del usuario
async function loadUserProfile(user) {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const data = userSnap.data();
        userNameSpan.textContent = data.displayName || user.email.split('@')[0] || 'Usuario';
        userAvatar.src = data.avatarUrl || '/default-avatar.png';
        currentUserAvatar = userAvatar.src;
        displayNameInput.value = data.displayName || '';
    } else {
        userNameSpan.textContent = user.email.split('@')[0] || 'Usuario';
        userAvatar.src = '/default-avatar.png';
        currentUserAvatar = userAvatar.src;
    }
}

// Subir avatar
async function uploadAvatar(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.secure_url;
}

// Guardar perfil (actualizado para manejar el avatar)
saveProfileBtn.addEventListener('click', async () => {
    const displayName = displayNameInput.value.trim();
    const file = avatarUpload.files[0];
    let avatarUrl = currentUserAvatar;

    if (file) {
        avatarUrl = await uploadAvatar(file);
    }

    const userRef = doc(db, 'users', currentUser.uid);
    await setDoc(userRef, {
        displayName: displayName || userNameSpan.textContent,
        avatarUrl: avatarUrl,
        email: currentUser.email,
    }, { merge: true });

    loadUserProfile(currentUser);
    profilePanel.classList.add('hidden');
});

// Alternar panel de perfil
[userNameSpan, userAvatar].forEach(element => {
    element.addEventListener('click', () => profilePanel.classList.remove('hidden'));
});

// Búsqueda de usuarios
userSearch.addEventListener('input', async (e) => {
    const query = e.target.value.trim();
    searchResults.innerHTML = '';
    if (query.length < 3) return;

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('displayName', '>=', query), where('displayName', '<=', query + '\uf8ff'), limit(5));
    const snapshot = await getDocs(q);
    snapshot.forEach((doc) => {
        const user = doc.data();
        if (user.uid !== currentUser.uid) {
            const result = document.createElement('div');
            result.classList.add('search-result');
            result.innerHTML = `<img src="${user.avatarUrl || '/default-avatar.png'}" class="search-avatar" alt="${user.displayName}"><span>${user.displayName}</span>`;
            result.onclick = () => addFriend(user.uid);
            searchResults.appendChild(result);
        }
    });
});

// Agregar amigo
window.addFriend = async function(receiverUid) {
    const friendshipRef = doc(db, 'friendships', [currentUser.uid, receiverUid].sort().join('_'));
    await setDoc(friendshipRef, {
        userUid1: currentUser.uid,
        userUid2: receiverUid,
        status: 'pending',
        timestamp: serverTimestamp()
    });
    searchResults.innerHTML = '';
    userSearch.value = '';
};

// Cargar amigos
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
                friend.status = 'online'; // Ficticio
                friend.game = 'Papers, Please'; // Ficticio
                friend.joined = '21 octubre 2020'; // Ficticio

                const friendItem = document.createElement('div');
                friendItem.classList.add('friend-item');
                friendItem.innerHTML = `
                    <div class="avatar-wrapper">
                        <img src="${friend.avatarUrl || '/default-avatar.png'}" alt="${friend.displayName}" class="friend-avatar">
                        <div class="status-dot ${friend.status}"></div>
                    </div>
                    <div class="friend-info">
                        <span class="friend-name">${friend.displayName}</span>
                        <span class="friend-status">${friend.game ? `Jugando a ${friend.game}` : friend.status.charAt(0).toUpperCase() + friend.status.slice(1)}</span>
                    </div>
                `;
                friendItem.onclick = () => openPrivateChat(friendUid, friend.displayName, friend.avatarUrl || '/default-avatar.png', friend.game, friend.joined);
                friendsList.appendChild(friendItem);
            });
        });
    });
}

// Cargar perfil de amigo
async function loadFriendProfile(friendUid, callback) {
    const userRef = doc(db, 'users', friendUid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        callback(userSnap.data());
    }
}

// Abrir chat privado
window.openPrivateChat = function(friendUid, friendName, friendAvatarUrl, friendGameText, friendJoinedDate) {
    const chatId = [currentUser.uid, friendUid].sort().join('_');
    currentChatId = chatId;
    chatTitle.textContent = friendName;
    chatUserAvatar.src = friendAvatarUrl;
    welcomeSection.classList.add('hidden');
    reelsSection.classList.add('hidden');
    chatContent.classList.remove('hidden');
    profileSidebar.classList.remove('hidden');
    friendAvatar.src = friendAvatarUrl;
    friendName.textContent = friendName;
    friendGame.textContent = friendGameText ? `Jugando a ${friendGameText}` : 'En línea';
    friendJoined.textContent = friendJoinedDate;
    loadChatMessages(chatId);
    messageInput.placeholder = `Enviar mensaje a @${friendName}`;
    messageInput.focus();
};

// Cargar solicitudes
function loadRequests() {
    if (unsubscribeRequests) unsubscribeRequests();
    const requestsRef = collection(db, 'friendships');
    const q = query(requestsRef, where('userUid2', '==', currentUser.uid), where('status', '==', 'pending'));
    unsubscribeRequests = onSnapshot(q, (snapshot) => {
        requestsSection.style.display = snapshot.size ? 'block' : 'none';
        requestsList.innerHTML = '';
        snapshot.forEach((doc) => {
            const request = doc.data();
            const senderUid = request.userUid1;
            loadFriendProfile(senderUid, (friend) => {
                const requestItem = document.createElement('div');
                requestItem.classList.add('request-item');
                requestItem.innerHTML = `
                    <img src="${friend.avatarUrl || '/default-avatar.png'}" class="friend-avatar" alt="${friend.displayName}">
                    <span>${friend.displayName}</span>
                    <button onclick="acceptRequest('${doc.id}', '${senderUid}')">Aceptar</button>
                    <button onclick="rejectRequest('${doc.id}')">Rechazar</button>
                `;
                requestsList.appendChild(requestItem);
            });
        });
    });
};

// Aceptar solicitud
window.acceptRequest = async function(requestId, senderUid) {
    const friendshipRef = doc(db, 'friendships', requestId);
    await updateDoc(friendshipRef, { status: 'accepted' });
    loadFriends();
};

// Rechazar solicitud
window.rejectRequest = async function(requestId) {
    const friendshipRef = doc(db, 'friendships', requestId);
    await updateDoc(friendshipRef, { status: 'rejected' });
};

// Cerrar chat
window.closeChat = function() {
    console.log('Cerrar chat llamado');
    if (unsubscribeMessages) unsubscribeMessages();
    chatContent.classList.add('hidden');
    profileSidebar.classList.add('hidden');
    welcomeSection.classList.remove('hidden');
    // reelsSection.classList.remove('hidden'); // Descomentar si quieres mostrar reels
    messagesContainer.innerHTML = '';
    currentChatId = null;
    messageInput.value = '';
};

// Cargar mensajes de chat
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
                separator.textContent = messageDate === '24 de septiembre de 2025' ? 'Hoy' : messageDate;
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
};

// Enviar mensaje
window.sendMessage = async function() {
    console.log('Enviar mensaje llamado');
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

// Enviar con Enter
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Subir imagen al chat (funcionalidad original restaurada)
attachBtn.addEventListener('click', () => attachUpload.click());
attachUpload.addEventListener('change', async () => {
    const file = attachUpload.files[0];
    if (!file || !currentChatId) return;
    if (!file.type.startsWith('image/')) {
        alert('Por favor, selecciona un archivo de imagen.');
        attachUpload.value = '';
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        alert('El archivo excede el tamaño máximo de 10 MB.');
        attachUpload.value = '';
        return;
    }
    try {
        const imageUrl = await uploadAvatar(file);
        const docRef = await addDoc(collection(db, 'chats', currentChatId, 'messages'), {
            text: imageUrl,
            type: 'image',
            senderId: currentUser.uid,
            senderName: userNameSpan.textContent,
            timestamp: serverTimestamp()
        });
        console.log('Imagen subida con éxito:', imageUrl);
        console.log('Mensaje guardado en Firebase con ID:', docRef.id);
        attachUpload.value = '';
    } catch (error) {
        console.error('Error al subir la imagen:', error.message);
        alert('Error al subir la imagen: ' + error.message);
    }
});

// Marcadores para botones
document.getElementById('gif-btn').addEventListener('click', () => alert('Selector de GIF no implementado'));
document.getElementById('emoji-btn').addEventListener('click', () => alert('Selector de emoji no implementado'));
document.getElementById('game-btn').addEventListener('click', () => alert('Funciones de juego no implementadas'));
