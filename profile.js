import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

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

const userAvatar = document.getElementById('user-avatar');
const displayNameInput = document.getElementById('display-name');
const avatarUpload = document.getElementById('avatar-upload');
const saveProfileBtn = document.getElementById('save-profile');
const backBtn = document.getElementById('back-btn');

// Verificar estado de autenticación
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'index.html';
    } else {
        currentUser = user;
        loadUserProfile(user);
    }
});

// Función para cargar el perfil del usuario
async function loadUserProfile(user) {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const data = userSnap.data();
        userAvatar.src = data.avatarUrl || 'default-avatar.png';
        displayNameInput.value = data.displayName || user.email.split('@')[0] || '';
    } else {
        userAvatar.src = 'default-avatar.png';
        displayNameInput.value = user.email.split('@')[0] || '';
    }
}

// Función para subir avatar a Cloudinary
async function uploadAvatar(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'avatar_upload');

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
        alert('Perfil actualizado con éxito!');
    }
});

// Volver a la página principal
backBtn.addEventListener('click', () => {
    window.close();
    window.opener.location.reload();
});
