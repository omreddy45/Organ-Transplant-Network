import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Organs", href: "/organs" },
  { label: "How It Works", href: "/#how" },
  { label: "About", href: "/#about" },
];

export const PublicNavbar = () => {
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="glass-strong border-b border-border/40">
        <nav className="container flex h-16 items-center justify-between">
          <Link to="/" aria-label="OrganConnect home" onClick={() => {
            if (location.pathname === "/") window.scrollTo({ top: 0, behavior: "smooth" });
          }}>
            <Logo />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => {
                  if (item.href === "/" && location.pathname === "/") window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={cn(
                  "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  location.pathname === item.href && "text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="rounded-xl"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
            {user ? (
              <Button asChild className="rounded-xl">
                <Link to={`/dashboard/${user.role}`}>Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" className="rounded-xl">
                  <Link to="/login">Login</Link>
                </Button>
                <Button asChild className="rounded-xl bg-gradient-primary shadow-glow hover:opacity-90">
                  <Link to="/signup">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          <button
            className="md:hidden rounded-xl p-2 hover:bg-muted"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>

        {open && (
          <div className="md:hidden border-t border-border/40 animate-fade-in">
            <div className="container flex flex-col gap-2 py-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => {
                    setOpen(false);
                    if (item.href === "/" && location.pathname === "/") window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex gap-2 pt-2">
                <Button asChild variant="outline" className="flex-1 rounded-xl">
                  <Link to="/login">Login</Link>
                </Button>
                <Button asChild className="flex-1 rounded-xl bg-gradient-primary">
                  <Link to="/signup">Get Started</Link>
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={toggleTheme} className="justify-start gap-2">
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />} Toggle theme
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
