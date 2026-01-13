const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      // MODIFICARE: Folosește project_id în loc de projectId
      project_id: process.env.FIREBASE_PROJECT_ID,
      // MODIFICARE: Folosește client_email în loc de clientEmail
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      // MODIFICARE: Folosește private_key în loc de privateKey
      private_key: process.env.FIREBASE_PRIVATE_KEY 
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") 
        : undefined,
    }),
  });
}

module.exports = admin;