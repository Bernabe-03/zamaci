import mongoose from 'mongoose';
import Product from '../models/Product.js';
import dotenv from 'dotenv';

dotenv.config();

const fixProductsSlug = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Connecté à MongoDB');

    // Trouver tous les produits avec seo.slug null ou undefined
    const productsWithNullSlug = await Product.find({
      $or: [
        { 'seo.slug': null },
        { 'seo.slug': { $exists: false } },
        { 'seo.slug': '' }
      ]
    });

    console.log(`🔄 Trouvé ${productsWithNullSlug.length} produits avec slug null`);

    for (const product of productsWithNullSlug) {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 9);
      const newSlug = `${product.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')}-${timestamp}-${random}`;

      // Initialiser seo si non existant
      if (!product.seo) {
        product.seo = {};
      }

      product.seo.slug = newSlug;
      await product.save();
      console.log(`✅ Slug corrigé pour: ${product.name}`);
    }

    console.log('🎉 Tous les slugs ont été corrigés!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
};

fixProductsSlug();