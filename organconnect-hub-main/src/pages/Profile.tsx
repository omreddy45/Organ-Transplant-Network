import { useState, KeyboardEvent, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Home, User, Mail, Shield, Trash2, Save, Plus, X, ArrowLeft } from "lucide-react";
import { DashboardLayout, NavItem } from "@/components/dashboard/DashboardLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth, Role } from "@/contexts/AuthContext";
import { toast } from "sonner";

const navByRole: Record<Role, NavItem[]> = {
  patient: [
    { label: "Dashboard", to: "/dashboard/patient", icon: Home },
    { label: "My Profile", to: "/profile", icon: User },
  ],
  donor: [
    { label: "Dashboard", to: "/dashboard/donor", icon: Home },
    { label: "My Profile", to: "/profile", icon: User },
  ],
  doctor: [
    { label: "Dashboard", to: "/dashboard/doctor", icon: Home },
    { label: "My Profile", to: "/profile", icon: User },
  ],
  organization: [
    { label: "Dashboard", to: "/dashboard/organization", icon: Home },
    { label: "My Profile", to: "/profile", icon: User },
  ],
  head: [
    { label: "Dashboard", to: "/dashboard/head", icon: Home },
    { label: "My Profile", to: "/profile", icon: User },
  ],
};

const initials = (name: string) =>
  name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [city, setCity] = useState("Delhi");
  const [state, setState] = useState("Delhi");
  const [street, setStreet] = useState("12 Lotus Avenue");
  const [insurance, setInsurance] = useState("INS-100137");
  const [reason, setReason] = useState("Saving lives is the greatest legacy.");
  const [specialization, setSpecialization] = useState("Nephrology");
  const [orgName, setOrgName] = useState("AIIMS Delhi");
  const [license, setLicense] = useState("LIC-2024-001");
  const [location, setLocation] = useState("Delhi");

  const [phones, setPhones] = useState<string[]>(["+91 9876543210"]);
  const [phoneInput, setPhoneInput] = useState("");

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [headData, setHeadData] = useState<any>(null);

  const memberSince = "August 2024";

  useEffect(() => {
    if (user?.role === "organization") {
      const oid = user.orgId || user.roleId;
      fetch(`/api/auth/head/${oid}`).then(r => r.ok ? r.json() : null).then(d => {
        if (d) setHeadData(d);
      });
    }
  }, [user]);

  const addPhone = () => {
    const v = phoneInput.trim();
    if (!v) return;
    if (phones.includes(v)) { toast.error("Phone already added"); return; }
    setPhones((p) => [...p, v]);
    setPhoneInput("");
  };

  const handlePhoneKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); addPhone(); }
  };

  const removePhone = (p: string) => setPhones((arr) => arr.filter((x) => x !== p));

  const saveProfile = () => toast.success("Profile saved");

  const changePassword = () => {
    if (!currentPwd || !newPwd) return toast.error("Fill all password fields");
    if (newPwd !== confirmPwd) return toast.error("New passwords don't match");
    if (newPwd.length < 8) return toast.error("Password must be 8+ characters");
    setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    toast.success("Password updated");
  };

  const deleteAccount = () => {
    logout();
    toast.success("Account deleted");
    navigate("/");
  };

  if (!user) return <Navigate to="/login" replace />;

  return (
    <DashboardLayout nav={navByRole[user.role]} title="My Profile" subtitle="Manage your personal information & security">
      {/* Header card */}
      <section className="glass-strong rounded-2xl p-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-2xl font-bold">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold">{name}</h2>
            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              <Mail size={14} /> {email}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge className="bg-gradient-primary text-primary-foreground border-0 capitalize">{user.role}</Badge>
              <span className="text-xs text-muted-foreground">Member since {memberSince}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Edit form */}
      <section className="mt-6 glass-strong rounded-2xl p-5">
        <h3 className="text-lg font-semibold mb-4">Personal information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl" />
          </div>

          {user.role === "patient" && (
            <>
              <div className="space-y-2"><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} className="rounded-xl" /></div>
              <div className="space-y-2"><Label>State</Label><Input value={state} onChange={(e) => setState(e.target.value)} className="rounded-xl" /></div>
              <div className="space-y-2 md:col-span-2"><Label>Street address</Label><Input value={street} onChange={(e) => setStreet(e.target.value)} className="rounded-xl" /></div>
              <div className="space-y-2 md:col-span-2"><Label>Medical insurance</Label><Input value={insurance} onChange={(e) => setInsurance(e.target.value)} className="rounded-xl" /></div>
            </>
          )}

          {user.role === "donor" && (
            <div className="space-y-2 md:col-span-2">
              <Label>Donation reason</Label>
              <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-xl resize-none" />
            </div>
          )}

          {user.role === "doctor" && (
            <>
              <div className="space-y-2"><Label>Specialization</Label><Input value={specialization} onChange={(e) => setSpecialization(e.target.value)} className="rounded-xl" /></div>
              <div className="space-y-2"><Label>Organization</Label><Input value={orgName} onChange={(e) => setOrgName(e.target.value)} className="rounded-xl" /></div>
            </>
          )}

          {user.role === "organization" && (
            <>
              <div className="space-y-2"><Label>Organization name</Label><Input value={orgName} onChange={(e) => setOrgName(e.target.value)} className="rounded-xl" /></div>
              <div className="space-y-2"><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} className="rounded-xl" /></div>
              <div className="space-y-2 md:col-span-2"><Label>License number</Label><Input value={license} onChange={(e) => setLicense(e.target.value)} className="rounded-xl" /></div>
              <div className="space-y-2 md:col-span-2 mt-2 p-4 border border-border/40 rounded-2xl bg-muted/20">
                <h4 className="font-semibold text-sm mb-1">Administrative Head</h4>
                {headData ? (
                  <p className="text-xs text-muted-foreground mb-3">
                    Current Head: <strong>Dr. {headData.name}</strong>. Provide new details below to completely replace the existing head account.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mb-3">Does your hospital need a dedicated head account for analytics and medical tracking?</p>
                )}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button size="sm" variant="outline" className="rounded-xl">{headData ? "Update Head Account" : "Create Head Account"}</Button>
                  </SheetTrigger>
                  <SheetContent className="rounded-l-2xl">
                    <SheetHeader>
                      <SheetTitle>Register Hospital Head</SheetTitle>
                      <SheetDescription>Create an administrative head account.</SheetDescription>
                    </SheetHeader>
                    <div className="space-y-4 mt-6">
                      <div className="space-y-2"><Label>Full Name</Label><Input id="head-name" placeholder="Name" className="rounded-xl" /></div>
                      <div className="space-y-2"><Label>Email</Label><Input id="head-email" type="email" placeholder="head@hospital.com" className="rounded-xl" /></div>
                      <div className="space-y-2"><Label>Password</Label><Input id="head-password" type="password" placeholder="Min 6 characters" className="rounded-xl" /></div>
                    </div>
                    <SheetFooter className="mt-6">
                      <Button className="rounded-xl bg-gradient-primary" onClick={() => {
                        const nameEl = document.getElementById('head-name') as HTMLInputElement;
                        const emailEl = document.getElementById('head-email') as HTMLInputElement;
                        const pwdEl = document.getElementById('head-password') as HTMLInputElement;
                        if (!nameEl?.value || !emailEl?.value || !pwdEl?.value) {
                           return toast.error('Please fill all required fields');
                        }
                        fetch('/api/auth/add-head', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name: nameEl.value, email: emailEl.value, password: pwdEl.value, org_id: user.orgId || user.roleId })
                        }).then(r => r.json()).then(data => {
                          if (data.error) throw new Error(data.error);
                          toast.success("Head account saved! They can now log in.");
                          setHeadData({ name: nameEl.value });
                        }).catch(err => toast.error(err.message));
                      }}>{headData ? "Replace Head Account" : "Create Head Account"}</Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              </div>
            </>
          )}

          {/* Phones — multi-chip */}
          <div className="space-y-2 md:col-span-2">
            <Label>Phone numbers</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {phones.map((p) => (
                <span key={p} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-sm border border-border/40">
                  {p}
                  <button onClick={() => removePhone(p)} className="hover:text-danger" aria-label="Remove phone">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                onKeyDown={handlePhoneKey}
                placeholder="+91 9876543210"
                className="rounded-xl flex-1"
              />
              <Button type="button" variant="outline" className="rounded-xl" onClick={addPhone}>
                <Plus size={14} className="mr-1" /> Add
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button className="rounded-xl bg-gradient-primary" onClick={saveProfile}>
            <Save size={14} className="mr-1" /> Save changes
          </Button>
        </div>
      </section>

      {/* Security */}
      <section className="mt-6 glass-strong rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Security</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Current password</Label>
            <Input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>New password</Label>
            <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Confirm password</Label>
            <Input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} className="rounded-xl" />
          </div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">Last login: today at {new Date().toLocaleTimeString()}</div>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" className="rounded-xl" onClick={changePassword}>Update password</Button>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="mt-6 rounded-2xl p-5 border border-danger/30 bg-danger/5 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Trash2 size={18} className="text-danger" />
          <h3 className="text-lg font-semibold text-danger">Danger zone</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Deleting your account is permanent. All your data, donations, and transplant history will be removed.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="rounded-xl border-danger/40 text-danger hover:bg-danger hover:text-white">
              <Trash2 size={14} className="mr-1" /> Delete account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your OrganConnect account?</AlertDialogTitle>
              <AlertDialogDescription>
                This action is permanent and cannot be undone. You will be logged out immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction className="rounded-xl bg-danger text-white hover:bg-danger/90" onClick={deleteAccount}>
                Yes, delete my account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </DashboardLayout>
  );
};

export default Profile;
