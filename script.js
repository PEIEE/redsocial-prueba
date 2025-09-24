// script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

// Configuración de Firebase usando variables de entorno de Netlify
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

// Elementos del formulario en login.html
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submit-btn');
const toggleRegistro = document.getElementById('toggle-registro');
const errorMsg = document.getElementById('error-msg');
const successMsg = document.getElementById('success-msg');

// Estado para alternar entre login y registro
let isLoginMode = true;

// Cambiar entre modo inicio de sesión y registro
toggleRegistro.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    submitBtn.textContent = isLoginMode ? 'Iniciar Sesión' : 'Registrarse';
    toggleRegistro.textContent = isLoginMode ? 'Registrarse' : 'Iniciar Sesión';
});

// Manejar el envío del formulario
authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;

    if (isLoginMode) {
        // Iniciar sesión
        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                successMsg.textContent = '¡Inicio de sesión exitoso!';
                errorMsg.textContent = '';
                // Redirigir a una página después del login (por ejemplo, dashboard.html)
                window.location.href = 'dashboard.html';
            })
            .catch((error) => {
                errorMsg.textContent = traducirError(error.code);
                successMsg.textContent = '';
            });
    } else {
        // Registrarse
        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                successMsg.textContent = '¡Registro exitoso! Ahora inicia sesión.';
                errorMsg.textContent = '';
                isLoginMode = true;
                submitBtn.textContent = 'Iniciar Sesión';
                toggleRegistro.textContent = 'Registrarse';
            })
            .catch((error) => {
                errorMsg.textContent = traducirError(error.code);
                successMsg.textContent = '';
            });
    }
});

// Función para traducir códigos de error de Firebase a mensajes en español
function traducirError(code) {
    switch (code) {
        case 'auth/invalid-email':
            return 'El correo electrónico no es válido.';
        case 'auth/user-not-found':
            return 'No se encontró un usuario con este correo.';
        case 'auth/wrong-password':
            return 'La contraseña es incorrecta.';
        case 'auth/email-already-in-use':
            return 'El correo electrónico ya está registrado.';
        case 'auth/weak-password':
            return 'La contraseña debe tener al menos 6 caracteres.';
        default:
            return 'Ocurrió un error: ' + code;
    }
}
