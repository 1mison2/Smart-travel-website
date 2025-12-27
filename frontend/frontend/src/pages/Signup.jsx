import React, { useState } from "react";
import api from "../utils/api";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";
import plane from "../assets/plane.svg";

export default function Signup() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const res = await api.post("/api/auth/register", form);
      login(res.data);
      navigate("/dashboard");
    } catch (error) {
      setErr(error?.response?.data?.message || "Registration failed");
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
            <h2 className="title">Sign up</h2>

            <form onSubmit={submit}>
              <input className="input" placeholder="Name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <input className="input" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <input className="input" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />

              <label className="checkbox-row"><input type="checkbox" required /> I agree to the terms & conditions.</label>

              {err && <div className="error" role="alert">{err}</div>}

              <button className="btn-small" type="submit">Sign up</button>
            </form>

            <div className="alt">Already have an account? <Link to="/login">Login</Link></div>
          </div>
        </div>
      </main>
    </div>
  );
}
