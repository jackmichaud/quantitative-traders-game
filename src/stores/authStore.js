import { writable } from "svelte/store";
import { auth } from "../lib/firebase/firebase.client";
import { createUserWithEmailAndPassword, updatePassword, signOut, sendPasswordResetEmail, updateEmail, signInWithEmailAndPassword } from "firebase/auth";
import { dbHandler } from "./dataStore";

export const authStore = writable({
    isLoading: true,
    currentUser: null,
    game: {type: "none", gameID: null, teamName: null}
});

export const authHandler = {
    signup: async (email, password) => {
        await createUserWithEmailAndPassword(auth, email, password)
    },
    login: async (email, password) => {
        await signInWithEmailAndPassword(auth, email, password)
    },
    logout: async () => {
        await signOut(auth)
    },
    resetPassword: async (email) => {
        await sendPasswordResetEmail(auth, email)
    },
    updateEmail: async (email) => {
        if(!email) return
        if(email === auth.currentUser.email) return
        
        authStore.update((curr) => {
            return {...curr, currentUser: {...curr.currentUser, email: email}}
        })
        await updateEmail(auth.currentUser, email)
    },
    updatePassword: async (password) => {
        await updatePassword(auth.currentUser, password)
    }
}