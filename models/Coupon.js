import mongoose from 'mongoose';

const couponSchema = mongoose.Schema(
  {
    // Code unique du coupon (ex: ÉTÉ20, SOLDESFIXES)
    code: { 
      type: String, 
      required: true, 
      unique: true, 
      uppercase: true,
      trim: true
    },
    // Description interne du coupon (ex: 20% sur les perruques lace front)
    description: String,
    // Type de réduction : pourcentage ou montant fixe
    type: { 
      type: String, 
      enum: ['percentage', 'fixed'], 
      required: true 
    },
    // Valeur de la réduction (ex: 20 pour 20%, ou 10 pour 10€)
    value: { 
      type: Number, 
      required: true, 
      min: 0 
    },
    // Montant minimum d'achat requis pour utiliser le coupon
    minimumAmount: { 
      type: Number, 
      default: 0, 
      min: 0 
    },
    // Montant maximum de la réduction appliquée (pertinent pour les pourcentages)
    maximumDiscount: Number,
    // Nombre maximum de fois que ce coupon peut être utilisé au total
    usageLimit: { 
      type: Number, 
      default: 1, 
      min: 0 
    },
    // Compteur d'utilisation actuel
    usedCount: { 
      type: Number, 
      default: 0, 
      min: 0 
    },
    // Date à partir de laquelle le coupon est valide
    validFrom: { 
      type: Date, 
      required: true 
    },
    // Date d'expiration du coupon
    validUntil: { 
      type: Date, 
      required: true 
    },
    // Categories auxquelles le coupon s'applique
    categories: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Category' 
    }],
    // Produits spécifiques auxquels le coupon s'applique
    products: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Product' 
    }],
    // Utilisateurs spécifiques pouvant utiliser ce coupon (pour les codes personnels)
    users: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    }],
    // Indique si le coupon est à usage unique par client (indépendamment de usageLimit)
    oneTimeUse: { 
      type: Boolean, 
      default: true 
    },
    // État d'activation du coupon
    isActive: { 
      type: Boolean, 
      default: true 
    }
  },
  { 
    // Ajoute les champs createdAt et updatedAt
    timestamps: true 
  }
);

// Index composite pour la recherche rapide par code et statut actif
couponSchema.index({ code: 1, isActive: 1 });

const Coupon = mongoose.model('Coupon', couponSchema);

export default Coupon;
