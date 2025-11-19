import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Définition du schéma de l'utilisateur
const userSchema = mongoose.Schema(
    {
        // Informations de base
        firstName: { type: String, required: true }, // Prénom
        lastName: { type: String, required: true },  // Nom de famille
        email: {
            type: String,
            required: true,
            unique: true, // L'e-mail doit être unique
        },
        phone: { type: String, required: true },     // Numéro de téléphone
        password: { type: String, required: true },  // Mot de passe (sera haché)
        avatar: { type: String },                    // URL ou chemin de l'avatar

        // Rôle et statut
        role: {
            type: String,
            enum: ['user', 'admin'], // Rôles autorisés : utilisateur ou administrateur
            default: 'user',
        },
        isActive: { type: Boolean, default: true }, // Statut d'activité du compte

        // Adresses
        addresses: [{
            // Sous-schéma pour les adresses
            type: { type: String, enum: ['home', 'work'], default: 'home' }, // Type d'adresse (maison/travail)
            street: String,
            city: String,
            state: String,
            zipCode: String,
            isDefault: { type: Boolean, default: false } // Adresse par défaut
        }],

        // Fonctionnalités e-commerce
        wishlist: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product' // Référence au modèle 'Product' pour la liste de souhaits
        }],
        loyaltyPoints: { type: Number, default: 0 }, // Points de fidélité
        referralCode: String,                        // Code de parrainage
    },
    { timestamps: true } // Ajoute automatiquement les champs 'createdAt' et 'updatedAt'
);

// ---

// Middleware Mongoose qui s'exécute AVANT la sauvegarde du document.
userSchema.pre('save', async function (next) {
    // Si le champ 'password' n'a pas été modifié, on passe à l'étape suivante.
    if (!this.isModified('password')) {
        next();
    }
    
    // Génération du sel (salt) pour le hachage avec un facteur de coût de 10.
    const salt = await bcrypt.genSalt(10);
    
    // Hachage du mot de passe en texte brut avec le sel généré.
    this.password = await bcrypt.hash(this.password, salt);
});

// ---

// Ajoute une méthode à l'instance de l'utilisateur pour vérifier le mot de passe.
userSchema.methods.matchPassword = async function (enteredPassword) {
    // Compare le mot de passe entré par l'utilisateur (en clair) avec le hachage stocké.
    return await bcrypt.compare(enteredPassword, this.password);
};

// ---

// Exportation du modèle User.
// Note : En ES modules, on utilise `export default` au lieu de `module.exports =`.
const User = mongoose.model('User', userSchema);
export default User;