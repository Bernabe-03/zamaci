// Import des modules nécessaires
import express from 'express';
const router = express.Router();

// Import des fonctions du contrôleur de commandes
import { 
  createOrder, 
  getMyOrders, 
  getOrder, 
  updateOrderStatus, 
  getOrders 
} from '../controllers/orderController.js';

// Import des middlewares
import { protect, admin } from '../middleware/auth.js';
import { validateOrder } from '../middleware/validation.js';

// Créer une commande (protection + validation des données)
router.route('/')
  .post(protect, validateOrder, createOrder)
  // Récupérer toutes les commandes (admin uniquement)
  .get(protect, admin, getOrders);

// Récupérer les commandes de l'utilisateur connecté
router.route('/my-orders')
  .get(protect, getMyOrders);

// Récupérer une commande par son ID
router.route('/:id')
  .get(protect, getOrder);

// Mettre à jour le statut d'une commande (admin uniquement)
router.route('/:id/status')
  .put(protect, admin, updateOrderStatus);

// Export du router pour utilisation dans le serveur principal
export default router;
