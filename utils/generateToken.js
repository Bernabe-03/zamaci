// Import du module JWT
import jwt from 'jsonwebtoken';

/**
 * Génère un token JWT pour un utilisateur
 * @param {string} id - L'ID de l'utilisateur
 * @returns {string} - Token JWT
 */
const generateToken = (id) => {
  return jwt.sign(
    { id }, // Payload : contient l'ID de l'utilisateur
    process.env.JWT_SECRET, // Clé secrète depuis les variables d'environnement
    { expiresIn: '30d' }   // Expiration du token : 30 jours
  );
};

// Export du module en ES Modules
export default generateToken;
