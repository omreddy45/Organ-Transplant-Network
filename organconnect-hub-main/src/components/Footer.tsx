import { Link } from "react-router-dom";
import { Twitter, Linkedin, Instagram, Mail } from "lucide-react";
import { Logo } from "./Logo";

export const Footer = () => (
  <footer className="border-t border-border/40 mt-24">
    <div className="container py-12 grid gap-10 md:grid-cols-3">
      <div>
        <Logo />
        <p className="mt-4 text-sm text-muted-foreground max-w-xs">
          Connecting donors, patients, doctors, and hospitals to save lives — one organ at a time.
        </p>
        <div className="mt-4 flex gap-3 text-muted-foreground">
          <a href="#" aria-label="Twitter" className="hover:text-foreground transition-colors"><Twitter size={18} /></a>
          <a href="#" aria-label="LinkedIn" className="hover:text-foreground transition-colors"><Linkedin size={18} /></a>
          <a href="#" aria-label="Instagram" className="hover:text-foreground transition-colors"><Instagram size={18} /></a>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-3">Quick Links</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><Link to="/organs" className="hover:text-foreground">Browse Organs</Link></li>
          <li><Link to="/signup" className="hover:text-foreground">Become a Donor</Link></li>
          <li><Link to="/login" className="hover:text-foreground">Login</Link></li>
          <li><a href="#how" className="hover:text-foreground">How It Works</a></li>
        </ul>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-3">Contact</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2"><Mail size={14} /> hello@organconnect.org</li>
          <li>24/7 Helpline: 1800-DONATE</li>
        </ul>
      </div>
    </div>
    <div className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
      © {new Date().getFullYear()} OrganConnect. All rights reserved.
    </div>
  </footer>
);
