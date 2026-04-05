import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import GoogleSignInButton from "../components/auth/GoogleSignInButton";
import authReference from "../assets/auth-reference.jpg";
import "./Auth.css";

export default function Signup() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const validateForm = () => {
    const newErrors = {};

    if (!form.name.trim()) {
      newErrors.name = "Full name is required";
    } else if (form.name.length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = "Email is invalid";
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
      const res = await api.post("/api/auth/signup", {
        name: form.name,
        email: form.email,
        password: form.password,
      });
      login(res.data);
      navigate(res?.data?.user?.role === "admin" ? "/admin" : "/dashboard");
    } catch (error) {
      setErrors({
        general: error?.response?.data?.message || "Registration failed. Please try again.",
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
      setErrors({
        general: error?.response?.data?.message || "Google sign-up failed. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-frame">
        <section
          className="auth-visual"
          style={{ "--auth-visual-image": `url(${authReference})` }}
        >
          <div className="auth-visual__content">
            <p className="auth-visual__eyebrow">Your Adventure</p>
            <h1>
              Start <strong>here</strong> with every route ready for a new <em>story</em>.
            </h1>
            <p>
              Create your account and explore destinations, smarter planning, and a cleaner travel experience
              built around Nepal.
            </p>
          </div>
        </section>

        <section className="auth-panel">
          <div className="auth-panel__top">
            <Link to="/" className="auth-back" aria-label="Back to home">
              <ArrowLeft size={16} />
            </Link>
            <div className="auth-switch">
              <Link to="/signup" className="auth-switch__link is-active">
                Register
              </Link>
              <Link to="/login" className="auth-switch__link">
                Login
              </Link>
            </div>
          </div>

          <div className="auth-panel__head">
            <h2>Create New Account</h2>
            <p>Start your journey to travelling here.</p>
          </div>

          <form onSubmit={submit} className="auth-form">
            {errors.general && <div className="auth-error">{errors.general}</div>}

            <div className="auth-form__split">
              <div className="auth-form__row">
                <div className={`auth-input-wrap ${errors.name ? "auth-input-wrap--error" : ""}`}>
                  <User size={18} className="auth-input-icon" />
                  <input
                    id="signup-name"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="First name"
                    disabled={isLoading}
                  />
                </div>
                {errors.name && <p className="auth-field-error">{errors.name}</p>}
              </div>

              <div className="auth-form__row">
                <div className={`auth-input-wrap ${errors.name ? "auth-input-wrap--error" : ""}`}>
                  <User size={18} className="auth-input-icon" />
                  <input
                    type="text"
                    value={form.name.split(" ").slice(1).join(" ")}
                    onChange={(e) => {
                      const first = form.name.split(" ")[0] || "";
                      setForm({ ...form, name: `${first} ${e.target.value}`.trim() });
                    }}
                    placeholder="Last name"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            <div className="auth-form__row">
              <div className={`auth-input-wrap ${errors.email ? "auth-input-wrap--error" : ""}`}>
                <Mail size={18} className="auth-input-icon" />
                <input
                  id="signup-email"
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
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Create a password"
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
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  placeholder="Confirm password"
                  disabled={isLoading}
                />
              </div>
              {errors.confirmPassword && <p className="auth-field-error">{errors.confirmPassword}</p>}
            </div>

            <button type="submit" className="auth-submit" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Let's Start Your Journey"}
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
        </section>
      </div>
    </div>
  );
}
