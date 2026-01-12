// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD-gnPIXaESQVRr4jR8Gg4P45Y_9Kz0VM8",
  authDomain: "task-project-auth.firebaseapp.com",
  projectId: "task-project-auth",
  storageBucket: "task-project-auth.firebasestorage.app",
  messagingSenderId: "101828610554",
  appId: "1:101828610554:web:b70a9e45f5df4d9a1c3c43"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
