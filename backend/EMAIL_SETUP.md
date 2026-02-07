# Email Setup for Smart Travel

## Current Status
The forgot password functionality now sends actual emails using Nodemailer with Ethereal test email service for development.

## How It Works
1. **Development**: Uses Ethereal test email service (emails are not real but you can preview them)
2. **Production**: Can be configured to use Gmail, Outlook, or any SMTP service

## Testing the Email Functionality

### Method 1: Check Console Logs
When you request a password reset, check the backend console for:
- "Email sent successfully: [message-id]"
- "Email preview URL: [preview-url]"

### Method 2: Use the Preview URL
The preview URL will show you the exact email that would be sent. Open this URL in your browser to see the email.

### Method 3: Configure Real Email (Optional)

#### For Gmail:
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password
3. Add to your `.env` file:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

#### For Other Email Services:
Update the email service configuration in `utils/emailService.js`:
```javascript
const transporter = nodemailer.createTransporter({
  host: 'smtp.your-email-provider.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
```

## Current Email Template
The email includes:
- Professional Smart Travel branding
- Clear password reset instructions
- Security warnings and expiration info
- Responsive design for mobile devices

## Testing Steps
1. Go to the login page
2. Click "Forgot password?"
3. Enter your email
4. Check the backend console for the preview URL
5. Open the preview URL to see the email
6. Copy the reset token from the URL to test the reset page

## Production Deployment
For production deployment:
1. Set up real email credentials
2. Update the FRONTEND_URL environment variable
3. Consider using a transactional email service like SendGrid or Mailgun for better deliverability

The email functionality is now fully working and ready for testing! 🎉
