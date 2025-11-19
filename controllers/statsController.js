// controllers/statsController.js
import Order from '../models/Order.js';
import Product from '../models/Product.js';

// @desc    Statistiques des produits achetés par mois
// @route   GET /api/stats/products-sales
// @access  Private/Admin
export const getProductSalesStats = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;

    const stats = await Order.aggregate([
      { $match: { status: { $in: ['livre', 'expedie'] } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            product: '$items.product'
          },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          orderCount: { $addToSet: '$_id' }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id.product',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: {
            year: '$_id.year',
            month: '$_id.month'
          },
          products: {
            $push: {
              product: {
                _id: '$product._id',
                name: '$product.name',
                sku: '$product.sku'
              },
              quantity: '$totalQuantity',
              revenue: '$totalRevenue'
            }
          },
          totalMonthlyRevenue: { $sum: '$totalRevenue' },
          totalMonthlyQuantity: { $sum: '$totalQuantity' },
          uniqueProducts: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({
      success: true,
      data: stats,
      period
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Produits les plus vendus
// @route   GET /api/stats/top-products
// @access  Private/Admin
export const getTopProducts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const topProducts = await Order.aggregate([
      { $match: { status: { $in: ['livre', 'expedie'] } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          orderCount: { $addToSet: '$_id' }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          _id: 0,
          product: {
            _id: '$product._id',
            name: '$product.name',
            sku: '$product.sku',
            price: '$product.price',
            images: '$product.images'
          },
          totalSold: 1,
          totalRevenue: 1,
          orderCount: { $size: '$orderCount' }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json({
      success: true,
      data: topProducts
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};