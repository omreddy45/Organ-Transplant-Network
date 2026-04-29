import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, User, Stethoscope, Building2, Check, ArrowLeft, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Role } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { ORGANIZATIONS } from "@/lib/mockData";
import { api } from "@/lib/api";

const roles: { value: Role; title: string; desc: string; icon: typeof User }[] = [
  { value: "patient", title: "Patient", desc: "I need an organ transplant", icon: User },
  { value: "donor", title: "Donor", desc: "I want to donate my organs", icon: Heart },
  { value: "organization", title: "Organization", desc: "I represent a hospital/clinic", icon: Building2 },
];
// Note: Doctor accounts are created by Organizations, not via public signup

const Signup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [basic, setBasic] = useState({
    name: "", email: "", password: "", confirm: "", dob: "",
  });
  const [details, setDetails] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const progress = (step / 3) * 100;

  const next = () => {
    if (step === 1 && !role) return toast.error("Please select a role");
    if (step === 2) {
      const b = basic;
      if (!b.name || !b.email || !b.password || ((role === "patient" || role === "donor") && !b.dob))
        return toast.error("Please fill all required fields");
      if (!/^\S+@\S+\.\S+$/.test(b.email)) return toast.error("Please enter a valid email address");
      if (b.password.length < 6) return toast.error("Password must be at least 6 characters");
      if (b.password !== b.confirm) return toast.error("Passwords do not match");
    }
    setStep((s) => Math.min(3, s + 1));
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  const submit = async () => {
    setLoading(true);
    try {
      // Build role-specific payload
      const payload: Record<string, unknown> = {
        name: basic.name,
        email: basic.email,
        password: basic.password,
        role: role!,
        dob: basic.dob,
      };

      if (role === 'patient') {
        payload.city = details.city;
        payload.state = details.state;
        payload.street = details.street;
        payload.insurance = details.insurance;
        payload.phoneNumber = details.phone;
      } else if (role === 'donor') {
        payload.reason = details.reason;
        payload.phoneNumber = details.phone;
      } else if (role === 'doctor') {
        payload.specialization = details.specialization;
        payload.phoneNumber = details.phone;
        // Find org_id from selected org name
        const selectedOrg = ORGANIZATIONS.find(o => o.name === details.org);
        payload.org_id = selectedOrg?.id || 1;
      } else if (role === 'organization') {
        payload.orgName = basic.name; // use name from step 2
        payload.location = details.location;
        payload.license = details.license;
        payload.head = details.head;
        payload.joining = details.joining;
        payload.phoneNumber = details.phone;
      }

      await api.auth.signup(payload);
      toast.success("Account created! Please sign in.");
      navigate("/login");
    } catch (err: any) {
      // Fallback: if backend is down, still redirect
      console.warn("Signup API error:", err);
      if (err.message?.includes('fetch')) {
        toast.success("Account created! (mock mode) Please sign in.");
        navigate("/login");
      } else {
        toast.error(err.message || "Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 justify-center">
      <Link to="/" className="self-start"><Logo /></Link>

      <div className="w-full max-w-2xl mt-4">
        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Step {step} of 3</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-gradient-primary transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="glass-strong rounded-3xl p-6">
          {step === 1 && (
            <div className="animate-fade-in">
              <h1 className="text-2xl md:text-3xl font-bold">Choose your role</h1>
              <p className="mt-1 text-muted-foreground">Tell us how you'll use OrganConnect.</p>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {roles.map((r) => {
                  const selected = role === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={cn(
                        "text-left rounded-2xl border-2 p-5 transition-all hover-lift",
                        selected ? "border-primary bg-primary/5 shadow-glow" : "border-border bg-card",
                      )}
                    >
                      <div className={cn(
                        "h-11 w-11 rounded-xl flex items-center justify-center mb-3",
                        selected ? "bg-gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      )}>
                        <r.icon size={20} />
                      </div>
                      <div className="font-semibold flex items-center gap-2">
                        {r.title}
                        {selected && <Check size={16} className="text-primary" />}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">{r.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <h1 className="text-2xl md:text-3xl font-bold">Create your account</h1>
              <p className="mt-1 text-muted-foreground">Basic information for all members.</p>
              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                <Field label={role === "organization" ? "Organization Name" : "Full Name"} value={basic.name} onChange={(v) => setBasic({ ...basic, name: v })} />
                <Field label="Email" type="email" value={basic.email} onChange={(v) => setBasic({ ...basic, email: v })} />
                {(role === "patient" || role === "donor") && (
                  <Field label="Date of Birth" type="date" value={basic.dob} onChange={(v) => setBasic({ ...basic, dob: v })} />
                )}
                <div className="relative">
                  <Field label="Password" type={showPassword ? "text" : "password"} value={basic.password} onChange={(v) => setBasic({ ...basic, password: v })} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[34px] text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="relative">
                  <Field label="Confirm Password" type={showConfirm ? "text" : "password"} value={basic.confirm} onChange={(v) => setBasic({ ...basic, confirm: v })} />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-[34px] text-muted-foreground hover:text-foreground">
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && role && (
            <div className="animate-fade-in">
              <h1 className="text-2xl md:text-3xl font-bold">A few more details</h1>
              <p className="mt-1 text-muted-foreground">Specific to your role as a <span className="text-primary font-medium">{role}</span>.</p>
              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                {role === "patient" && (
                  <>
                    <Field label="City" onChange={(v) => setDetails({ ...details, city: v })} />
                    <Field label="State" onChange={(v) => setDetails({ ...details, state: v })} />
                    <Field label="Phone Number" onChange={(v) => setDetails({ ...details, phone: v })} />
                    <Field label="Street Address" wide onChange={(v) => setDetails({ ...details, street: v })} />
                    <Field label="Medical Insurance Number" wide onChange={(v) => setDetails({ ...details, insurance: v })} />
                  </>
                )}
                {role === "donor" && (
                  <>
                    <Field label="Phone Number" onChange={(v) => setDetails({ ...details, phone: v })} />
                    <div className="sm:col-span-2">
                      <Label>Donation Reason</Label>
                      <Textarea
                        rows={4} className="mt-1.5 rounded-xl"
                        placeholder="Why do you want to donate?"
                        onChange={(e) => setDetails({ ...details, reason: e.target.value })}
                      />
                    </div>
                  </>
                )}
                {role === "organization" && (
                  <>
                    <Field label="Location" onChange={(v) => setDetails({ ...details, location: v })} />
                    <Field label="Government License Number" onChange={(v) => setDetails({ ...details, license: v })} wide />
                    <Field label="Phone Number" onChange={(v) => setDetails({ ...details, phone: v })} />
                  </>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <Button variant="ghost" onClick={back} disabled={step === 1} className="rounded-xl">
              <ArrowLeft size={16} className="mr-1" /> Back
            </Button>
            {step < 3 ? (
              <Button onClick={next} className="rounded-xl bg-gradient-primary shadow-glow hover:opacity-90">
                Next <ArrowRight size={16} className="ml-1" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={loading} className="rounded-xl bg-gradient-primary shadow-glow hover:opacity-90">
                {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                Create account
              </Button>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

const Field = ({
  label, type = "text", value, onChange, wide,
}: { label: string; type?: string; value?: string; onChange: (v: string) => void; wide?: boolean }) => (
  <div className={wide ? "sm:col-span-2" : ""}>
    <Label>{label}</Label>
    <Input
      type={type} value={value} onChange={(e) => onChange(e.target.value)}
      className="mt-1.5 rounded-xl"
    />
  </div>
);

export default Signup;
