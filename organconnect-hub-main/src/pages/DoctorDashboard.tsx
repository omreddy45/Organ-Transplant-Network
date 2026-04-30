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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
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
  const [orgName, setOrgName] = useState<string>("");

  const doctorId = user?.roleId;
  const orgId = user?.orgId;

  useEffect(() => {
    if (!doctorId) return;
    setLoading(true);
    Promise.allSettled([
      api.transplants.list({ doctor_id: String(doctorId) }),
      api.doctors.schedule(doctorId),
      api.patients.list({ doctor_id: String(doctorId) }),
      orgId ? fetch(`/api/auth/org/${orgId}`).then(r => r.ok ? r.json() : { name: "" }) : Promise.resolve({ name: "" })
    ]).then(([trRes, schRes, patRes, orgRes]) => {
      const trData = trRes.status === 'fulfilled' ? trRes.value : [];
      setTransplants(trData);

      let patData = patRes.status === 'fulfilled' ? patRes.value : [];
      
      const patientsWithTransplant = patData.map((p: any) => {
         const t = trData.find((tr: any) => tr.patient_id === p.patient_id);
         return { ...p, organ: t?.organ_name || 'N/A', status: t?.status || 'N/A' };
      });
      setPatients(patientsWithTransplant);

      if (schRes.status === 'fulfilled') setSchedule(schRes.value);
      if (orgRes.status === 'fulfilled' && orgRes.value?.name) setOrgName(orgRes.value.name);
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

  if (!doctorId) {
    return (
      <DashboardLayout nav={nav} title="Doctor Dashboard" subtitle="Account Error">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="text-xl font-bold text-destructive mb-2">Account Orphaned</div>
          <div className="text-muted-foreground">Your hospital's organization account has been deleted from the system.<br/>Please contact the system administrator.</div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout nav={nav} title="Doctor Dashboard" subtitle={orgName || "Manage patients and transplants"}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading your data...</div>
        </div>
      </DashboardLayout>
    );
  }

  const pendingTransplants = transplants.filter(t => t.status === 'pending').length;
  const completedTransplants = transplants.filter(t => t.status === 'completed').length;

  return (
    <DashboardLayout nav={nav} title="Doctor Dashboard" subtitle={orgName || "Manage patients and transplants"}>

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
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Organ & Status</TableHead>
                    <TableHead className="text-right">History</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((p: any) => (
                    <TableRow key={p.patient_id}>
                      <TableCell className="font-medium">
                        {p.name}
                        {p.dob && <div className="text-xs text-muted-foreground mt-1">DOB: {new Date(p.dob).toLocaleDateString()}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{p.email || '—'}</div>
                        <div className="text-xs text-muted-foreground">{p.phones?.join(', ') || '—'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{p.organ}</div>
                        <div className="mt-1"><StatusBadge status={p.status} /></div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="rounded-xl">View History</Button>
                          </DialogTrigger>
                          <DialogContent className="rounded-2xl">
                            <DialogHeader>
                              <DialogTitle>Medical History: {p.name}</DialogTitle>
                            </DialogHeader>
                            <div className="max-h-96 overflow-y-auto space-y-3 mt-4">
                              {p.medical_history && p.medical_history.length > 0 ? (
                                p.medical_history.map((h: any) => (
                                  <div key={h.history_id} className="p-3 bg-muted/50 rounded-xl border border-border/50">
                                    <div className="text-xs text-muted-foreground mb-1">{format(new Date(h.record_date), "MMM d, yyyy")}</div>
                                    <div className="text-sm">{h.medical_detail}</div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-muted-foreground text-center p-4">No medical history available.</p>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
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
