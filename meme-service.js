
import { db } from "./firebase-config.js";
import { getCurrentUser } from "./auth.js";

import {
    collection,
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

// Save a new meme using the agreed Firestore fields.
export async function createMeme({ title, description, courseTag, imageUrl }) {
    const user = await getCurrentUser();

    if (!user) {
        throw new Error("Please log in first.");
    }

    if (!title?.trim() || !courseTag?.trim() || !imageUrl) {
        throw new Error("Missing required meme information.");
    }

    // Generate a unique memeId (Firestore Document ID).
    const memeRef = doc(collection(db, "memes"));

    await setDoc(memeRef, {
        title: title.trim(),
        description: description?.trim() || "",
        courseTag: courseTag.trim(),
        imageUrl: imageUrl,
        authorId: user.uid,
        authorName: user.displayName || "Student",
        createdAt: serverTimestamp()
    });

    return memeRef.id;
}
