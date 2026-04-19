import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Search, X, Heart, Droplet, Activity, Wind, Eye, Bone, Sparkles, ShieldCheck, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PublicNavbar } from "@/components/PublicNavbar";
import { Footer } from "@/components/Footer";
import { StatusBadge } from "@/components/StatusBadge";
import { ORGAN_TYPES } from "@/lib/mockData";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const iconMap: Record<string, typeof Heart> = {
  Kidney: Droplet, Liver: Activity, Heart: Heart, Lung: Wind,
  Pancreas: Sparkles, Cornea: Eye, "Bone Marrow": Bone, Skin: ShieldCheck,
};

const colorMap: Record<string, string> = {
  Kidney: "from-blue-500 to-cyan-500",
  Liver: "from-amber-500 to-orange-500",
  Heart: "from-rose-500 to-pink-500",
  Lung: "from-sky-500 to-indigo-500",
  Pancreas: "from-emerald-500 to-teal-500",
  Cornea: "from-violet-500 to-purple-500",
  "Bone Marrow": "from-yellow-500 to-amber-500",
  Skin: "from-fuchsia-500 to-rose-500",
};

const OrgansCatalog = () => {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [search, setSearch] = useState("");
  const [types, setTypes] = useState<string[]>(params.get("type") ? [params.get("type")!] : []);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [city, setCity] = useState<string>("all");
  const [gateOpen, setGateOpen] = useState(false);
  const [organs, setOrgans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.organs.list().then((data) => {
      setOrgans(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const cities = useMemo(() => {
    return Array.from(new Set(organs.map(o => o.location).filter(Boolean)));
  }, [organs]);

  const toggleType = (t: string) => {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const reset = () => {
    setSearch(""); setTypes([]); setStatusFilter("all"); setCity("all");
    setParams({});
  };

  const filtered = useMemo(() => {
    return organs.filter((o) => {
      if (search && !o.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (types.length && !types.includes(o.name)) return false;
      if (statusFilter !== "all" && o.availability_status !== statusFilter) return false;
      if (city !== "all" && o.location !== city) return false;
      return true;
    });
  }, [organs, search, types, statusFilter, city]);

  const handleRequestClick = () => {
    if (!isAuthenticated) return setGateOpen(true);
    if (user?.role !== "patient") return window.alert("Only patients can submit match requests.");
    
    navigate("/dashboard/patient");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />

      <main className="flex-1">
        <section className="container py-12">
          <h1 className="text-3xl md:text-4xl font-bold">Organ Availability</h1>
          <p className="mt-2 text-muted-foreground">Browse organs available across our partner hospitals.</p>
        </section>

        {/* Sticky filter bar */}
        <div className="sticky top-16 z-40 backdrop-blur-xl border-y border-border/50 bg-background/70">
          <div className="container py-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  placeholder="Search organs..."
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 rounded-xl"
                />
              </div>
              <select
                value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="all">All statuses</option>
                <option value="available">Available</option>
                <option value="reserved">Reserved</option>
                <option value="transplanted">Transplanted</option>
              </select>
              <select
                value={city} onChange={(e) => setCity(e.target.value)}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="all">All locations</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <Button variant="ghost" onClick={reset} className="rounded-xl">
                <X size={14} className="mr-1" /> Clear
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {ORGAN_TYPES.map((t) => {
                const active = types.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleType(t)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:text-foreground",
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <section className="container py-10">
          {loading ? (
             <div className="text-center py-20 flex justify-center items-center">
                 <div className="animate-pulse text-muted-foreground">Loading organs...</div>
             </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="mx-auto mb-6 h-32 w-32 rounded-full bg-muted/50 flex items-center justify-center">
                <Search className="text-muted-foreground" size={40} />
              </div>
              <h3 className="text-xl font-semibold">No organs match your filters</h3>
              <p className="mt-2 text-muted-foreground">Try adjusting or clearing your filters.</p>
              <Button onClick={reset} className="mt-6 rounded-xl">Reset Filters</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((organ, i) => {
                const Icon = iconMap[organ.name] ?? Heart;
                const banner = colorMap[organ.name] ?? "from-primary to-primary-glow";
                return (
                  <article
                    key={organ.organ_id}
                    className="glass rounded-2xl overflow-hidden hover-lift animate-fade-in"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className={cn("h-2 bg-gradient-to-r", banner)} />
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div className={cn("h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white", banner)}>
                          <Icon size={20} />
                        </div>
                        <StatusBadge status={organ.availability_status} />
                      </div>
                      <h3 className="mt-4 font-semibold text-lg">{organ.name}</h3>
                      <p className="text-sm text-muted-foreground">{organ.organization_name}</p>
                      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin size={12} /> {organ.location}
                        {organ.blood_type && <span className="ml-2 px-2 py-0.5 rounded-full bg-muted">{organ.blood_type}</span>}
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-sm">
                          {organ.availability_status === "available" ? (
                            <>
                              <span className="font-semibold">{organ.quantity}</span>
                              <span className="text-muted-foreground"> available</span>
                            </>
                          ) : (
                            <span className="font-medium text-muted-foreground capitalize">
                              {organ.availability_status}
                            </span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={handleRequestClick}
                          className="rounded-lg bg-gradient-primary hover:opacity-90"
                        >
                          Submit Match Request
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />

      <Dialog open={gateOpen} onOpenChange={setGateOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Login required</DialogTitle>
            <DialogDescription>
              You need to be signed in as a patient to submit an organ match request.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setGateOpen(false)}>Cancel</Button>
            <Button className="rounded-xl bg-gradient-primary" onClick={() => navigate("/login")}>Sign in</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrgansCatalog;
