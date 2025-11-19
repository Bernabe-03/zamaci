
// routes/products.js
import express from 'express';
const router = express.Router();
import { 
  getProducts, getProduct, createProduct, updateProduct, deleteProduct,
  getFeaturedProducts, getNewArrivals, searchProducts
} from '../controllers/productController.js';
import { protect, admin } from '../middleware/auth.js';
import { validateProduct } from '../middleware/validation.js';

// Routes publiques
router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/new-arrivals', getNewArrivals);
router.get('/search', searchProducts);
router.get('/:id', getProduct);

// Routes protégées admin
router.post('/', protect, admin, validateProduct, createProduct);
router.put('/:id', protect, admin, validateProduct, updateProduct);
router.delete('/:id', protect, admin, deleteProduct);
// routes/products.js
router.post('/:id/favorite', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    
    product.favoriteCount += 1;
    await product.save();
    
    res.json({ success: true, favoriteCount: product.favoriteCount });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});
export default router;