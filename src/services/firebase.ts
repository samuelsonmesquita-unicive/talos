import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Inicialização segura do Firebase (Singleton)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Banco Firestore utilizando o databaseId gerado pelo projeto
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

export default app;
