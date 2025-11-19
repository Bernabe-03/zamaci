import { Types } from 'mongoose';
import Review from '../models/Review.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';

// @desc    Obtenir les avis pour un produit
// @route   GET /api/reviews/product/:productId
// @access  Public
const getProductReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { sort = 'newest' } = req.query;

    // Définition des options de tri
    let sortOption = {};
    switch (sort) {
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'highest':
        sortOption = { rating: -1 };
        break;
      case 'lowest':
        sortOption = { rating: 1 };
        break;
      case 'most_helpful':
        sortOption = { helpful: -1 };
        break;
      case 'most_liked':
        sortOption = { likes: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    // Récupération des avis approuvés pour le produit
    const reviews = await Review.find({ 
      product: req.params.productId,
      status: 'approved'
    })
      .populate('user', 'firstName lastName')
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    // Calcul du nombre total d'avis approuvés pour la pagination
    const total = await Review.countDocuments({ 
      product: req.params.productId,
      status: 'approved'
    });

    // Calcul des statistiques d'évaluation
    const ratingStats = await Review.aggregate([
      { 
        $match: { 
          product: new Types.ObjectId(req.params.productId), 
          status: 'approved' 
        } 
      },
      {
        $group: {
          _id: '$product',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      }
    ]);

    const stats = ratingStats[0] || {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: []
    };

    // Calcul de la distribution des notes
    const distribution = [0, 0, 0, 0, 0];
    stats.ratingDistribution.forEach(rating => {
      if (rating >= 1 && rating <= 5) { 
        distribution[5 - rating]++; 
      }
    });

    res.json({
      success: true,
      count: reviews.length,
      total: stats.totalReviews,
      pagination: {
        page,
        limit,
        pages: Math.ceil(stats.totalReviews / limit)
      },
      statistics: {
        averageRating: Math.round(stats.averageRating * 10) / 10 || 0,
        totalReviews: stats.totalReviews,
        distribution 
      },
      data: reviews
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Créer un avis - CORRIGÉ pour les invités (email optionnel)
// @route   POST /api/reviews
// @access  Private/Public
const createReview = async (req, res) => {
  try {
    const { productId, rating, title, comment, images, userName, userEmail } = req.body;

    // Validation de base
    if (!productId || !rating || !title || !comment) {
      return res.status(400).json({ 
        success: false,
        message: 'Le produit, la note, le titre et le commentaire sont obligatoires' 
      });
    }

    // Validation de la note
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false,
        message: 'La note doit être entre 1 et 5' 
      });
    }

    // Vérifier si le produit existe
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: 'Produit non trouvé' 
      });
    }

    // Gestion utilisateur connecté vs invité
    let user = null;
    let verified = false;
    let guestName = null;
    let guestEmail = null;
    
    if (req.user) {
      // Utilisateur connecté
      user = req.user._id;
      
      // Vérifier si l'utilisateur a acheté le produit
      const order = await Order.findOne({
        user: user,
        'items.product': productId,
        status: 'livre'
      });
      verified = !!order;

      // Vérifier s'il existe déjà un avis pour ce produit/utilisateur connecté
      const existingReview = await Review.findOne({
        user: user,
        product: productId
      });

      if (existingReview) {
        return res.status(400).json({ 
          success: false,
          message: 'Vous avez déjà évalué ce produit' 
        });
      }
    } else {
      // Utilisateur invité - CORRECTION : email optionnel
      if (!userName) {
        return res.status(400).json({ 
          success: false,
          message: 'Le nom est obligatoire pour les invités' 
        });
      }

      // Validation email seulement si fourni
      if (userEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userEmail)) {
          return res.status(400).json({ 
            success: false,
            message: 'Format d\'email invalide' 
          });
        }

        // Vérifier s'il existe déjà un avis pour ce produit/email invité
        const existingGuestReview = await Review.findOne({
          product: productId,
          guestEmail: userEmail
        });

        if (existingGuestReview) {
          return res.status(400).json({ 
            success: false,
            message: 'Un avis avec cet email existe déjà pour ce produit' 
          });
        }
      }

      guestName = userName;
      guestEmail = userEmail || null; // Email peut être null
    }

    // Création de l'avis
    const review = new Review({
      user: user || undefined,
      product: productId,
      rating,
      title,
      comment,
      images: images || [],
      verified,
      guestName,
      guestEmail,
      helpful: 0,
      likes: 0,
      helpfulUsers: [],
      likedUsers: [],
      status: 'approved' // Auto-approbation
    });

    const createdReview = await review.save();

    // Mise à jour de la note moyenne du produit
    await updateProductRating(productId);

    // Peupler les informations pour la réponse
    const populatedReview = await Review.findById(createdReview._id)
      .populate('user', 'firstName lastName')
      .populate('product', 'name');

    res.status(201).json({
      success: true,
      data: populatedReview,
      message: 'Avis créé avec succès'
    });

  } catch (error) {
    console.error('Erreur création avis:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: 'Vous avez déjà évalué ce produit' 
      });
    }
    
    res.status(400).json({ 
      success: false,
      message: error.message || 'Erreur lors de la création de l\'avis' 
    });
  }
};
// @desc    Marquer un avis comme utile
// @route   POST /api/reviews/:id/helpful
// @access  Private
const markHelpful = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Avis non trouvé' });
    }

    // Vérifier si l'utilisateur a déjà marqué cet avis comme utile
    const userId = req.user._id.toString();
    const hasMarkedHelpful = review.helpfulUsers.includes(userId);

    if (hasMarkedHelpful) {
      // Retirer le marquage utile
      review.helpfulUsers = review.helpfulUsers.filter(id => id.toString() !== userId);
      review.helpful = Math.max(0, review.helpful - 1);
      await review.save();

      return res.json({ 
        message: 'Marquage utile retiré',
        helpful: review.helpful,
        userAction: 'removed'
      });
    } else {
      // Ajouter le marquage utile
      review.helpfulUsers.push(userId);
      review.helpful += 1;
      await review.save();

      return res.json({ 
        message: 'Avis marqué comme utile',
        helpful: review.helpful,
        userAction: 'added'
      });
    }
  } catch (error) {
    console.error('Erreur marquage utile:', error);
    res.status(400).json({ message: error.message });
  }
};
// @desc    Aimer un avis
// @route   POST /api/reviews/:id/like
// @access  Private
const markLike = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Avis non trouvé' });
    }

    // Vérifier si l'utilisateur a déjà aimé cet avis
    const userId = req.user._id.toString();
    const hasLiked = review.likedUsers.includes(userId);

    if (hasLiked) {
      // Retirer le like
      review.likedUsers = review.likedUsers.filter(id => id.toString() !== userId);
      review.likes = Math.max(0, review.likes - 1);
      await review.save();

      return res.json({ 
        message: 'Like retiré',
        likes: review.likes,
        userAction: 'removed'
      });
    } else {
      // Ajouter le like
      review.likedUsers.push(userId);
      review.likes += 1;
      await review.save();

      return res.json({ 
        message: 'Avis aimé avec succès',
        likes: review.likes,
        userAction: 'added'
      });
    }
  } catch (error) {
    console.error('Erreur like avis:', error);
    res.status(400).json({ message: error.message });
  }
};

// @desc    Signaler un avis
// @route   POST /api/reviews/:id/report
// @access  Private
const reportReview = async (req, res) => {
  try {
    const { reason } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Avis non trouvé' });
    }

    if (!reason) {
      return res.status(400).json({ message: 'La raison du signalement est obligatoire' });
    }

    // Ajouter le signalement
    review.reports = review.reports || [];
    review.reports.push({
      user: req.user._id,
      reason: reason,
      reportedAt: new Date()
    });

    // Si l'avis a plus de 3 signalements, le passer en statut "pending" pour révision
    if (review.reports.length >= 3) {
      review.status = 'pending';
    }

    await review.save();

    res.json({ 
      message: 'Avis signalé avec succès',
      reportsCount: review.reports.length
    });
  } catch (error) {
    console.error('Erreur signalement avis:', error);
    res.status(400).json({ message: error.message });
  }
};
// @desc    Obtenir les statistiques des interactions utilisateur
// @route   GET /api/reviews/user/interactions
// @access  Private
const getUserInteractions = async (req, res) => {
  try {
    const userId = req.user._id;

    // Trouver tous les avis que l'utilisateur a marqués comme utiles ou aimés
    const helpfulReviews = await Review.find({
      helpfulUsers: userId
    }).select('_id');

    const likedReviews = await Review.find({
      likedUsers: userId
    }).select('_id');

    res.json({
      helpfulReviews: helpfulReviews.map(review => review._id.toString()),
      likedReviews: likedReviews.map(review => review._id.toString())
    });
  } catch (error) {
    console.error('Erreur récupération interactions:', error);
    res.status(400).json({ message: error.message });
  }
};
// @desc    Mettre à jour un avis
// @route   PUT /api/reviews/:id
// @access  Private
const updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Avis non trouvé' });
    }

    // Vérifie si l'utilisateur est le propriétaire de l'avis
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'Non autorisé à mettre à jour cet avis' 
      });
    }

    // Met à jour les champs autorisés
    const { rating, title, comment, images } = req.body;
    
    if (rating) review.rating = rating;
    if (title) review.title = title;
    if (comment) review.comment = comment;
    if (images) review.images = images;

    // Un avis mis à jour doit repasser par l'approbation
    review.status = 'pending'; 

    const updatedReview = await review.save();

    // Recalcule la note moyenne du produit
    await updateProductRating(review.product);

    res.json(updatedReview);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
// @desc    Supprimer un avis
// @route   DELETE /api/reviews/:id
// @access  Private
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Avis non trouvé' });
    }

    // Vérifie si l'utilisateur est le propriétaire ou un administrateur
    const isOwner = review.user && review.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ 
        message: 'Non autorisé à supprimer cet avis' 
      });
    }

    const productId = review.product;
    await Review.deleteOne({ _id: req.params.id });

    // Recalcule la note moyenne du produit après suppression
    await updateProductRating(productId);

    res.json({ message: 'Avis supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir tous les avis (Admin)
// @route   GET /api/reviews
// @access  Private/Admin
const getReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { status } = req.query;

    let query = {};
    if (status) {
      query.status = status;
    }

    const reviews = await Review.find(query)
      .populate('user', 'firstName lastName email')
      .populate('product', 'name images')
      .populate('order', 'orderNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments(query);

    res.json({
      success: true,
      count: reviews.length,
      total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      data: reviews
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Upload une image pour un avis - CORRIGÉ
// @route   POST /api/reviews/upload-image
// @access  Public
const uploadReviewImage = async (req, res) => {
  try {
    console.log('Upload review image request received - File:', req.file);
    console.log('Request body:', req.body);

    if (!req.file) {
      console.log('No file received in uploadReviewImage');
      return res.status(400).json({ 
        success: false,
        message: 'Aucune image téléchargée' 
      });
    }

    // Cloudinary fournit l'URL dans `path`
    const imageUrl = req.file.path;
    console.log('Image uploaded successfully to Cloudinary:', imageUrl);

    res.json({
      success: true,
      imageUrl: imageUrl,
      message: 'Image téléchargée avec succès'
    });

  } catch (error) {
    console.error('Erreur upload image avis:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du téléchargement de l\'image: ' + error.message
    });
  }
};
// @desc    Mettre à jour le statut d'un avis (Admin)
// @route   PATCH /api/reviews/:id/status
// @access  Private/Admin
const updateReviewStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Avis non trouvé' });
    }

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }

    review.status = status;
    const updatedReview = await review.save();

    // Si l'avis est approuvé, met à jour la note moyenne du produit
    if (status === 'approved') {
      await updateProductRating(review.product);
    }

    res.json(updatedReview);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
// Fonction d'assistance pour mettre à jour la note moyenne du produit
const updateProductRating = async (productId) => {
  try {
    const ratingStats = await Review.aggregate([
      { 
        $match: { 
          product: new Types.ObjectId(productId), 
          status: 'approved'
        } 
      },
      {
        $group: {
          _id: '$product',
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 }
        }
      }
    ]);

    if (ratingStats.length > 0) {
      await Product.findByIdAndUpdate(productId, {
        $set: {
          'rating': Math.round(ratingStats[0].averageRating * 10) / 10,
          'reviewCount': ratingStats[0].reviewCount
        }
      });
    } else {
      await Product.findByIdAndUpdate(productId, {
        $set: {
          'rating': 0,
          'reviewCount': 0
        }
      });
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la note du produit :', error);
  }
};
// Exportation des contrôleurs
export {
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
};