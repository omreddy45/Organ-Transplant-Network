import { useEffect, useState } from "react";
import {
  Home, User, Users, Activity, Calendar, Clock,
} from "lucide-react";
import { DashboardLayout, NavItem } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

type Section = "overview" | "patients" | "transplants" | "schedule";

const DoctorDashboard = () => {
  const { user } = useAuth();
  const [section, setSection] = useState<Section>("overview");
  const [transplants, setTransplants] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [availability, setAvailability] = useState<string>("available");
  const [loading, setLoading] = useState(true);

  const doctorId = user?.roleId;
  const orgId = user?.orgId;

  useEffect(() => {
    if (!doctorId) return;
    setLoading(true);
    Promise.allSettled([
      api.transplants.list({ doctor_id: String(doctorId) }),
      api.doctors.schedule(doctorId),
    ]).then(([trRes, schRes]) => {
      if (trRes.status === 'fulfilled') {
        const trData = trRes.value;
        setTransplants(trData);
        // Derive unique patients from this doctor's transplants
        const seen = new Set();
        const uniquePatients = trData
          .filter((t: any) => { if (seen.has(t.patient_id)) return false; seen.add(t.patient_id); return true; })
          .map((t: any) => ({ patient_id: t.patient_id, name: t.patient_name, organ: t.organ_name, status: t.status }));
        setPatients(uniquePatients);
      }
      if (schRes.status === 'fulfilled') setSchedule(schRes.value);
      setLoading(false);
    });
  }, [doctorId, orgId]);

  const updateAvailability = async (status: string) => {
    if (!doctorId) return;
    try {
      await api.doctors.updateStatus(doctorId, status);
      setAvailability(status);
      toast.success(`Status updated to ${status.replace('_', ' ')}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const nav: NavItem[] = [
    { label: "Overview", to: "/dashboard/doctor", icon: Home, end: true, onClick: () => setSection("overview") },
    { label: "Patients", to: "/dashboard/doctor", icon: Users, onClick: () => setSection("patients") },
    { label: "Transplants", to: "/dashboard/doctor", icon: Activity, onClick: () => setSection("transplants") },
    { label: "Schedule", to: "/dashboard/doctor", icon: Calendar, onClick: () => setSection("schedule") },
  ];

  if (loading) {
    return (
      <DashboardLayout nav={nav} title="Doctor Dashboard" subtitle="Manage patients and transplants">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading your data...</div>
        </div>
      </DashboardLayout>
    );
  }

  const pendingTransplants = transplants.filter(t => t.status === 'pending').length;
  const completedTransplants = transplants.filter(t => t.status === 'completed').length;

  return (
    <DashboardLayout nav={nav} title="Doctor Dashboard" subtitle="Manage patients and transplants">

      {/* ── OVERVIEW ── */}
      {section === "overview" && (
        <div className="space-y-6 animate-fade-in">
          {/* Availability toggle */}
          <div className="glass-strong rounded-2xl p-5 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Your Availability</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Patients and organizations see this status</p>
            </div>
            <Select value={availability} onValueChange={updateAvailability}>
              <SelectTrigger className="w-40 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">✅ Available</SelectItem>
                <SelectItem value="busy">🔴 Busy</SelectItem>
                <SelectItem value="on_leave">🟡 On Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Transplants" value={transplants.length} icon={Activity} accent="primary" />
            <StatCard label="Pending" value={pendingTransplants} icon={Clock} accent="warning" hint="Awaiting surgery" />
            <StatCard label="Completed" value={completedTransplants} icon={Activity} accent="success" />
            <StatCard label="Patients" value={patients.length} icon={Users} accent="accent" />
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button onClick={() => setSection("patients")} className="glass rounded-2xl p-5 text-left hover-lift">
              <Users className="text-primary mb-2" size={22} />
              <div className="font-semibold">My Patients</div>
              <div className="text-xs text-muted-foreground mt-1">{patients.length} patients</div>
            </button>
            <button onClick={() => setSection("transplants")} className="glass rounded-2xl p-5 text-left hover-lift">
              <Activity className="text-primary mb-2" size={22} />
              <div className="font-semibold">Transplant Records</div>
              <div className="text-xs text-muted-foreground mt-1">{transplants.length} records</div>
            </button>
            <button onClick={() => setSection("schedule")} className="glass rounded-2xl p-5 text-left hover-lift">
              <Calendar className="text-primary mb-2" size={22} />
              <div className="font-semibold">Schedule</div>
              <div className="text-xs text-muted-foreground mt-1">{schedule.length} upcoming visits</div>
            </button>
          </div>
        </div>
      )}

      {/* ── PATIENTS ── */}
      {section === "patients" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setSection("overview")} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
            <h2 className="text-xl font-bold">Patients</h2>
          </div>
          {patients.length === 0 ? (
            <div className="glass-strong rounded-2xl p-8 text-center text-muted-foreground">
              <Users className="mx-auto mb-3" size={32} />
              <p>No patients found in your organization yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto glass-strong rounded-2xl p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient Name</TableHead>
                    <TableHead>Organ</TableHead>
                    <TableHead>Transplant Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((p: any) => (
                    <TableRow key={p.patient_id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.organ}</TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* ── TRANSPLANTS ── */}
      {section === "transplants" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setSection("overview")} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
            <h2 className="text-xl font-bold">Transplant Records</h2>
          </div>
          {transplants.length === 0 ? (
            <div className="glass-strong rounded-2xl p-8 text-center text-muted-foreground">
              <Activity className="mx-auto mb-3" size={32} />
              <p>No transplant records yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transplants.map((t: any) => (
                <div key={t.transplant_id} className="glass rounded-xl p-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">{t.organ_name} → {t.patient_name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(t.transplant_date), "MMM d, yyyy")} · {t.organization_name}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={t.status} />
                    <span className="text-sm font-semibold">₹{Number(t.bill_amount).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SCHEDULE ── */}
      {section === "schedule" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setSection("overview")} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
            <h2 className="text-xl font-bold">Visit Schedule</h2>
          </div>
          {schedule.length === 0 ? (
            <div className="glass-strong rounded-2xl p-8 text-center text-muted-foreground">
              <Calendar className="mx-auto mb-3" size={32} />
              <p>No upcoming visits scheduled.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedule.map((v: any, i: number) => (
                <div key={i} className="glass rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{v.patient_name}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(v.visit_date), "MMM d, yyyy")}</div>
                  </div>
                  <Badge variant="outline" className="rounded-full">{v.visit_type || "Consultation"}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default DoctorDashboard;
