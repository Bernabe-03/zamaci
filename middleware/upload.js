import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

// Configuration du stockage Cloudinary pour les images
const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    return {
      folder: 'nono-vitrine/products/images',
      format: file.mimetype.split('/')[1] === 'jpeg' ? 'jpg' : file.mimetype.split('/')[1],
      public_id: `image_${Date.now()}_${Math.round(Math.random() * 1E9)}`,
      transformation: [
        { width: 800, height: 800, crop: 'limit', quality: 'auto' },
        { format: 'auto' }
      ]
    };
  },
});

// Configuration du stockage Cloudinary pour les vidéos
const videoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    return {
      folder: 'nono-vitrine/products/videos',
      resource_type: 'video',
      public_id: `video_${Date.now()}_${Math.round(Math.random() * 1E9)}`,
      transformation: [
        { quality: 'auto' },
        { format: 'mp4' } // Convertir en MP4 pour une meilleure compatibilité
      ]
    };
  },
});

// Filtrage des fichiers amélioré
const fileFilter = (req, file, cb) => {
  // Autoriser les images
  if (file.mimetype.startsWith('image/')) {
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format d\'image non supporté! Utilisez JPEG, JPG, PNG ou WEBP.'), false);
    }
  }
  // Autoriser les vidéos
  else if (file.mimetype.startsWith('video/')) {
    const allowedVideoTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/webm'];
    if (allowedVideoTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format vidéo non supporté! Utilisez MP4, MOV, AVI ou WEBM.'), false);
    }
  }
  // Rejeter les autres types
  else {
    cb(new Error('Seules les images et vidéos sont autorisées!'), false);
  }
};

// Configuration de Multer pour les images
const upload = multer({
  storage: imageStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max pour les images
  },
});

// Configuration de Multer pour l'upload multiple (images + vidéos)
const uploadMultiple = multer({
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max par fichier
    files: 15 // Maximum 15 fichiers au total
  },
}).fields([
  { 
    name: 'images', 
    maxCount: 10,
    storage: imageStorage // Utiliser le storage images pour les images
  },
  { 
    name: 'videos', 
    maxCount: 5,
    storage: videoStorage // Utiliser le storage vidéos pour les vidéos
  }
]);

// Middleware pour gérer les erreurs Multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Fichier trop volumineux'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Trop de fichiers uploadés'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Type de fichier non autorisé'
      });
    }
  }
  next(error);
};

export { upload, uploadMultiple, handleUploadError };