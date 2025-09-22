import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

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

// Elementos DOM
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
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
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
        // Redirigir a feed.html
        setTimeout(() => {
            window.location.href = 'feed.html';
        }, 1000); // Espera 1 segundo para mostrar el mensaje
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

// Verificar estado de autenticación
onAuthStateChanged(auth, (user) => {
    if (user && window.location.pathname !== '/feed.html') {
        window.location.href = 'feed.html';
    }
});
