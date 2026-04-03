import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import path from "path";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});


const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let folder = "general";

    if (file.mimetype.includes('image/')) {
      if (req.baseUrl.includes('users')) {
        folder = 'users/images'
      } else if (req.baseUrl.includes('messages')) {
        folder = 'messages/images'
      } else if (req.baseUrl.includes('covers')) {
        folder = 'covers/images'
      } else if (req.baseUrl.includes('posts')) {
        folder = 'posts/images'
      } else {
        folder = 'general/images'
      }
    };

    return {
      folder,
      resource_type: "image",
      public_id: `${Date.now()}-${path.parse(file.originalname).name}`
    };
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024,
  }
})

export default upload;