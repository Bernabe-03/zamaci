import express from 'express';
const router = express.Router();

import { 
  getProductReviews,
  createReview,
  uploadReviewImage,
  updateReview,
  deleteReview,
  markHelpful,
  markLike,
  reportReview,
  getUserInteractions,
  getReviews,
  updateReviewStatus
} from '../controllers/reviewController.js';

import { protect, admin } from '../middleware/auth.js';
import { uploadSingleReviewImage, handleReviewUploadError } from '../middleware/uploadReviews.js';

// Récupérer tous les avis d'un produit spécifique
router.route('/product/:productId')
  .get(getProductReviews);

// Créer un avis (utilisateur connecté ou invité)
router.route('/')
  .post(createReview);

// Upload d'image pour avis - CORRECTION IMPORTANTE
router.post('/upload-image', 
  (req, res, next) => {
    console.log('Upload route hit, processing file...');
    next();
  },
  uploadSingleReviewImage,
  (err, req, res, next) => {
    if (err) {
      console.log('Multer error:', err);
      return handleReviewUploadError(err, req, res, next);
    }
    next();
  },
  uploadReviewImage
);

// Récupérer les interactions de l'utilisateur
router.route('/user/interactions')
  .get(protect, getUserInteractions);

// Mettre à jour ou supprimer un avis spécifique (utilisateur connecté)
router.route('/:id')
  .put(protect, updateReview)
  .delete(protect, deleteReview);

// Interactions avec les avis
router.route('/:id/helpful')
  .post(protect, markHelpful);

router.route('/:id/like')
  .post(protect, markLike);

router.route('/:id/report')
  .post(protect, reportReview);

// Routes admin
router.route('/admin/all')
  .get(protect, admin, getReviews);

router.route('/admin/:id/status')
  .patch(protect, admin, updateReviewStatus);
  
export default router;