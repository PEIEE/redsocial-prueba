import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';

// Config de Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Elementos DOM
document.addEventListener('DOMContentLoaded', () => {
  const authForm = document.getElementById('auth-form');
  const submitBtn = document.getElementById('submit-btn');
  const toggleBtn = document.getElementById('toggle-registro');
  const errorMsg = document.getElementById('error-msg');
  const successMsg = document.getElementById('success-msg');

  // Verificar elementos
  if (!authForm || !submitBtn || !toggleBtn || !errorMsg || !successMsg) {
    console.error('Uno o más elementos del DOM no se encontraron en login.html.');
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
    const email = document.getElementById('email')?.value.trim();
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
        window.location.href = '/feed.html'; // Ajustado para Vite
      }, 1000);
    } catch (error) {
      let errorMessage = 'Error desconocido.';
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'El correo ya está registrado. Intenta con otro.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'El correo no es válido.';
          break;
        case 'auth/weak-password':
          errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Correo o contraseña incorrectos.';
          break;
        default:
          console.error('Error de auth:', error);
      }
      errorMsg.textContent = errorMessage;
    }
  });
});

// Verificar estado de autenticación
onAuthStateChanged(auth, (user) => {
  if (user && window.location.pathname.includes('login.html')) {
    window.location.href = '/feed.html';
  }
});
