// src/App.jsx
import React, { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { AuthProvider } from "./context/AuthContext";
import { supabase } from "./lib/supabase";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import PrivateRoute from "./components/PrivateRoute";

// Bulletin pages
import BulletinList from "./pages/BulletinList";
import BulletinNew from "./pages/BulletinNew";
import BulletinDetail from "./pages/BulletinDetail";
import Messages from "./pages/Messages";
import BulletinMine from "./pages/BulletinMine";
import BulletinEdit from "./pages/BulletinEdit";

// Auth pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Profile page (rewritten)
import Profile from "./pages/Profile";

export default function App() {
  // Handle Supabase PKCE deep-links (?code=...) once, then clean URL
  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const errorDesc = url.searchParams.get("error_description");
        if (errorDesc) console.error("Auth error:", errorDesc);
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) console.error("exchangeCodeForSession failed:", error.message);
          ["code","type","error","error_description","scope","state","redirect_to"]
            .forEach(k => url.searchParams.delete(k));
          const clean = url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : "");
          window.history.replaceState({}, "", clean);
        }
      } catch (e) {
        console.error("Auth callback handling failed:", e);
      }
    })();
  }, []);

  return (
    <AuthProvider>
      <Navbar />
      <main className="min-h-[70vh]">
        <Routes>
          {/* Default → board (gated) */}
          <Route path="/" element={<PrivateRoute><BulletinList /></PrivateRoute>} />

          {/* Bulletin Board */}
          <Route path="/bulletin" element={<PrivateRoute><BulletinList /></PrivateRoute>} />
          <Route path="/bulletin/new" element={<PrivateRoute><BulletinNew /></PrivateRoute>} />
          <Route path="/bulletin/:id" element={<PrivateRoute><BulletinDetail /></PrivateRoute>} />
          <Route path="/bulletin/mine" element={<PrivateRoute><BulletinMine /></PrivateRoute>} />
          <Route path="/bulletin/:id/edit" element={<PrivateRoute><BulletinEdit /></PrivateRoute>} />

          {/* Messages */}
          <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />

          {/* Profile (display name for chat) */}
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Fallback */}
          <Route path="*" element={<PrivateRoute><BulletinList /></PrivateRoute>} />
        </Routes>
      </main>
      <Footer />
      <Toaster position="top-right" />
    </AuthProvider>
  );
}
