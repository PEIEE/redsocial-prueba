import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// Firebase configuration using Netlify environment variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// DOM elements
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const authForm = document.getElementById('auth-form');
    const submitBtn = document.getElementById('submit-btn');
    const toggleBtn = document.getElementById('toggle-registro');
    const errorMsg = document.getElementById('error-msg');
    const successMsg = document.getElementById('success-msg');

    // Verify DOM elements exist
    if (!loginForm || !authForm || !submitBtn || !toggleBtn || !errorMsg || !successMsg) {
        console.error('Uno o más elementos del DOM no se encontraron. Verifica los IDs en login.html.');
        throw new Error('Elementos del DOM faltantes');
    }

    let isRegistro = false;

    // Toggle between login and register
    toggleBtn.addEventListener('click', () => {
        isRegistro = !isRegistro;
        submitBtn.textContent = isRegistro ? 'Registrarse' : 'Iniciar Sesión';
        toggleBtn.textContent = isRegistro ? 'Ya tengo cuenta' : 'Registrarse';
        errorMsg.textContent = '';
        successMsg.textContent = '';
    });

    // Handle form submission
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email')?.value;
        const password = document.getElementById('password')?.value;

        if (!email || !password) {
            errorMsg.textContent = 'Por favor, completa todos los campos.';
            return;
        }

        errorMsg.textContent = '';
        successMsg.textContent = '';

        try {
            if (isRegistro) {
                await createUserWithEmailAndPassword(auth, email, password);
                successMsg.textContent = '¡Registro exitoso! Redirigiendo...';
            } else {
                await signInWithEmailAndPassword(auth, email, password);
                successMsg.textContent = '¡Inicio de sesión exitoso! Redirigiendo...';
            }
            setTimeout(() => {
                window.location.href = 'feed.html';
            }, 1000);
        } catch (error) {
            let errorMessage = error.message;
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'El correo ya está registrado. Intenta con otro.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'El correo no es válido.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
            } else if (error.code === 'auth/invalid-credential') {
                errorMessage = 'Correo o contraseña incorrectos.';
            }
            errorMsg.textContent = errorMessage;
        }
    });
});

// Verify authentication state
onAuthStateChanged(auth, (user) => {
    if (user && window.location.pathname.endsWith('login.html')) {
        window.location.href = 'feed.html';
    }
});
