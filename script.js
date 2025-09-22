import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// Config de Firebase desde variables de entorno (Netlify las inyectará)
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

// Elementos DOM
const loginForm = document.getElementById('login-form');
const feed = document.getElementById('feed');
const authForm = document.getElementById('auth-form');
const submitBtn = document.getElementById('submit-btn');
const toggleBtn = document.getElementById('toggle-registro');
const errorMsg = document.getElementById('error-msg');
const logoutBtn = document.getElementById('logout-btn');

let isRegistro = false;

// Toggle entre login y registro
toggleBtn.addEventListener('click', () => {
    isRegistro = !isRegistro;
    submitBtn.textContent = isRegistro ? 'Registrarse' : 'Iniciar Sesión';
    toggleBtn.textContent = isRegistro ? 'Ya tengo cuenta' : 'Registrarse';
});

// Manejar formulario
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    errorMsg.textContent = '';

    try {
        if (isRegistro) {
            await createUserWithEmailAndPassword(auth, email, password);
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
    } catch (error) {
        errorMsg.textContent = error.message;
    }
});

// Observar estado de auth
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginForm.classList.add('hidden');
        feed.classList.remove('hidden');
    } else {
        loginForm.classList.remove('hidden');
        feed.classList.add('hidden');
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    signOut(auth);
});