// @desc   Gestionnaire d'erreurs global pour l'application Express
const errorHandler = (err, req, res, next) => {
  // Crée une copie de l'erreur pour ne pas modifier l'objet original
  let error = { ...err }; 
  error.message = err.message;

  // Log de l'erreur dans la console pour le débogage en développement
  console.log(err); 

  // --- Gestion des Erreurs Mongoose/MongoDB ---

  // 1. Mongoose: Mauvais ID (CastError)
  if (err.name === 'CastError') {
    const message = 'Ressource non trouvée (ID invalide)';
    error = { message, statusCode: 404 };
  }

  // 2. Mongoose: Clé dupliquée (code 11000)
  if (err.code === 11000) {
    const message = 'Valeur de champ en double déjà saisie';
    error = { message, statusCode: 400 };
  }

  // 3. Mongoose: Erreur de validation (ValidationError)
  if (err.name === 'ValidationError') {
    // Récupère tous les messages d'erreur de validation
    const message = Object.values(err.errors).map(val => val.message);
    // Joint les messages avec une virgule pour une réponse concise
    error = { message: message.join(', '), statusCode: 400 };
  }
  
  // Si l'erreur provient du middleware JWT (token expiré, etc.)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    const message = 'Non autorisé, veuillez vous reconnecter';
    error = { message, statusCode: 401 };
  }

  // Envoie la réponse d'erreur formatée
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Erreur du Serveur' // Message générique par défaut
  });
};

export default errorHandler;
