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

console.log('Firebase inicializado con config:', firebaseConfig);

// Elementos DOM
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submit-btn');
const toggleBtn = document.getElementById('toggle-registro');
const errorMsg = document.getElementById('error-msg');
const successMsg = document.getElementById('success-msg');

// Verificar que los elementos existan
if (!authForm || !emailInput || !passwordInput || !submitBtn || !toggleBtn || !errorMsg || !successMsg) {
    console.error('Uno o más elementos del DOM no se encontraron. Verifica los IDs en login.html:', {
        authForm, emailInput, passwordInput, submitBtn, toggleBtn, errorMsg, successMsg
    });
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
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    errorMsg.textContent = '';
    successMsg.textContent = '';

    if (!email || !password) {
        errorMsg.textContent = 'Por favor, completa todos los campos.';
        return;
    }

    console.log('Intentando autenticación:', { email, isRegistro });

    try {
        let userCredential;
        if (isRegistro) {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log('Usuario registrado:', userCredential.user);
            successMsg.textContent = '¡Registro exitoso! Redirigiendo...';
        } else {
            userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log('Usuario logueado:', userCredential.user);
            successMsg.textContent = '¡Inicio de sesión exitoso! Redirigiendo...';
        }

        // Esperar a que el estado de autenticación se actualice antes de redirigir
        await new Promise(resolve => setTimeout(resolve, 1000)); // Espera 1 segundo
        window.location.href = 'feed.html';
    } catch (error) {
        console.error('Error de autenticación:', error.code, error.message);
        let errorMessage = error.message;
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'El correo ya está registrado. Intenta con otro.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'El correo no es válido.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
        } else if (error.code === 'auth/invalid-credential') {
            errorMessage = 'Correo o contraseña incorrectos.';
        } else if (error.code === 'auth/operation-not-allowed') {
            errorMessage = 'La autenticación por email/contraseña no está habilitada.';
        } else if (error.code === 'auth/invalid-api-key') {
            errorMessage = 'Configuración de Firebase inválida. Revisa las variables de entorno.';
        }
        errorMsg.textContent = errorMessage;
    }
});

// Verificar estado de autenticación
onAuthStateChanged(auth, (user) => {
    if (user && window.location.pathname !== '/feed.html') {
        console.log('Usuario autenticado, redirigiendo:', user);
        window.location.href = 'feed.html';
    } else if (!user && window.location.pathname === '/feed.html') {
        console.log('Usuario no autenticado, redirigiendo a login:', window.location.pathname);
        window.location.href = 'index.html';
    }
});
