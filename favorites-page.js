
import { db } from "./firebase-config.js";
import {
  getFavoriteIds,
  removeFavorite
} from "./favorites.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const container = document.getElementById("favoritesContainer");
const loading = document.getElementById("favoritesLoading");
const empty = document.getElementById("favoritesEmpty");
const errorMessage = document.getElementById("favoritesError");

function showState(state) {
  loading.hidden = state !== "loading";
  empty.hidden = state !== "empty";
  errorMessage.hidden = state !== "error";
}

function createFavoriteCard(meme) {
  const card = document.createElement("article");
  card.className = "meme-card";

  const header = document.createElement("div");
  header.className = "meme-card-header";

  const authorBlock = document.createElement("div");
  authorBlock.className = "meme-author-block";

  const author = document.createElement("span");
  author.className = "meme-author";
  author.textContent = meme.authorName || "Student";

  const course = document.createElement("span");
  course.className = "meme-course-tag";
  course.textContent = meme.courseTag || "Other";

  authorBlock.append(author, course);

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "meme-action-button is-favorite";
  removeButton.title = "Remove from favorites";
  removeButton.setAttribute("aria-label", removeButton.title);
  removeButton.setAttribute("aria-pressed", "true");

  // Red heart for saved memes
  const heart = document.createElement("span");
  heart.textContent = "♥";
  heart.setAttribute("aria-hidden", "true");
  heart.style.color = "#e53935";
  heart.style.fontSize = "25px";
  heart.style.lineHeight = "1";

  removeButton.appendChild(heart);

  removeButton.addEventListener("click", async () => {
    removeButton.disabled = true;

    try {
      await removeFavorite(meme.memeId);
      card.remove();

      if (!container.children.length) {
        showState("empty");
      }
    } catch (error) {
      console.error("Unable to remove favorite:", error);
      alert("Unable to remove favorite. Please try again.");
      removeButton.disabled = false;
    }
  });

  header.append(authorBlock, removeButton);

  const title = document.createElement("h3");
  title.className = "meme-card-title";
  title.textContent = meme.title || "Untitled meme";

  const link = document.createElement("a");
  link.className = "meme-image-link";
  link.href =
    `meme-detail.html?memeId=${encodeURIComponent(meme.memeId)}`;

  const image = document.createElement("img");
  image.className = "meme-card-image";
  image.src = meme.imageUrl;
  image.alt = meme.title || "Meme";
  image.loading = "lazy";

  link.appendChild(image);

  const description = document.createElement("p");
  description.className = "meme-card-description";
  description.textContent =
    meme.description || "No description provided.";

  card.append(header, title, link, description);

  return card;
}

async function loadFavorites() {
  showState("loading");
  container.replaceChildren();

  try {
    const favoriteIds = await getFavoriteIds();

    if (!favoriteIds.length) {
      showState("empty");
      return;
    }

    const results = await Promise.all(
      favoriteIds.map(async (memeId) => {
        const snapshot = await getDoc(
          doc(db, "memes", memeId)
        );

        if (!snapshot.exists()) return null;

        return {
          memeId: snapshot.id,
          ...snapshot.data()
        };
      })
    );

    const memes = results.filter(
      (meme) => meme && meme.imageUrl
    );

    if (!memes.length) {
      showState("empty");
      return;
    }

    memes.forEach((meme) => {
      container.appendChild(createFavoriteCard(meme));
    });

    showState("success");
  } catch (error) {
    console.error("Unable to load favorites:", error);
    showState("error");
  }
}

loadFavorites();
