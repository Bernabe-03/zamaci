import mongoose from 'mongoose';

// Schéma des articles commandés
const itemSchema = new mongoose.Schema({
  // Référence au produit (pour les détails actuels)
  product: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
  },
  // Détails de la variante commandée (taille, couleur, etc.)
  variant: {
    name: String, // ex: Nom de la variante si elle existe
    size: String,
    color: String,
    // Le prix de la variante au moment de l'achat
    price: Number
  },
  // Quantité commandée
  quantity: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  // Prix unitaire du produit au moment de l'achat (pour l'historique)
  price: { 
    type: Number, 
    required: true 
  }
});

const orderSchema = mongoose.Schema(
  {
    // Numéro de commande unique et généré
    orderNumber: { 
      type: String, 
      unique: true, 
      required: true,
      immutable: true 
    },
    // Référence à l'utilisateur enregistré
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    // Informations du client invité si non enregistré
    guest: {
      email: String,
      firstName: String,
      lastName: String,
      phone: String
    },
    // Liste des articles commandés
    items: [itemSchema],
    // Sous-total avant frais de port et taxes
    subtotal: { 
      type: Number, 
      required: true 
    },
    // Frais de livraison
    shipping: { 
      type: Number, 
      required: true 
    },
    // Montant de la taxe
    tax: { 
      type: Number, 
      required: true 
    },
    // Total final de la commande
    total: { 
      type: Number, 
      required: true 
    },
    // Adresse de livraison
    shippingAddress: {
      firstName: String,
      lastName: String,
      street: String,
      city: String,
      state: String,
      zipCode: String,
      phone: String,
      instructions: String // Instructions de livraison
    },
    // Adresse de facturation (si différente)
    billingAddress: {
      firstName: String,
      lastName: String,
      street: String,
      city: String,
      state: String,
      zipCode: String
    },
    // Méthode de paiement utilisée
    paymentMethod: { 
      type: String, 
      enum: ['livraison', 'carte_bancaire', 'paypal'], 
      default: 'livraison' 
    },
    // Statut du paiement
    paymentStatus: { 
      type: String, 
      enum: ['en_attente', 'paye', 'echec', 'annule'], 
      default: 'en_attente' 
    },
    // Statut de la commande dans le cycle de vie
    status: { 
      type: String, 
      enum: ['en_attente', 'confirme', 'en_preparation', 'expedie', 'livre', 'retourne', 'annule'],
      default: 'en_attente' 
    },
    // Méthode de livraison choisie (ex: Standard, Express)
    shippingMethod: { 
      type: String, 
      required: true 
    },
    // Numéro de suivi du colis
    trackingNumber: String,
    // Transporteur (ex: DHL, Colissimo)
    carrier: String,
    // Notes ou commentaires de l'administrateur
    notes: String,
    // Coupon de réduction appliqué
    coupon: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Coupon' 
    },
    // Montant de la réduction appliquée
    discount: { 
      type: Number, 
      default: 0 
    }
  },
  { 
    // Ajoute les champs createdAt et updatedAt
    timestamps: true 
  }
);

// Middleware de pré-sauvegarde pour générer le numéro de commande
orderSchema.pre('save', async function (next) {
  if (this.isNew) {
    const date = new Date();
    // Format: NONO-AAAA(MM)JJ-RANDOM9CHARS
    this.orderNumber = `NONO-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
