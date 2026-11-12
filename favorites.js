
import { db } from "./firebase-config.js";
import { getCurrentUser } from "./auth.js";

import {
  doc,
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

// Check whether a meme is already a favorite
export async function isFavorite(memeId) {
  const user = await getCurrentUser();

  if (!user) return false;

  const favoriteIds = await getFavoriteIds();
  return favoriteIds.includes(memeId);
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

// Display an empty or red heart
function updateFavoriteButton(button, saved) {
  button.setAttribute("aria-pressed", String(saved));

  button.title = saved
    ? "Remove from favorites"
    : "Add to favorites";

  button.setAttribute("aria-label", button.title);
  button.classList.toggle("is-favorite", saved);

  // Replace only the favorite icon, not other buttons
  let heart = button.querySelector(".favorite-heart");

  if (!heart) {
    const oldIcon = button.querySelector("img");

    if (oldIcon) {
      oldIcon.remove();
    }

    heart = document.createElement("span");
    heart.className = "favorite-heart";
    heart.setAttribute("aria-hidden", "true");

    button.appendChild(heart);
  }

  heart.textContent = saved ? "♥" : "♡";
  heart.style.color = saved ? "#e53935" : "#333333";
  heart.style.fontSize = "25px";
  heart.style.fontFamily = "Arial, sans-serif";
  heart.style.fontWeight = "normal";
  heart.style.lineHeight = "1";
  heart.style.display = "inline-block";
}

// Update matching buttons after clicking
function updateFavoriteButtons(memeId, saved) {
  const buttons = document.querySelectorAll(
    '[data-action="favorite"][data-meme-id]'
  );

  buttons.forEach((button) => {
    if (button.dataset.memeId !== memeId) return;

    updateFavoriteButton(button, saved);
  });
}

// Load saved states when memes appear
async function refreshFavoriteButtons() {
  const buttons = document.querySelectorAll(
    '[data-action="favorite"][data-meme-id]'
  );

  if (!buttons.length) return;

  try {
    const favoriteIds = new Set(await getFavoriteIds());

    buttons.forEach((button) => {
      // Skip buttons removed during search or filtering
      if (!button.isConnected) return;

      const saved = favoriteIds.has(button.dataset.memeId);
      updateFavoriteButton(button, saved);
    });
  } catch (error) {
    console.error("Unable to load favorite states:", error);
  }
}

// Connect with the existing feed.js
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

// Refresh buttons after search or filtering recreates cards
const memesContainer = document.getElementById("memesContainer");

if (memesContainer) {
  const observer = new MutationObserver(() => {
    refreshFavoriteButtons();
  });

  observer.observe(memesContainer, {
    childList: true,
    subtree: false
  });
}

// Initialize buttons already present on the page
if (document.querySelector('[data-action="favorite"]')) {
  refreshFavoriteButtons();
}
