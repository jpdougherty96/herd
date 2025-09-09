// src/components/Navbar.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const loc = useLocation();

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-green-700">HERD</Link>

        <div className="flex items-center gap-6">
          {/* Always visible; gated by PrivateRoute once clicked */}
          <Link
            to="/bulletin"
            className={linkClass(loc.pathname.startsWith("/bulletin") || loc.pathname === "/")}
          >
            Bulletin Board
          </Link>

          {user ? (
            <>
              <Link
                to="/bulletin/mine"
                className={linkClass(loc.pathname.startsWith("/bulletin/mine"))}
              >
                My Listings
              </Link>
              <Link
                to="/messages"
                className={linkClass(loc.pathname.startsWith("/messages"))}
              >
                Messages
              </Link>
              <Link
                to="/profile"
                className={linkClass(loc.pathname.startsWith("/profile"))}
              >
                Profile
              </Link>
              <button onClick={signOut} className="text-red-600 hover:underline">
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={linkClass(loc.pathname === "/login")}>
                Log In
              </Link>
              <Link to="/signup" className={linkClass(loc.pathname === "/signup")}>
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function linkClass(active) {
  return `hover:underline ${active ? "font-semibold" : ""}`;
}
