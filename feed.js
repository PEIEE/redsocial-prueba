import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, doc, setDoc, getDoc, where, limit, updateDoc, getDocs } from 'firebase/firestore';

// Configuración de Firebase usando variables de entorno
console.log('Cargando variables de entorno...');
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};
console.log('Firebase Config:', firebaseConfig); // Para verificar si las variables se cargan
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
document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        logoutBtn: document.getElementById('logout-btn'),
        userNameSpan: document.getElementById('user-name'),
        userAvatar: document.getElementById('user-avatar'),
        profilePanel: document.getElementById('profile-panel'),
        displayNameInput: document.getElementById('display-name'),
        avatarUpload: document.getElementById('avatar-upload'),
        saveProfileBtn: document.getElementById('save-profile'),
        chatContent: document.getElementById('chat-content'),
        chatTitle: document.getElementById('chat-title'),
        chatUserAvatar: document.getElementById('chat-user-avatar'),
        messagesContainer: document.getElementById('messages-container'),
        messageInput: document.getElementById('message-input'),
        sendButton: document.getElementById('send-button'),
        attachBtn: document.getElementById('attach-btn'),
        attachUpload: document.getElementById('attach-upload'),
        userSearch: document.getElementById('user-search'),
        searchResults: document.getElementById('search-results'),
        friendsList: document.getElementById('friends-list'),
        requestsSection: document.getElementById('requests-section'),
        requestsList: document.getElementById('requests-list'),
        welcomeSection: document.querySelector('.welcome-section'),
        reelsSection: document.querySelector('.reels-section'),
        profileSidebar: document.getElementById('profile-sidebar'),
        friendAvatar: document.getElementById('friend-avatar'),
        friendName: document.getElementById('friend-name'),
        friendGame: document.getElementById('friend-game'),
        friendJoined: document.getElementById('friend-joined')
    };

    // Verificar elementos
    const missing = Object.entries(elements).find(([key, el]) => !el);
    if (missing) {
        console.error('Elementos DOM faltantes:', missing);
        return;
    }

    // Asignar elementos (usa desestructuración)
    const { logoutBtn, userNameSpan, userAvatar, /* ... resto */ } = elements;

    // Cerrar sesión
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    });

    // Subir avatar
    async function uploadAvatar(file) {
        console.log('Subiendo avatar a Cloudinary...');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        if (!response.ok || data.error) {
            console.error('Error en Cloudinary:', data.error);
            throw new Error(data.error?.message || 'Error desconocido al subir la imagen');
        }
        console.log('Avatar subido con éxito:', data.secure_url);
        return data.secure_url;
    }

    // Guardar perfil
    saveProfileBtn.addEventListener('click', async () => {
        console.log('Guardando perfil...');
        const displayName = displayNameInput.value.trim();
        const file = avatarUpload.files[0];
        let avatarUrl = currentUserAvatar;

        if (file) {
            try {
                avatarUrl = await uploadAvatar(file);
            } catch (error) {
                console.error('Error al subir el avatar:', error.message);
                alert('Error al subir el avatar: ' + error.message);
                return;
            }
        }

        const userRef = doc(db, 'users', currentUser.uid);
        try {
            await setDoc(userRef, {
                displayName: displayName || userNameSpan.textContent,
                avatarUrl: avatarUrl,
                email: currentUser.email,
            }, { merge: true });
            console.log('Perfil guardado');
            loadUserProfile(currentUser);
        } catch (error) {
            console.error('Error al guardar perfil:', error);
        }
    });

    // Cargar perfil del usuario
    async function loadUserProfile(user) {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        console.log('Cargando perfil del usuario:', user.uid);
        if (userSnap.exists()) {
            const data = userSnap.data();
            userNameSpan.textContent = data.displayName || user.email.split('@')[0] || 'Usuario';
            userAvatar.src = data.avatarUrl || '/default-avatar.png';
            currentUserAvatar = userAvatar.src;
            displayNameInput.value = data.displayName || '';
            console.log('Perfil cargado:', { displayName: userNameSpan.textContent, avatarUrl: userAvatar.src });
        } else {
            userNameSpan.textContent = user.email.split('@')[0] || 'Usuario';
            userAvatar.src = '/default-avatar.png';
            currentUserAvatar = userAvatar.src;
            console.log('Perfil no encontrado, usando valores por defecto');
        }
    }

    // Estado de autenticación
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = 'index.html';
        } else {
            currentUser = user;
            console.log('Usuario autenticado:', user.uid);
            loadUserProfile(user);
            loadFriends();
            loadRequests();
        }
    });

    // Cargar amigos (reconstruido)
    function loadFriends() {
        if (unsubscribeFriends) unsubscribeFriends();
        const friendsRef = collection(db, 'friendships');
        const q = query(friendsRef, where('userId', '==', currentUser.uid), where('status', '==', 'accepted'));
        unsubscribeFriends = onSnapshot(q, (snapshot) => {
            friendsList.innerHTML = '';
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const friendItem = document.createElement('div');
                friendItem.classList.add('friend-item');
                friendItem.innerHTML = `
                    <img src="${data.friendAvatar || '/default-avatar.png'}" class="friend-avatar" alt="${data.friendName}">
                    <span>${data.friendName}</span>
                `;
                friendItem.addEventListener('click', () => openChat(docSnap.id));
                friendsList.appendChild(friendItem);
            });
        });
    }

    // Cargar solicitudes (reconstruido)
    function loadRequests() {
        if (unsubscribeRequests) unsubscribeRequests();
        const requestsRef = collection(db, 'friendships');
        const q = query(requestsRef, where('receiverId', '==', currentUser.uid), where('status', '==', 'pending'));
        unsubscribeRequests = onSnapshot(q, (snapshot) => {
            requestsList.innerHTML = '';
            snapshot.forEach((doc) => {
                const data = doc.data();
                loadFriendProfile(data.senderId, (friend) => {
                    const requestItem = document.createElement('div');
                    requestItem.classList.add('request-item');
                    requestItem.innerHTML = `
                        <img src="${friend.avatarUrl || '/default-avatar.png'}" class="friend-avatar" alt="${friend.displayName}">
                        <span>${friend.displayName}</span>
                        <button onclick="window.acceptRequest('${doc.id}', '${data.senderId}')">Aceptar</button>
                        <button onclick="window.rejectRequest('${doc.id}')">Rechazar</button>
                    `;
                    requestsList.appendChild(requestItem);
                });
            });
        });
    }

    // Función helper para cargar perfil de amigo (reconstruido)
    async function loadFriendProfile(uid, callback) {
        const friendRef = doc(db, 'users', uid);
        const snap = await getDoc(friendRef);
        if (snap.exists()) {
            callback(snap.data());
        }
    }

    // Aceptar/Rechazar solicitud
    window.acceptRequest = async function(requestId, senderUid) {
        const friendshipRef = doc(db, 'friendships', requestId);
        await updateDoc(friendshipRef, { status: 'accepted' });
        loadFriends();
    };

    window.rejectRequest = async function(requestId) {
        const friendshipRef = doc(db, 'friendships', requestId);
        await updateDoc(friendshipRef, { status: 'rejected' });
    };

    // Abrir chat (reconstruido)
    function openChat(chatId) {
        currentChatId = chatId;
        chatContent.classList.remove('hidden');
        profileSidebar.classList.remove('hidden');
        welcomeSection.classList.add('hidden');
        loadChatMessages(chatId);
    }

    // Cerrar chat
    window.closeChat = function() {
        console.log('Cerrar chat llamado');
        if (unsubscribeMessages) unsubscribeMessages();
        chatContent.classList.add('hidden');
        profileSidebar.classList.add('hidden');
        welcomeSection.classList.remove('hidden');
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
            snapshot.forEach((docSnap) => {
                const message = docSnap.data();
                const messageDate = new Date(message.timestamp.toDate()).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
                if (messageDate !== lastDate) {
                    const separator = document.createElement('div');
                    separator.classList.add('date-separator');
                    separator.textContent = messageDate === new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) ? 'Hoy' : messageDate;
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

    // Subir imagen al chat
    attachBtn.addEventListener('click', () => attachUpload.click());
    attachUpload.addEventListener('change', async () => {
        console.log('Subiendo imagen al chat...');
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
            await addDoc(collection(db, 'chats', currentChatId, 'messages'), {
                text: imageUrl,
                type: 'image',
                senderId: currentUser.uid,
                senderName: userNameSpan.textContent,
                timestamp: serverTimestamp()
            });
            console.log('Imagen subida con éxito:', imageUrl);
            attachUpload.value = '';
        } catch (error) {
            console.error('Error al subir la imagen:', error.message);
            alert('Error al subir la imagen: ' + error.message);
        }
    });

    // Marcadores para botones
    document.getElementById('gif-btn')?.addEventListener('click', () => alert('Selector de GIF no implementado'));
    document.getElementById('emoji-btn')?.addEventListener('click', () => alert('Selector de emoji no implementado'));
    document.getElementById('game-btn')?.addEventListener('click', () => alert('Funciones de juego no implementadas'));
});
