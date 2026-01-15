<script>
  import "../app.css";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";

  import { auth, db } from "../lib/firebase/firebase.client";
  import { authStore } from "../stores/authStore";
  import { doc, onSnapshot } from "firebase/firestore";

  import { get } from "svelte/store";

  import NavBar from "../components/NavBar.svelte";

  onMount(() => {
    let userDocUnsub = null;

    const authUnsub = auth.onAuthStateChanged((user) => {
      // stop previous user listener
      if (userDocUnsub) {
        userDocUnsub();
        userDocUnsub = null;
      }

      // Always update user + loading first
      authStore.update((current) => ({
        ...current,
        isLoading: false,
        currentUser: user,
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
<body class="bg-slate-400">
  <slot />
</body>