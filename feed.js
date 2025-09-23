import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, doc, setDoc, getDoc, where, limit, updateDoc, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

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
const db = getFirestore(app);

let currentUser = null;
let currentChannel = 'general';
let unsubscribeMessages = null;
let unsubscribeFriends = null;
let unsubscribeRequests = null;

// Elementos DOM
const logoutBtn = document.getElementById('logout-btn');
const userIcon = document.getElementById('user-icon');
const channelTitle = document.getElementById('channel-title');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const friendsList = document.getElementById('friends-list');
const requestsSection = document.getElementById('requests-section');
const requestsList = document.getElementById('requests-list');

// Verificar estado de autenticación
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'index.html';
    } else {
        currentUser = user;
        loadFriends();
        loadRequests();
        loadChannelMessages(currentChannel);
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

// Open profile in new tab
userIcon.addEventListener('click', () => {
    window.open('profile.html', '_blank');
});

// Función para abrir un canal
window.openChannel = function(channel) {
    currentChannel = channel;
    channelTitle.textContent = `# ${channel}`;
    if (unsubscribeMessages) unsubscribeMessages();
    loadChannelMessages(channel);
};

// Función para cargar mensajes de un canal
function loadChannelMessages(channel) {
    const messagesRef = collection(db, 'channels', channel, 'messages');
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
    if (!text || !currentChannel) return;
    try {
        await addDoc(collection(db, 'channels', currentChannel, 'messages'), {
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
    if (e.key === 'Enter') sendMessage();
});

// Función para cargar amigos
function loadFriends() {
    if (unsubscribeFriends) unsubscribeFriends();
    const friendshipsRef = collection(db, 'friendships');
    const q = query(friendshipsRef, where('userUid1', '==', currentUser.uid), limit(50));
    unsubscribeFriends = onSnapshot(q, (snapshot) => {
        friendsList.innerHTML = '';
        snapshot.forEach((doc) => {
            const friendship = doc.data();
            const friendUid = friendship.userUid1 === currentUser.uid ? friendship.userUid2 : friendship.userUid1;
            loadFriendProfile(friendUid, (friend) => {
                const friendItem = document.createElement('div');
                friendItem.classList.add('friend-item');
                friendItem.innerHTML = `
                    <span>${friend.displayName || friend.email.split('@')[0]}</span>
                    <span class="friend-status">●</span>
                `;
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
                <span>${request.senderUid}</span>
                <button onclick="acceptRequest('${doc.id}', '${request.senderUid}')">Aceptar</button>
                <button onclick="rejectRequest('${doc.id}')">Rechazar</button>
            `;
            requestsList.appendChild(requestItem);
        });
        requestsSection.classList.toggle('hidden', snapshot.empty);
    });
}

// Función para aceptar solicitud
window.acceptRequest = async function(requestId, senderUid) {
    const requestRef = doc(db, 'friend_requests', requestId);
    await updateDoc(requestRef, { status: 'accepted' });
    const friendshipId = [currentUser.uid, senderUid].sort().join('_');
    const friendshipRef = doc(db, 'friendships', friendshipId);
    await setDoc(friendshipRef, {
        userUid1: [currentUser.uid, senderUid].sort()[0],
        userUid2: [currentUser.uid, senderUid].sort()[1],
        timestamp: serverTimestamp()
    });
    loadFriends();
};

// Función para rechazar solicitud
window.rejectRequest = async function(requestId) {
    const requestRef = doc(db, 'friend_requests', requestId);
    await updateDoc(requestRef, { status: 'rejected' });
    loadRequests();
};
