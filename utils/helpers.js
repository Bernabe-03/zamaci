// -------------------- UTILITAIRES -------------------- //

/**
 * Génère une chaîne aléatoire
 * @param {Number} length - Longueur de la chaîne
 * @returns {String}
 */
const generateRandomString = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Formate un montant en devise
 * @param {Number} amount - Montant
 * @param {String} currency - Code devise (défaut: XOF)
 * @returns {String}
 */
const formatCurrency = (amount, currency = 'XOF') => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Formate une date
 * @param {Date} date - Date à formater
 * @param {String} locale - Locale (défaut: fr-FR)
 * @returns {String}
 */
const formatDate = (date, locale = 'fr-FR') => {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Calcule la distance entre deux coordonnées (formule Haversine)
 * @param {Object} coord1 - {lat, lng}
 * @param {Object} coord2 - {lat, lng}
 * @returns {Number} Distance en km
 */
const calculateDistance = (coord1, coord2) => {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.lat * Math.PI / 180) *
      Math.cos(coord2.lat * Math.PI / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Vérifie la validité d'un email
 * @param {String} email
 * @returns {Boolean}
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Vérifie la validité d'un numéro de téléphone (Côte d'Ivoire)
 * @param {String} phone
 * @returns {Boolean}
 */
const isValidPhone = (phone) => {
  const phoneRegex = /^(?:(?:\+|00)225|0)?[0-9]{8,10}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Nettoie une chaîne HTML pour éviter le XSS
 * @param {String} str
 * @returns {String}
 */
const sanitizeHTML = (str) => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Tronque un texte à une longueur donnée
 * @param {String} text
 * @param {Number} length
 * @returns {String}
 */
const truncateText = (text, length = 100) => {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};

/**
 * Retourne la couleur CSS d'un badge de statut de commande
 * @param {String} status
 * @returns {String} Classe CSS
 */
const getStatusColor = (status) => {
  const statusColors = {
    en_attente: 'warning',
    confirme: 'info',
    en_preparation: 'primary',
    expedie: 'secondary',
    livre: 'success',
    annule: 'danger',
    paye: 'success'
  };
  return statusColors[status] || 'secondary';
};

/**
 * Calcule la date de livraison estimée
 * @param {String} shippingMethod
 * @param {Date} orderDate
 * @returns {Date}
 */
const calculateDeliveryDate = (shippingMethod, orderDate = new Date()) => {
  const date = new Date(orderDate);
  const deliveryDays = {
    express_24h: 1,
    standard_48h: 2,
    point_relais: 3
  };

  const days = deliveryDays[shippingMethod] || 2;
  date.setDate(date.getDate() + days);

  // Ignorer les weekends
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }

  return date;
};

/**
 * Génère un slug SEO-friendly
 * @param {String} text
 * @returns {String}
 */
const generateSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

/**
 * Clonage profond d'un objet
 * @param {Object} obj
 * @returns {Object}
 */
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Fonction debounce
 * @param {Function} func
 * @param {Number} wait
 * @returns {Function}
 */
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Calcule les statistiques d'évaluation à partir d'un tableau de reviews
 * @param {Array} reviews
 * @returns {Object} {average, count, distribution}
 */
const calculateRatingStats = (reviews) => {
  if (!reviews || reviews.length === 0) {
    return {
      average: 0,
      count: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }

  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  const average = total / reviews.length;

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((review) => {
    if (review.rating >= 1 && review.rating <= 5) {
      distribution[review.rating]++;
    }
  });

  return {
    average: Math.round(average * 10) / 10,
    count: reviews.length,
    distribution
  };
};

// Export ES Modules
export {
  generateRandomString,
  formatCurrency,
  formatDate,
  calculateDistance,
  isValidEmail,
  isValidPhone,
  sanitizeHTML,
  truncateText,
  getStatusColor,
  calculateDeliveryDate,
  generateSlug,
  deepClone,
  debounce,
  calculateRatingStats
};
