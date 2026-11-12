
import { db } from "./firebase-config.js";
import { getCurrentUser } from "./auth.js";

import {
    collection,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    writeBatch
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const WORKER =
    "https://mememory-delete.jood0505ali.workers.dev";

const statusBox = document.getElementById("adminStatus");
const adminContent = document.getElementById("adminContent");
const reportsList = document.getElementById("reportsList");

let currentAdmin = null;
let reportsCache = [];

function showStatus(message, isError = false) {
    statusBox.textContent = message;
    statusBox.className = isError
        ? "feed-status error"
        : "feed-status";
    statusBox.hidden = !message;
}

function formatDate(timestamp) {
    if (!timestamp) return "Date unavailable";

    const date = typeof timestamp.toDate === "function"
        ? timestamp.toDate()
        : new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return date.toLocaleString("en-US");
}

// Check whether the user has Admin permission.
async function checkAdminAccess() {
    const user = await getCurrentUser();

    if (!user) {
        window.location.replace("login.html");
        return false;
    }

    const userSnapshot = await getDoc(
        doc(db, "users", user.uid)
    );

    if (
        !userSnapshot.exists() ||
        userSnapshot.data().role !== "admin"
    ) {
        showStatus("Access denied. Admins only.", true);
        return false;
    }

    currentAdmin = user;
    return true;
}

// Retrieve all reports.
async function loadReports() {
    showStatus("Loading reports...");

    try {
        const snapshot = await getDocs(
            collection(db, "reports")
        );

        reportsCache = snapshot.docs.map(reportDoc => ({
            id: reportDoc.id,
            ...reportDoc.data()
        }));

        reportsCache.sort((a, b) => {
            const first = a.createdAt?.toMillis?.() || 0;
            const second = b.createdAt?.toMillis?.() || 0;
            return second - first;
        });

        await renderReports();
        showStatus("");

    } catch (error) {
        console.error(error);
        showStatus("Unable to load reports.", true);
    }
}

// Create a text element safely.
function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

// Display reports with meme previews.
async function renderReports() {
    reportsList.replaceChildren();

    if (reportsCache.length === 0) {
        reportsList.appendChild(
            makeElement(
                "p",
                "admin-empty",
                "No reports found"
            )
        );
        return;
    }

    for (const report of reportsCache) {
        const card = makeElement("article", "admin-report-card");

        const heading = makeElement(
            "h3",
            "",
            "Reported Meme"
        );

        const reason = makeElement(
            "p",
            "",
            `Reason: ${report.reason || "Unknown"}`
        );

        const status = makeElement(
            "p",
            "",
            `Status: ${report.status || "Pending"}`
        );

        const date = makeElement(
            "p",
            "",
            `Submitted: ${formatDate(report.createdAt)}`
        );

        card.append(heading, reason, status, date);

        let memeExists = false;

        if (report.memeId) {
            try {
                const memeSnapshot = await getDoc(
                    doc(db, "memes", report.memeId)
                );

                if (memeSnapshot.exists()) {
                    memeExists = true;
                    const meme = memeSnapshot.data();

                    card.appendChild(
                        makeElement(
                            "h4",
                            "admin-meme-title",
                            meme.title || "Untitled meme"
                        )
                    );

                    if (meme.imageUrl) {
                        const image = document.createElement("img");
                        image.src = meme.imageUrl;
                        image.alt = meme.title || "Reported meme";
                        image.className = "admin-meme-image";
                        image.loading = "lazy";
                        card.appendChild(image);
                    }

                    const detailsLink = makeElement(
                        "a",
                        "admin-details-link",
                        "View Meme Details"
                    );

                    detailsLink.href =
                        `meme-detail.html?memeId=${encodeURIComponent(report.memeId)}`;

                    card.appendChild(detailsLink);
                }
            } catch (error) {
                console.error("Unable to load meme preview:", error);
                card.appendChild(
                    makeElement("p", "", "Meme preview unavailable.")
                );
            }
        }

        if (!memeExists) {
            card.appendChild(
                makeElement(
                    "p",
                    "",
                    "Meme deleted or unavailable."
                )
            );
        }

        if (report.status === "Pending") {
            const actions = makeElement(
                "div",
                "admin-report-actions"
            );

            const dismissButton = makeElement(
                "button",
                "admin-dismiss-btn",
                "Dismiss Report"
            );

            dismissButton.type = "button";
            dismissButton.addEventListener("click", async () => {
                if (!confirm("Dismiss this report?")) return;

                dismissButton.disabled = true;

                try {
                    await dismissReport(report.id);
                    alert("Report dismissed successfully.");
                    await loadReports();
                } catch (error) {
                    console.error(error);
                    alert("Unable to dismiss report.");
                    dismissButton.disabled = false;
                }
            });

            actions.appendChild(dismissButton);

            if (memeExists) {
                const deleteButton = makeElement(
                    "button",
                    "admin-delete-btn",
                    "Delete Inappropriate Meme"
                );

                deleteButton.type = "button";

                deleteButton.addEventListener("click", async () => {
                    if (!confirm(
                        "Permanently delete this meme?"
                    )) return;

                    deleteButton.disabled = true;

                    try {
                        await deleteReportedMeme(report.memeId);
                        alert("Meme deleted successfully.");
                        await loadReports();
                    } catch (error) {
                        console.error(error);
                        alert(error.message || "Unable to delete meme.");
                        deleteButton.disabled = false;
                    }
                });

                actions.appendChild(deleteButton);
            }

            card.appendChild(actions);
        }

        reportsList.appendChild(card);
    }
}

// Dismiss a report without deleting the meme.
async function dismissReport(reportId) {
    await updateDoc(
        doc(db, "reports", reportId),
        { status: "Dismissed" }
    );
}

// Request deletion through the existing backend.
async function deleteReportedMeme(memeId) {
    if (!currentAdmin) {
        throw new Error("Admin authentication required.");
    }

    const response = await fetch(
        `${WORKER}/delete-meme`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization:
                    `Bearer ${await currentAdmin.getIdToken()}`
            },
            body: JSON.stringify({ memeId })
        }
    );

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.error || "Meme deletion failed."
        );
    }

    // Resolve all reports associated with the deleted meme.
    const relatedReports = reportsCache.filter(
        report => report.memeId === memeId
    );

    // Firestore batches have write limits.
    // Keep each batch below the limit.
    for (let i = 0; i < relatedReports.length; i += 400) {
        const batch = writeBatch(db);

        relatedReports.slice(i, i + 400).forEach(report => {
            batch.update(
                doc(db, "reports", report.id),
                { status: "Resolved" }
            );
        });

        await batch.commit();
    }
}

// Start the Admin Panel.
async function initializeAdmin() {
    try {
        const authorized = await checkAdminAccess();

        if (!authorized) return;

        adminContent.hidden = false;
        await loadReports();

    } catch (error) {
        console.error(error);
        showStatus("Unable to verify admin access.", true);
    }
}

initializeAdmin();
