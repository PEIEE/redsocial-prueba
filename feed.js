import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, doc, setDoc, getDoc, where, limit, updateDoc, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// Fetch configuration from Netlify Function
async function getConfig() {
    try {
        const response = await fetch('/.netlify/functions/get-config');
        if (!response.ok) throw new Error('Failed to fetch config');
        return await response.json();
    } catch (error) {
        console.error('Error fetching config:', error);
        alert('Error al cargar la configuración. Por favor, intenta de nuevo.');
        throw error;
    }
}

// Initialize Firebase and app logic after fetching config
(async () => {
    const CONFIG = await getConfig();
    const firebaseConfig = CONFIG.FIREBASE;
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    let currentUser = null;
    let currentUserAvatar = '/default-avatar.png';
    let currentChatId = null;
    let unsubscribeMessages = null;
    let unsubscribeFriends = null;
    let unsubscribeRequests = null;

    // Elementos DOM
    const logoutBtn = document.getElementById('logout-btn');
    const userNameSpan = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');
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
            console.log('Usuario autenticado:', user.uid);
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
        console.log('Cargando perfil del usuario:', user.uid);
        if (userSnap.exists()) {
            const data = userSnap.data();
            userNameSpan.textContent = data.displayName || user.email.split('@')[0] || 'Usuario';
            userAvatar.src = data.avatarUrl || '/default-avatar.png';
            currentUserAvatar = userAvatar.src;
            console.log('Perfil cargado:', { displayName: userNameSpan.textContent, avatarUrl: userAvatar.src });
        } else {
            userNameSpan.textContent = user.email.split('@')[0] || 'Usuario';
            userAvatar.src = '/default-avatar.png';
            currentUserAvatar = userAvatar.src;
            console.log('Perfil no encontrado, usando valores por defecto');
        }
    }

    // Subir avatar
    async function uploadAvatar(file) {
        console.log('Subiendo avatar a Cloudinary...');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CONFIG.CLOUDINARY.uploadPreset);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${CONFIG.CLOUDINARY.cloudName}/image/upload`, {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        if (data.error) {
            console.error('Error en Cloudinary:', data.error);
            throw new Error(data.error.message || 'Error desconocido al subir la imagen');
        }
        console.log('Avatar subido con éxito:', data.secure_url);
        return data.secure_url;
    }

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
        const q = query(friendshipsRef, where('status', '==', 'accepted'), where('userUid1', '==', currentUser.uid));
        const q2 = query(friendshipsRef, where('status', '==', 'accepted'), where('userUid2', '==', currentUser.uid));
        friendsList.innerHTML = '';
        const friendUids = new Set();

        const processFriend = (friendUid, friendData) => {
            if (!friendUids.has(friendUid)) {
                friendUids.add(friendUid);
                loadFriendProfile(friendUid, (friend) => {
                    const friendItem = document.createElement('div');
                    friendItem.classList.add('friend-item');
                    friendItem.innerHTML = `
                        <div class="avatar-wrapper">
                            <img src="${friend.avatarUrl || '/default-avatar.png'}" class="friend-avatar" alt="${friend.displayName}">
                            <span class="status-dot online"></span>
                        </div>
                        <div class="friend-info">
                            <span class="friend-name">${friend.displayName}</span>
                            <span class="friend-status">${friend.status || 'En línea'}</span>
                        </div>
                    `;
                    friendItem.onclick = () => openPrivateChat(friendUid, friend.displayName, friend.avatarUrl || '/default-avatar.png', friend.game, friend.joined);
                    friendsList.appendChild(friendItem);
                });
            }
        };

        unsubscribeFriends = onSnapshot(q, (snapshot) => {
            snapshot.forEach((doc) => {
                const friendData = doc.data();
                processFriend(friendData.userUid2, friendData);
            });
        });

        unsubscribeFriends = onSnapshot(q2, (snapshot) => {
            snapshot.forEach((doc) => {
                const friendData = doc.data();
                processFriend(friendData.userUid1, friendData);
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

    // Subir imagen al chat
    attachBtn.addEventListener('click', () => attachUpload.click());
    attachUpload.addEventListener('change', async () => {
        console.log('Subiendo imagen al chat...');
        const file = attachUpload.files[0];
        if (!file || !currentChatId) {
            console.log('No hay archivo o chat seleccionado');
            return;
        }
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
})();
