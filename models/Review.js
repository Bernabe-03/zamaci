import mongoose from 'mongoose';

const reviewSchema = mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: false
    },
    product: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Product', 
      required: true 
    },
    order: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Order', 
      required: false
    },
    rating: { 
      type: Number, 
      required: true, 
      min: 1, 
      max: 5 
    },
    title: { 
      type: String, 
      required: true,
      trim: true 
    },
    comment: { 
      type: String, 
      required: true,
      trim: true 
    },
    images: [String],
    verified: { 
      type: Boolean, 
      default: false 
    },
    helpful: { 
      type: Number, 
      default: 0, 
      min: 0 
    },
    likes: { 
      type: Number, 
      default: 0, 
      min: 0 
    },
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected'], 
      default: 'pending' 
    },
    // NOUVEAUX CHAMPS POUR LES INTERACTIONS
    helpfulUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    likedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    reports: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reason: {
        type: String,
        required: true
      },
      reportedAt: {
        type: Date,
        default: Date.now
      }
    }],
    // CHAMPS POUR LES INVITÉS
    guestName: {
      type: String,
      trim: true,
      required: function() {
        return !this.user; // Requis seulement pour les invités
      }
    },
    guestEmail: {
      type: String,
      trim: true,
      required: false // CORRECTION : email optionnel
    }
  },
  { 
    timestamps: true 
  }
);

// Index modifié pour les utilisateurs connectés uniquement
reviewSchema.index({ product: 1, user: 1 }, { 
  unique: true,
  sparse: true,
  partialFilterExpression: { user: { $type: 'objectId' } } 
});

// Index pour les invités avec email - CORRECTION : unique seulement si email fourni
reviewSchema.index({ product: 1, guestEmail: 1 }, { 
  unique: true,
  sparse: true,
  partialFilterExpression: { 
    guestEmail: { $exists: true, $ne: null },
    user: { $exists: false }
  }
});

reviewSchema.index({ product: 1, rating: 1 });
reviewSchema.index({ product: 1, status: 1 });
reviewSchema.index({ helpful: -1 });
reviewSchema.index({ likes: -1 });

const Review = mongoose.model('Review', reviewSchema);

export default Review;