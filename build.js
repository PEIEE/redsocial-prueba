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
const missingVars = Object.keys(env).filter(key => !env[key]);
if (missingVars.length > 0) {
    throw new Error(`Las siguientes variables de entorno no están definidas en Netlify: ${missingVars.join(', ')}`);
}

// Procesar ambos archivos: script.js y feed.js
['script.js', 'feed.js'].forEach(file => {
    try {
        // Leer el archivo
        const filePath = path.join(__dirname, file);
        let content = fs.readFileSync(filePath, 'utf8');

        // Reemplazar process.env con los valores reales
        Object.keys(env).forEach(key => {
            const regex = new RegExp(`process.env.${key}`, 'g');
            content = content.replace(regex, JSON.stringify(env[key]));
        });

        // Guardar el archivo modificado
        fs.writeFileSync(filePath, content);
        console.log(`Archivo ${file} procesado exitosamente.`);
    } catch (error) {
        console.error(`Error procesando ${file}:`, error.message);
        throw error;
    }
});
