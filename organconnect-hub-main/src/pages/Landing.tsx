import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Heart, UserPlus, GitMerge, Stethoscope, Activity,
  Droplet, Eye, Bone, Wind, Sparkles, ArrowRight, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/PublicNavbar";
import { Footer } from "@/components/Footer";
import { heroStats, organCounts, ORGAN_TYPES } from "@/lib/mockData";
import { api } from "@/lib/api";

const organIconMap: Record<string, typeof Heart> = {
  Kidney: Droplet,
  Liver: Activity,
  Heart: Heart,
  Lung: Wind,
  Pancreas: Sparkles,
  Cornea: Eye,
  "Bone Marrow": Bone,
  Skin: ShieldCheck,
};

const useCountUp = (target: number, duration = 1500) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let frame: number;
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      setVal(Math.floor(p * target));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return val;
};

const Stat = ({ value, label }: { value: number; label: string }) => {
  const n = useCountUp(value);
  return (
    <div className="text-center">
      <div className="text-3xl md:text-4xl font-bold gradient-text">{n.toLocaleString()}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
};

const steps = [
  { icon: UserPlus, title: "Register", desc: "Create your account as donor, patient, doctor or hospital." },
  { icon: GitMerge, title: "Get Matched", desc: "Smart matching connects compatible organs and recipients." },
  { icon: Stethoscope, title: "Medical Review", desc: "Doctors verify compatibility and clear the transplant." },
  { icon: Heart, title: "Transplant", desc: "Surgery is performed and a new life begins." },
];

const testimonials = [
  { name: "Aarav Mehta", role: "Patient", quote: "OrganConnect found me a kidney match in 11 days. I owe my life to this network.", initials: "AM" },
  { name: "Priya Sharma", role: "Donor", quote: "Knowing my decision could save up to 8 lives is the most powerful feeling in the world.", initials: "PS" },
  { name: "Dr. Rohan Iyer", role: "Transplant Surgeon", quote: "The matching system has cut our coordination time in half. It's a game changer.", initials: "RI" },
];

const Landing = () => {
  const [stats, setStats] = useState([
    { label: "Active Donors", value: 0 },
    { label: "Organs Available", value: 0 },
    { label: "Lives Saved", value: 0 },
    { label: "Partner Hospitals", value: 0 }
  ]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    }
  }, [location.hash]);

  useEffect(() => {
    api.organs.stats().then(data => {
      setStats([
        { label: "Active Donors", value: data.donors || 0 },
        { label: "Organs Available", value: data.availableOrgans || 0 },
        { label: "Lives Saved", value: data.completedTransplants || 0 },
        { label: "Partner Hospitals", value: data.organizations || 0 }
      ]);
    }).catch(console.error);

    api.organs.list().then(data => {
      const c: Record<string, number> = {};
      data.forEach((o: any) => {
        if (o.availability_status === "available") {
          c[o.name] = (c[o.name] || 0) + o.quantity;
        }
      });
      setCounts(c);
    }).catch(console.error);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="container py-16 md:py-24 grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-dot" />
                Live network · {stats[1].value} organs available now
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
                Every Second Counts.
                <br />
                <span className="gradient-text">Every Organ Matters.</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-xl">
                Join the network that connects donors, patients, doctors, and hospitals across the country to make life-saving transplants possible.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-xl bg-gradient-primary shadow-glow hover:opacity-90">
                  <Link to="/signup">Register as Donor <ArrowRight className="ml-1" size={16} /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-xl">
                  <Link to="/organs">Find an Organ</Link>
                </Button>
              </div>
            </div>

            {/* Hero graphic */}
            <div className="relative h-[420px] hidden lg:block">
              <div className="absolute inset-0 bg-gradient-mesh opacity-60 blur-3xl" />
              <div className="relative h-full glass rounded-3xl p-8 flex items-center justify-center overflow-hidden">
                <Heart size={220} className="text-primary fill-primary/20 animate-float" strokeWidth={1.2} />
                <svg viewBox="0 0 400 100" className="absolute inset-x-8 bottom-12 h-16 text-primary">
                  <polyline
                    fill="none" stroke="currentColor" strokeWidth="2"
                    points="0,50 60,50 80,20 100,80 120,30 140,50 400,50"
                  />
                </svg>
                {/* Floating cards */}
                <div className="absolute top-6 left-6 glass rounded-2xl px-4 py-3 animate-float" style={{ animationDelay: "0.5s" }}>
                  <div className="text-xs text-muted-foreground">Donors</div>
                  <div className="text-lg font-bold">{stats[0].value.toLocaleString()}</div>
                </div>
                <div className="absolute top-10 right-6 glass rounded-2xl px-4 py-3 animate-float" style={{ animationDelay: "1.2s" }}>
                  <div className="text-xs text-muted-foreground">Lives Saved</div>
                  <div className="text-lg font-bold gradient-text">{stats[2].value.toLocaleString()}</div>
                </div>
                <div className="absolute bottom-6 left-10 glass rounded-2xl px-4 py-3 animate-float" style={{ animationDelay: "0.8s" }}>
                  <div className="text-xs text-muted-foreground">Hospitals</div>
                  <div className="text-lg font-bold">{stats[3].value.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS BAR */}
        <section className="container">
          <div className="glass-strong rounded-3xl p-8 grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s) => (
              <Stat key={s.label} value={s.value} label={s.label} />
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="container py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">How It Works</h2>
            <p className="mt-3 text-muted-foreground">From registration to transplant — a streamlined, secure, life-saving journey.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div
                key={s.title}
                className="glass rounded-2xl p-6 hover-lift relative animate-slide-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="absolute -top-3 -left-3 h-9 w-9 rounded-xl bg-gradient-primary text-primary-foreground font-bold flex items-center justify-center shadow-glow">
                  {i + 1}
                </div>
                <s.icon className="text-primary mb-4" size={28} />
                <h3 className="font-semibold text-lg">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ORGAN CATEGORIES */}
        <section className="container py-12">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Organ Categories</h2>
            <p className="mt-3 text-muted-foreground">Browse availability across our partner hospitals.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {ORGAN_TYPES.map((t, i) => {
              const Icon = organIconMap[t] ?? Heart;
              return (
                <Link
                  key={t}
                  to={`/organs?type=${encodeURIComponent(t)}`}
                  className="glass rounded-2xl p-5 hover-lift group animate-scale-in"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                    <Icon className="text-primary" size={20} />
                  </div>
                  <div className="font-semibold">{t}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{counts[t] ?? 0} available</div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section id="about" className="container py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Stories From Our Network</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="glass rounded-2xl p-6 hover-lift">
                <p className="text-sm leading-relaxed">"{t.quote}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container pb-20">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-10 md:p-16 text-center shadow-glow">
            <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
            <div className="relative">
              <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground">Ready to save a life?</h2>
              <p className="mt-4 text-primary-foreground/80 max-w-xl mx-auto">
                One signup. Endless impact. Join {stats[0].value.toLocaleString()} donors making a difference today.
              </p>
              <Button asChild size="lg" className="mt-8 rounded-xl bg-background text-foreground hover:bg-background/90">
                <Link to="/signup">Register Now</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Landing;
