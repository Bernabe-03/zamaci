import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'dotenv/config';

// Imports des modules locaux
import connectDB from './config/database.js';
import errorHandler from './middleware/errorHandler.js';

// Imports des routes
import authRouter from './routes/auth.js';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import categoriesRouter from './routes/categories.js';
import usersRouter from './routes/users.js';
import uploadsRouter from './routes/uploads.js';
import reviewsRouter from './routes/reviews.js';

// --- Fonction pour créer l'admin ---
const createAdminUser = async () => {
  try {
    const User = (await import('./models/User.js')).default;
    const existingAdmin = await User.findOne({ email: 'nonovitrine@gmail.com' });

    if (!existingAdmin) {
      const adminUser = new User({
        firstName: 'Admin',
        lastName: 'NONO',
        email: 'nonovitrine@gmail.com',
        password: '19E000172', 
        phone: '+225 0173430776',
        role: 'admin',
        isActive: true
      });

      await adminUser.save();
      console.log('✅ Compte admin créé avec succès');
    } else {
      console.log('✅ Compte admin existe déjà');
    }
  } catch (error) {
    console.error('❌ Erreur création admin:', error.message);
  }
};

// --- Fonction pour créer les catégories par défaut ---
const createDefaultCategories = async () => {
  try {
    const Category = (await import('./models/Category.js')).default;
    
    const defaultCategories = [
      {
        name: "Perruques",
        type: "perruque",
        description: "Collection de perruques de qualité",
        isActive: true,
        order: 1
      },
      {
        name: "Mèches",
        type: "meche", 
        description: "Mèches naturelles et synthétiques",
        isActive: true,
        order: 2
      },
      {
        name: "Extensions",
        type: "extension",
        description: "Extensions capillaires",
        isActive: true,
        order: 3
      },
      {
        name: "Accessoires",
        type: "accessoire",
        description: "Accessoires pour cheveux",
        isActive: true,
        order: 4
      }
    ];

    let categoriesCreated = 0;

    for (const categoryData of defaultCategories) {
      const existingCategory = await Category.findOne({ name: categoryData.name });
      if (!existingCategory) {
        const category = new Category(categoryData);
        // Générer le slug
        category.seo = {
          slug: categoryData.name.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-')
        };
        await category.save();
        categoriesCreated++;
        console.log(`✅ Catégorie créée: ${categoryData.name}`);
      }
    }
    
    if (categoriesCreated > 0) {
      console.log(`✅ ${categoriesCreated} catégories par défaut créées avec succès`);
    } else {
      console.log('✅ Catégories par défaut déjà existantes');
    }
  } catch (error) {
    console.error('❌ Erreur création catégories:', error.message);
  }
};

// --- Initialisation de la base de données ---
const initializeDatabase = async () => {
  try {
    await connectDB();
    console.log('✅ [OK] Connexion MongoDB réussie');
    
    // Créer l'admin et les catégories
    await createAdminUser();
    await createDefaultCategories();
    
  } catch (err) {
    console.error('❌ [ÉCHEC] Connexion MongoDB :', err.message);
    process.exit(1);
  }
};

// --- Lancement de l'initialisation ---
initializeDatabase();

// --- Création de l'application Express ---
const app = express();

// --- Configuration CORS ---
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5174',
      'https://zamaci.vercel.app',
      process.env.CLIENT_URL
    ].filter(Boolean);

    if (!origin) return callback(null, true); // mobile / Postman

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS: ' + origin));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// --- Middleware ---
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// --- Fichiers statiques ---
app.use('/uploads', express.static('public/uploads'));

// --- Routes principales ---
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/users', usersRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/reviews', reviewsRouter);


// --- Route test simple ---
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend connecté ✅',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// --- Route pour vérifier l'état de la base de données ---
app.get('/api/health', async (req, res) => {
  try {
    const Category = (await import('./models/Category.js')).default;
    const categoryCount = await Category.countDocuments();
    
    res.json({
      status: 'OK',
      database: 'Connected',
      categories: categoryCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error',
      database: 'Disconnected',
      error: error.message
    });
  }
});

// --- Route par défaut ---
app.get('/', (req, res) => {
  res.json({
    message: "Bienvenue sur l'API NONO E-commerce 🚀",
    version: '1.0.0',
    status: 'Opérationnel',
    endpoints: {
      test: '/api/test',
      health: '/api/health',
      seed_categories: '/api/seed/categories (POST)',
      authentification: '/api/auth',
      produits: '/api/products',
      commandes: '/api/orders',
      catégories: '/api/categories',
      utilisateurs: '/api/users',
      uploads: '/api/uploads',
      avis: '/api/reviews'
    },
  });
});

// --- Middleware de gestion d'erreurs ---
app.use(errorHandler);

// --- Gestion des erreurs globales ---
process.on('unhandledRejection', (err) => {
  console.error('❌ Rejet de promesse non gérée :', err.message);
  console.error(err);
});

// --- Lancement du serveur ---
const PORT = process.env.PORT || 5000;

try {
  const server = app.listen(PORT, () => {
    console.log(`✅ [OK] Serveur démarré en mode ${process.env.NODE_ENV || 'production'} sur le port ${PORT}`);
    console.log(`✅ CORS configuré pour: http://localhost:5173, http://localhost:3000`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
  });

  process.on('SIGTERM', () => {
    console.log('🛑 Arrêt du serveur...');
    server.close(() => console.log('✅ Serveur arrêté proprement'));
  });
} catch (error) {
  console.error('❌ [ÉCHEC] Impossible de démarrer le serveur :', error.message);
  process.exit(1);
}