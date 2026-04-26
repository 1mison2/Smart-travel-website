const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const {
  canSendEmail,
  sendAuthCodeEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} = require("../utils/emailService");
const { validateEmail, validateFullName, validatePasswordStrength } = require("../utils/authValidation");

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
    isEmailVerified: Boolean(user.isEmailVerified),
  },
});

const AUTH_CODE_TTL_MS = 10 * 60 * 1000;

const generateAuthCode = () => {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const hash = crypto.createHash("sha256").update(code).digest("hex");
  return { code, hash };
};

const clearAuthCode = (user) => {
  user.authCodeHash = undefined;
  user.authCodeExpire = undefined;
  user.authCodePurpose = undefined;
  user.authCodeSentAt = undefined;
};

const issueAuthCode = async ({ user, purpose }) => {
  const { code, hash } = generateAuthCode();
  user.authCodeHash = hash;
  user.authCodeExpire = new Date(Date.now() + AUTH_CODE_TTL_MS);
  user.authCodePurpose = purpose;
  user.authCodeSentAt = new Date();
  await user.save();

  await sendAuthCodeEmail({
    email: user.email,
    customerName: user.name,
    code,
    purpose,
  });
};

// Generate 6-digit reset code
const generateResetCode = () => {
  const resetCode = String(Math.floor(100000 + Math.random() * 900000));
  const resetCodeHash = crypto.createHash("sha256").update(resetCode).digest("hex");
  return { resetCode, resetCodeHash };
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Please provide email" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({ message: "If an account exists with that email, a password reset code has been sent." });
    }

    const { resetCode, resetCodeHash } = generateResetCode();
    
    user.resetPasswordToken = resetCodeHash;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();
    
    try {
      const emailResult = await sendPasswordResetEmail(normalizedEmail, resetCode);
      console.log("Email sent successfully:", emailResult.messageId);
      
      // For development, you can access the email preview URL
      if (emailResult.previewURL) {
        console.log("Email preview URL:", emailResult.previewURL);
      }
      
      res.json({ message: "If an account exists with that email, a password reset code has been sent." });
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
    const { email, code, password } = req.body;

    if (!email || !code || !password) {
      return res.status(400).json({ message: "Please provide email, code and new password" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const resetCodeHash = crypto.createHash("sha256").update(String(code)).digest("hex");

    const user = await User.findOne({
      email: normalizedEmail,
      resetPasswordToken: resetCodeHash,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    const passwordCheck = validatePasswordStrength({ password, email: normalizedEmail, name: user.name });
    if (!passwordCheck.valid) {
      return res.status(400).json({
        message: passwordCheck.feedback[0],
        passwordFeedback: passwordCheck.feedback,
      });
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

    if (!validateFullName(name)) {
      return res.status(400).json({ message: "Please provide both first and last name" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    const passwordCheck = validatePasswordStrength({ password, email, name });
    if (!passwordCheck.valid) {
      return res.status(400).json({
        message: passwordCheck.feedback[0],
        passwordFeedback: passwordCheck.feedback,
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userExists = await User.findOne({ email: normalizedEmail }).select("+authCodeHash +authCodeExpire +authCodePurpose +authCodeSentAt");
    if (userExists?.isEmailVerified) {
      return res.status(400).json({ message: "User already exists" });
    }
    if (userExists?.authProvider === "google" && userExists?.isEmailVerified) {
      return res.status(400).json({ message: "This email is registered with Google sign-in." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = userExists || new User({ email: normalizedEmail });
    user.name = name.trim();
    user.email = normalizedEmail;
    user.password = hashedPassword;
    user.authProvider = "local";
    user.role = user.role || "user";
    user.isEmailVerified = false;

    await issueAuthCode({ user, purpose: "signup" });

    return res.status(200).json({
      message: "Verification code sent to your email.",
      requiresCode: true,
      purpose: "signup",
      email: normalizedEmail,
    });
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

    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select("+authCodeHash +authCodeExpire +authCodePurpose +authCodeSentAt");
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
    if (!user.isEmailVerified) {
      await issueAuthCode({ user, purpose: "signup" });
      return res.status(403).json({
        message: "Your email is not verified yet. We sent a new verification code.",
        requiresCode: true,
        purpose: "signup",
        email: normalizedEmail,
      });
    }

    await issueAuthCode({ user, purpose: "login" });
    return res.json({
      message: "Login verification code sent to your email.",
      requiresCode: true,
      purpose: "login",
      email: normalizedEmail,
    });
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
    const isNewUser = !user;

    if (!user) {
      user = await User.create({
        name: payload.name || payload.given_name || email.split("@")[0],
        email,
        authProvider: "google",
        googleId: payload.sub,
        role: "user",
        isEmailVerified: true,
      });
    } else {
      if (!user.googleId) user.googleId = payload.sub;
      if (!user.authProvider || user.authProvider === "local") user.authProvider = "google";
      user.isEmailVerified = true;
      await user.save();
    }

    if (isNewUser && canSendEmail(user)) {
      sendWelcomeEmail({
        email: user.email,
        customerName: user.name,
      }).catch((error) => {
        console.error("Failed to send welcome email:", error);
      });
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

exports.verifySignupCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: "Email and verification code are required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select(
      "+authCodeHash +authCodeExpire +authCodePurpose +authCodeSentAt"
    );

    if (!user) {
      return res.status(400).json({ message: "Account not found for this email" });
    }
    if (user.authCodePurpose !== "signup" || !user.authCodeHash || !user.authCodeExpire) {
      return res.status(400).json({ message: "No signup verification code is active" });
    }
    if (user.authCodeExpire.getTime() < Date.now()) {
      clearAuthCode(user);
      await user.save();
      return res.status(400).json({ message: "Verification code expired. Please request a new one." });
    }

    const submittedHash = crypto.createHash("sha256").update(String(code).trim()).digest("hex");
    if (submittedHash !== user.authCodeHash) {
      return res.status(400).json({ message: "Verification code is invalid" });
    }

    user.isEmailVerified = true;
    clearAuthCode(user);
    await user.save();

    if (canSendEmail(user)) {
      sendWelcomeEmail({
        email: user.email,
        customerName: user.name,
      }).catch((error) => {
        console.error("Failed to send welcome email:", error);
      });
    }

    const token = createJwt(user);
    return res.json(buildAuthResponse(user, token));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.verifyLoginCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: "Email and verification code are required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select(
      "+authCodeHash +authCodeExpire +authCodePurpose +authCodeSentAt"
    );

    if (!user) {
      return res.status(400).json({ message: "Account not found for this email" });
    }
    if (user.authCodePurpose !== "login" || !user.authCodeHash || !user.authCodeExpire) {
      return res.status(400).json({ message: "No login verification code is active" });
    }
    if (user.authCodeExpire.getTime() < Date.now()) {
      clearAuthCode(user);
      await user.save();
      return res.status(400).json({ message: "Verification code expired. Please request a new one." });
    }

    const submittedHash = crypto.createHash("sha256").update(String(code).trim()).digest("hex");
    if (submittedHash !== user.authCodeHash) {
      return res.status(400).json({ message: "Verification code is invalid" });
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: "Account is blocked. Contact admin." });
    }

    clearAuthCode(user);
    await user.save();

    const token = createJwt(user);
    return res.json(buildAuthResponse(user, token));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.resendAuthCode = async (req, res) => {
  try {
    const { email, purpose } = req.body;
    if (!email || !purpose) {
      return res.status(400).json({ message: "Email and purpose are required" });
    }
    if (!["signup", "login"].includes(purpose)) {
      return res.status(400).json({ message: "Invalid code purpose" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select(
      "+authCodeHash +authCodeExpire +authCodePurpose +authCodeSentAt"
    );
    if (!user) {
      return res.status(400).json({ message: "Account not found for this email" });
    }
    if (purpose === "login" && !user.isEmailVerified) {
      return res.status(400).json({ message: "Email must be verified before requesting a login code" });
    }

    await issueAuthCode({ user, purpose });
    return res.json({ message: "A new verification code was sent to your email." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};
