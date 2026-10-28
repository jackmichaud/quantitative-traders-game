<script>
  import "../app.css";
  import { onMount } from "svelte";
  import { browser } from "$app/env";

  import { auth, db } from "../lib/firebase/firebase.client";
  import { authStore } from "../stores/authStore";
  import { doc, onSnapshot } from "firebase/firestore";

  import { get } from "svelte/store";

  import NavBar from "../components/NavBar.svelte";

  onMount(() => {
    let userDocUnsub = null;
    let authEvent = 0;

    const authUnsub = auth.onIdTokenChanged(async (user) => {
      const currentAuthEvent = ++authEvent;

      // stop previous user listener
      if (userDocUnsub) {
        userDocUnsub();
        userDocUnsub = null;
      }

      let isAdmin = false;
      if (user) {
        try {
          const token = await user.getIdTokenResult();
          isAdmin = token.claims.admin === true;
        } catch (error) {
          console.error("Unable to read authentication claims:", error);
        }
      }

      // Ignore a stale token lookup if the user changed while it was pending.
      if (currentAuthEvent !== authEvent) return;

      // The claim only controls presentation here. Cloud Functions enforce it.
      authStore.update((current) => ({
        ...current,
        isLoading: false,
        currentUser: user,
        isAdmin,
        currentGame: null
      }));

      // Redirect logic (optional) — do this after store update
      if (browser) {
        const { currentUser, isLoading } = get(authStore); // see note below
        if (!currentUser && !isLoading && window.location.pathname !== "/") {
          window.location.href = "/";
        }
      }

      if (!user) return;

      // Realtime subscription to users/{uid}
      userDocUnsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
        const data = snap.data() || {};
        authStore.update((current) => ({
          ...current,
          currentGame: data.currentGame ?? null
        }));
      });
    });

    return () => {
      if (userDocUnsub) userDocUnsub();
      authUnsub();
    };
  });
</script>

<NavBar />
<main class="bg-slate-400 min-h-screen">
  <slot />
</main>
