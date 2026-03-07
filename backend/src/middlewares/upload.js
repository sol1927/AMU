import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
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
