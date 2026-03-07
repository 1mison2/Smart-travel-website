const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const { sendPasswordResetEmail } = require("../utils/emailService");

const normalizedRole = (role) => (role === "admin" ? "admin" : "user");
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const createJwt = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });

const buildAuthResponse = (user, token) => ({
  token,
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    role: normalizedRole(user.role),
    isBlocked: user.isBlocked,
  },
});

// Generate reset token
const generateResetToken = () => {
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
  return { resetToken, resetTokenHash };
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Please provide email" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({ message: "If an account exists with that email, a password reset link has been sent." });
    }

    // Generate reset token
    const { resetToken, resetTokenHash } = generateResetToken();
    
    // Hash token and set to user document
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Create reset URL (you'll need to update this to your frontend URL)
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    
    try {
      // Send email
      const emailResult = await sendPasswordResetEmail(email, resetToken, resetUrl);
      console.log("Email sent successfully:", emailResult.messageId);
      
      // For development, you can access the email preview URL
      if (emailResult.previewURL) {
        console.log("Email preview URL:", emailResult.previewURL);
      }
      
      res.json({ message: "If an account exists with that email, a password reset link has been sent." });
    } catch (emailError) {
      console.error("Failed to send email:", emailError);
      // Still save the token but let user know there was an issue
      res.status(500).json({ message: "Failed to send reset email. Please try again later." });
    }
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: "Please provide token and new password" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Hash token to compare with stored hash
    const resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user password and clear reset fields
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Generate new JWT token
    const jwtToken = createJwt(user);
    res.json({ message: "Password reset successful", ...buildAuthResponse(user, jwtToken) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide name, email and password" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      authProvider: "local",
      role: "user",
    });

    const token = createJwt(user);
    res.status(201).json(buildAuthResponse(user, token));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.password) {
      return res
        .status(400)
        .json({ message: "This account uses Google sign-in. Please continue with Google." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: "Account is blocked. Contact admin." });
    }

    const token = createJwt(user);
    res.json(buildAuthResponse(user, token));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: "Google token is required" });
    }
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: "Google auth is not configured on server" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email || !payload?.sub) {
      return res.status(400).json({ message: "Invalid Google profile data" });
    }
    if (!payload.email_verified) {
      return res.status(400).json({ message: "Google email is not verified" });
    }

    const email = payload.email.toLowerCase();
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name: payload.name || payload.given_name || email.split("@")[0],
        email,
        authProvider: "google",
        googleId: payload.sub,
        role: "user",
      });
    } else {
      if (!user.googleId) user.googleId = payload.sub;
      if (!user.authProvider || user.authProvider === "local") user.authProvider = "google";
      await user.save();
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: "Account is blocked. Contact admin." });
    }

    const token = createJwt(user);
    return res.json(buildAuthResponse(user, token));
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: "Google authentication failed" });
  }
};
