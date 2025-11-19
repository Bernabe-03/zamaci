
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import APIFeatures from '../utils/apiFeatures.js';

// @desc    Obtenir tous les produits - VERSION CORRIGÉE
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
    try {
      console.log('🔄 getProducts appelé avec query:', req.query);
  
      // 1. Initialiser le filtre de base pour MongoDB
      // On utilise un tableau de clauses qui sera combiné par $and
      const filterClauses = [{ status: 'active' }];
      
      // 2. Appliquer les filtres de recherche (logique OR)
      if (req.query.search) {
        // Créer une clause $or pour la recherche textuelle
        const searchClause = {
          $or: [
            { name: { $regex: req.query.search, $options: 'i' } },
            { description: { $regex: req.query.search, $options: 'i' } },
            { brand: { $regex: req.query.search, $options: 'i' } }
          ]
        };
        filterClauses.push(searchClause); // Ajouter la clause $or au tableau de filtres
      }
      
      // 3. Appliquer les autres filtres (logique AND)
      if (req.query.category) {
        filterClauses.push({ category: req.query.category });
      }
  
      if (req.query.type) {
        filterClauses.push({ type: req.query.type });
      }
  
      if (req.query.material) {
        filterClauses.push({ 'attributes.material': req.query.material });
      }
      
      // Filtre prix
      if (req.query.priceMin || req.query.priceMax) {
        const priceClause = {};
        if (req.query.priceMin) priceClause.$gte = parseFloat(req.query.priceMin);
        if (req.query.priceMax) priceClause.$lte = parseFloat(req.query.priceMax);
        filterClauses.push({ price: priceClause });
      }
  
      // CORRECTION CRUCIALE : Combiner toutes les clauses avec $and
      // Si filterClauses contient plus d'un élément (status: 'active' + 1 ou plusieurs filtres)
      const finalQuery = filterClauses.length > 1 
        ? { $and: filterClauses } 
        : filterClauses[0]; // Si seul 'status: active' est présent
  
      // Pagination
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 12;
      const skip = (page - 1) * limit;
  
      // Tri (le reste du tri est bon)
      let sortOption = { createdAt: -1 };
      // ... votre logique de tri existante ...
      if (req.query.sort) {
        switch (req.query.sort) {
          case 'price_asc':
            sortOption = { price: 1 };
            break;
          case 'price_desc':
            sortOption = { price: -1 };
            break;
          case 'newest':
            sortOption = { createdAt: -1 };
            break;
          case 'popular':
            sortOption = { 'rating': -1 };
            break;
        }
      }
  
  
      // Exécuter la requête
      let products = [];
      let total = 0;
  
      try {
        // Compter le total avec la requête finale
        total = await Product.countDocuments(finalQuery);
  
        // Obtenir les produits avec la requête finale
        products = await Product.find(finalQuery)
          .populate('category', 'name')
          // Début de la modification: Filtrer les avis par statut 'approved'
          .populate({
            path: 'reviews',
            match: { status: 'approved' }, // Seulement les avis approuvés
            select: 'rating comment',
            options: { 
                limit: 5,
                sort: { createdAt: -1 } // Trier les 5 derniers avis
            }
          })
          // Fin de la modification
          .sort(sortOption)
          .skip(skip)
          .limit(limit)
          .lean();
  
      } catch (dbError) {
        console.error('❌ Erreur base de données:', dbError);
        // Si c'est une erreur de base de données, la remonter avec 500
        return res.status(500).json({
          success: false,
          message: 'Erreur de base de données lors de la recherche',
        });
      }
  
      console.log(`✅ ${products.length} produits trouvés sur ${total} total`);
  
      // Structure de réponse cohérente
      res.json({
        success: true,
        data: products,
        count: products.length,
        total,
        pagination: {
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      });
  
    } catch (error) {
      console.error('❌ Erreur getProducts:', error);
      
      // Gérer les erreurs non-DB potentielles
      res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne lors du chargement des produits',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
};
// @desc    Obtenir un seul produit
// @route   GET /api/products/:id
// @access  Public
const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔄 getProduct appelé pour:', id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID produit requis'
      });
    }

    const product = await Product.findById(id)
      .populate('category')
      // Début de la modification: Filtrer les avis par statut 'approved'
      .populate({
        path: 'reviews',
        match: { status: 'approved' }, // Seulement les avis approuvés
        populate: { path: 'user', select: 'firstName lastName' }
      })
      // Fin de la modification
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    console.log('✅ Produit trouvé:', product.name);
    res.json(product);

  } catch (error) {
    console.error('❌ Erreur getProduct:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID produit invalide'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors du chargement du produit',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};
// @desc    Créer un produit
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
  try {
    console.log('📦 Début création produit...');
    
    // Valider les données requises
    const requiredFields = ['name', 'description', 'category', 'brand', 'price'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: `Champs manquants: ${missingFields.join(', ')}` 
      });
    }

    const productData = {
      ...req.body,
      // S'assurer que les nombres sont bien formatés
      price: parseFloat(req.body.price) || 0,
      comparePrice: req.body.comparePrice ? parseFloat(req.body.comparePrice) : undefined,
      stock: parseInt(req.body.stock) || 0,
      // S'assurer que seo est un objet
      seo: req.body.seo || {},
      // S'assurer que les images ont le bon format
      images: Array.isArray(req.body.images) ? req.body.images.map(img => ({
        url: img.url,
        alt: img.alt || `Image produit`,
        public_id: img.public_id,
        isPrimary: img.isPrimary || false
      })) : [],
      // S'assurer que les vidéos ont le bon format
      videos: Array.isArray(req.body.videos) ? req.body.videos.map(video => ({
        url: video.url,
        alt: video.alt || `Vidéo produit`,
        public_id: video.public_id,
        thumbnail: video.thumbnail
      })) : [],
      // S'assurer que les variants ont le bon format
      variants: Array.isArray(req.body.variants) ? req.body.variants.map(variant => ({
        size: variant.size || '',
        color: variant.color || '',
        price: parseFloat(variant.price) || parseFloat(req.body.price) || 0,
        stock: parseInt(variant.stock) || 0,
        sku: variant.sku || `VAR-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      })) : []
    };

    console.log('✅ Données validées, création du produit...');

    const product = new Product(productData);
    
    // Génère un SKU si non fourni
    if (!product.sku) {
      product.sku = `NONO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // GÉNÉRER UN SLUG UNIQUE
    if (!product.seo) {
      product.seo = {};
    }
    
    // Générer un slug unique avec timestamp et random
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    product.seo.slug = `${product.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')}-${timestamp}-${random}`;

    console.log('💾 Sauvegarde en base de données...');
    console.log('Generated slug:', product.seo.slug);
    
    const createdProduct = await product.save();
    
    console.log('✅ Produit créé avec ID:', createdProduct._id);
    
    res.status(201).json({
      success: true,
      message: 'Produit créé avec succès',
      data: createdProduct
    });
    
  } catch (error) {
    console.error('❌ Erreur création produit:', error);
    
    // Gestion spécifique des erreurs MongoDB
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors
      });
    }
    
    if (error.code === 11000) {
      // Erreur de clé en double - régénérer le slug et réessayer
      if (error.keyValue && error.keyValue['seo.slug']) {
        return res.status(400).json({
          success: false,
          message: 'Erreur de slug en double. Veuillez réessayer.',
          error: 'Duplicate slug'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Un produit avec ce SKU ou slug existe déjà'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur lors de la création du produit',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// @desc    Mettre à jour un produit
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
  try {
    console.log('🔄 Mise à jour produit:', req.params.id);
    
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: 'Produit non trouvé' 
      });
    }

    // Préparer les données de mise à jour
    const updateData = { ...req.body };
    
    // Gérer la mise à jour du slug si le nom change
    if (req.body.name && req.body.name !== product.name) {
      if (!updateData.seo) updateData.seo = {};
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 9);
      updateData.seo.slug = `${req.body.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')}-${timestamp}-${random}`;
    }

    // Met à jour le produit avec les nouvelles données
    Object.assign(product, updateData);
    const updatedProduct = await product.save();
    
    console.log('✅ Produit mis à jour:', updatedProduct.name);
    
    res.json({
      success: true,
      message: 'Produit mis à jour avec succès',
      data: updatedProduct
    });
  } catch (error) {
    console.error('❌ Erreur mise à jour produit:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Un produit avec ce SKU ou slug existe déjà'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du produit',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// @desc    Supprimer un produit
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
  try {
    console.log('🔄 Suppression produit:', req.params.id);
    
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: 'Produit non trouvé' 
      });
    }

    // Supprime le produit
    await Product.deleteOne({ _id: req.params.id });
    
    console.log('✅ Produit supprimé:', product.name);
    
    res.json({ 
      success: true,
      message: 'Produit supprimé avec succès' 
    });
  } catch (error) {
    console.error('❌ Erreur suppression produit:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la suppression du produit',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// @desc    Obtenir les produits vedettes
// @route   GET /api/products/featured
// @access  Public
const getFeaturedProducts = async (req, res) => {
  try {
    console.log('🔄 Chargement produits vedettes...');
    
    // Cherche les produits marqués comme vedettes et actifs, limite à 8
    const products = await Product.find({ featured: true, status: 'active' })
      .populate('category', 'name')
      .limit(8)
      .lean();

    console.log(`✅ ${products.length} produits vedettes trouvés`);
    
    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('❌ Erreur produits vedettes:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors du chargement des produits vedettes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// @desc    Obtenir les nouveautés
// @route   GET /api/products/new-arrivals
// @access  Public
const getNewArrivals = async (req, res) => {
  try {
    console.log('🔄 Chargement nouveautés...');
    
    // Calcule la date il y a 30 jours
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Cherche les produits actifs créés au cours des 30 derniers jours
    const products = await Product.find({
      createdAt: { $gte: thirtyDaysAgo },
      status: 'active'
    })
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();

    console.log(`✅ ${products.length} nouveautés trouvés`);
    
    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('❌ Erreur nouveautés:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors du chargement des nouveautés',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// @desc    Rechercher des produits
// @route   GET /api/products/search
// @access  Public
const searchProducts = async (req, res) => {
  try {
    console.log('🔍 Recherche produits:', req.query);
    
    const { q, category, type, material, priceMin, priceMax, sort } = req.query;
    
    let query = { status: 'active' };

    // Recherche textuelle (nécessite un index de texte dans le modèle Product)
    if (q) {
      query.$text = { $search: q };
    }
    // Filtre par catégorie
    if (category) {
      query.category = category;
    }
    // Filtre par type
    if (type) {
      query.type = type;
    }
    // Filtre par matériel (attribut spécifique)
    if (material) {
      query['attributes.material'] = material;
    }
    // Filtre par fourchette de prix
    if (priceMin || priceMax) {
      query.price = {};
      if (priceMin) query.price.$gte = parseFloat(priceMin);
      if (priceMax) query.price.$lte = parseFloat(priceMax);
    }

    // Options de tri
    let sortOption = {};
    switch (sort) {
      case 'price_asc':
        sortOption = { price: 1 };
        break;
      case 'price_desc':
        sortOption = { price: -1 };
        break;
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      case 'popular':
        sortOption = { 'rating': -1 }; 
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Exécute la requête de recherche
    const products = await Product.find(query)
      .populate('category', 'name')
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Product.countDocuments(query);

    console.log(`✅ Recherche: ${products.length} produits trouvés sur ${total}`);

    res.json({
      success: true,
      count: products.length,
      total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      data: products
    });
  } catch (error) {
    console.error('❌ Erreur recherche produits:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la recherche des produits',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// @desc    Obtenir les produits en promotion
// @route   GET /api/products/on-sale
// @access  Public
const getProductsOnSale = async (req, res) => {
  try {
    console.log('🔄 Chargement produits en promotion...');
    
    // Cherche les produits en promotion, actifs, et où le prix de comparaison (comparePrice) est supérieur à 0.
    // Remarque: La clause `price: { $lt: { $expr: '$comparePrice' } }` nécessite l'utilisation de l'agrégation.
    // Dans l'état actuel avec `find()`, on se base sur `onSale: true` et `comparePrice: { $gt: 0 }`.
    const products = await Product.find({
      onSale: true,
      status: 'active',
      comparePrice: { $gt: 0 }
    })
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    console.log(`✅ ${products.length} produits en promotion trouvés`);
    
    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('❌ Erreur produits en promotion:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors du chargement des produits en promotion',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// Exportation des contrôleurs
export {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  getNewArrivals,
  searchProducts,
  getProductsOnSale
};