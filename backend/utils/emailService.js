const nodemailer = require("nodemailer");

// Create a test email transporter (using Gmail for example)
// In production, you should use environment variables for credentials
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password'
    }
  });
};

// For development/testing, we'll use Ethereal email service
const createTestTransporter = async () => {
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
};

const sendPasswordResetEmail = async (email, resetToken, resetUrl) => {
  try {
    // Use test transporter for development
    const transporter = await createTestTransporter();
    
    const mailOptions = {
      from: '"Smart Travel" <noreply@smarttravel.com>',
      to: email,
      subject: 'Password Reset Request - Smart Travel',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 2rem;">Smart Travel</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Password Reset Request</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
            <p style="color: #666; line-height: 1.6;">
              Hello,<br><br>
              We received a request to reset your password for your Smart Travel account. 
              Click the button below to reset your password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: bold; 
                        display: inline-block;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                Reset Password
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              Or copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
            </p>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="color: #856404; margin: 0;">
                <strong>Important:</strong> This link will expire in 10 minutes for security reasons. 
                If you didn't request this password reset, please ignore this email.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; color: #999; font-size: 0.9rem;">
            <p style="margin: 0;">
              © 2024 Smart Travel. All rights reserved.<br>
              This is an automated message, please do not reply to this email.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Password reset email sent: ", info.messageId);
    
    // For development, return the test URL so you can view the email
    return {
      success: true,
      messageId: info.messageId,
      previewURL: nodemailer.getTestMessageUrl(info)
    };
    
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
};

module.exports = {
  sendPasswordResetEmail
};
