import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

// Configuration du stockage Cloudinary pour les images d'avis
const reviewImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    return {
      folder: 'nono-vitrine/reviews/images',
      format: file.mimetype.split('/')[1] === 'jpeg' ? 'jpg' : file.mimetype.split('/')[1],
      public_id: `review_${Date.now()}_${Math.round(Math.random() * 1E9)}`,
      transformation: [
        { width: 800, height: 600, crop: 'limit', quality: 'auto' },
        { format: 'auto' }
      ]
    };
  },
});

// Filtrage des fichiers pour les images d'avis
const reviewFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format d\'image non supporté! Utilisez JPEG, JPG, PNG ou WEBP.'), false);
    }
  } else {
    cb(new Error('Seules les images sont autorisées pour les avis!'), false);
  }
};

// Configuration de Multer pour les images d'avis
const uploadReviewImage = multer({
  storage: reviewImageStorage,
  fileFilter: reviewFileFilter,
  limits: {
    fileSize: 3 * 1024 * 1024, // 3MB max pour les images d'avis
  },
});

// Middleware pour upload single
const uploadSingleReviewImage = uploadReviewImage.single('image');

// Middleware pour gérer les erreurs Multer
const handleReviewUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Image trop volumineuse (max 3MB)'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Trop d\'images uploadées'
      });
    }
  }
  
  if (error.message) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

export { uploadReviewImage, uploadSingleReviewImage, handleReviewUploadError };