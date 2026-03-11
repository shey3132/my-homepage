import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAmqfWAIGgjmJDx1Qb3BN5HAWDvepbrqsc",
  authDomain: "owner-avatar-purim-donation.firebaseapp.com",
  databaseURL: "https://owner-avatar-purim-donation-default-rtdb.firebaseio.com",
  projectId: "owner-avatar-purim-donation",
  storageBucket: "owner-avatar-purim-donation.firebasestorage.app",
  messagingSenderId: "46990905877",
  appId: "1:46990905877:web:cfe5a85ca006c77ee3b41c"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
