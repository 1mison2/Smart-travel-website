import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import GoogleSignInButton from "../components/auth/GoogleSignInButton";
import authReference from "../assets/auth-reference.jpg";
import "./Auth.css";

export default function Login() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const validateForm = () => {
    const newErrors = {};

    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!form.password) {
      newErrors.password = "Password is required";
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
      const res = await api.post("/api/auth/login", form);
      login(res.data);
      navigate(res?.data?.user?.role === "admin" ? "/admin" : "/dashboard");
    } catch (error) {
      setErrors({
        general: error?.response?.data?.message || "Invalid email or password. Please try again.",
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
      login(res.data);
      navigate(res?.data?.user?.role === "admin" ? "/admin" : "/dashboard");
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

  return (
    <div className="auth-shell">
      <div className="auth-frame auth-frame--reverse">
        <section className="auth-panel">
          <div className="auth-panel__top">
            <Link to="/" className="auth-back" aria-label="Back to home">
              <ArrowLeft size={16} />
            </Link>
            <div className="auth-switch">
              <Link to="/signup" className="auth-switch__link">
                Register
              </Link>
              <Link to="/login" className="auth-switch__link is-active">
                Login
              </Link>
            </div>
          </div>

          <div className="auth-panel__head">
            <h2>Welcome back</h2>
            <p>Life is for adventure, let&apos;s travel.</p>
          </div>

          <form onSubmit={submit} className="auth-form">
            {errors.general && <div className="auth-error">{errors.general}</div>}

            <div className="auth-form__row">
              <div className={`auth-input-wrap ${errors.email ? "auth-input-wrap--error" : ""}`}>
                <Mail size={18} className="auth-input-icon" />
                <input
                  id="login-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Marco_polo001@gmail.com"
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
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
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
              {isLoading ? "Logging in..." : "Log In"}
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

          <div className="auth-footer">
            <Link to="/forgot-password" className="auth-inline-link">
              Forgot password?
            </Link>
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
            <p>
              Walk into mountain light, hidden valleys, and unforgettable routes with a travel platform designed
              for explorers.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
