import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import { clearAuthRedirect } from "../utils/authRedirect";
import { validateEmail } from "../utils/authValidation";
import GoogleSignInButton from "../components/auth/GoogleSignInButton";
import authReference from "../assets/auth-reference.jpg";
import "./Auth.css";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [verificationCode, setVerificationCode] = useState("");
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState("credentials");
  const [pendingEmail, setPendingEmail] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const validateCredentials = () => {
    const nextErrors = {};
    if (!form.email.trim()) nextErrors.email = "Email is required";
    else if (!validateEmail(form.email)) nextErrors.email = "Enter a valid email address";
    if (!form.password) nextErrors.password = "Password is required";
    return nextErrors;
  };

  const validateCode = () => {
    const code = verificationCode.trim();
    if (!code) return "Verification code is required";
    if (!/^\d{6}$/.test(code)) return "Verification code must be 6 digits";
    return "";
  };

  const finishLogin = (payload) => {
    login(payload);
    clearAuthRedirect();
    navigate(payload?.user?.role === "admin" ? "/admin" : "/dashboard", { replace: true });
  };

  const submitCredentials = async (event) => {
    event.preventDefault();
    const nextErrors = validateCredentials();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});
    try {
      const res = await api.post("/api/auth/login", {
        email: form.email.trim(),
        password: form.password,
      });

      if (res.data?.requiresCode) {
        setPendingEmail(res.data.email || form.email.trim().toLowerCase());
        setStep(res.data.purpose === "signup" ? "signup-code" : "code");
        setVerificationCode("");
        return;
      }

      finishLogin(res.data);
    } catch (error) {
      const message = error?.response?.data?.message || "Unable to continue login. Please try again.";
      if (error?.response?.data?.requiresCode) {
        setPendingEmail(error?.response?.data?.email || form.email.trim().toLowerCase());
        setStep(error?.response?.data?.purpose === "signup" ? "signup-code" : "code");
        setVerificationCode("");
        setErrors({ general: message });
      } else {
        setErrors({ general: message });
      }
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
      const endpoint = step === "signup-code" ? "/api/auth/verify-signup" : "/api/auth/verify-login";
      const res = await api.post(endpoint, {
        email: pendingEmail,
        code: verificationCode.trim(),
      });
      finishLogin(res.data);
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
        purpose: step === "signup-code" ? "signup" : "login",
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

  const backToCredentials = () => {
    setStep("credentials");
    setVerificationCode("");
    setErrors({});
  };

  const onGoogleCredential = async (idToken) => {
    setIsLoading(true);
    setErrors({});
    try {
      const res = await api.post("/api/auth/google", { idToken });
      finishLogin(res.data);
    } catch (error) {
      const isServerUnavailable = !error?.response;
      setErrors({
        general: isServerUnavailable
          ? "The server is not responding right now. Please restart the backend and try again."
          : error?.response?.data?.message || "Google sign-in failed. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isCodeStep = step === "code" || step === "signup-code";

  return (
    <div className="auth-shell">
      <div className="auth-frame auth-frame--reverse">
        <section className="auth-panel">
          <div className="auth-panel__top">
            <Link to="/" state={location.state} className="auth-back" aria-label="Back to home">
              <ArrowLeft size={16} />
            </Link>
            <div className="auth-switch">
              <Link to="/signup" state={location.state} className="auth-switch__link">
                Register
              </Link>
              <Link to="/login" className="auth-switch__link is-active">
                Login
              </Link>
            </div>
          </div>

          <div className="auth-panel__head">
            <h2>{isCodeStep ? "Check your email" : "Welcome back"}</h2>
            {isCodeStep && <p>{`Enter the 6-digit code sent to ${pendingEmail}.`}</p>}
          </div>

          {!isCodeStep ? (
            <form onSubmit={submitCredentials} className="auth-form">
              {errors.general && <div className="auth-error">{errors.general}</div>}

              <div className="auth-form__row">
                <div className={`auth-input-wrap ${errors.email ? "auth-input-wrap--error" : ""}`}>
                  <Mail size={18} className="auth-input-icon" />
                  <input
                    id="login-email"
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
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                    placeholder="Enter your password"
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

              <button type="submit" className="auth-submit" disabled={isLoading}>
                {isLoading ? "Checking credentials..." : "Continue"}
              </button>

              <div className="auth-google">
                <GoogleSignInButton
                  onCredential={onGoogleCredential}
                  onError={(message) => setErrors({ general: message })}
                  disabled={isLoading}
                  text="signin_with"
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
                  <strong>{step === "signup-code" ? "Verify your account" : "Finish signing in"}</strong>
                  <p>
                    {step === "signup-code"
                      ? "We sent a signup verification code to your email."
                      : "We sent a one-time login code to your email."}
                  </p>
                </div>
              </div>

              <div className="auth-form__row">
                <div className={`auth-input-wrap ${errors.code ? "auth-input-wrap--error" : ""}`}>
                  <ShieldCheck size={18} className="auth-input-icon" />
                  <input
                    id="login-code"
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
                <button type="button" className="auth-text-btn" onClick={backToCredentials} disabled={isLoading}>
                  Back
                </button>
              </div>
            </form>
          )}

          <div className="auth-footer">
            {!isCodeStep && (
              <Link to="/forgot-password" className="auth-inline-link">
                Forgot password?
              </Link>
            )}
          </div>
        </section>

        <section
          className="auth-visual auth-visual--login"
          style={{ "--auth-visual-image": `url(${authReference})` }}
        >
          <div className="auth-visual__content">
            <p className="auth-visual__eyebrow">Smart Travel Nepal</p>
            <h1>
              Every destination has a <em>story</em>.
            </h1>
          </div>
        </section>
      </div>
    </div>
  );
}
