// routes/statsRoutes.js
import express from 'express';
import { getProductSalesStats, getTopProducts } from '../controllers/statsController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/products-sales', protect, admin, getProductSalesStats);
router.get('/top-products', protect, admin, getTopProducts);

export default router;