import multer from "multer";
import { BadRequestError } from "../utils/errors.utils.js";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_AUDIO_TYPES = [
  "audio/mp3",          // non-standard but sent by some clients
  "audio/mpeg",         // standard MIME type for MP3
  "audio/flac",
  "audio/x-flac",       // common alternative for FLAC
  "audio/wav",
  "audio/wave",          // alternative for WAV
  "audio/x-wav",         // alternative for WAV
  "audio/aac",
  "audio/x-aac",         // alternative for AAC
  "audio/mp4",           // AAC in MP4 container
];
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

export const trackArtworkUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB (per API doc for track artwork)
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
