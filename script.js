import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

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

    // Elementos DOM
    document.addEventListener('DOMContentLoaded', () => {
        const authForm = document.getElementById('auth-form');
        const submitBtn = document.getElementById('submit-btn');
        const toggleBtn = document.getElementById('toggle-registro');
        const errorMsg = document.getElementById('error-msg');
        const successMsg = document.getElementById('success-msg');

        // Verificar que los elementos existan
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
        if (user && window.location.pathname.endsWith('login.html')) {
            window.location.href = 'feed.html';
        }
    });
})();
