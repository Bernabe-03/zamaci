import express from 'express';
const router = express.Router();
import cloudinary from '../config/cloudinary.js';
import { protect, admin } from '../middleware/auth.js';
import { upload, uploadMultiple, handleUploadError } from '../middleware/upload.js';
import cloudinaryDebug from '../middleware/cloudinaryDebug.js';


// @desc    Upload d'images de produit (admin)
// @route   POST /api/uploads/product
// @access  Private/Admin
router.post('/product', protect, admin, upload.array('images', 10), handleUploadError, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Veuillez uploader des fichiers image' 
      });
    }

    const uploadedImages = req.files.map(file => ({
      url: file.path,
      alt: file.originalname,
      public_id: file.filename,
      isPrimary: false,
      type: 'image'
    }));

    // Définir la première image comme principale
    if (uploadedImages.length > 0) {
      uploadedImages[0].isPrimary = true;
    }

    res.json({
      success: true,
      message: 'Images de produit uploadées avec succès',
      count: uploadedImages.length,
      data: uploadedImages
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Échec de l\'upload des images',
      error: error.message 
    });
  }
});

// @desc    Upload de plusieurs fichiers (images + vidéos) (admin)
// @route   POST /api/uploads/multiple
// @access  Private/Admin
router.post('/multiple', protect, admin, uploadMultiple, handleUploadError, async (req, res) => {
  try {
    const files = req.files;
    
    if ((!files.images || files.images.length === 0) && (!files.videos || files.videos.length === 0)) {
      return res.status(400).json({ 
        success: false,
        message: 'Veuillez uploader des fichiers image ou vidéo' 
      });
    }

    const uploadedMedia = [];

    // Traiter les images
    if (files.images) {
      files.images.forEach(file => {
        uploadedMedia.push({
          type: 'image',
          url: file.path,
          alt: file.originalname,
          public_id: file.filename,
          format: file.format,
          bytes: file.size,
          isPrimary: uploadedMedia.length === 0
        });
      });
    }

    // Traiter les vidéos
    if (files.videos) {
      files.videos.forEach(file => {
        // Générer une URL de miniature pour la vidéo
        const videoUrl = file.path;
        const thumbnailUrl = videoUrl.replace(/\.(mp4|mov|avi|webm)$/, '.jpg');
        
        uploadedMedia.push({
          type: 'video',
          url: videoUrl,
          alt: file.originalname,
          public_id: file.filename,
          format: file.format,
          bytes: file.size,
          thumbnail: thumbnailUrl,
          duration: file.duration
        });
      });
    }

    res.json({
      success: true,
      message: 'Médias uploadés avec succès',
      count: uploadedMedia.length,
      data: uploadedMedia
    });
  } catch (error) {
    console.error('Upload multiple error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Échec de l\'upload des médias',
      error: error.message 
    });
  }
});


// Appliquez le debug à toutes les routes d'upload
router.use(cloudinaryDebug);
// @desc    Supprimer un fichier de Cloudinary (admin)
// @route   DELETE /api/uploads/image
// @access  Private/Admin
router.delete('/image', protect, admin, async (req, res) => {
  try {
    const { public_id, resource_type = 'image' } = req.body;

    if (!public_id) {
      return res.status(400).json({ 
        success: false,
        message: 'L\'ID public est requis' 
      });
    }

    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: resource_type 
    });

    if (result.result === 'ok') {
      res.json({
        success: true,
        message: 'Fichier supprimé avec succès',
        result
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Échec de la suppression du fichier',
        result
      });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Échec de la suppression',
      error: error.message 
    });
  }
});

// @desc    Upload d'une seule image (admin)
// @route   POST /api/uploads/image
// @access  Private/Admin
router.post('/image', protect, admin, upload.single('image'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'Veuillez uploader un fichier image' 
      });
    }

    res.json({
      success: true,
      message: 'Image uploadée avec succès',
      data: {
        url: req.file.path,
        filename: req.file.filename,
        public_id: req.file.filename,
        format: req.file.format,
        bytes: req.file.size
      }
    });
  } catch (error) {
    console.error('Single upload error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Échec de l\'upload',
      error: error.message 
    });
  }
});

export default router;