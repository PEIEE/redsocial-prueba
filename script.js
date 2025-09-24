import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// Config de Firebase (use import.meta.env for Vite, or hardcode for testing)
// Config de Firebase desde variables de entorno (para Netlify)
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'your-api-key',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'your-auth-domain',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'your-project-id',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'your-storage-bucket',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'your-messaging-sender-id',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || 'your-app-id'
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
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const authForm = document.getElementById('auth-form');
    const submitBtn = document.getElementById('submit-btn');
    const toggleBtn = document.getElementById('toggle-registro');
    const errorMsg = document.getElementById('error-msg');
    const successMsg = document.getElementById('success-msg');

    // Verificar que los elementos existan
    if (!loginForm || !authForm || !submitBtn || !toggleBtn || !errorMsg || !successMsg) {
        console.error('Uno o más elementos del DOM no se encontraron. Verifica los IDs en index.html.');
        throw new Error('Elementos del DOM faltantes');
    if (!authForm || !submitBtn || !toggleBtn || !errorMsg || !successMsg) {
        console.error('Uno o más elementos del DOM no se encontraron. Verifica los IDs en login.html.');
        return;
    }

    let isRegistro = false;

    // Toggle entre login y registro
    toggleBtn.addEventListener('click', () => {
        isRegistro = !isRegistro;
        submitBtn.textContent = isRegistro ? 'Registrarse' : 'Iniciar Sesión';
        toggleBtn.textContent = isRegistro ? 'Ya tengo cuenta' : 'Registrarse';
        errorMsg.textContent = '';
        successMsg.textContent = '';
    });

    // Manejar formulario
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

// Verificar estado de autenticación
onAuthStateChanged(auth, (user) => {
    if (user && window.location.pathname !== '/feed.html') {
    if (user && window.location.pathname.endsWith('login.html')) {
        window.location.href = 'feed.html';
    }
});
