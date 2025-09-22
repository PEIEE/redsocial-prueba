const fs = require('fs');
const path = require('path');

// Leer las variables de entorno de Netlify
const env = {
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID: process.env.FIREBASE_APP_ID
};

// Leer el script.js original
let scriptContent = fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8');

// Reemplazar process.env con los valores reales
Object.keys(env).forEach(key => {
    const regex = new RegExp(`process.env.${key}`, 'g');
    scriptContent = scriptContent.replace(regex, `"${env[key]}"`);
});

// Guardar el nuevo script.js
fs.writeFileSync(path.join(__dirname, 'script.js'), scriptContent);
