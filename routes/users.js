// Import des modules nécessaires
import express from 'express';
const router = express.Router();

// Import des fonctions du contrôleur utilisateur
import { 
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserActive,
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} from '../controllers/userController.js';

// Import des middlewares
import { protect, admin } from '../middleware/auth.js';
import { validateUser } from '../middleware/validation.js';

// Récupérer tous les utilisateurs (admin)
router.route('/')
  .get(protect, admin, getUsers);

// Récupérer, mettre à jour ou supprimer un utilisateur spécifique (admin)
router.route('/:id')
  .get(protect, admin, getUserById)   
  .put(protect, admin, validateUser, updateUser) 
  .delete(protect, admin, deleteUser);     

// Activer ou désactiver un utilisateur (admin)
router.route('/:id/active')
  .patch(protect, admin, toggleUserActive);

// -------------------- ROUTES PROFIL UTILISATEUR -------------------- //

// Gestion de la wishlist
router.route('/wishlist')
  .get(protect, getWishlist) 
  .post(protect, addToWishlist);

router.route('/wishlist/:productId')
  .delete(protect, removeFromWishlist);

// Gestion des adresses
router.route('/addresses')
  .post(protect, addAddress);

router.route('/addresses/:addressId')
  .put(protect, updateAddress)
  .delete(protect, deleteAddress);

// Définir une adresse par défaut
router.route('/addresses/:addressId/default')
  .patch(protect, setDefaultAddress);

// Export du router pour utilisation dans le serveur principal
export default router;
