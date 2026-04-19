import { useEffect, useState } from "react";
import { Home, User, Heart, Activity, MapPin, Phone, Calendar } from "lucide-react";
import { DashboardLayout, NavItem } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ORGAN_TYPES } from "@/lib/mockData";

type Section = "overview" | "donations" | "tracking";

const DonorDashboard = () => {
  const { user } = useAuth();
  const [section, setSection] = useState<Section>("overview");
  const [organs, setOrgans] = useState<any[]>([]);
  const [pledges, setPledges] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [donateOpen, setDonateOpen] = useState(false);
  const [donateForm, setDonateForm] = useState({ name: "Kidney", org_id: "" });
  const [organizations, setOrganizations] = useState<any[]>([]);

  const donorId = user?.roleId;

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [orgRes, profRes, orgsRes, pledgesRes] = await Promise.all([
        api.organs.list(),
        api.profile.get(Number(user.id)),
        api.organs.organizations(),
        api.donors.listPledges({ donor_id: donorId })
      ]);
      const myDonations = donorId ? orgRes.filter((o: any) => o.donor_id === donorId) : [];
      setOrgans(myDonations);
      setPledges(pledgesRes);
      setProfile(profRes);
      setOrganizations(orgsRes);
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id, donorId]);

  const handleDonate = async () => {
    if (!donateForm.org_id) return toast.error("Please select a hospital");
    try {
      await api.donors.createPledge({
        donor_id: donorId,
        org_id: Number(donateForm.org_id),
        organ_type: donateForm.name
      });
      toast.success("Organ pledge submitted to the hospital for review!");
      setDonateOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to pledge organ");
    }
  };

  const nav: NavItem[] = [
    { label: "Overview", to: "/dashboard/donor", icon: Home, end: true, onClick: () => setSection("overview") },
    { label: "My Donations", to: "/dashboard/donor", icon: Heart, onClick: () => setSection("donations") },
    { label: "Track Organs", to: "/dashboard/donor", icon: Activity, onClick: () => setSection("tracking") },
  ];

  if (loading) {
    return (
      <DashboardLayout nav={nav} title="Donor Dashboard" subtitle="Thank you for saving lives">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading your data...</div>
        </div>
      </DashboardLayout>
    );
  }

  const transplantedCount = organs.filter(o => o.availability_status === 'transplanted').length;
  const availableCount = organs.filter(o => o.availability_status === 'available').length;
  const reservedCount = organs.filter(o => o.availability_status === 'reserved').length;

  return (
    <DashboardLayout nav={nav} title="Donor Dashboard" subtitle="Thank you for saving lives">

      {/* ── OVERVIEW ── */}
      {section === "overview" && (
        <div className="space-y-6 animate-fade-in">
          {/* Impact banner */}
          <div className="glass-strong rounded-2xl p-6 bg-gradient-to-r from-primary/10 to-accent/10">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-gradient-primary flex items-center justify-center">
                <Heart className="text-white" size={28} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Your Impact</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {organs.length === 0
                    ? "Register your first organ donation through your hospital to get started."
                    : `You've donated ${organs.length} organ(s) — ${transplantedCount} already saved a life.`}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Organs Donated" value={organs.length} icon={Heart} accent="primary" />
            <StatCard label="Lives Saved" value={transplantedCount} icon={Activity} accent="success" hint={`${transplantedCount} transplanted`} />
            <StatCard label="Available" value={availableCount} icon={MapPin} accent="warning" hint="Waiting for match" />
            <StatCard label="Reserved" value={reservedCount} icon={Calendar} accent="accent" hint="Surgery scheduled" />
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={() => setSection("donations")} className="glass rounded-2xl p-5 text-left hover-lift group">
              <Heart className="text-primary mb-2" size={22} />
              <div className="font-semibold">My Donations</div>
              <div className="text-xs text-muted-foreground mt-1">{organs.length} organs donated</div>
            </button>
            <button onClick={() => setSection("tracking")} className="glass rounded-2xl p-5 text-left hover-lift group">
              <Activity className="text-primary mb-2" size={22} />
              <div className="font-semibold">Track Organs</div>
              <div className="text-xs text-muted-foreground mt-1">See where your organs went</div>
            </button>
          </div>
        </div>
      )}

      {/* ── MY DONATIONS ── */}
      {section === "donations" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button onClick={() => setSection("overview")} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
              <h2 className="text-xl font-bold">My Pledges & Donations</h2>
            </div>
            
            <Dialog open={donateOpen} onOpenChange={setDonateOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl bg-gradient-primary">
                  <Heart size={16} className="mr-2" /> Pledge Organ
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Pledge an Organ</DialogTitle>
                  <DialogDescription>Submit a formal pledge. The hospital will verify it before it enters the registry.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Organ Type</Label>
                    <select
                      value={donateForm.name}
                      onChange={(e) => setDonateForm({ ...donateForm, name: e.target.value })}
                      className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
                    >
                      {ORGAN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Hospital / Organization</Label>
                    <select
                      value={donateForm.org_id}
                      onChange={(e) => setDonateForm({ ...donateForm, org_id: e.target.value })}
                      className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Select a hospital...</option>
                      {organizations.map(o => (
                        <option key={o.org_id} value={o.org_id}>{o.name} ({o.location})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" className="rounded-xl" onClick={() => setDonateOpen(false)}>Cancel</Button>
                  <Button className="rounded-xl bg-gradient-primary" onClick={handleDonate}>Submit Pledge</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-6">
            {/* Pledges Section */}
            {pledges.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pending Pledges</h3>
                <div className="space-y-3">
                  {pledges.filter(p => p.status === 'pending').map((p: any) => (
                    <div key={p.pledge_id} className="glass rounded-xl p-4 flex items-center justify-between border-amber-500/20">
                      <div>
                        <div className="font-semibold">{p.organ_type}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Hospital: {p.org_name}</div>
                      </div>
                      <StatusBadge status="pending" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approved Organs Section */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Approved Registry</h3>
              {organs.length === 0 ? (
                <div className="glass-strong rounded-2xl p-8 text-center text-muted-foreground">
                  <Heart className="mx-auto mb-3" size={32} />
                  <p>No verified donations in the registry yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {organs.map((o: any) => (
                    <div key={o.organ_id} className="glass rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{o.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {o.organization_name} · {o.location}
                        </div>
                      </div>
                      <StatusBadge status={o.availability_status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TRACK ORGANS ── */}
      {section === "tracking" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setSection("overview")} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
            <h2 className="text-xl font-bold">Organ Tracking</h2>
          </div>
          {organs.length === 0 ? (
            <div className="glass-strong rounded-2xl p-8 text-center text-muted-foreground">
              <Activity className="mx-auto mb-3" size={32} />
              <p>Nothing to track yet. Donated organs will appear here.</p>
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-border/60 space-y-4">
              {organs.map((o: any) => (
                <div key={o.organ_id} className="relative">
                  <div className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full ring-4 ring-background ${
                    o.availability_status === 'transplanted' ? 'bg-emerald-500' :
                    o.availability_status === 'reserved' ? 'bg-amber-500' : 'bg-primary'
                  }`} />
                  <div className="glass rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{o.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {o.organization_name} · Qty: {o.quantity}
                        </div>
                      </div>
                      <StatusBadge status={o.availability_status} />
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {o.availability_status === 'transplanted' && "✅ Successfully transplanted — you saved a life!"}
                      {o.availability_status === 'reserved' && "🕐 Surgery scheduled — patient matched."}
                      {o.availability_status === 'available' && "⏳ Waiting for a compatible patient match."}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default DonorDashboard;
