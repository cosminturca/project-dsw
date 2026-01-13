const admin = require("firebase-admin");

// Log pentru a vedea dacă Render citește variabilele
console.log("Project ID found:", !!process.env.FIREBASE_PROJECT_ID);
console.log("Client Email found:", !!process.env.FIREBASE_CLIENT_EMAIL);

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        project_id: process.env.FIREBASE_PROJECT_ID,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY 
          ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") 
          : undefined,
      }),
    });
    console.log("Firebase Admin initialized successfully.");
  } catch (error) {
    console.error("Firebase Initialization Error:", error.message);
    throw error;
  }
}

module.exports = admin;