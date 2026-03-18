import { BadRequestError } from "./errors.js";
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const validateImageFile = (file, maxBytes) => {
  if (!file) throw new BadRequestError("No file provided.");
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype))
    throw new BadRequestError(
      "Invalid file format. Only JPEG, PNG, and WebP are allowed.",
    );
  if (file.size > maxBytes)
    throw new BadRequestError(
      `File exceeds the ${maxBytes / (1024 * 1024)} MB limit.`,
    );
};

export default {
  validateImageFile,
};
