import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Debug: Log config
console.log('Firebase Config:', firebaseConfig);

// Check for missing API key
if (!firebaseConfig.apiKey) {
    console.error('Error: VITE_FIREBASE_API_KEY is missing. Check Netlify environment variables.');
    // FIXED: Changed == to = for assignment
    const errorMsgElement = document.getElementById('error-msg');
    if (errorMsgElement) {
        errorMsgElement.textContent = 'Error de configuración. Contacta al administrador.';
    }
    throw new Error('Missing Firebase API Key');
}

// Initialize Firebase
let auth;
try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app); // Assign auth to the outer scope
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization failed:', error);
    const errorMsgElement = document.getElementById('error-msg');
    if (errorMsgElement) {
        errorMsgElement.textContent = 'Error al conectar con Firebase. Contacta al administrador.';
    }
    throw error;
}

// DOM elements and event listeners
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const authForm = document.getElementById('auth-form');
    const submitBtn = document.getElementById('submit-btn');
    const toggleBtn = document.getElementById('toggle-registro');
    const errorMsg = document.getElementById('error-msg');
    const successMsg = document.getElementById('success-msg');

    // Verify DOM elements exist
    const missingElements = [];
    if (!loginForm) missingElements.push('login-form');
    if (!authForm) missingElements.push('auth-form');
    if (!submitBtn) missingElements.push('submit-btn');
    if (!toggleBtn) missingElements.push('toggle-registro');
    if (!errorMsg) missingElements.push('error-msg');
    if (!successMsg) missingElements.push('success-msg');

    if (missingElements.length > 0) {
        console.error(`Error: Falta(n) el(los) siguiente(s) elemento(s) del DOM: ${missingElements.join(', ')}. Verifica los IDs en login.html.`);
        if (errorMsg) {
             errorMsg.textContent = 'Error de configuración del formulario. Contacta al administrador.';
        }
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

        // Basic client-side password length check (optional but recommended)
        if (isRegistro && password.length < 6) {
             errorMsg.textContent = 'La contraseña debe tener al menos 6 caracteres.';
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
            console.error('Auth error:', error); // Debug
            let errorMessage = 'Error de autenticación. Inténtalo de nuevo.'; // Default error message
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'El correo ya está registrado. Intenta con otro.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'El correo no es válido.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
            } else if (error.code === 'auth/invalid-credential') {
                errorMessage = 'Correo o contraseña incorrectos.';
            } else if (error.message) {
                 // Fallback to Firebase error message if no specific code match
                 errorMessage = error.message;
            }
            errorMsg.textContent = errorMessage;
        }
    });

    // Verify authentication state
    // This check is done when the script loads initially.
    // The listener below will also handle state changes.
    if (auth.currentUser && window.location.pathname.endsWith('login.html')) {
         window.location.href = 'feed.html';
    }
});

// Verify authentication state changes
// This listener persists throughout the session
onAuthStateChanged(auth, (user) => {
    // Check if auth object was successfully initialized
    if (typeof auth === 'undefined') {
         console.error("Firebase Auth object not initialized for onAuthStateChanged.");
         return; // Exit if auth is not available
    }

    if (user && window.location.pathname.endsWith('login.html')) {
        window.location.href = 'feed.html';
    } else if (!user && window.location.pathname.endsWith('feed.html')) {
        // Optional: Redirect from feed.html back to login if user logs out or session expires
        // This depends on the desired behavior for the feed page.
        // window.location.href = 'login.html';
    }
}, (error) => {
     console.error('Error during onAuthStateChanged:', error);
     // Handle potential errors during state change observation
     const errorMsgElement = document.getElementById('error-msg');
     if (errorMsgElement) {
         errorMsgElement.textContent = 'Error en la verificación de la sesión. Intenta recargar la página.';
     }
});
