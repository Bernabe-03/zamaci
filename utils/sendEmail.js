// emailService.js (ou mailer.js)

// Importation des dépendances et du transporteur d'e-mail configuré
import nodemailer from 'nodemailer'; // (Optionnel si nodemailer n'est utilisé que pour la référence du transporteur)
import transporter from '../config/email.js'; // Assurez-vous que '../config/email' exporte par défaut l'objet transporter.
// Si le fichier config/email n'exporte pas par défaut, utilisez :
// import { transporter } from '../config/email.js'; 

/**
 * @desc    Envoyer un e-mail
 * @param   {Object} options - Options de l'e-mail
 * @param   {String} options.to - E-mail du destinataire
 * @param   {String} options.subject - Sujet de l'e-mail
 * @param   {String} options.text - Contenu en texte brut
 * @param   {String} options.html - Contenu en HTML
 * @returns {Promise<Object>} Résultat de l'envoi de l'e-mail
 */
const sendEmail = async (options) => {
  try {
    const mailOptions = {
      // Utilisation de || pour une valeur par défaut en cas d'absence de la variable d'environnement
      from: process.env.EMAIL_FROM || 'NONO Boutique <noreply@nonoboutique.com>', 
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('E-mail envoyé avec succès (ID du message):', result.messageId);
    return result;
  } catch (error) {
    console.error("Échec de l'envoi de l'e-mail:", error);
    // Lancer une nouvelle erreur pour la gestion par l'appelant
    throw new Error("L'e-mail n'a pas pu être envoyé.");
  }
};

/**
 * @desc    Envoyer un e-mail de confirmation de commande
 * @param   {Object} order - Objet de la commande
 * @param   {Object} user - Objet de l'utilisateur
 * @returns {Promise<Object>} Résultat de l'envoi de l'e-mail
 */
const sendOrderConfirmation = async (order, user) => {
  const subject = `Confirmation de commande - ${order.orderNumber}`;
  
  const text = `
    Bonjour ${user.firstName},
    
    Merci pour votre commande ! Votre commande n°${order.orderNumber} a été confirmée.
    
    Détails de la commande:
    - Total: ${order.total} FCFA
    - Méthode de livraison: ${order.shippingMethod}
    - Adresse de livraison: ${order.shippingAddress.street}, ${order.shippingAddress.city}
    
    Vous paierez à la livraison.
    
    Merci de votre confiance !
    L'équipe NONO
  `;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #D4AF37; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; }
        .footer { background: #1A1A1A; color: white; padding: 20px; text-align: center; }
        .order-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>NONO Boutique</h1>
          <p>Confirmation de commande</p>
        </div>
        <div class="content">
          <h2>Bonjour ${user.firstName},</h2>
          <p>Merci pour votre commande ! Votre commande a été confirmée.</p>
          
          <div class="order-details">
            <h3>Détails de la commande</h3>
            <p><strong>Numéro de commande:</strong> ${order.orderNumber}</p>
            <p><strong>Total:</strong> ${order.total} FCFA</p>
            <p><strong>Méthode de livraison:</strong> ${order.shippingMethod}</p>
            <p><strong>Adresse de livraison:</strong><br>
            ${order.shippingAddress.street}<br>
            ${order.shippingAddress.city}, ${order.shippingAddress.state || ''}</p>
          </div>
          
          <p><strong>Mode de paiement:</strong> Paiement à la livraison</p>
          <p>Vous serez contacté pour la livraison. Merci de préparer le montant exact.</p>
        </div>
        <div class="footer">
          <p>L'équipe NONO - Votre beauté, notre expertise</p>
          <p>Email: contact@nonoboutique.com | Téléphone: +225 XX XX XX XX</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject,
    text,
    html
  });
};

/**
 * @desc    Envoyer un e-mail de réinitialisation de mot de passe
 * @param   {Object} user - Objet de l'utilisateur
 * @param   {String} resetToken - Jeton de réinitialisation de mot de passe
 * @returns {Promise<Object>} Résultat de l'envoi de l'e-mail
 */
const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  
  const subject = 'Réinitialisation de votre mot de passe NONO';
  
  const text = `
    Bonjour ${user.firstName},
    
    Vous avez demandé la réinitialisation de votre mot de passe.
    Cliquez sur le lien suivant pour créer un nouveau mot de passe:
    ${resetUrl}
    
    Ce lien expirera dans 1 heure.
    
    Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet e-mail.
    
    Cordialement,
    L'équipe NONO
  `;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #D4AF37; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; }
        .footer { background: #1A1A1A; color: white; padding: 20px; text-align: center; }
        .button { background: #D4AF37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>NONO Boutique</h1>
          <p>Réinitialisation de mot de passe</p>
        </div>
        <div class="content">
          <h2>Bonjour ${user.firstName},</h2>
          <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
          <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
          </p>
          <p>Ce lien expirera dans 1 heure.</p>
          <p>Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet e-mail.</p>
        </div>
        <div class="footer">
          <p>L'équipe NONO - Votre beauté, notre expertise</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject,
    text,
    html
  });
};

/**
 * @desc    Envoyer un e-mail de bienvenue
 * @param   {Object} user - Objet de l'utilisateur
 * @returns {Promise<Object>} Résultat de l'envoi de l'e-mail
 */
const sendWelcomeEmail = async (user) => {
  const subject = 'Bienvenue chez NONO Boutique !';
  
  const text = `
    Bonjour ${user.firstName},
    
    Bienvenue dans la famille NONO ! Votre compte a été créé avec succès.
    
    Chez NONO, nous nous engageons à vous offrir:
    - Des produits capillaires de qualité premium
    - Une livraison express
    - Un service client 7j/7
    - Des conseils d'experts
    
    Commencez dès maintenant à explorer notre collection:
    ${process.env.CLIENT_URL}/boutique
    
    Merci de nous faire confiance !
    
    Cordialement,
    L'équipe NONO
  `;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #D4AF37; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; }
        .footer { background: #1A1A1A; color: white; padding: 20px; text-align: center; }
        .button { background: #D4AF37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; }
        .benefits { list-style: none; padding: 0; }
        .benefits li { margin: 10px 0; padding-left: 20px; position: relative; }
        .benefits li:before { content: "✓"; color: #D4AF37; position: absolute; left: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Bienvenue chez NONO !</h1>
          <p>Votre beauté, notre expertise</p>
        </div>
        <div class="content">
          <h2>Bonjour ${user.firstName},</h2>
          <p>Bienvenue dans la famille NONO ! Votre compte a été créé avec succès.</p>
          
          <p>Chez NONO, nous nous engageons à vous offrir:</p>
          <ul class="benefits">
            <li>Des produits capillaires de qualité premium</li>
            <li>Une livraison express</li>
            <li>Un service client 7j/7</li>
            <li>Des conseils d'experts</li>
          </ul>
          
          <p style="text-align: center;">
            <a href="${process.env.CLIENT_URL}/boutique" class="button">
              Explorer la boutique
            </a>
          </p>
          
          <p>Merci de nous faire confiance !</p>
        </div>
        <div class="footer">
          <p>L'équipe NONO - Votre beauté, notre expertise</p>
          <p>Email: contact@nonoboutique.com | Téléphone: +225 XX XX XX XX</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject,
    text,
    html
  });
};

// Exportation des fonctions pour être utilisées ailleurs
export {
  sendEmail,
  sendOrderConfirmation,
  sendPasswordResetEmail,
  sendWelcomeEmail
};