import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import api from "../utils/api";
import "./Auth.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email is invalid";
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
      await api.post("/api/auth/forgot-password", { email });
      navigate(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (error) {
      setErrors({
        general: error?.response?.data?.message || "Failed to send reset code. Please try again.",
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
            <Link to="/login" className="auth-back" aria-label="Back to login">
              <ArrowLeft size={16} />
            </Link>
          </div>

          <div className="auth-panel__head">
            <h2>Forgot Password</h2>
            <p>Enter your email and we&apos;ll send you a reset code.</p>
          </div>

          <form onSubmit={submit} className="auth-form">
            {errors.general && <div className="auth-error">{errors.general}</div>}

            <div className="auth-form__row">
              <div className={`auth-input-wrap ${errors.email ? "auth-input-wrap--error" : ""}`}>
                <Mail size={18} className="auth-input-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled={isLoading}
                />
              </div>
              {errors.email && <p className="auth-field-error">{errors.email}</p>}
            </div>

            <button type="submit" className="auth-submit" disabled={isLoading}>
              {isLoading ? "Sending code..." : "Send Reset Code"}
              {!isLoading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Remember your password? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </section>

        <section className="auth-visual auth-visual--login">
          <div className="auth-visual__content">
            <p className="auth-visual__eyebrow">Secure Recovery</p>
            <h1>
              Reset access and get back to your <em>journey</em>.
            </h1>
            <p>We will send a 6-digit code to your email so you can safely change your password.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
