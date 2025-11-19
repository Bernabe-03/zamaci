const cloudinaryDebug = (req, res, next) => {
    console.log('🔧 Configuration Cloudinary:');
    console.log('- Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
    console.log('- API Key:', process.env.CLOUDINARY_API_KEY ? 'Défini' : 'Non défini');
    console.log('- API Secret:', process.env.CLOUDINARY_API_SECRET ? 'Défini' : 'Non défini');
    
    next();
  };
  
  export default cloudinaryDebug;