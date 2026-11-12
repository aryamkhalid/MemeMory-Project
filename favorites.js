
import { db } from "./firebase-config.js";
import { getCurrentUser } from "./auth.js";

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

// Add a meme to favorites
export async function addFavorite(memeId) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Please log in first.");
  }

  const favoriteId = `${user.uid}_${memeId}`;

  await setDoc(doc(db, "favorites", favoriteId), {
    userId: user.uid,
    memeId: memeId,
    createdAt: serverTimestamp()
  });
}

// Remove a meme from favorites
export async function removeFavorite(memeId) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Please log in first.");
  }

  const favoriteId = `${user.uid}_${memeId}`;

  await deleteDoc(doc(db, "favorites", favoriteId));
}

// Check whether a meme is already a favorite
export async function isFavorite(memeId) {
  const user = await getCurrentUser();

  if (!user) {
    return false;
  }

  const favoriteId = `${user.uid}_${memeId}`;
  const favoriteDoc = await getDoc(
    doc(db, "favorites", favoriteId)
  );

  return favoriteDoc.exists();
}

// Toggle favorite on or off
export async function toggleFavorite(memeId) {
  const saved = await isFavorite(memeId);

  if (saved) {
    await removeFavorite(memeId);
    return false;
  }

  await addFavorite(memeId);
  return true;
}

// Get favorites belonging to the current user
export async function getFavoriteIds() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Please log in first.");
  }

  const favoritesQuery = query(
    collection(db, "favorites"),
    where("userId", "==", user.uid)
  );

  const snapshot = await getDocs(favoritesQuery);

  return snapshot.docs
    .map((favorite) => favorite.data().memeId)
    .filter(Boolean);
}

// Update the appearance and state of favorite buttons
function updateFavoriteButtons(memeId, saved) {
  const buttons = document.querySelectorAll(
    '[data-action="favorite"][data-meme-id]'
  );

  buttons.forEach((button) => {
    if (button.dataset.memeId !== memeId) return;

    button.setAttribute("aria-pressed", String(saved));
    button.title = saved
      ? "Remove from favorites"
      : "Add to favorites";

    button.setAttribute("aria-label", button.title);
    button.classList.toggle("is-favorite", saved);
  });
}

// Load saved states when memes appear
async function refreshFavoriteButtons() {
  try {
    const favoriteIds = new Set(await getFavoriteIds());

    const buttons = document.querySelectorAll(
      '[data-action="favorite"][data-meme-id]'
    );

    buttons.forEach((button) => {
      updateFavoriteButtons(
        button.dataset.memeId,
        favoriteIds.has(button.dataset.memeId)
      );
    });
  } catch (error) {
    console.error("Unable to load favorite states:", error);
  }
}

// Connect with feed.js
window.MemeMoryFavorites = {
  toggleFavorite: async (memeId) => {
    const saved = await toggleFavorite(memeId);
    updateFavoriteButtons(memeId, saved);
    return saved;
  }
};

// Refresh buttons after Home Feed loads
window.addEventListener(
  "mememory:memes-loaded",
  refreshFavoriteButtons
);

// Initialize buttons already present on the page
if (document.querySelector('[data-action="favorite"]')) {
  refreshFavoriteButtons();
}
