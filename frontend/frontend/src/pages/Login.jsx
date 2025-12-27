import React, { useState } from "react";
import api from "../utils/api";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";
import plane from "../assets/plane.svg";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const res = await api.post("/api/auth/login", form);
      login(res.data);
      navigate("/dashboard");
    } catch (error) {
      setErr(error?.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="page-wrap">
      <header className="topbar">
        <div className="topbar-inner">
          <button className="get-started">Get Started</button>
        </div>
      </header>

      <main className="center-area">
        <div className="card-wrap">
          <img src={plane} alt="plane" aria-hidden className="plane-float" />

          <div className="auth-card">
            <button className="card-close" aria-label="Close">×</button>
            <h2 className="title">Sign in</h2>

            <form onSubmit={submit}>
              <input className="input" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <input className="input" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />

              <div className="row">
                <label className="remember"><input type="checkbox" /> Remember me</label>
                <Link to="/forgot" className="small-link">Forgot password</Link>
              </div>

              {err && <div className="error" role="alert">{err}</div>}

              <button className="btn-small" type="submit">Sign in</button>
            </form>

            <div className="alt">Don't have an account? <Link to="/signup">Register</Link></div>
          </div>
        </div>
      </main>
    </div>
  );
}
