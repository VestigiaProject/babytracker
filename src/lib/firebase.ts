import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC25wqWW7CfSK9OoTDcU2inxeQ7w6RhGFc",
  authDomain: "milk-road-ef1d9.firebaseapp.com",
  projectId: "milk-road-ef1d9",
  storageBucket: "milk-road-ef1d9.firebasestorage.app",
  messagingSenderId: "936836650142",
  appId: "1:936836650142:web:c7bf2b690e77bedca4d78f",
  measurementId: "G-ELL1NML8KV"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Helper function to get the user ID we should query data for
export async function getTrackingUserId() {
  if (!auth.currentUser) return null;
  
  // Check if we're connected to someone else's tracker
  const connectionDoc = await getDoc(doc(db, 'connections', auth.currentUser.uid));
  if (connectionDoc.exists()) {
    return connectionDoc.data().connectedTo;
  }
  
  // Otherwise use our own ID
  return auth.currentUser.uid;
}