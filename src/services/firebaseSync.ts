import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useFinancialStore } from './storage';

/**
 * Save or overwrite a document in Firestore
 */
export async function saveDocToFirestore<T extends { id: string }>(
  collectionName: string,
  data: T
) {
  try {
    const docRef = doc(db, collectionName, data.id);
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    console.error(`Failed to save document to ${collectionName}:`, error);
  }
}

/**
 * Delete a document from Firestore
 */
export async function deleteDocFromFirestore(
  collectionName: string,
  id: string
) {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Failed to delete document from ${collectionName}:`, error);
  }
}

/**
 * Initialize real-time synchronization between Firebase Firestore and Zustand Store
 */
export async function initFirebaseSync() {
  const store = useFinancialStore.getState();

  // Helper to seed Firestore if collection is empty
  const seedIfEmpty = async (colName: string, items: any[]) => {
    try {
      const colRef = collection(db, colName);
      const snap = await getDocs(colRef);
      if (snap.empty && items && items.length > 0) {
        const batch = writeBatch(db);
        items.forEach((item) => {
          if (item && item.id) {
            batch.set(doc(db, colName, item.id), item);
          }
        });
        await batch.commit();
      }
    } catch (e) {
      console.warn(`Seed check warning for ${colName}:`, e);
    }
  };

  // 1. Seed initial datasets to central Firestore if empty
  await seedIfEmpty('users', store.users);
  await seedIfEmpty('banks', store.banks);
  await seedIfEmpty('cards', store.cards);
  await seedIfEmpty('categories', store.categories);
  await seedIfEmpty('subcategories', store.subcategories);
  await seedIfEmpty('incomes', store.incomes);
  await seedIfEmpty('fixedExpenses', store.fixedExpenses);
  await seedIfEmpty('variableExpenses', store.variableExpenses);
  await seedIfEmpty('loans', store.loans);
  await seedIfEmpty('investments', store.investments);
  await seedIfEmpty('goals', store.goals);

  // 2. Real-time Subscriptions (Syncs automatically across all devices & browsers)
  const unsubscribes: (() => void)[] = [];

  const bindCollection = (colName: string, stateKey: keyof ReturnType<typeof useFinancialStore.getState>) => {
    const colRef = collection(db, colName);
    const unsub = onSnapshot(
      colRef,
      (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) {
          // Local write already reflected in UI
          return;
        }
        const items: any[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ ...docSnap.data(), id: docSnap.id });
        });
        if (items.length > 0 || !snapshot.empty) {
          useFinancialStore.setState({ [stateKey]: items } as any);
        }
      },
      (error) => {
        console.warn(`Realtime sync warning on ${colName}:`, error);
      }
    );
    unsubscribes.push(unsub);
  };

  bindCollection('users', 'users');
  bindCollection('banks', 'banks');
  bindCollection('cards', 'cards');
  bindCollection('categories', 'categories');
  bindCollection('subcategories', 'subcategories');
  bindCollection('incomes', 'incomes');
  bindCollection('fixedExpenses', 'fixedExpenses');
  bindCollection('variableExpenses', 'variableExpenses');
  bindCollection('loans', 'loans');
  bindCollection('investments', 'investments');
  bindCollection('goals', 'goals');
  bindCollection('auditLogs', 'auditLogs');

  return () => {
    unsubscribes.forEach((unsub) => unsub());
  };
}
