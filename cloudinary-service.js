
import { getCurrentUser } from "./auth.js";

const WORKER = "https://mememory-delete.jood0505ali.workers.dev";

// Upload a PNG/JPG image up to 5MB.
export async function uploadMemeImage(file) {
    if (!file || !["image/png", "image/jpeg"].includes(file.type)) {
        throw new Error("Only PNG and JPG images are allowed.");
    }

    if (file.size > 5 * 1024 * 1024) {
        throw new Error("Image size must not exceed 5MB.");
    }

    const user = await getCurrentUser();
    if (!user) throw new Error("Please log in first.");

    // Get an authorized upload signature from Cloudflare.
    const response = await fetch(`${WORKER}/sign-upload`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${await user.getIdToken()}`
        }
    });

    const options = await response.json();
    if (!response.ok) {
        throw new Error(options.error || "Upload authorization failed.");
    }

    const formData = new FormData();
    formData.append("file", file);

    for (const key of [
        "api_key", "allowed_formats", "overwrite",
        "public_id", "timestamp", "signature"
    ]) {
        formData.append(key, String(options[key]));
    }

    const upload = await fetch(
        `https://api.cloudinary.com/v1_1/${options.cloud_name}/image/upload`,
        { method: "POST", body: formData }
    );

    const result = await upload.json();

    if (!upload.ok || !result.secure_url) {
        throw new Error(result.error?.message || "Image upload failed.");
    }

    return {
        imageUrl: result.secure_url,
        publicId: result.public_id
    };
}
