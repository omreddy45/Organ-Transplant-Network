import { useEffect, useMemo, useState } from "react";
import {
  Home, User, Search, Activity, FileText, Stethoscope, Heart, Plus, Calendar, ShieldCheck,
} from "lucide-react";
import { DashboardLayout, NavItem } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

import { ORGAN_TYPES } from "@/lib/mockData";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Section = "overview" | "transplants" | "history" | "doctors" | "matchRequests";

const PatientDashboard = () => {
  const { user } = useAuth();
  const [section, setSection] = useState<Section>("overview");
  const [transplants, setTransplants] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRecordOpen, setNewRecordOpen] = useState(false);
  const [recordText, setRecordText] = useState("");
  const [matchRequests, setMatchRequests] = useState<any[]>([]);
  const [formOrganType, setFormOrganType] = useState("Kidney");
  const [formUrgency, setFormUrgency] = useState("normal");
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [schedule, setSchedule] = useState<any[]>([]);

  const patientId = user?.roleId;

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    Promise.allSettled([
      api.transplants.list({ patient_id: String(patientId) }),
      api.medicalHistory.list(patientId),
      api.doctors.list(),
      api.matchRequests.list({ patient_id: patientId }),
      api.patients.schedule(patientId)
    ]).then(([tRes, hRes, dRes, mrRes, schRes]) => {
      if (tRes.status === "fulfilled") setTransplants(tRes.value);
      if (hRes.status === "fulfilled") setHistory(hRes.value);
      if (dRes.status === "fulfilled") setDoctors(dRes.value);
      if (mrRes.status === "fulfilled") setMatchRequests(mrRes.value);
      if (schRes.status === "fulfilled") setSchedule(schRes.value);
      setLoading(false);
    });
  }, [patientId]);

  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => String(b.record_date).localeCompare(String(a.record_date))),
    [history],
  );

  const filteredDoctors = useMemo(() => {
    const allowedOrgs = new Set(transplants.map((t: any) => t.org_id).filter(Boolean));
    return doctors.filter((d: any) => allowedOrgs.has(d.org_id));
  }, [doctors, transplants]);

  const addRecord = async () => {
    if (!recordText.trim() || !patientId) return;
    try {
      const res = await api.medicalHistory.add(patientId, recordText.trim());
      setHistory((h) => [
        { history_id: res.history_id, patient_id: patientId, medical_detail: recordText.trim(), record_date: res.record_date || new Date().toISOString() },
        ...h,
      ]);
      setRecordText("");
      setNewRecordOpen(false);
      toast.success("Medical record added");
    } catch (err: any) {
      toast.error(err.message || "Failed to add record");
    }
  };

  const submitMatchRequest = async () => {
    if (!patientId) return;
    try {
      const res: any = await api.matchRequests.create({ patient_id: patientId, organ_type: formOrganType, urgency_level: formUrgency });
      const newReq = { request_id: res.request_id || res.id || Math.random(), patient_id: patientId, organ_type: formOrganType, urgency_level: formUrgency, status: 'pending', request_date: new Date().toISOString() };
      setMatchRequests(prev => [newReq, ...prev]);
      setNewRequestOpen(false);
      toast.success("Match request submitted to the health network!");
    } catch(err: any) {
      toast.error(err.message);
    }
  };

  const assignedDoctor = useMemo(() => {
    if (transplants.length > 0) {
      // transplants array is already ordered by date DESC from the API
      const latestTransplant = transplants[0];
      return doctors.find(d => d.doctor_id === latestTransplant.doctor_id) || filteredDoctors[0];
    }
    return filteredDoctors[0];
  }, [transplants, doctors, filteredDoctors]);

  const nav: NavItem[] = [
    { label: "Overview", to: "/dashboard/patient", icon: Home, end: true, onClick: () => setSection("overview") },
    { label: "Match Requests", to: "/dashboard/patient", icon: Heart, onClick: () => setSection("matchRequests") },
    { label: "Transplants", to: "/dashboard/patient", icon: Activity, onClick: () => setSection("transplants") },
    { label: "Medical History", to: "/dashboard/patient", icon: FileText, onClick: () => setSection("history") },
    { label: "Doctors", to: "/dashboard/patient", icon: Stethoscope, onClick: () => setSection("doctors") },
    { label: "Public Catalog", to: "/organs", icon: Search },
  ];

  if (loading) {
    return (
      <DashboardLayout nav={nav} title="Patient Dashboard" subtitle="Track your transplant journey">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading your data...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout nav={nav} title="Patient Dashboard" subtitle="Track your transplant journey">

      {/* ── OVERVIEW ── */}
      {section === "overview" && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Transplant Status"
              value={transplants.length > 0 ? <StatusBadge status={transplants[0].status} /> : <span className="text-sm text-muted-foreground">No transplants yet</span>}
              icon={Activity}
              accent="warning"
              hint={transplants.length > 0 ? `${transplants.length} record(s)` : "Visit 'Find Organs' to get started"}
            />
            <div className="glass-strong rounded-2xl p-5 hover-lift">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Assigned Doctor</div>
              {assignedDoctor ? (
                <div className="mt-3 flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs font-semibold">
                      {assignedDoctor.name?.split(" ").map((s: string) => s[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{assignedDoctor.name}</div>
                    <div className="text-xs text-muted-foreground">{assignedDoctor.specialization}</div>
                    {assignedDoctor.phones && assignedDoctor.phones.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-0.5 border-t border-border/30 pt-0.5">
                        📞 {assignedDoctor.phones.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-muted-foreground">None assigned yet</div>
              )}
            </div>
            <StatCard label="Transplants" value={transplants.length} icon={Calendar} accent="primary" hint={`${transplants.filter(t => t.status === 'completed').length} completed`} />
            <StatCard label="Medical Records" value={history.length} icon={ShieldCheck} accent="success" hint="View full history below" />
          </div>

          {/* Recent transplant activity */}
          {transplants.length > 0 && (
            <div className="glass-strong rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">Recent Transplant Activity</h2>
                <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => setSection("transplants")}>
                  View all →
                </Button>
              </div>
              <div className="space-y-3">
                {transplants.slice(0, 3).map((t: any) => (
                  <div key={t.transplant_id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                    <div>
                      <span className="font-medium">{t.organ_name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{format(new Date(t.transplant_date), "MMM d, yyyy")}</span>
                      <span className="text-xs text-muted-foreground ml-2">· {t.doctor_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={t.status} />
                      <span className="text-sm font-semibold">₹{Number(t.bill_amount).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <button onClick={() => setSection("matchRequests")} className="glass rounded-2xl p-5 text-left hover-lift group">
              <Heart className="text-primary mb-2" size={22} />
              <div className="font-semibold">Match Requests</div>
              <div className="text-xs text-muted-foreground mt-1">{matchRequests.length} requests</div>
            </button>
            <button onClick={() => setSection("history")} className="glass rounded-2xl p-5 text-left hover-lift group">
              <FileText className="text-primary mb-2" size={22} />
              <div className="font-semibold">Medical History</div>
              <div className="text-xs text-muted-foreground mt-1">{history.length} records</div>
            </button>
            <button onClick={() => setSection("doctors")} className="glass rounded-2xl p-5 text-left hover-lift group">
              <Stethoscope className="text-primary mb-2" size={22} />
              <div className="font-semibold">My Doctors</div>
              <div className="text-xs text-muted-foreground mt-1">{filteredDoctors.length} available</div>
            </button>
            <button onClick={() => setSection("transplants")} className="glass rounded-2xl p-5 text-left hover-lift group">
              <Activity className="text-primary mb-2" size={22} />
              <div className="font-semibold">Transplants</div>
              <div className="text-xs text-muted-foreground mt-1">{transplants.length} records</div>
            </button>
          </div>
        </div>
      )}

      {/* ── TRANSPLANTS ── */}
      {section === "transplants" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setSection("overview")} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
            <h2 className="text-xl font-bold">Transplant Timeline</h2>
          </div>
          {transplants.length === 0 ? (
            <div className="glass-strong rounded-2xl p-8 text-center text-muted-foreground">
              <Activity className="mx-auto mb-3" size={32} />
              <p>No transplant records yet. Visit the <a href="/organs" className="text-primary underline">Organs Catalog</a> to find available organs.</p>
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-border/60 space-y-4">
              {transplants.map((t: any) => (
                <div key={t.transplant_id} className="relative">
                  <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full bg-gradient-primary ring-4 ring-background" />
                  <div className="glass rounded-xl p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold">{t.organ_name} transplant</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{format(new Date(t.transplant_date), "MMM d, yyyy")} · {t.doctor_name} · {t.organization_name}</div>
                        {t.donor_name && (
                          <div className="text-xs mt-1.5 px-2 py-1 rounded-lg bg-primary/5 border border-primary/20 inline-block">
                            <span className="text-muted-foreground">Donated by: </span>
                            <span className="font-medium text-foreground">{t.donor_name}</span>
                            {t.donor_email && <span className="text-muted-foreground"> ({t.donor_email})</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={t.status} />
                        <span className="text-sm font-semibold">₹{Number(t.bill_amount).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MATCH REQUESTS ── */}
      {section === "matchRequests" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button onClick={() => setSection("overview")} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
              <h2 className="text-xl font-bold">My Match Requests</h2>
            </div>
            <Dialog open={newRequestOpen} onOpenChange={setNewRequestOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-xl bg-gradient-primary">
                  <Plus size={14} className="mr-1" /> Request Organ
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Submit organ match request</DialogTitle>
                  <DialogDescription>Submit your request to the central matching system.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label>Organ Required</Label>
                    <Select value={formOrganType} onValueChange={setFormOrganType}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ORGAN_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Urgency Level</Label>
                    <Select value={formUrgency} onValueChange={setFormUrgency}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="mt-4">
                  <Button variant="outline" className="rounded-xl" onClick={() => setNewRequestOpen(false)}>Cancel</Button>
                  <Button className="rounded-xl bg-gradient-primary" onClick={submitMatchRequest}>Submit Request</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="glass-strong rounded-2xl p-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request Date</TableHead>
                  <TableHead>Organ</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matchRequests.map((r: any) => (
                  <TableRow key={r.request_id}>
                    <TableCell>{new Date(r.request_date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-semibold">{r.organ_type}</TableCell>
                    <TableCell><StatusBadge status={r.urgency_level} /></TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                  </TableRow>
                ))}
                {matchRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground h-24">You do not have any active organ match requests.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── MEDICAL HISTORY ── */}
      {section === "history" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setSection("overview")} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
              <h2 className="text-xl font-bold">Medical History</h2>
            </div>
            <Dialog open={newRecordOpen} onOpenChange={setNewRecordOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-xl bg-gradient-primary">
                  <Plus size={14} className="mr-1" /> Add Record
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Add medical record</DialogTitle>
                  <DialogDescription>This record will be visible to your assigned doctor.</DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="rec">Detail</Label>
                  <Textarea id="rec" rows={4} value={recordText} onChange={(e) => setRecordText(e.target.value)} className="rounded-xl" />
                </div>
                <DialogFooter>
                  <Button variant="outline" className="rounded-xl" onClick={() => setNewRecordOpen(false)}>Cancel</Button>
                  <Button className="rounded-xl bg-gradient-primary" onClick={addRecord}>Save record</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {sortedHistory.length === 0 ? (
            <div className="glass-strong rounded-2xl p-8 text-center text-muted-foreground">
              <FileText className="mx-auto mb-3" size={32} />
              <p>No medical records yet. Click "Add Record" to create your first one.</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {sortedHistory.map((r: any) => (
                <AccordionItem key={r.history_id} value={String(r.history_id)} className="border-border/40">
                  <AccordionTrigger className="hover:no-underline text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-24 shrink-0">{format(new Date(r.record_date), "MMM d, yyyy")}</span>
                      <span className="font-medium">{r.medical_detail.slice(0, 60)}{r.medical_detail.length > 60 ? "…" : ""}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pl-[120px]">
                    {r.medical_detail}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      )}

      {/* ── DOCTORS ── */}
      {section === "doctors" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setSection("overview")} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
            <h2 className="text-xl font-bold">My Assigned Doctors</h2>
          </div>
          {filteredDoctors.length === 0 ? (
            <div className="glass-strong rounded-2xl p-8 text-center text-muted-foreground">
              <Stethoscope className="mx-auto mb-3" size={32} />
              <p>No doctors assigned yet. Complete a match request to be assigned to a hospital and doctor.</p>
            </div>
          ) : (
            <div className="overflow-x-auto glass-strong rounded-2xl p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDoctors.map((d: any) => (
                    <TableRow key={d.doctor_id}>
                       <TableCell className="font-medium">{d.name}</TableCell>
                       <TableCell className="text-muted-foreground">{d.specialization}</TableCell>
                       <TableCell className="text-muted-foreground text-xs">{d.phones?.join(', ') || '—'}</TableCell>
                       <TableCell className="text-muted-foreground">{d.organization_name || '—'}</TableCell>
                       <TableCell><StatusBadge status={d.availability_status === "available" ? "available_doctor" : d.availability_status} /></TableCell>
                       <TableCell className="text-right">
                         <Button size="sm" variant="outline" className="rounded-xl" onClick={() => {
                           // Set the visit date to next week for a manual booking
                           const fd = new Date();
                           fd.setDate(fd.getDate() + 7);
                           fetch('/api/doctors/visit', {
                             method: 'POST', headers: { 'Content-Type': 'application/json' },
                             body: JSON.stringify({ doctor_id: d.doctor_id, patient_id: patientId, visit_date: fd.toISOString().split('T')[0] })
                           }).then(r => r.json()).then(data => {
                             if (data.error) throw new Error(data.error);
                             toast.success(`Visit securely booked. Check your schedule.`);
                           }).catch(e => toast.error(e.message));
                         }}>Book Visit</Button>
                       </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Visits Timeline */}
          {schedule.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-bold mb-3">Your Medical Visits</h3>
              <div className="space-y-3">
                {schedule.map((v: any, i: number) => (
                  <div key={i} className="glass rounded-xl p-4 flex items-center justify-between border border-primary/20 bg-primary/5">
                    <div>
                      <div className="font-semibold text-primary">{v.doctor_name}</div>
                      <div className="text-xs text-muted-foreground">{v.organization_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{format(new Date(v.visit_date), "MMM d, yyyy")}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Consultation Visit</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default PatientDashboard;
