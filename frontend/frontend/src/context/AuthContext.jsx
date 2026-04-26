/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../utils/api";

const AuthContext = createContext();

function readStoredUser() {
  try {
    const raw = localStorage.getItem("st_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readStoredToken() {
  try {
    return localStorage.getItem("st_token") || null;
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => readStoredUser());
  const [token, setToken] = useState(() => readStoredToken());
  const [ready, setReady] = useState(() => {
    const storedToken = readStoredToken();
    const storedUser = readStoredUser();
    return !storedToken || Boolean(storedUser);
  });

  useEffect(() => {
    if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    else delete api.defaults.headers.common["Authorization"];
  }, [token]);

  useEffect(() => {
    let active = true;
    const syncUser = async () => {
      if (!token) {
        if (active) setReady(true);
        return;
      }
      try {
        const { data } = await api.get("/api/auth/me");
        if (!active) return;
        const nextUser = data?.user || null;
        setUser(nextUser);
        if (nextUser) {
          localStorage.setItem("st_user", JSON.stringify(nextUser));
        } else {
          localStorage.removeItem("st_user");
        }
      } catch {
        if (!active) return;
        setToken(null);
        setUser(null);
        localStorage.removeItem("st_token");
        localStorage.removeItem("st_user");
        delete api.defaults.headers.common["Authorization"];
      } finally {
        if (active) setReady(true);
      }
    };
    syncUser();
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token && user) {
      setUser(null);
      localStorage.removeItem("st_user");
    }
  }, [token, user]);

  const login = ({ token, user }) => {
    setToken(token);
    setUser(user);
    localStorage.setItem("st_token", token);
    localStorage.setItem("st_user", JSON.stringify(user));
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("st_token");
    localStorage.removeItem("st_user");
    delete api.defaults.headers.common["Authorization"];
  };

  const updateUser = (nextUser) => {
    setUser(nextUser);
    if (nextUser) {
      localStorage.setItem("st_user", JSON.stringify(nextUser));
    } else {
      localStorage.removeItem("st_user");
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, ready, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
