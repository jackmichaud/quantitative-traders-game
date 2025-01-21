import { db } from "../lib/firebase/firebase.client";
import { doc, collection, setDoc, addDoc, updateDoc, getDoc, onSnapshot, query, deleteDoc } from "firebase/firestore";

export const dbHandler = {
    getDB: () => {
        return db
    },

    setDoc: async (collection, data, id) => {
        await setDoc(doc(db, collection, id), data)
    },

    addDoc: async (collection_name, data) => {
        const collectionRef = collection(db, collection_name)
        await addDoc(collectionRef, data)
    },

    updateDoc: async (collection, id, data) => {
        const docRef = doc(db, collection, id)
        return await updateDoc(docRef, data)
    },


    getDoc: async (collection, id) => {
        const docRef = doc(db, collection, id)
        const docSnap = await getDoc(docRef)
        return docSnap
    },


    onSnapshot: async (collection, callback) => {
        onSnapshot(collection(db, collection), callback)
    },

    queryDoc: async (collection_name, query_conditions) => {
        const q = query(collection(db, collection_name), query_conditions)
        const querySnapshot = await getDoc(q)

        return querySnapshot
    },


    deleteDoc: async (collection, id) => {
        const docRef = doc(db, collection, id)
        await deleteDoc(docRef)
    }

}