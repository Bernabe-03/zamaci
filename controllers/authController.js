import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';

// @desc    Enregistrer un utilisateur
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    // Vérifie si l'utilisateur existe déjà
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'L\'utilisateur existe déjà' });
    }

    // Crée un nouvel utilisateur
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      // Génère un code de parrainage aléatoire
      referralCode: Math.random().toString(36).substr(2, 9).toUpperCase()
    });

    // Répond avec les informations de l'utilisateur et un jeton si la création a réussi
    if (user) {
      res.status(201).json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        token: generateToken(user._id),
      });
    }
  } catch (error) {
    // Gestion des erreurs
    res.status(400).json({ message: error.message });
  }
};


// @desc    Authentifier un utilisateur et obtenir le jeton
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Cherche l'utilisateur par email
    const user = await User.findOne({ email });

    // Vérifie l'utilisateur et le mot de passe
    if (user && (await user.matchPassword(password))) {
      // Répond avec les informations de l'utilisateur et un jeton
      res.json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role, // ASSUREZ-VOUS QUE LE RÔLE EST INCLUS
        token: generateToken(user._id),
      });
    } else {
      // Erreur d'authentification
      res.status(401).json({ message: 'Email ou mot de passe invalide' });
    }
  } catch (error) {
    // Gestion des erreurs
    res.status(400).json({ message: error.message });
  }
};

// @desc    Obtenir le profil utilisateur
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    // Cherche l'utilisateur par ID, ajoute les informations de la liste de souhaits et exclut le mot de passe
    const user = await User.findById(req.user._id)
      .populate('wishlist')
      .select('-password');

    if (user) {
      // Répond avec les données de l'utilisateur
      res.json(user);
    } else {
      // Utilisateur non trouvé
      res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
  } catch (error) {
    // Gestion des erreurs
    res.status(400).json({ message: error.message });
  }
};


// @desc    Mettre à jour le profil utilisateur
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    // Cherche l'utilisateur par ID
    const user = await User.findById(req.user._id);

    if (user) {
      // Met à jour les champs si de nouvelles valeurs sont fournies
      user.firstName = req.body.firstName || user.firstName;
      user.lastName = req.body.lastName || user.lastName;
      user.email = req.body.email || user.email;
      user.phone = req.body.phone || user.phone;

      // Met à jour le mot de passe s'il est fourni dans la requête
      if (req.body.password) {
        user.password = req.body.password;
      }

      // Sauvegarde l'utilisateur mis à jour
      const updatedUser = await user.save();

      // Répond avec les informations de l'utilisateur mis à jour et un nouveau jeton
      res.json({
        _id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        token: generateToken(updatedUser._id),
      });
    } else {
      // Utilisateur non trouvé
      res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
  } catch (error) {
    // Gestion des erreurs
    res.status(400).json({ message: error.message });
  }
};

export {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
};