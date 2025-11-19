import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// @desc    Middleware de protection (authentification obligatoire)
// @access  Vérifie la présence et la validité du token JWT
const protect = async (req, res, next) => {
  let token;

  // Vérifie si l'en-tête Authorization est présent et commence par 'Bearer'
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extrait le token (deuxième partie de 'Bearer token')
      token = req.headers.authorization.split(' ')[1]; 
      
      // Vérifie le token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Récupère l'utilisateur sans son mot de passe et l'attache à la requête
      req.user = await User.findById(decoded.id).select('-password');
      
      next();
    } catch (error) {
      console.error('Erreur de Token :', error);
      // Réponse en cas de token invalide (expiré, mal formé, etc.)
      return res.status(401).json({ message: 'Non autorisé, token invalide' });
    }
  }

  // Si aucun token n'est fourni
  if (!token) {
    return res.status(401).json({ message: 'Non autorisé, aucun token' });
  }
};

// @desc    Middleware d'administrateur
// @access  Vérifie si l'utilisateur authentifié a le rôle 'admin'
const admin = (req, res, next) => {
  // Vérifie si l'objet utilisateur est attaché à la requête et si son rôle est 'admin'
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    // Réponse si l'utilisateur n'est pas autorisé en tant qu'administrateur
    res.status(403).json({ message: 'Non autorisé en tant qu\'administrateur' });
  }
};

// @desc    Middleware d'authentification optionnelle
// @access  Tente d'authentifier l'utilisateur, mais continue même sans token valide
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Attache l'utilisateur à req.user s'il est trouvé
      req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
      // Log l'erreur mais ne bloque pas la requête
      console.error('Erreur de Token (authentification optionnelle) :', error);
    }
  }
  // Continue la requête, que l'utilisateur soit authentifié ou non
  next();
};

// Exportation des middlewares
export { protect, admin, optionalAuth };
