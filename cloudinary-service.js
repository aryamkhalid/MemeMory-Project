
const CLOUD_NAME = "vtz9yqqo";
const UPLOAD_PRESET = "mememory_upload";

// Upload a PNG or JPG meme image (maximum 5MB).
export async function uploadMemeImage(file) {
    if (!file || !["image/png", "image/jpeg"].includes(file.type)) {
        throw new Error("Only PNG and JPG images are allowed.");
    }

    if (file.size > 5 * 1024 * 1024) {
        throw new Error("Image size must not exceed 5MB.");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
            method: "POST",
            body: formData
        }
    );

    const result = await response.json();

    if (!response.ok || !result.secure_url) {
        throw new Error(result.error?.message || "Image upload failed.");
    }

    // Return the image URL and its Cloudinary identifier.
    return {
        imageUrl: result.secure_url,
        publicId: result.public_id
    };
}
