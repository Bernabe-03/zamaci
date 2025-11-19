// Importations des modèles (ESM)
import User from '../models/User.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';

// @desc    Get all users (admin)
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    res.json({
      success: true,
      count: users.length,
      total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      data: users
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('wishlist')
      .populate('addresses');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user statistics
    const orders = await Order.find({ user: user._id });
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);

    const userData = {
      ...user.toObject(),
      statistics: {
        totalOrders,
        totalSpent,
        lastOrder: orders[0]?.createdAt || null
      }
    };

    res.json(userData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { firstName, lastName, email, phone, role, loyaltyPoints, isActive } = req.body;

    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.role = role || user.role;
    user.loyaltyPoints = loyaltyPoints !== undefined ? loyaltyPoints : user.loyaltyPoints;
    user.isActive = isActive !== undefined ? isActive : user.isActive;

    const updatedUser = await user.save();
    res.json(updatedUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has orders
    const userOrders = await Order.countDocuments({ user: user._id });
    if (userOrders > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete user with existing orders. Deactivate instead.' 
      });
    }

    await User.deleteOne({ _id: req.params.id });
    res.json({ message: 'User removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle user active status
// @route   PATCH /api/users/:id/active
// @access  Private/Admin
export const toggleUserActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({ 
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      isActive: user.isActive 
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Add to wishlist
// @route   POST /api/users/wishlist
// @access  Private
export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    // req.user._id vient du middleware d'authentification
    const user = await User.findById(req.user._id);

    if (!user.wishlist.includes(productId)) {
      user.wishlist.push(productId);
      await user.save();
    }

    await user.populate('wishlist');
    res.json({ 
      message: 'Product added to wishlist',
      wishlist: user.wishlist 
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Remove from wishlist
// @route   DELETE /api/users/wishlist/:productId
// @access  Private
export const removeFromWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    user.wishlist = user.wishlist.filter(
      item => item.toString() !== req.params.productId
    );
    
    await user.save();
    await user.populate('wishlist');

    res.json({ 
      message: 'Product removed from wishlist',
      wishlist: user.wishlist 
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get user wishlist
// @route   GET /api/users/wishlist
// @access  Private
export const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'wishlist',
      match: { status: 'active' }
    });

    res.json(user.wishlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add address
// @route   POST /api/users/addresses
// @access  Private
export const addAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    const newAddress = {
      type: req.body.type,
      street: req.body.street,
      city: req.body.city,
      state: req.body.state,
      zipCode: req.body.zipCode,
      isDefault: req.body.isDefault || false
    };

    // If setting as default, remove default from other addresses
    if (newAddress.isDefault) {
      user.addresses.forEach(addr => {
        addr.isDefault = false;
      });
    }

    user.addresses.push(newAddress);
    await user.save();

    res.status(201).json({
      message: 'Address added successfully',
      addresses: user.addresses
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update address
// @route   PUT /api/users/addresses/:addressId
// @access  Private
export const updateAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const addressIndex = user.addresses.findIndex(
      addr => addr._id.toString() === req.params.addressId
    );

    if (addressIndex === -1) {
      return res.status(404).json({ message: 'Address not found' });
    }

    const updatedAddress = {
      ...user.addresses[addressIndex].toObject(),
      ...req.body
    };

    // If setting as default, remove default from other addresses
    if (updatedAddress.isDefault) {
      user.addresses.forEach(addr => {
        addr.isDefault = false;
      });
    }

    user.addresses[addressIndex] = updatedAddress;
    await user.save();

    res.json({
      message: 'Address updated successfully',
      addresses: user.addresses
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete address
// @route   DELETE /api/users/addresses/:addressId
// @access  Private
export const deleteAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    user.addresses = user.addresses.filter(
      addr => addr._id.toString() !== req.params.addressId
    );
    
    await user.save();

    res.json({
      message: 'Address deleted successfully',
      addresses: user.addresses
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Set default address
// @route   PATCH /api/users/addresses/:addressId/default
// @access  Private
export const setDefaultAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    user.addresses.forEach(addr => {
      addr.isDefault = addr._id.toString() === req.params.addressId;
    });
    
    await user.save();

    res.json({
      message: 'Default address updated successfully',
      addresses: user.addresses
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
