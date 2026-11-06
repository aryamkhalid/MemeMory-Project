
import { db } from "./firebase-config.js";
import { getCurrentUser } from "./auth.js";

import {
    collection,
    doc,
    setDoc,
    serverTimestamp,
    query,
    where,
    getDocs,
    getDoc,
    updateDoc,
    deleteDoc
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

 // Get only the posts created by the logged-in user.
export async function getMyMemes() {
    const user = await getCurrentUser();

    if (!user) {
        throw new Error("Please log in first.");
    }

    const myMemesQuery = query(
        collection(db, "memes"),
        where("authorId", "==", user.uid)
    );

    const snapshot = await getDocs(myMemesQuery);

    return snapshot.docs.map((memeDoc) => ({
        memeId: memeDoc.id,
        ...memeDoc.data()
    }));
}

 // Edit Meme - Only the post owner can update its details.
export async function updateMeme(memeId, { title, description, courseTag }) {
    const user = await getCurrentUser();

    if (!user) {
        throw new Error("Please log in first.");
    }

    // Title and course tag are required.
    const cleanTitle = title?.trim();
    const cleanCourseTag = courseTag?.trim();

    if (!memeId || !cleanTitle || !cleanCourseTag) {
        throw new Error("Please enter a valid title and course tag.");
    }

    const memeRef = doc(db, "memes", memeId);
    const memeSnapshot = await getDoc(memeRef);

    if (!memeSnapshot.exists()) {
        throw new Error("Meme not found.");
    }

    // Prevent users from editing someone else's post.
    if (memeSnapshot.data().authorId !== user.uid) {
        throw new Error("You can only edit your own memes.");
    }

    // Update the existing post without creating a new one.
    await updateDoc(memeRef, {
        title: cleanTitle,
        description: description?.trim() || "",
        courseTag: cleanCourseTag
    });
}

 // Delete Meme - Only the post owner can delete it.
export async function deleteMeme(memeId) {
    const user = await getCurrentUser();

    if (!user) {
        throw new Error("Please log in first.");
    }

    if (!memeId) {
        throw new Error("Invalid meme ID.");
    }

    const memeRef = doc(db, "memes", memeId);
    const memeSnapshot = await getDoc(memeRef);

    if (!memeSnapshot.exists()) {
        throw new Error("Meme not found.");
    }

    // Prevent users from deleting someone else's post.
    if (memeSnapshot.data().authorId !== user.uid) {
        throw new Error("You can only delete your own memes.");
    }

    // Delete the meme document from Firestore.
    await deleteDoc(memeRef);
}


