"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { signOutCurrentUser, subscribeToAuthState } from "@/lib/firebase/trading-service";
import { IconHome, IconDashboard, IconSettings, IconLogin, IconSignOut } from "./icons";

const navItems = [
  { href: "/", label: "Home", Icon: IconHome },
  { href: "/dashboard", label: "Dashboard", Icon: IconDashboard },
  { href: "/settings", label: "Settings", Icon: IconSettings },
  { href: "/login", label: "Login", Icon: IconLogin },
];

export default function TopNavigation() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeToAuthState(setUser), []);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  // Close on route change
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: "rgba(4,6,15,0.82)",
        borderBottom: "1px solid rgba(99,179,237,0.1)",
        backdropFilter: "blur(24px) saturate(1.5)",
      }}
    >
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-10">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 select-none"
          style={{ textDecoration: "none" }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "2rem",
              height: "2rem",
              borderRadius: "0.625rem",
              background: "linear-gradient(135deg, #0ea5e9, #34d399)",
              fontSize: "0.875rem",
              fontWeight: 900,
              color: "#01080f",
            }}
          >
            G
          </span>
          <span
            style={{
              fontSize: "1rem",
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#e0f2fe",
            }}
          >
            Grid
            <span style={{ color: "#38bdf8" }}>Pilot</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navItems
            .filter((item) => !(item.href === "/login" && user))
            .map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className={`nav-link${isActive ? " active" : ""}`}>
                  <item.Icon size="0.9em" />
                  {item.label}
                </Link>
              );
            })}

          {user ? (
            <div className="ml-2 flex items-center gap-2">
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--fg-2)",
                  maxWidth: "160px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user.email}
              </span>
              <button
                className="btn btn-sm btn-secondary"
                type="button"
                onClick={signOutCurrentUser}
                style={{ gap: "0.375rem" }}
              >
                <IconSignOut size="0.9em" />
                Sign out
              </button>
            </div>
          ) : null}
        </div>

        {/* Mobile hamburger */}
        <button
          className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 rounded-xl md:hidden"
          style={{ border: "1px solid rgba(99,179,237,0.2)", background: "rgba(13,21,40,0.8)" }}
          type="button"
          aria-label="Toggle menu"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <span
            style={{
              display: "block",
              width: "1.125rem",
              height: "2px",
              background: menuOpen ? "var(--brand)" : "var(--fg-2)",
              borderRadius: "2px",
              transition: "all 200ms",
              transform: menuOpen ? "rotate(45deg) translate(3px, 3px)" : "none",
            }}
          />
          <span
            style={{
              display: "block",
              width: "1.125rem",
              height: "2px",
              background: menuOpen ? "transparent" : "var(--fg-2)",
              borderRadius: "2px",
              transition: "all 200ms",
            }}
          />
          <span
            style={{
              display: "block",
              width: "1.125rem",
              height: "2px",
              background: menuOpen ? "var(--brand)" : "var(--fg-2)",
              borderRadius: "2px",
              transition: "all 200ms",
              transform: menuOpen ? "rotate(-45deg) translate(3px, -3px)" : "none",
            }}
          />
        </button>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen ? (
        <div
          ref={menuRef}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "rgba(4,6,15,0.97)",
            borderBottom: "1px solid rgba(99,179,237,0.14)",
            backdropFilter: "blur(24px)",
            padding: "0.75rem 1rem 1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          {navItems
            .filter((item) => !(item.href === "/login" && user))
            .map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.875rem",
                    fontWeight: 700,
                    fontSize: "0.9375rem",
                    color: isActive ? "var(--brand)" : "var(--fg-2)",
                    background: isActive ? "var(--brand-dim)" : "transparent",
                    textDecoration: "none",
                    transition: "background 120ms, color 120ms",
                  }}
                >
                  <item.Icon size="1.1em" style={{ opacity: 0.7 }} />
                  {item.label}
                </Link>
              );
            })}

          {user ? (
            <div
              style={{
                marginTop: "0.5rem",
                padding: "0.75rem 1rem",
                borderRadius: "0.875rem",
                borderTop: "1px solid rgba(99,179,237,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.75rem",
              }}
            >
              <span style={{ fontSize: "0.8rem", color: "var(--fg-2)", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.email}
              </span>
              <button
                className="btn btn-sm btn-secondary"
                type="button"
                onClick={signOutCurrentUser}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
              >
                <IconSignOut size="0.9em" />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}