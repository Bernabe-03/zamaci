import cloudinary from '../config/cloudinary.js';

const testCloudinary = async () => {
  try {
    console.log('🔍 Test de connexion Cloudinary...');
    console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
    console.log('API Key:', process.env.CLOUDINARY_API_KEY ? '✓ Défini' : '✗ Manquant');
    console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? '✓ Défini' : '✗ Manquant');

    // Test simple de l'API
    const result = await cloudinary.api.ping();
    console.log('✅ Connexion Cloudinary réussie!');
    console.log('Status:', result.status);
    
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion Cloudinary:');
    console.error('Message:', error.message);
    console.error('Code:', error.http_code);
    console.error('Nom:', error.name);
    
    return false;
  }
};

export default testCloudinary;