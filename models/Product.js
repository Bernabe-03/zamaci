
import mongoose from 'mongoose';

const productSchema = mongoose.Schema(
  {
    // Nom du produit (requis)
    name: { 
      type: String, 
      required: true,
      trim: true 
    },
    // Description détaillée du produit (requis)
    description: { 
      type: String, 
      required: true 
    },
    // Catégorie principale (référence au modèle Category, requis)
    category: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Category', 
      required: true 
    },
    // Sous-catégorie ou information de groupement (texte libre)
    subCategory: { 
      type: String 
    },
    // Marque du produit (requis)
    brand: { 
      type: String, 
      required: true,
      trim: true 
    },
    // Prix de vente (requis)
    price: { 
      type: Number, 
      required: true, 
      min: 0 
    },
    // Prix de comparaison (prix barré, pour afficher une réduction)
    comparePrice: { 
      type: Number, 
      min: 0 
    },
    // Coût du produit (usage interne)
    cost: { 
      type: Number 
    },
    // Stock Keeping Unit (référence unique du produit parent)
    sku: { 
      type: String, 
      unique: true,
      trim: true 
    },
    // Mots-clés pour la recherche
    tags: [String],
    // Type principal (clé pour la structure du site)
    type: { 
      type: String, 
      enum: ['perruque', 'meche', 'extension', 'accessoire'],
      required: true 
    },
    // Attributs principaux du produit
    attributes: {
      material: { 
        type: String, 
        enum: ['synthétique', 'naturel'], 
        required: true 
      },
      texture: { 
        type: String, 
        enum: ['lisse', 'bouclé', 'ondulé', 'profond', 'kinky', 'yaki'] 
      },
      length: { 
        type: String 
      },
      density: { 
        type: String 
      },
      color: { 
        type: String 
      },
      origin: { 
        type: String // ex: brésilien, malaisien
      }
    },
    // Variantes (ex: taille, couleur, avec leur propre prix/stock)
    variants: [{
      size: String,
      color: String,
      price: { type: Number, min: 0 },
      stock: { type: Number, min: 0 },
      sku: String // SKU de la variante
    }],
    // Liste des images du produit
    images: [{
      url: String,
      alt: String,
      public_id: String,
      isPrimary: { type: Boolean, default: false },
      type: { type: String, default: 'image' }
    }],
    videos: [{
      url: String,
      alt: String,
      public_id: String,
      type: { type: String, default: 'video' },
      thumbnail: String // Optionnel: miniature générée par Cloudinary
    }],
    // Stock total (si pas de variantes)
trackQuantity: {
  type: Boolean,
  default: true
},
favoriteCount: {
  type: Number,
  default: 0,
  min: 0
},
stock: {
  type: Number,
  default: 0
},
status: {
  type: String,
  enum: ['active', 'inactive', 'out_of_stock'],
  default: 'active'
},
    // Indique si la quantité doit être suivie
    trackQuantity: { 
      type: Boolean, 
      default: true 
    },
    // Autoriser les commandes en attente (backorder)
    allowBackorder: { 
      type: Boolean, 
      default: false 
    },
    // Marquer comme produit mis en avant (sur la page d'accueil)
    featured: { 
      type: Boolean, 
      default: false 
    },
    // Marquer comme nouvelle arrivée
    newArrival: { 
      type: Boolean, 
      default: false 
    },
    // Marquer comme en solde/promotion
    onSale: { 
      type: Boolean, 
      default: false 
    },
    // Données d'optimisation pour les moteurs de recherche
    seo: {
      title: String,
      description: String,
      slug: { 
        type: String, 
        unique: true,
        sparse: true,
        trim: true 
      }
    },
    // Statut de publication
    status: { 
      type: String, 
      enum: ['active', 'draft', 'archived'], 
      default: 'active' 
    },
    // Note moyenne des avis (calculée)
    rating: { 
      type: Number, 
      default: 0, 
      min: 0, 
      max: 5 
    },
    // Nombre total d'avis (calculé)
    reviewCount: { 
      type: Number, 
      default: 0, 
      min: 0 
    }
  },
  { 
    timestamps: true,
    // Permet à Mongoose de générer le champ virtuel 'reviews'
    toJSON: { virtuals: true }, 
    toObject: { virtuals: true } 
  }
);

// 🛠️ RÉFÉRENCE VIRTUELLE (Virtual Populate)
// Crée un champ virtuel 'reviews' qui ne sera pas stocké en base de données
// mais sera rempli par les documents de la collection 'Review' qui 
// référencent l'ID de ce produit.
productSchema.virtual('reviews', {
  ref: 'Review',         
  localField: '_id',     
  foreignField: 'product'
});

productSchema.pre('save', function(next) {
  if (this.trackQuantity && this.stock <= 0) {
    this.status = 'out_of_stock';
  } else if (this.status === 'out_of_stock' && this.stock > 0) {
    this.status = 'active';
  }
  next();
});
// Index de recherche textuelle pour le nom, la description et les tags
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
// Index pour les requêtes de filtrage courantes
productSchema.index({ category: 1, type: 1, 'attributes.material': 1 });

const Product = mongoose.model('Product', productSchema);

export default Product;