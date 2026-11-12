
import { db } from "./firebase-config.js";
import { getCurrentUser } from "./auth.js";

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp
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
