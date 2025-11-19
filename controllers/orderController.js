import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';

// @desc    Créer une nouvelle commande
// @route   POST /api/orders
// @access  Private (ou public pour les invités avec guestEmail)
const createOrder = async (req, res) => {
  try {
    
    const {
      items,
      shippingAddress,
      billingAddress,
      shippingMethod,
      couponCode,
      notes
    } = req.body;

    let subtotal = 0;
    const orderItems = [];

    // Vérifier le stock et décrémenter
    for (const item of items) {
      const product = await Product.findById(item.product);
      
      if (!product) {
        return res.status(404).json({ 
          message: `Produit ${item.product} non trouvé` 
        });
      }

      // Vérifier le stock
      if (product.trackQuantity && product.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Stock insuffisant pour ${product.name}. Disponible: ${product.stock}` 
        });
      }

      // Décrémenter le stock
      if (product.trackQuantity) {
        product.stock -= item.quantity;
        
        // Désactiver automatiquement si stock épuisé
        if (product.stock <= 0) {
          product.status = 'out_of_stock';
        }
        
        await product.save();
      }
    }
    // --- 1. Traitement des articles et vérification du stock ---
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Produit ${item.product} non trouvé` });
      }

      // Vérification du stock si le suivi est activé
      if (product.trackQuantity && product.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Stock insuffisant pour ${product.name}. Disponible : ${product.stock}`
        });
      }

      const itemPrice = item.variant?.price || product.price;
      const itemTotal = itemPrice * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: item.product,
        variant: item.variant,
        quantity: item.quantity,
        price: itemPrice
      });
    }

    // --- 2. Application du coupon de réduction ---
    let discount = 0;
    let coupon = null;

    if (couponCode) {
      // Recherche d'un coupon valide
      coupon = await Coupon.findOne({ 
        code: couponCode.toUpperCase(),
        isActive: true,
        validFrom: { $lte: new Date() },
        validUntil: { $gte: new Date() }
      });

      if (coupon) {
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
          return res.status(400).json({ message: 'Limite d\'utilisation du coupon dépassée' });
        }

        if (subtotal < coupon.minimumAmount) {
          return res.status(400).json({ 
            message: `Le montant minimum de la commande pour ce coupon est de ${coupon.minimumAmount}`
          });
        }

        if (coupon.type === 'percentage') {
          discount = (subtotal * coupon.value) / 100;
          // Limite la réduction si un maximum est défini
          if (coupon.maximumDiscount && discount > coupon.maximumDiscount) {
            discount = coupon.maximumDiscount;
          }
        } else {
          // Réduction fixe
          discount = coupon.value;
        }

        // Met à jour le nombre d'utilisations du coupon
        coupon.usedCount += 1;
        await coupon.save();
      } else {
        return res.status(400).json({ message: 'Code de coupon invalide ou expiré' });
      }
    }

    // --- 3. Calcul des frais et du total final ---
    // Calcul du coût d'expédition (simplifié)
    const shipping = calculateShippingCost(shippingMethod, shippingAddress);
    
    // Calcul de la taxe (Exemple à 8%)
    const tax = (subtotal - discount) * 0.08;

    const total = subtotal - discount + shipping + tax;

    // --- 4. Création de l'objet commande ---
    const order = new Order({
      user: req.user?._id || null, // ID de l'utilisateur ou null si invité
      guest: !req.user ? { // Informations de l'invité si non connecté
        email: req.body.guestEmail,
        firstName: shippingAddress.firstName,
        lastName: shippingAddress.lastName,
        phone: shippingAddress.phone
      } : undefined,
      items: orderItems,
      subtotal,
      shipping,
      // Arrondit la taxe et le total à deux décimales
      tax: Math.round(tax * 100) / 100, 
      total: Math.round(total * 100) / 100,
      discount,
      coupon: coupon?._id,
      shippingAddress,
      // Adresse de facturation par défaut égale à l'expédition
      billingAddress: billingAddress || shippingAddress, 
      shippingMethod,
      notes,
      // Paramètres par défaut pour le paiement à la livraison
      paymentMethod: 'livraison', 
      paymentStatus: 'en_attente'
    });

    const createdOrder = await order.save();

    // --- 5. Mise à jour du stock des produits ---
    for (const item of items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: -item.quantity } } // Décrémente la quantité en stock
      );
    }

    res.status(201).json(createdOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Obtenir les commandes de l'utilisateur connecté
// @route   GET /api/orders/my-orders
// @access  Private
const getMyOrders = async (req, res) => {
  try {
    // Cherche toutes les commandes de l'utilisateur actuel, peuple les produits et trie par date
    const orders = await Order.find({ user: req.user._id })
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir une commande par ID
// @route   GET /api/orders/:id
// @access  Private (pour le propriétaire ou l'administrateur)
const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .populate('items.product', 'name images')
      .populate('coupon', 'code type value');

    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    // Vérifie si l'utilisateur est le propriétaire de la commande ou un administrateur
    const isOwner = order.user && order.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Non autorisé à consulter cette commande' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mettre à jour le statut d'une commande
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
  try {
    const { status, paymentStatus, trackingNumber, carrier } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    // Met à jour les champs si fournis
    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (carrier) order.carrier = carrier;

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Obtenir toutes les commandes (pour l'administration)
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = async (req, res) => {
  try {
    // Gestion de la pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const orders = await Order.find()
      .populate('user', 'firstName lastName email') // Peuple les informations de l'utilisateur
      .sort({ createdAt: -1 }) // Trie de la plus récente à la plus ancienne
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments();

    res.json({
      success: true,
      count: orders.length,
      total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      data: orders
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Fonction d'assistance pour calculer le coût d'expédition (peut être étendu)
const calculateShippingCost = (method, address) => {
  const baseCosts = {
    'express_24h': 5000, // 5000 FCFA
    'standard_48h': 3000, // 3000 FCFA
    'point_relais': 2000  // 2000 FCFA
  };

  // Coût par défaut si la méthode n'est pas reconnue
  return baseCosts[method] || 3000;
};

// Exportation des contrôleurs
export {
  createOrder,
  getMyOrders,
  getOrder,
  updateOrderStatus,
  getOrders
};
