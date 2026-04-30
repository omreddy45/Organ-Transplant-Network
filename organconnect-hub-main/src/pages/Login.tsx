import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Heart, Droplet, Activity, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { useAuth, Role } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const handleReset = async () => {
    if (!forgotEmail || !newPassword) {
      return toast.error("Please provide both email and a new password.");
    }
    setResetLoading(true);
    try {
      await api.auth.resetPassword(forgotEmail, newPassword);
      toast.success("Password reset successfully. You can now log in.");
      setForgotOpen(false);
      setForgotEmail("");
      setNewPassword("");
    } catch (e: any) {
      toast.error(e.message || "Failed to reset password.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter your email and password");
      return;
    }
    setLoading(true);
    try {
      // Try real backend API first
      const data = await api.auth.login(email, password);
      login({
        id: String(data.user.id),
        email: data.user.email,
        name: data.user.name,
        role: data.user.role as Role,
        roleId: data.user.roleId,
        orgId: data.user.orgId,
        sessionId: data.sessionId,
      });
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate(`/dashboard/${data.user.role}`);
    } catch (apiError: any) {
      toast.error(apiError?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Decorative panel */}
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-primary p-12 flex-col justify-between">
        <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
        <Link to="/" className="relative z-10">
          <Logo />
        </Link>
        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-primary-foreground leading-tight">
            Welcome back to the network that saves lives.
          </h2>
          <p className="mt-4 text-primary-foreground/80 max-w-sm">
            Sign in to manage donations, requests, transplants and patients in one place.
          </p>
        </div>
        {/* Floating organ icons */}
        <div className="relative z-10 grid grid-cols-2 gap-4 max-w-xs">
          {[
            { icon: Heart, label: "Heart" },
            { icon: Droplet, label: "Kidney" },
            { icon: Activity, label: "Liver" },
            { icon: Wind, label: "Lung" },
          ].map((it, i) => (
            <div
              key={it.label}
              className="glass rounded-2xl p-4 animate-float"
              style={{ animationDelay: `${i * 0.4}s`, background: "rgba(255,255,255,0.1)" }}
            >
              <it.icon className="text-primary-foreground mb-2" size={20} />
              <div className="text-xs text-primary-foreground/90">{it.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-col items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex justify-center"><Logo /></div>
          <h1 className="text-3xl font-bold">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            New here?{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline">Create an account</Link>
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email" type="email" autoComplete="email" required
                placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 rounded-xl"
              />

            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1.5">
                <Input
                  id="password" type={show ? "text" : "password"} autoComplete="current-password" required
                  placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox /> Remember me
              </label>
              <button 
                type="button"
                onClick={() => setForgotOpen(true)}
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit" disabled={loading}
              className="w-full rounded-xl bg-gradient-primary shadow-glow hover:opacity-90 h-11"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Sign in"}
            </Button>
          </form>

          <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
            <DialogContent className="rounded-2xl sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Reset Password</DialogTitle>
                <DialogDescription>
                  Enter your email address and your new desired password to instantly reset it.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="forgotEmail">Email Address</Label>
                  <Input
                    id="forgotEmail"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="rounded-xl"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="rounded-xl"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" className="rounded-xl" onClick={() => setForgotOpen(false)}>
                  Cancel
                </Button>
                <Button className="rounded-xl bg-gradient-primary" onClick={handleReset} disabled={resetLoading}>
                  {resetLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                  Reset Password
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default Login;
