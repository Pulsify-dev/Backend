import { BadRequestError } from "./errors.utils.js";
import sharp from "sharp";

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

const compressImage = async (fileBuffer, maxWidth = 800) => {
  try {
    return await sharp(fileBuffer)
      // Resizes to a max width of 800px. 
      // Height adjusts automatically to maintain the original aspect ratio (no cropping).
      // 'withoutEnlargement' ensures small images aren't stretched.
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch (error) {
    throw new BadRequestError("Failed to compress image file.");
  }
};

export default {
  validateImageFile,
  compressImage,
};
