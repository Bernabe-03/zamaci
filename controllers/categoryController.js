import Category from '../models/Category.js';
import Product from '../models/Product.js';

// @desc    Obtenir toutes les catégories
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    console.log('📥 Requête categories reçue');
    
    // Cherche toutes les catégories actives
    const categories = await Category.find({ isActive: true })
      .populate('parent', 'name')
      .sort({ order: 1, name: 1 })
      .lean(); // Utilise lean() pour de meilleures performances

    console.log(`✅ ${categories.length} catégories trouvées`);

    // Si pas de catégories, retourner un tableau vide au lieu d'erreur
    if (!categories || categories.length === 0) {
      console.log('ℹ️  Aucune catégorie trouvée, retour tableau vide');
      return res.json([]);
    }

    res.json(categories);
  } catch (error) {
    console.error('❌ Erreur getCategories:', error);
    // En cas d'erreur, retourner un tableau vide pour éviter de casser le frontend
    res.status(500).json({ 
      message: 'Erreur serveur lors du chargement des catégories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// @desc    Créer les catégories par défaut
// @route   POST /api/categories/seed/default
// @access  Private/Admin
const seedCategories = async (req, res) => {
  try {
    const defaultCategories = [
      {
        name: "Perruques",
        type: "perruque",
        description: "Collection de perruques de qualité",
        isActive: true,
        order: 1
      },
      {
        name: "Mèches",
        type: "meche", 
        description: "Mèches naturelles et synthétiques",
        isActive: true,
        order: 2
      },
      {
        name: "Extensions",
        type: "extension",
        description: "Extensions capillaires",
        isActive: true,
        order: 3
      },
      {
        name: "Accessoires",
        type: "accessoire",
        description: "Accessoires pour cheveux",
        isActive: true,
        order: 4
      }
    ];

    let categoriesCreated = 0;
    const createdCategories = [];

    for (const categoryData of defaultCategories) {
      const existingCategory = await Category.findOne({ name: categoryData.name });
      if (!existingCategory) {
        const category = new Category(categoryData);
        // Générer le slug
        category.seo = {
          slug: categoryData.name.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-')
        };
        await category.save();
        categoriesCreated++;
        createdCategories.push(category);
        console.log(`✅ Catégorie créée: ${categoryData.name}`);
      }
    }
    
    if (categoriesCreated > 0) {
      res.json({
        success: true,
        message: `${categoriesCreated} catégories par défaut créées avec succès`,
        created: categoriesCreated,
        categories: createdCategories
      });
    } else {
      res.json({
        success: true,
        message: 'Toutes les catégories par défaut existent déjà',
        created: 0,
        categories: []
      });
    }
  } catch (error) {
    console.error('❌ Erreur création catégories:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la création des catégories par défaut',
      error: error.message 
    });
  }
};
// @desc    Obtenir une catégorie par ID
// @route   GET /api/categories/:id
// @access  Public
const getCategoryById = async (req, res) => {
  try {
    // Cherche la catégorie par ID et peuple le parent
    const category = await Category.findById(req.params.id)
      .populate('parent', 'name');

    if (!category) {
      return res.status(404).json({ message: 'Catégorie non trouvée' });
    }

    // Compte le nombre de produits actifs dans cette catégorie
    const productsCount = await Product.countDocuments({ 
      category: category._id,
      status: 'active'
    });

    // Combine les données de la catégorie avec le compte de produits
    const categoryData = {
      ...category.toObject(),
      productsCount
    };

    res.json(categoryData);
  } catch (error) {
    // Gestion des erreurs internes du serveur
    res.status(500).json({ message: error.message });
  }
};
// @desc    Obtenir les catégories par type
// @route   GET /api/categories/type/:type
// @access  Public
const getCategoriesByType = async (req, res) => {
  try {
    // Cherche les catégories actives par type spécifié
    const categories = await Category.find({ 
      type: req.params.type,
      isActive: true 
    })
    .populate('parent', 'name')
    .sort({ order: 1, name: 1 });

    res.json(categories);
  } catch (error) {
    // Gestion des erreurs internes du serveur
    res.status(500).json({ message: error.message });
  }
};
// @desc    Créer une catégorie
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = async (req, res) => {
  try {
    const category = new Category(req.body);

    // Génère le slug si non fourni
    if (!category.seo?.slug) {
      category.seo = category.seo || {};
      category.seo.slug = generateSlug(category.name);
    }

    const createdCategory = await category.save();
    res.status(201).json(createdCategory);
  } catch (error) {
    // Erreur de validation ou de création
    res.status(400).json({ message: error.message });
  }
};
// @desc    Mettre à jour une catégorie
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Catégorie non trouvée' });
    }

    // Met à jour la catégorie avec les nouvelles données
    Object.assign(category, req.body);
    const updatedCategory = await category.save();
    res.json(updatedCategory);
  } catch (error) {
    // Erreur de validation ou de mise à jour
    res.status(400).json({ message: error.message });
  }
};
// @desc    Supprimer une catégorie
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Catégorie non trouvée' });
    }

    // Vérifie si la catégorie a des produits
    const productsCount = await Product.countDocuments({ category: category._id });
    if (productsCount > 0) {
      return res.status(400).json({ 
        message: 'Impossible de supprimer la catégorie car elle contient des produits. Veuillez plutôt la désactiver.' 
      });
    }

    // Vérifie si la catégorie a des sous-catégories
    const subcategoriesCount = await Category.countDocuments({ parent: category._id });
    if (subcategoriesCount > 0) {
      return res.status(400).json({ 
        message: 'Impossible de supprimer la catégorie car elle contient des sous-catégories. Mettez à jour les sous-catégories au préalable.' 
      });
    }

    // Supprime la catégorie
    await Category.deleteOne({ _id: req.params.id });
    res.json({ message: 'Catégorie supprimée avec succès' });
  } catch (error) {
    // Gestion des erreurs internes du serveur
    res.status(500).json({ message: error.message });
  }
};
// @desc    Basculer l'état actif/inactif d'une catégorie
// @route   PATCH /api/categories/:id/active
// @access  Private/Admin
const toggleCategoryActive = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Catégorie non trouvée' });
    }

    // Inverse l'état actuel (actif/inactif)
    category.isActive = !category.isActive;
    await category.save();

    res.json({ 
      message: `Catégorie ${category.isActive ? 'activée' : 'désactivée'} avec succès`,
      isActive: category.isActive 
    });
  } catch (error) {
    // Erreur de validation ou de mise à jour
    res.status(400).json({ message: error.message });
  }
};
// @desc    Obtenir l'arbre des catégories (hiérarchie)
// @route   GET /api/categories/tree
// @access  Public
const getCategoryTree = async (req, res) => {
  try {
    // Cherche toutes les catégories actives et trie
    const categories = await Category.find({ isActive: true })
      .sort({ order: 1, name: 1 });

    // Fonction récursive pour construire la structure arborescente
    const buildTree = (parentId = null) => {
      return categories
        .filter(cat => {
          // Si parentId est null, cherche les catégories racine (sans parent)
          if (parentId === null) return !cat.parent;
          // Sinon, cherche les enfants dont le parent correspond à parentId
          return cat.parent && cat.parent.toString() === parentId;
        })
        .map(cat => ({
          ...cat.toObject(),
          children: buildTree(cat._id)
        }));
    };

    const categoryTree = buildTree();
    res.json(categoryTree);
  } catch (error) {
    // Gestion des erreurs internes du serveur
    res.status(500).json({ message: error.message });
  }
};
// @desc    Mettre à jour l'ordre des catégories
// @route   PATCH /api/categories/order
// @access  Private/Admin
const updateCategoryOrder = async (req, res) => {
  try {
    const { orderUpdates } = req.body; // Tableau des mises à jour: [{id: '...', order: 1}, ...]

    // Prépare les opérations d'écriture en masse
    const bulkOps = orderUpdates.map(update => ({
      updateOne: {
        filter: { _id: update.id },
        update: { order: update.order }
      }
    }));

    // Exécute les mises à jour en masse
    await Category.bulkWrite(bulkOps);
    res.json({ message: 'Ordre des catégories mis à jour avec succès' });
  } catch (error) {
    // Erreur lors des opérations en masse ou de la requête
    res.status(400).json({ message: error.message });
  }
};
// Fonction utilitaire pour générer un slug à partir d'un nom
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^\w ]+/g, '') // Supprime les caractères spéciaux sauf les espaces
    .replace(/ +/g, '-');   // Remplace les espaces par des tirets
};
// Exportation des contrôleurs
export {
  getCategories,
  getCategoryById,
  getCategoriesByType,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryActive,
  getCategoryTree,
  updateCategoryOrder,
  seedCategories // AJOUTEZ CETTE LIGNE - C'EST CE QUI MANQUAIT !
};