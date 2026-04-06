import { collection, doc, setDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';

const DEFAULT_CATEGORIES = [
  { name: 'פוליטיקה', slug: 'politics', order: 1 },
  { name: 'ביטחון', slug: 'security', order: 2 },
  { name: 'כלכלה', slug: 'economy', order: 3 },
  { name: 'טכנולוגיה', slug: 'tech', order: 4 },
  { name: 'ספורט', slug: 'sports', order: 5 },
];

export async function seedDatabase() {
  const catSnap = await getDocs(collection(db, 'categories'));
  if (catSnap.empty) {
    console.log('Seeding categories...');
    for (const cat of DEFAULT_CATEGORIES) {
      const newDoc = doc(collection(db, 'categories'));
      await setDoc(newDoc, cat);
    }
  }

  const settingsDoc = doc(db, 'settings', 'global');
  const settingsSnap = await getDocs(query(collection(db, 'settings'), limit(1)));
  if (settingsSnap.empty) {
    console.log('Seeding settings...');
    await setDoc(settingsDoc, {
      tickerText: 'ברוכים הבאים למערכת מבזקון - עדכוני חדשות בזמן אמת',
      isMaintenance: false,
      siteTitle: 'מבזקון - חדשות Real-Time'
    });
  }
}
