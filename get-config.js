// functions/get-config.js
exports.handler = async function(event, context) {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*' // Allow CORS for client-side access
        },
        body: JSON.stringify({
            FIREBASE: {
                apiKey: process.env.FIREBASE_API_KEY,
                authDomain: process.env.FIREBASE_AUTH_DOMAIN,
                projectId: process.env.FIREBASE_PROJECT_ID,
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
                messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
                appId: process.env.FIREBASE_APP_ID
            },
            CLOUDINARY: {
                uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET,
                cloudName: process.env.CLOUDINARY_CLOUD_NAME
            }
        })
    };
};
