import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, Shield } from "lucide-react";
import api from "../utils/api";
import "./Auth.css";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const emailFromQuery = useMemo(() => searchParams.get("email") || "", [searchParams]);
  const [form, setForm] = useState({
    email: emailFromQuery,
    code: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};

    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!form.code.trim()) {
      newErrors.code = "Reset code is required";
    } else if (!/^\d{6}$/.test(form.code.trim())) {
      newErrors.code = "Enter the 6-digit code sent to your email";
    }

    if (!form.password) {
      newErrors.password = "Password is required";
    } else if (form.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    return newErrors;
  };

  const submit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      await api.post("/api/auth/reset-password", {
        email: form.email.trim(),
        code: form.code.trim(),
        password: form.password,
      });
      setIsSuccess(true);
    } catch (error) {
      setErrors({
        general: error?.response?.data?.message || "Failed to reset password. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="auth-shell">
        <div className="auth-frame auth-frame--reverse">
          <section className="auth-panel">
            <div className="auth-panel__head">
              <h2>Password Updated</h2>
              <p>Your password has been changed successfully. You can now log in with your new password.</p>
            </div>

            <button type="button" className="auth-submit" onClick={() => navigate("/login")}>
              Go To Login
            </button>
          </section>

          <section className="auth-visual auth-visual--login">
            <div className="auth-visual__content">
              <p className="auth-visual__eyebrow">All Set</p>
              <h1>
                Your account is ready for the next <em>trip</em>.
              </h1>
              <p>Sign in again and continue planning, booking, and exploring with your updated password.</p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-frame auth-frame--reverse">
        <section className="auth-panel">
          <div className="auth-panel__top">
            <Link to="/forgot-password" className="auth-back" aria-label="Back to forgot password">
              <ArrowLeft size={16} />
            </Link>
          </div>

          <div className="auth-panel__head">
            <h2>Change Password</h2>
            <p>Enter the reset code from your email and choose a new password.</p>
          </div>

          <form onSubmit={submit} className="auth-form">
            {errors.general && <div className="auth-error">{errors.general}</div>}

            <div className="auth-form__row">
              <div className={`auth-input-wrap ${errors.email ? "auth-input-wrap--error" : ""}`}>
                <Mail size={18} className="auth-input-icon" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Email address"
                  disabled={isLoading}
                />
              </div>
              {errors.email && <p className="auth-field-error">{errors.email}</p>}
            </div>

            <div className="auth-form__row">
              <div className={`auth-input-wrap ${errors.code ? "auth-input-wrap--error" : ""}`}>
                <Shield size={18} className="auth-input-icon" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.replace(/\D/g, "") })}
                  placeholder="6-digit reset code"
                  disabled={isLoading}
                />
              </div>
              {errors.code && <p className="auth-field-error">{errors.code}</p>}
            </div>

            <div className="auth-form__row">
              <div className={`auth-input-wrap ${errors.password ? "auth-input-wrap--error" : ""}`}>
                <Lock size={18} className="auth-input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="New password"
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
                  type={showPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  disabled={isLoading}
                />
              </div>
              {errors.confirmPassword && <p className="auth-field-error">{errors.confirmPassword}</p>}
            </div>

            <button type="submit" className="auth-submit" disabled={isLoading}>
              {isLoading ? "Changing password..." : "Change Password"}
              {!isLoading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Didn&apos;t get a code? <Link to="/forgot-password">Send it again</Link>
            </p>
          </div>
        </section>

        <section className="auth-visual auth-visual--login">
          <div className="auth-visual__content">
            <p className="auth-visual__eyebrow">Password Recovery</p>
            <h1>
              Enter your code and keep your account <em>secure</em>.
            </h1>
            <p>A short 6-digit code from your email is all you need to create a fresh password and get back in.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
