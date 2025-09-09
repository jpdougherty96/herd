// src/components/Navbar.jsx
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

function NavLink({ to, children, onClick, active }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`px-3 py-2 rounded hover:bg-stone-100 ${
        active ? "font-semibold text-stone-900" : "text-stone-700"
      }`}
    >
      {children}
    </Link>
  );
}

export default function Navbar() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  async function logout() {
    try {
      await supabase.auth.signOut();
    } finally {
      window.location.href = "/"; // hard refresh to reset client state
    }
  }

  const isActive = (p) => pathname === p;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
        <div className="mx-auto max-w-6xl px-3 h-14 flex items-center justify-between">
          {/* Left: Brand */}
          <Link to="/bulletin" className="flex items-center gap-2" onClick={close}>
            <span className="text-lg font-extrabold tracking-tight">HERD</span>
            <span className="hidden sm:inline text-stone-500">Bulletin Board</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/bulletin" active={isActive("/bulletin") || isActive("/")}>Browse</NavLink>

            {user ? (
              <>
                <NavLink to="/bulletin/new" active={isActive("/bulletin/new")}>Post</NavLink>
                <NavLink to="/bulletin/mine" active={isActive("/bulletin/mine")}>My Listings</NavLink>
                <NavLink to="/messages" active={isActive("/messages")}>Messages</NavLink>
                <NavLink to="/profile" active={isActive("/profile")}>Profile</NavLink>
                <button
                  onClick={logout}
                  className="ml-1 px-3 py-2 rounded text-stone-700 hover:bg-stone-100"
                  title="Log out"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" active={isActive("/login")}>Log in</NavLink>
                <Link
                  to="/signup"
                  className="ml-1 px-3 py-2 rounded bg-stone-900 text-white hover:bg-stone-800"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded hover:bg-stone-100"
            aria-label="Open menu"
            aria-expanded={open ? "true" : "false"}
            onClick={() => setOpen(true)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile slide-over menu */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={close}
            aria-hidden="true"
          />
          {/* Panel */}
          <div className="absolute right-0 top-0 h-full w-[82%] max-w-xs bg-white shadow-xl border-l p-3 flex flex-col">
            <div className="flex items-center justify-between h-12">
              <span className="text-base font-bold">Menu</span>
              <button
                className="h-9 w-9 inline-flex items-center justify-center rounded hover:bg-stone-100"
                onClick={close}
                aria-label="Close menu"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="mt-2 flex-1 overflow-y-auto">
              <div className="flex flex-col">
                <NavLink to="/bulletin" onClick={close} active={isActive("/bulletin") || isActive("/")}>Browse</NavLink>

                {user ? (
                  <>
                    <NavLink to="/bulletin/new" onClick={close} active={isActive("/bulletin/new")}>
                      Post a Listing
                    </NavLink>
                    <NavLink to="/bulletin/mine" onClick={close} active={isActive("/bulletin/mine")}>
                      My Listings
                    </NavLink>
                    <NavLink to="/messages" onClick={close} active={isActive("/messages")}>
                      Messages
                    </NavLink>
                    <NavLink to="/profile" onClick={close} active={isActive("/profile")}>
                      Profile
                    </NavLink>
                  </>
                ) : (
                  <>
                    <NavLink to="/login" onClick={close} active={isActive("/login")}>
                      Log in
                    </NavLink>
                    <Link
                      to="/signup"
                      onClick={close}
                      className="mt-1 px-3 py-2 rounded bg-stone-900 text-white text-left"
                    >
                      Sign up
                    </Link>
                  </>
                )}
              </div>
            </div>

            {user ? (
              <button
                onClick={logout}
                className="w-full mt-2 px-3 py-2 rounded border text-left"
              >
                Logout
              </button>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
