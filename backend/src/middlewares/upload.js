import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "uploads", // folder in Cloudinary
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [{ width: 800, height: 800, crop: "limit" }],
  },
});

// Configure Multer with storage and 2MB limit
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
      const error = new Error(
        "Invalid file type. Only jpg, jpeg, png, and webp are allowed.",
      );
      error.code = "LIMIT_FILE_TYPE";
      return cb(error, false);
    }
    cb(null, true);
  },
});

export default upload;
