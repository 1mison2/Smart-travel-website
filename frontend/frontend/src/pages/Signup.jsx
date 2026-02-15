import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, User, Lock, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

export default function Signup() {
  const [form, setForm] = useState({ 
    name: "", 
    email: "", 
    password: "",
    confirmPassword: ""
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
        password: form.password
      });
      login(res.data);
      navigate(res?.data?.user?.role === "admin" ? "/admin" : "/dashboard");
    } catch (error) {
      setErrors({ 
        general: error?.response?.data?.message || "Registration failed. Please try again." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-container" style={{
      height: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        opacity: 0.3
      }} />

      {/* Signup Card */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '2rem',
        width: '100%',
        maxWidth: '450px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Header */}
        <div style={{textAlign: 'center', marginBottom: '2rem'}}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#2d3748',
            marginBottom: '0.5rem'
          }}>Create Account</h1>
          <p style={{
            color: '#718096',
            fontSize: '1rem',
            margin: 0
          }}>Join Smart Travel and start your journey</p>
        </div>

        {/* Form */}
        <form onSubmit={submit} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
          {errors.general && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', 
              border: '1px solid rgba(248,113,113,0.3)', 
              color: '#e53e3e', 
              padding: '0.75rem 1rem', 
              borderRadius: '12px', 
              fontSize: '0.875rem', 
              textAlign: 'center'
            }}>
              {errors.general}
            </div>
          )}

          {/* Name Field */}
          <div>
            <label style={{
              display: 'block',
              color: '#4a5568',
              fontSize: '0.875rem',
              fontWeight: '500',
              marginBottom: '0.5rem'
            }}>Full Name</label>
            <div style={{position: 'relative', overflow: 'hidden'}}>
              <User style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
                color: '#a0aec0',
                zIndex: 1
              }} />
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 48px',
                  border: errors.name ? '2px solid #e53e3e' : '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  background: '#f7fafc',
                  color: '#2d3748',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                placeholder="Enter your full name"
                disabled={isLoading}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.name ? '#e53e3e' : '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            {errors.name && (
              <p style={{
                color: '#e53e3e', 
                fontSize: '0.875rem', 
                marginTop: '0.25rem'
              }}>{errors.name}</p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label style={{
              display: 'block',
              color: '#4a5568',
              fontSize: '0.875rem',
              fontWeight: '500',
              marginBottom: '0.5rem'
            }}>Email Address</label>
            <div style={{position: 'relative', overflow: 'hidden'}}>
              <Mail style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
                color: '#a0aec0',
                zIndex: 1
              }} />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 48px',
                  border: errors.email ? '2px solid #e53e3e' : '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  background: '#f7fafc',
                  color: '#2d3748',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                placeholder="Enter your email"
                disabled={isLoading}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.email ? '#e53e3e' : '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            {errors.email && (
              <p style={{
                color: '#e53e3e', 
                fontSize: '0.875rem', 
                marginTop: '0.25rem'
              }}>{errors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label style={{
              display: 'block',
              color: '#4a5568',
              fontSize: '0.875rem',
              fontWeight: '500',
              marginBottom: '0.5rem'
            }}>Password</label>
            <div style={{position: 'relative', overflow: 'hidden'}}>
              <Lock style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
                color: '#a0aec0',
                zIndex: 1
              }} />
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 48px 12px 48px',
                  border: errors.password ? '2px solid #e53e3e' : '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  background: '#f7fafc',
                  color: '#2d3748',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                placeholder="Enter your password"
                disabled={isLoading}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.password ? '#e53e3e' : '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  zIndex: 2
                }}
              >
                {showPassword ? (
                  <EyeOff style={{width: '20px', height: '20px', color: '#a0aec0'}} />
                ) : (
                  <Eye style={{width: '20px', height: '20px', color: '#a0aec0'}} />
                )}
              </button>
            </div>
            {errors.password && (
              <p style={{
                color: '#e53e3e', 
                fontSize: '0.875rem', 
                marginTop: '0.25rem'
              }}>{errors.password}</p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label style={{
              display: 'block',
              color: '#4a5568',
              fontSize: '0.875rem',
              fontWeight: '500',
              marginBottom: '0.5rem'
            }}>Confirm Password</label>
            <div style={{position: 'relative', overflow: 'hidden'}}>
              <Lock style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
                color: '#a0aec0',
                zIndex: 1
              }} />
              <input
                type={showPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 48px',
                  border: errors.confirmPassword ? '2px solid #e53e3e' : '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  background: '#f7fafc',
                  color: '#2d3748',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                placeholder="Confirm your password"
                disabled={isLoading}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.confirmPassword ? '#e53e3e' : '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            {errors.confirmPassword && (
              <p style={{
                color: '#e53e3e', 
                fontSize: '0.875rem', 
                marginTop: '0.25rem'
              }}>{errors.confirmPassword}</p>
            )}
          </div>

          {/* Terms and Conditions */}
          <div style={{display: 'flex', alignItems: 'flex-start', gap: '0.5rem'}}>
            <input
              type="checkbox"
              required
              style={{
                marginTop: '0.25rem',
                width: '16px',
                height: '16px',
                accentColor: '#667eea'
              }}
              disabled={isLoading}
            />
            <label style={{
              fontSize: '0.875rem',
              color: '#4a5568',
              lineHeight: '1.5'
            }}>
              I agree to the{" "}
              <Link 
                to="/terms" 
                style={{
                  color: '#667eea',
                  fontWeight: '600',
                  textDecoration: 'none'
                }}
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link 
                to="/privacy" 
                style={{
                  color: '#667eea',
                  fontWeight: '600',
                  textDecoration: 'none'
                }}
              >
                Privacy Policy
              </Link>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 10px 25px rgba(102, 126, 234, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }
            }}
          >
            {isLoading ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid white',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Creating Account...
              </div>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                Create Account
                <ArrowRight style={{
                  width: '20px', 
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center'
                }} />
              </div>
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '2rem',
          paddingTop: '2rem',
          borderTop: '1px solid #e2e8f0'
        }}>
          <p style={{
            color: '#718096',
            fontSize: '0.875rem',
            margin: '0 0 1rem 0'
          }}>
            Already have an account?{' '}
            <Link 
              to="/login" 
              style={{
                color: '#667eea',
                fontWeight: '600',
                textDecoration: 'none'
              }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Add CSS for no scroll */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        body {
          overflow: hidden;
          margin: 0;
          padding: 0;
        }
        .signup-container {
          overflow: hidden !important;
        }
      `}</style>
    </div>
  );
}
