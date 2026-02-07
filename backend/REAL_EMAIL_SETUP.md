# How to Receive Real Emails

## Option 1: Gmail Setup (Recommended)

### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account: https://myaccount.google.com/
2. Security → 2-Step Verification → Turn on
3. Follow the setup process

### Step 2: Generate App Password
1. Go to Google Account → Security
2. 2-Step Verification → App passwords
3. Select "Mail" on "Select app" dropdown
4. Select "Other (Custom name)" and enter "Smart Travel"
5. Click "Generate"
6. Copy the 16-character password (it will look like: xxxx xxxx xxxx xxxx)

### Step 3: Update Backend Configuration
Create or update your `.env` file in the backend folder:
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx
FRONTEND_URL=http://localhost:5173
```

### Step 4: Restart Backend Server
```bash
npm run dev
```

### Step 5: Test Again
Now when you request a password reset, you'll receive a real email in your Gmail inbox!

## Option 2: Use Your Own Email Provider

### For Outlook/Hotmail:
```
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-app-password
```

### For Other Providers:
Update the email service in `utils/emailService.js`:
```javascript
const transporter = nodemailer.createTransport({
  host: 'smtp.your-provider.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
```

## Option 3: Use Transactional Email Services (Production)

### SendGrid (Recommended for Production)
1. Sign up at https://sendgrid.com/
2. Get your API key
3. Install: `npm install @sendgrid/mail`
4. Update email service to use SendGrid

### Mailgun
1. Sign up at https://www.mailgun.com/
2. Get your API credentials
3. Update email service accordingly

## Quick Test (Gmail Method)

1. **Enable 2FA on your Gmail**
2. **Generate App Password** (16 characters)
3. **Add to .env file**:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=xxxx xxxx xxxx xxxx
   ```
4. **Restart backend**: `npm run dev`
5. **Test forgot password** - You'll get real email!

## Security Notes
- Never commit your `.env` file to Git
- Use App Passwords, not your main password
- Consider using transactional email services for production
- The Ethereal method is perfect for development and testing

## Current Status
Your system is working perfectly! The emails are being sent successfully to Ethereal (test service). To receive real emails, just follow the Gmail setup above.
