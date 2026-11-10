import { db } from "./firebase-config.js";

import {
    collection,
    doc,
    getDoc,
    getDocs
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

let cachedMemes = [];

function cleanText(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeMeme(memeDoc) {
    const data = memeDoc.data();

    return {
        memeId: memeDoc.id,
        title: cleanText(data.title, "Untitled meme"),
        description: cleanText(data.description),
        courseTag: cleanText(data.courseTag, "Other"),
        imageUrl: cleanText(data.imageUrl),
        authorId: cleanText(data.authorId),
        authorName: cleanText(data.authorName, "Student"),
        createdAt: data.createdAt || null
    };
}

function createdAtMilliseconds(meme) {
    if (meme.createdAt && typeof meme.createdAt.toMillis === "function") {
        return meme.createdAt.toMillis();
    }

    if (meme.createdAt instanceof Date) {
        return meme.createdAt.getTime();
    }

    return 0;
}

async function fetchAllMemes() {
    const snapshot = await getDocs(collection(db, "memes"));

    return snapshot.docs
        .map(normalizeMeme)
        .filter((meme) => meme.imageUrl)
        .sort((first, second) =>
            createdAtMilliseconds(second) - createdAtMilliseconds(first)
        );
}

export function getCachedMemes() {
    return [...cachedMemes];
}

function setStatus(elementId, textId, message, state = "loading") {
    const status = document.getElementById(elementId);
    const statusText = document.getElementById(textId);

    if (!status || !statusText) return;

    status.className = `feed-status ${state}`;
    statusText.textContent = message;
    status.hidden = !message;

    const spinner = status.querySelector(".loading-spinner");
    if (spinner) spinner.hidden = state !== "loading";
}

function createActionButton(action, memeId) {
    const isFavorite = action === "favorite";
    const button = document.createElement("button");
    const icon = document.createElement("img");

    button.type = "button";
    button.className = "meme-action-button";
    button.dataset.action = action;
    button.dataset.memeId = memeId;
    button.title = isFavorite ? "Add to favorites" : "Report meme";
    button.setAttribute("aria-label", button.title);

    icon.src = isFavorite ? "images/like-icon.png" : "images/flag-icon.png";
    icon.alt = "";
    button.appendChild(icon);

    return button;
}

function trackImageLoad(image, label) {
    const startedAt = performance.now();

    image.addEventListener("load", () => {
        const duration = Math.round(performance.now() - startedAt);
        const message = `${label} loaded in ${duration} ms.`;

        if (duration <= 3000) {
            console.info(message);
        } else {
            console.warn(`${message} This exceeds the 3-second performance target.`);
        }
    }, { once: true });
}

function createMemeCard(meme, index) {
    const card = document.createElement("article");
    card.className = "meme-card";
    card.dataset.memeId = meme.memeId;
    card.dataset.courseTag = meme.courseTag;

    const header = document.createElement("div");
    header.className = "meme-card-header";

    const authorBlock = document.createElement("div");
    authorBlock.className = "meme-author-block";

    const author = document.createElement("span");
    author.className = "meme-author";
    author.textContent = meme.authorName;

    const course = document.createElement("span");
    course.className = "meme-course-tag";
    course.textContent = meme.courseTag;

    authorBlock.append(author, course);

    const actions = document.createElement("div");
    actions.className = "meme-card-actions";
    actions.append(
        createActionButton("favorite", meme.memeId),
        createActionButton("report", meme.memeId)
    );

    header.append(authorBlock, actions);

    const title = document.createElement("h3");
    title.className = "meme-card-title";
    title.textContent = meme.title;

    const detailsLink = document.createElement("a");
    detailsLink.className = "meme-image-link";
    detailsLink.href = `meme-detail.html?memeId=${encodeURIComponent(meme.memeId)}`;
    detailsLink.setAttribute("aria-label", `Open details for ${meme.title}`);

    const image = document.createElement("img");
    image.className = "meme-card-image";
    trackImageLoad(image, `Home image ${meme.memeId}`);
    image.src = meme.imageUrl;
    image.alt = meme.title;
    image.decoding = "async";
    image.loading = index < 2 ? "eager" : "lazy";
    if (index < 2) image.fetchPriority = "high";
    image.addEventListener("error", () => {
        image.classList.add("image-load-error");
        image.alt = `Unable to load image for ${meme.title}`;
    });

    detailsLink.appendChild(image);

    const description = document.createElement("p");
    description.className = "meme-card-description";
    description.textContent = meme.description || "No description provided.";

    card.append(header, title, detailsLink, description);
    return card;
}

export function renderMemeFeed(memes, options = {}) {
    const container = document.getElementById("memesContainer");
    if (!container) return;

    container.replaceChildren();

    if (memes.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "feed-empty-message";
        emptyMessage.textContent = options.emptyMessage || "No memes have been posted yet.";
        container.appendChild(emptyMessage);
        return;
    }

    const courseGroups = new Map();
    memes.forEach((meme) => {
        if (!courseGroups.has(meme.courseTag)) {
            courseGroups.set(meme.courseTag, []);
        }
        courseGroups.get(meme.courseTag).push(meme);
    });

    let cardIndex = 0;
    courseGroups.forEach((courseMemes, courseTag) => {
        const section = document.createElement("section");
        section.className = "course-section";
        section.dataset.courseTag = courseTag;

        const heading = document.createElement("h2");
        heading.className = "course-section-title";
        heading.textContent = courseTag;

        const list = document.createElement("div");
        list.className = "course-meme-list";

        courseMemes.forEach((meme) => {
            list.appendChild(createMemeCard(meme, cardIndex));
            cardIndex += 1;
        });

        section.append(heading, list);
        container.appendChild(section);
    });
}

function findIntegrationHandler(action) {
    if (action === "favorite") {
        return window.MemeMoryFavorites?.toggleFavorite || window.toggleFavorite;
    }

    return window.MemeMoryReports?.openReportModal || window.openReportModal;
}

async function handleIntegrationAction(button) {
    const action = button.dataset.action;
    const memeId = button.dataset.memeId;
    if (!action || !memeId) return;

    const handler = findIntegrationHandler(action);
    const eventName = action === "favorite" ? "mememory:favorite" : "mememory:report";

    button.disabled = true;
    try {
        if (typeof handler === "function") {
            await handler(memeId, button);
        } else {
            window.dispatchEvent(new CustomEvent(eventName, {
                detail: { memeId, button }
            }));
        }
    } catch (error) {
        console.error(`Unable to run ${action} action:`, error);
    } finally {
        button.disabled = false;
    }
}

function setupActionDelegation() {
    document.addEventListener("click", (event) => {
        const button = event.target.closest("[data-action][data-meme-id]");
        if (button) handleIntegrationAction(button);
    });
}

async function loadHomeFeed() {
    const container = document.getElementById("memesContainer");
    if (!container) return;

    const startedAt = performance.now();
    setStatus("feedStatus", "feedStatusText", "Loading memes...", "loading");

    try {
        cachedMemes = await fetchAllMemes();
        renderMemeFeed(cachedMemes);
        setStatus("feedStatus", "feedStatusText", "", "success");

        window.dispatchEvent(new CustomEvent("mememory:memes-loaded", {
            detail: { memes: getCachedMemes() }
        }));

        console.info(`Home feed loaded in ${Math.round(performance.now() - startedAt)} ms.`);
    } catch (error) {
        console.error("Failed to load Home Feed:", error);
        setStatus(
            "feedStatus",
            "feedStatusText",
            "Unable to load memes. Please check your connection and try again.",
            "error"
        );
    }
}

function formatDate(createdAt) {
    if (!createdAt) return "";

    const date = typeof createdAt.toDate === "function"
        ? createdAt.toDate()
        : new Date(createdAt);

    if (Number.isNaN(date.getTime())) return "";
    return `Posted ${new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date)}`;
}

async function loadMemeDetails() {
    const detailsCard = document.getElementById("memeDetails");
    if (!detailsCard) return;

    const memeId = new URLSearchParams(window.location.search).get("memeId")?.trim();

    if (!memeId) {
        setStatus(
            "detailStatus",
            "detailStatusText",
            "This meme link is invalid. Please return to Home.",
            "error"
        );
        return;
    }

    const startedAt = performance.now();
    setStatus("detailStatus", "detailStatusText", "Loading meme details...", "loading");

    try {
        const snapshot = await getDoc(doc(db, "memes", memeId));

        if (!snapshot.exists()) {
            setStatus(
                "detailStatus",
                "detailStatusText",
                "This meme was not found or may have been deleted.",
                "error"
            );
            return;
        }

        const meme = normalizeMeme(snapshot);
        const image = document.getElementById("detailImage");

        document.getElementById("detailAuthor").textContent = meme.authorName;
        document.getElementById("detailCourseTag").textContent = meme.courseTag;
        document.getElementById("detailTitle").textContent = meme.title;
        document.getElementById("detailDescription").textContent =
            meme.description || "No description provided.";
        document.getElementById("detailDate").textContent = formatDate(meme.createdAt);

        trackImageLoad(image, `Detail image ${meme.memeId}`);
        image.src = meme.imageUrl;
        image.alt = meme.title;
        image.addEventListener("error", () => {
            image.classList.add("image-load-error");
            image.alt = `Unable to load image for ${meme.title}`;
        }, { once: true });

        document.getElementById("detailFavoriteButton").dataset.memeId = meme.memeId;
        document.getElementById("detailReportButton").dataset.memeId = meme.memeId;

        detailsCard.hidden = false;
        setStatus("detailStatus", "detailStatusText", "", "success");
        document.title = `${meme.title} - MemeMory`;

        console.info(`Meme details loaded in ${Math.round(performance.now() - startedAt)} ms.`);
    } catch (error) {
        console.error("Failed to load meme details:", error);
        setStatus(
            "detailStatus",
            "detailStatusText",
            "Unable to load this meme. Please check your connection and try again.",
            "error"
        );
    }
}

setupActionDelegation();
loadHomeFeed();
loadMemeDetails();
