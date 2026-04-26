import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Lock, Mail, ShieldCheck, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import { clearAuthRedirect } from "../utils/authRedirect";
import { validateEmail, validateFullName } from "../utils/authValidation";
import GoogleSignInButton from "../components/auth/GoogleSignInButton";
import authReference from "../assets/auth-reference.jpg";
import "./Auth.css";

export default function Signup() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [verificationCode, setVerificationCode] = useState("");
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState("details");
  const [pendingEmail, setPendingEmail] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const fullName = `${form.firstName} ${form.lastName}`.trim();

  const validateDetails = () => {
    const nextErrors = {};

    if (!form.firstName.trim()) nextErrors.name = "First name is required";
    else if (!form.lastName.trim()) nextErrors.name = "Last name is required";
    else if (!validateFullName(fullName)) nextErrors.name = "Please enter both first and last name";
    if (!form.email.trim()) nextErrors.email = "Email is required";
    else if (!validateEmail(form.email)) nextErrors.email = "Enter a valid email address";
    if (!form.password) nextErrors.password = "Password is required";
    if (!form.confirmPassword) nextErrors.confirmPassword = "Please confirm your password";
    else if (form.password !== form.confirmPassword) nextErrors.confirmPassword = "Passwords do not match";

    return nextErrors;
  };

  const validateCode = () => {
    const code = verificationCode.trim();
    if (!code) return "Verification code is required";
    if (!/^\d{6}$/.test(code)) return "Verification code must be 6 digits";
    return "";
  };

  const finishSignup = (payload) => {
    login(payload);
    clearAuthRedirect();
    navigate(payload?.user?.role === "admin" ? "/admin" : "/dashboard", { replace: true });
  };

  const submitDetails = async (event) => {
    event.preventDefault();
    const nextErrors = validateDetails();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});
    try {
      const res = await api.post("/api/auth/signup", {
        name: fullName,
        email: form.email.trim(),
        password: form.password,
      });
      setPendingEmail(res.data.email || form.email.trim().toLowerCase());
      setVerificationCode("");
      setStep("code");
      setErrors({ general: res.data.message || "Verification code sent to your email." });
    } catch (error) {
      setErrors({
        general: error?.response?.data?.message || "Registration failed. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const submitCode = async (event) => {
    event.preventDefault();
    const codeError = validateCode();
    if (codeError) {
      setErrors({ code: codeError });
      return;
    }

    setIsLoading(true);
    setErrors({});
    try {
      const res = await api.post("/api/auth/verify-signup", {
        email: pendingEmail,
        code: verificationCode.trim(),
      });
      finishSignup(res.data);
    } catch (error) {
      setErrors({
        code: error?.response?.data?.message || "Verification failed. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resendCode = async () => {
    setIsLoading(true);
    setErrors({});
    try {
      await api.post("/api/auth/resend-code", {
        email: pendingEmail,
        purpose: "signup",
      });
      setErrors({ general: "A new verification code was sent to your email." });
    } catch (error) {
      setErrors({
        general: error?.response?.data?.message || "Unable to resend code right now.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onGoogleCredential = async (idToken) => {
    setIsLoading(true);
    setErrors({});
    try {
      const res = await api.post("/api/auth/google", { idToken });
      finishSignup(res.data);
    } catch (error) {
      setErrors({
        general: error?.response?.data?.message || "Google sign-up failed. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isCodeStep = step === "code";

  return (
    <div className="auth-shell">
      <div className="auth-frame">
        <section className="auth-visual" style={{ "--auth-visual-image": `url(${authReference})` }}>
          <div className="auth-visual__content">
            <p className="auth-visual__eyebrow">Your Adventure</p>
            <h1>
              Start <strong>here</strong> with every route ready for a new <em>story</em>.
            </h1>
          </div>
        </section>

        <section className="auth-panel">
          <div className="auth-panel__top">
            <Link to="/" state={location.state} className="auth-back" aria-label="Back to home">
              <ArrowLeft size={16} />
            </Link>
            <div className="auth-switch">
              <Link to="/signup" className="auth-switch__link is-active">
                Register
              </Link>
              <Link to="/login" state={location.state} className="auth-switch__link">
                Login
              </Link>
            </div>
          </div>

          <div className="auth-panel__head">
            <h2>{isCodeStep ? "Verify your email" : "Create new account"}</h2>
            {isCodeStep && <p>{`Enter the 6-digit code sent to ${pendingEmail}.`}</p>}
          </div>

          {!isCodeStep ? (
            <form onSubmit={submitDetails} className="auth-form">
              {errors.general && <div className="auth-error">{errors.general}</div>}

              <div className="auth-form__split">
                <div className="auth-form__row">
                  <div className={`auth-input-wrap ${errors.name ? "auth-input-wrap--error" : ""}`}>
                    <User size={18} className="auth-input-icon" />
                    <input
                      id="signup-first-name"
                      type="text"
                      value={form.firstName}
                      onChange={(event) => setForm({ ...form, firstName: event.target.value })}
                      placeholder="First name"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="auth-form__row">
                  <div className={`auth-input-wrap ${errors.name ? "auth-input-wrap--error" : ""}`}>
                    <User size={18} className="auth-input-icon" />
                    <input
                      id="signup-last-name"
                      type="text"
                      value={form.lastName}
                      onChange={(event) => setForm({ ...form, lastName: event.target.value })}
                      placeholder="Last name"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
              {errors.name && <p className="auth-field-error">{errors.name}</p>}

              <div className="auth-form__row">
                <div className={`auth-input-wrap ${errors.email ? "auth-input-wrap--error" : ""}`}>
                  <Mail size={18} className="auth-input-icon" />
                  <input
                    id="signup-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    placeholder="name@example.com"
                    disabled={isLoading}
                  />
                </div>
                {errors.email && <p className="auth-field-error">{errors.email}</p>}
              </div>

              <div className="auth-form__row">
                <div className={`auth-input-wrap ${errors.password ? "auth-input-wrap--error" : ""}`}>
                  <Lock size={18} className="auth-input-icon" />
                  <input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                    placeholder="Create a strong password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    disabled={isLoading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="auth-field-error">{errors.password}</p>}
              </div>

              <div className="auth-form__row">
                <div className={`auth-input-wrap ${errors.confirmPassword ? "auth-input-wrap--error" : ""}`}>
                  <Lock size={18} className="auth-input-icon" />
                  <input
                    id="signup-confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
                    placeholder="Confirm password"
                    disabled={isLoading}
                  />
                </div>
                {errors.confirmPassword && <p className="auth-field-error">{errors.confirmPassword}</p>}
              </div>

              <button type="submit" className="auth-submit" disabled={isLoading}>
                {isLoading ? "Sending code..." : "Create account"}
              </button>

              <div className="auth-google">
                <GoogleSignInButton
                  onCredential={onGoogleCredential}
                  onError={(message) => setErrors({ general: message })}
                  disabled={isLoading}
                  text="signup_with"
                />
              </div>
            </form>
          ) : (
            <form onSubmit={submitCode} className="auth-form">
              {errors.general && <div className="auth-success">{errors.general}</div>}

              <div className="auth-code-panel">
                <div className="auth-code-panel__icon">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <strong>Verify your account</strong>
                  <p>Enter the code we just sent to your email to activate your account.</p>
                </div>
              </div>

              <div className="auth-form__row">
                <div className={`auth-input-wrap ${errors.code ? "auth-input-wrap--error" : ""}`}>
                  <ShieldCheck size={18} className="auth-input-icon" />
                  <input
                    id="signup-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    disabled={isLoading}
                  />
                </div>
                {errors.code && <p className="auth-field-error">{errors.code}</p>}
              </div>

              <button type="submit" className="auth-submit" disabled={isLoading}>
                {isLoading ? "Verifying..." : "Verify and continue"}
              </button>

              <div className="auth-actions-row">
                <button type="button" className="auth-text-btn" onClick={resendCode} disabled={isLoading}>
                  Resend code
                </button>
                <button type="button" className="auth-text-btn" onClick={() => setStep("details")} disabled={isLoading}>
                  Back
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
