
import { db } from "./firebase-config.js";
import { getCurrentUser } from "./auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");

async function loadProfile() {
    if (!profileName || !profileEmail) return;

    try {
        const user = await getCurrentUser();

        if (!user) {
            return;
        }

        profileEmail.textContent = user.email || "Information Technology";

        const userSnapshot = await getDoc(
            doc(db, "users", user.uid)
        );

        if (userSnapshot.exists()) {
            const userData = userSnapshot.data();

            profileName.textContent =
                userData.fullName ||
                user.displayName ||
                "IT Student";
        } else {
            profileName.textContent =
                user.displayName ||
                "IT Student";
        }

    } catch (error) {
        console.error("Unable to load profile:", error);

        profileName.textContent = "IT Student";
    }
}

loadProfile();
