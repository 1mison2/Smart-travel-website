import React, { useEffect, useState } from "react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function Dashboard(){
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(()=>{
    const load = async ()=>{
      try {
        const res = await api.get("/api/auth/me");
        setProfile(res.data.user);
      } catch (err) {
        console.error(err);
      }
    }
    load();
  },[]);

  return (
    <div style={{ padding: 20 }}>
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h1>Dashboard</h1>
        <div>
          <span>{user?.name}</span>
          <button onClick={logout} style={{ marginLeft: 12 }}>Logout</button>
        </div>
      </header>

      <main>
        <h3>Welcome, {profile?.name || user?.name}</h3>
        <p>Email: {profile?.email}</p>
      </main>
    </div>
  );
}
