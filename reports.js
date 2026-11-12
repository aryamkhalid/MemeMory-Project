import { db } from "./firebase-config.js";
import { getCurrentUser } from "./auth.js";

import {
    collection,
    addDoc,
    doc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const REPORT_REASONS = [
    "Unrelated to course",
    "Non-academic content",
    "Wrong subject tag"
];

let selectedMemeId = null;
let reportModal = null;

function createReportModal() {
    reportModal = document.createElement("div");
    reportModal.id = "reportModal";
    reportModal.className = "report-modal-overlay";
    reportModal.hidden = true;

    reportModal.innerHTML = `
        <div class="report-modal" role="dialog"
             aria-modal="true" aria-labelledby="reportTitle">

            <h2 id="reportTitle">Report Meme</h2>

            <p>Please select a reason for reporting this meme.</p>

            <form id="reportForm">
                <label for="reportReason">Reason</label>

                <select id="reportReason" required>
                    <option value="">Select a reason</option>
                    ${REPORT_REASONS.map(reason =>
                        `<option value="${reason}">${reason}</option>`
                    ).join("")}
                </select>

                <div class="report-modal-actions">
                    <button type="button" id="cancelReport">
                        Cancel
                    </button>

                    <button type="submit" id="submitReport">
                        Submit Report
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(reportModal);

    document.getElementById("cancelReport")
        .addEventListener("click", closeReportModal);

    document.getElementById("reportForm")
        .addEventListener("submit", submitReport);
}

export function openReportModal(memeId) {
    if (!memeId) {
        alert("Invalid meme.");
        return;
    }

    selectedMemeId = memeId;

    if (!reportModal) {
        createReportModal();
    }

    document.getElementById("reportReason").value = "";
    reportModal.hidden = false;
}

function closeReportModal() {
    reportModal.hidden = true;
    selectedMemeId = null;
}

async function submitReport(event) {
    event.preventDefault();

    const reason = document.getElementById("reportReason").value;
    const submitButton = document.getElementById("submitReport");

    if (!REPORT_REASONS.includes(reason)) {
        alert("Please select a valid reason.");
        return;
    }

    submitButton.disabled = true;

    try {
        const user = await getCurrentUser();

        if (!user) {
            throw new Error("Please log in first.");
        }

        const memeSnapshot = await getDoc(
            doc(db, "memes", selectedMemeId)
        );

        if (!memeSnapshot.exists()) {
            throw new Error("This meme no longer exists.");
        }

        await addDoc(collection(db, "reports"), {
            memeId: selectedMemeId,
            reporterId: user.uid,
            reason: reason,
            status: "Pending",
            createdAt: serverTimestamp()
        });

        closeReportModal();
        alert("Report submitted successfully.");

    } catch (error) {
        console.error("Report submission failed:", error);
        alert(error.message || "Unable to submit report.");
    } finally {
        submitButton.disabled = false;
    }
}

// Connect to the existing feed.js integration.
window.MemeMoryReports = {
    openReportModal
};
