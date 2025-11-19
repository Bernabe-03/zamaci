// Import des modules nécessaires
import express from 'express';
const router = express.Router();

// Import des fonctions du contrôleur d'authentification
import { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  updateUserProfile 
} from '../controllers/authController.js';

// Import des middlewares
import { protect } from '../middleware/auth.js';
import { validateUser } from '../middleware/validation.js';

// Route pour l'inscription d'un utilisateur
router.post('/register', validateUser, registerUser);

// Route pour la connexion d'un utilisateur
router.post('/login', loginUser);

// L'accès est protégé par le middleware protect
router.route('/profile')
  .get(protect, getUserProfile)  
  .put(protect, updateUserProfile);

// Export du router pour l'utiliser dans le serveur principal
export default router;
