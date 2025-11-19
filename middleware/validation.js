import { body, validationResult } from 'express-validator';

// @desc   Gère les résultats de la validation et renvoie une erreur 400 si nécessaire
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Échec de la validation des données',
      errors: errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// --- RÈGLES DE VALIDATION SPÉCIFIQUES ---

// Validation pour la création/mise à jour d'un produit
const validateProduct = [
  body('name')
    .notEmpty().withMessage('Le nom du produit est requis')
    .isLength({ min: 2 }).withMessage('Le nom doit contenir au moins 2 caractères')
    .trim(),
  
  body('description')
    .notEmpty().withMessage('La description est requise')
    .isLength({ min: 10 }).withMessage('La description doit contenir au moins 10 caractères')
    .trim(),
  
  body('price')
    .isFloat({ min: 0 }).withMessage('Le prix doit être un nombre positif'),
  
  body('category')
    .notEmpty().withMessage('La catégorie est requise')
    .isMongoId().withMessage('ID de catégorie invalide'),
  
  body('brand')
    .notEmpty().withMessage('La marque est requise')
    .isLength({ min: 2 }).withMessage('La marque doit contenir au moins 2 caractères')
    .trim(),
  
  body('type')
    .isIn(['perruque', 'meche', 'extension', 'accessoire'])
    .withMessage('Type de produit invalide'),
  
  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('Le stock doit être un entier positif'),
  
  body('images')
    .isArray({ min: 1 }).withMessage('Au moins une image est requise'),
  
  body('images.*.url')
    .isURL().withMessage('URL d\'image invalide'),
  
  body('attributes.material')
    .optional()
    .isIn(['synthétique', 'naturel', 'mixte'])
    .withMessage('Matériau invalide'),

  handleValidationErrors
];

// Validation pour la création/mise à jour d'un utilisateur
const validateUser = [
  body('firstName').notEmpty().withMessage('Le prénom est requis'),
  body('lastName').notEmpty().withMessage('Le nom de famille est requis'),
  body('email')
    .isEmail().withMessage('Une adresse email valide est requise'),
  body('phone').notEmpty().withMessage('Le numéro de téléphone est requis'),
  body('password')
    .optional() // Le mot de passe peut être optionnel lors d'une mise à jour
    .isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  handleValidationErrors
];

// Validation pour la création d'une commande
const validateOrder = [
  body('items')
    .isArray({ min: 1 }).withMessage('Au moins un article est requis pour la commande'),
  body('items.*.product')
    .notEmpty().withMessage('L\'ID du produit est manquant pour un article'),
  body('items.*.quantity')
    .isInt({ min: 1 }).withMessage('La quantité doit être un entier positif'),
  body('shippingAddress')
    .isObject().withMessage('L\'adresse de livraison est requise'),
  body('shippingMethod')
    .notEmpty().withMessage('La méthode de livraison est requise'),
  // Validation des champs de l'adresse de livraison
  body('shippingAddress.city').notEmpty().withMessage('La ville de livraison est requise'),
  body('shippingAddress.street').notEmpty().withMessage('La rue de livraison est requise'),
  body('shippingAddress.firstName').notEmpty().withMessage('Le prénom pour la livraison est requis'),
  handleValidationErrors
];

// Exportation des validateurs
export {
  validateProduct,
  validateUser,
  validateOrder,
  handleValidationErrors
};
