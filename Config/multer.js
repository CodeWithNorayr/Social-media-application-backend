import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import path from "path";

// =============================
// CLOUDINARY CONFIG
// =============================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// =============================
// STORAGE ENGINE
// =============================
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let folder = "general/images";

    // only allow images (safer globally)
    if (!file.mimetype.startsWith("image/")) {
      throw new Error("Only image uploads are allowed");
    }

    // route-based folder logic (safe fallback)
    const baseUrl = req.baseUrl || "";

    if (baseUrl.includes("users")) {
      folder = "users/images";
    } else if (baseUrl.includes("messages")) {
      folder = "messages/images";
    } else if (baseUrl.includes("covers")) {
      folder = "covers/images";
    } else if (baseUrl.includes("posts")) {
      folder = "posts/images";
    }

    const originalName = path.parse(file.originalname).name
      .replace(/\s+/g, "_") // remove spaces
      .toLowerCase();

    return {
      folder,
      resource_type: "image",
      public_id: `${Date.now()}-${originalName}`,
      overwrite: false
    };
  }
});

// =============================
// MULTER CONFIG
// =============================
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB safer limit
  },

  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"), false);
    }
    cb(null, true);
  }
});

export default upload;
