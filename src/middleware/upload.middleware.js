import multer from "multer";
import { BadRequestError } from "../utils/errors.js";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/flac", "audio/aac"];
// Note: "audio/mpeg" is the MIME type for MP3 files
const trackFileFilter = (req, file, cb) => {
  if (file.fieldname === "audio_file") {
    if (ALLOWED_AUDIO_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestError(
          "Invalid file format. Only MP3, WAV, FLAC, and AAC are allowed.",
        ),
        false,
      );
    }
  } else if (file.fieldname === "artwork_file") {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestError("Invalid artwork. Only JPEG, PNG, WebP."), false);
    }
  } else {
  cb(new BadRequestError("Unexpected field"), false);
}
};

const storage = multer.memoryStorage();
const imageFileFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestError("Invalid file format. Only JPEG, PNG, and WebP are allowed.",),
      false);
  }
};

export const avatarUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: imageFileFilter,
}).single("file");

export const coverUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: imageFileFilter,
}).single("file");

export const trackUpload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB
  fileFilter: trackFileFilter,
}).fields([
  { name: "audio_file", maxCount: 1 },
  { name: "artwork_file", maxCount: 1 },
]);
