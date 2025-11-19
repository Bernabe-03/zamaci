// Import des modules nécessaires
import express from 'express';
const router = express.Router();

// Import des fonctions du contrôleur de catégories
import { 
  getCategories,
  getCategoryById,
  getCategoriesByType,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryActive,
  getCategoryTree,
  updateCategoryOrder,
  seedCategories
} from '../controllers/categoryController.js';

// Import des middlewares de protection et rôle admin
import { protect, admin } from '../middleware/auth.js';


// Récupérer toutes les catégories
router.route('/')
  .get(getCategories);

// Récupérer l'arborescence des catégories
router.route('/tree')
  .get(getCategoryTree);

// Récupérer les catégories par type
router.route('/type/:type')
  .get(getCategoriesByType);

// Récupérer une catégorie par son ID
router.route('/:id')
  .get(getCategoryById);

// Créer une nouvelle catégorie (protection + rôle admin)
router.route('/')
  .post(protect, admin, createCategory);

// Créer les catégories par défaut
router.route('/seed/default')
  .post(protect, admin, seedCategories);

// Mettre à jour ou supprimer une catégorie spécifique
router.route('/:id')
  .put(protect, admin, updateCategory) 
  .delete(protect, admin, deleteCategory); 

// Activer ou désactiver une catégorie
router.route('/:id/active')
  .patch(protect, admin, toggleCategoryActive);

// Mettre à jour l'ordre des catégories
router.route('/order/update')
  .patch(protect, admin, updateCategoryOrder);

// Export du router pour utilisation dans le serveur principal
export default router;
