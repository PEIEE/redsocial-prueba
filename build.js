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

// Verificar que todas las variables existan
Object.keys(env).forEach(key => {
    if (!env[key]) {
        throw new Error(`La variable de entorno ${key} no está definida en Netlify`);
    }
});

// Procesar ambos archivos: script.js y feed.js
['script.js', 'feed.js'].forEach(file => {
    // Leer el archivo
    let content = fs.readFileSync(path.join(__dirname, file), 'utf8');

    // Reemplazar process.env con los valores reales
    Object.keys(env).forEach(key => {
        const regex = new RegExp(`process.env.${key}`, 'g');
        content = content.replace(regex, `"${env[key]}"`);
    });

    // Guardar el archivo modificado
    fs.writeFileSync(path.join(__dirname, file), content);
});
