import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, doc, setDoc, getDoc, where, limit } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

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
const chatPanel = document.getElementById('chat-panel');
const chatTitle = document.getElementById('chat-title');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const userSearch = document.getElementById('user-search');
const searchResults = document.getElementById('search-results');
const friendsList = document.getElementById('friends-list');
const requestsSection = document.getElementById('requests-section');
const requestsList = document.getElementById('requests-list');

// Verificar que los elementos existan
if (!logoutBtn || !userNameSpan || !userAvatar || !profilePanel) {
    console.error('Faltan elementos en feed.html.');
}

// Verificar estado de autenticación
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

// Logout
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error.message);
    }
});

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

// Función para subir avatar a Cloudinary
async function uploadAvatar(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'avatar_upload'); // Reemplaza con tu preset

    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/TU_CLOUD_NAME/image/upload`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.secure_url) {
            return data.secure_url;
        } else {
            throw new Error('Error al subir la imagen a Cloudinary');
        }
    } catch (error) {
        console.error('Error en uploadAvatar:', error.message);
        return 'default-avatar.png';
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
        loadUserProfile(currentUser);
        profilePanel.classList.add('hidden');
    }
});

// Abrir/cerrar panel de perfil al clicar en nombre o avatar
[userNameSpan, userAvatar].forEach(element => {
    element.addEventListener('click', () => {
        profilePanel.classList.toggle('hidden');
        if (!profilePanel.classList.contains('hidden')) {
            chatPanel.classList.add('hidden');
            if (unsubscribeMessages) unsubscribeMessages();
            loadRequests(); // Cargar solicitudes al abrir perfil
        }
    });
});

// Búsqueda de usuarios
userSearch.addEventListener('input', async (e) => {
    const query = e.target.value.trim().toLowerCase();
    if (query.length < 2) {
        searchResults.classList.add('hidden');
        return;
    }
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('displayName', '>=', query), where('displayName', '<=', query + '\uf8ff'), limit(10));
    const snapshot = await getDocs(q); // Asume getDocs importado
    searchResults.innerHTML = '';
    snapshot.forEach((doc) => {
        const user = doc.data();
        if (user.uid !== currentUser.uid) {
            const result = document.createElement('div');
            result.classList.add('search-result');
            result.innerHTML = `
                <img src="${user.avatarUrl || 'default-avatar.png'}" alt="${user.displayName}" class="search-avatar">
                <span>${user.displayName} (${user.email})</span>
                <button onclick="addFriend('${doc.id}')">Agregar</button>
            `;
            searchResults.appendChild(result);
        }
    });
    searchResults.classList.remove('hidden');
});

// Función para agregar amigo (enviar solicitud)
window.addFriend = async function(receiverUid) {
    const requestId = [currentUser.uid, receiverUid].sort().join('_');
    const requestRef = doc(db, 'friend_requests', requestId);
    await setDoc(requestRef, {
        senderUid: currentUser.uid,
        receiverUid: receiverUid,
        status: 'pending',
        timestamp: serverTimestamp()
    });
    alert('Solicitud enviada!');
    userSearch.value = ''; // Limpiar búsqueda
    searchResults.classList.add('hidden');
};

// Función para cargar amigos
function loadFriends() {
    if (unsubscribeFriends) unsubscribeFriends();
    const friendshipsRef = collection(db, 'friendships');
    const q = query(friendshipsRef, where('userUid1', '==', currentUser.uid), limit(50)); // O usa userUid2 con OR si Firebase lo soporta
    unsubscribeFriends = onSnapshot(q, (snapshot) => {
        friendsList.innerHTML = '';
        snapshot.forEach((doc) => {
            const friendship = doc.data();
            const friendUid = friendship.userUid1 === currentUser.uid ? friendship.userUid2 : friendship.userUid1;
            loadFriendProfile(friendUid, (friend) => {
                const friendItem = document.createElement('div');
                friendItem.classList.add('friend-item');
                friendItem.innerHTML = `
                    <img src="${friend.avatarUrl || 'default-avatar.png'}" alt="${friend.displayName}" class="friend-avatar">
                    <span>${friend.displayName}</span>
                `;
                friendItem.onclick = () => openPrivateChat(friendUid, friend.displayName);
                friendsList.appendChild(friendItem);
            });
        });
    });
}

// Función para cargar perfil de amigo
async function loadFriendProfile(friendUid, callback) {
    const friendRef = doc(db, 'users', friendUid);
    const friendSnap = await getDoc(friendRef);
    if (friendSnap.exists()) {
        callback(friendSnap.data());
    }
}

// Función para abrir chat privado
window.openPrivateChat = function(friendUid, friendName) {
    const chatId = [currentUser.uid, friendUid].sort().join('_');
    currentChatId = chatId;
    chatTitle.textContent = `Chat con ${friendName}`;
    chatPanel.classList.remove('hidden');
    profilePanel.classList.add('hidden');
    loadChatMessages(chatId);
    messageInput.focus();
};

// Función para cargar solicitudes pendientes
function loadRequests() {
    if (unsubscribeRequests) unsubscribeRequests();
    const requestsRef = collection(db, 'friend_requests');
    const q = query(requestsRef, where('receiverUid', '==', currentUser.uid), where('status', '==', 'pending'));
    unsubscribeRequests = onSnapshot(q, (snapshot) => {
        requestsList.innerHTML = '';
        snapshot.forEach((doc) => {
            const request = doc.data();
            const requestItem = document.createElement('div');
            requestItem.classList.add('request-item');
            requestItem.innerHTML = `
                <span>${request.senderUid} te envió una solicitud</span>
                <button onclick="acceptRequest('${doc.id}', '${request.senderUid}')">Aceptar</button>
                <button onclick="rejectRequest('${doc.id}')">Rechazar</button>
            `;
            requestsList.appendChild(requestItem);
        });
        if (snapshot.empty) {
            requestsList.innerHTML = '<p>No hay solicitudes pendientes.</p>';
        }
        requestsSection.classList.toggle('hidden', snapshot.empty);
    });
}

// Función para aceptar solicitud
window.acceptRequest = async function(requestId, senderUid) {
    // Actualizar solicitud
    const requestRef = doc(db, 'friend_requests', requestId);
    await updateDoc(requestRef, { status: 'accepted' });
    // Crear amistad mutua
    const friendshipId = [currentUser.uid, senderUid].sort().join('_');
    const friendshipRef = doc(db, 'friendships', friendshipId);
    await setDoc(friendshipRef, {
        userUid1: [currentUser.uid, senderUid].sort()[0],
        userUid2: [currentUser.uid, senderUid].sort()[1],
        timestamp: serverTimestamp()
    });
    loadFriends(); // Recargar lista de amigos
    alert('¡Amigo agregado!');
};

// Función para rechazar solicitud
window.rejectRequest = async function(requestId) {
    const requestRef = doc(db, 'friend_requests', requestId);
    await updateDoc(requestRef, { status: 'rejected' });
    alert('Solicitud rechazada.');
    loadRequests(); // Recargar
};

// Función para cerrar el chat
window.closeChat = function() {
    if (unsubscribeMessages) unsubscribeMessages();
    chatPanel.classList.add('hidden');
    messagesContainer.innerHTML = '';
    currentChatId = null;
    messageInput.value = '';
};

// Función para cargar mensajes del chat en tiempo real
function loadChatMessages(chatId) {
    if (unsubscribeMessages) unsubscribeMessages();
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
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
            senderName: userNameSpan.textContent,
            timestamp: serverTimestamp()
        });
        messageInput.value = '';
    } catch (error) {
        console.error('Error al enviar mensaje:', error);
    }
};

// Event listener para enviar con Enter
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});
