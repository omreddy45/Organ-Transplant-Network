import { useEffect, useMemo, useState } from "react";
import {
  Home, Database, Stethoscope, Activity, User, Plus, ShieldCheck, Users, Heart, Trash2, Pencil, Clock, Eye, EyeOff
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend,
} from "recharts";
import { DashboardLayout, NavItem } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { ChartTooltip } from "@/components/dashboard/ChartTooltip";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import {
  mockOrgans, mockDoctors, mockTransplants, monthlyTransplants, inventoryMix, donorGrowth,
  ORGAN_TYPES, type Organ, type DoctorAvailability,
} from "@/lib/mockData";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

import { api } from "@/lib/api";

type Section = "overview" | "inventory" | "accounts" | "billing" | "donors" | "matchRequests" | "sessions";

const PIE_COLORS = [
  "hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))",
  "hsl(var(--warning))", "hsl(var(--primary-glow))", "hsl(256 89% 50%)",
  "hsl(18 100% 60%)", "hsl(280 90% 70%)",
];

const initials = (name: string) => name.split(" ").slice(-2).map((p) => p[0]).join("");

const OrganizationDashboard = () => {
  const { user } = useAuth();
  const [section, setSection] = useState<Section>("overview");
  const [inventory, setInventory] = useState<Organ[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Organ | null>(null);
  const [doctorList, setDoctorList] = useState<any[]>([]);
  const [showDocPwd, setShowDocPwd] = useState(false);
  const [organLimits, setOrganLimits] = useState<any[]>([]);
  const [transplantList, setTransplantList] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>({ monthly: [], mix: [], growth: [] });
  const [sortKey, setSortKey] = useState<"date" | "bill">("date");
  const [loading, setLoading] = useState(true);
  const [headName, setHeadName] = useState<string | null>(null);
  const [pendingDonors, setPendingDonors] = useState<any[]>([]);
  const [pendingPledges, setPendingPledges] = useState<any[]>([]);
  const [matchRequests, setMatchRequests] = useState<any[]>([]);
  const [sessionData, setSessionData] = useState<{ sessions: any[]; stats: { total: number; active: number; uniqueUsers: number } }>({ sessions: [], stats: { total: 0, active: 0, uniqueUsers: 0 } });

  const filterDoctorsByOrgan = (organ: string, docList: any[]) => {
    const limit = organLimits.find(l => String(l.organ_name).toLowerCase() === organ.toLowerCase());
    if (!limit) return docList; // fallback
    const reqSpec = String(limit.required_specialization).toLowerCase();
    return docList.filter(d => String(d.specialization).toLowerCase() === reqSpec && d.availability_status === 'available');
  };

  // Form state for Organ
  const [formName, setFormName] = useState<string>("Kidney");
  const [formQty, setFormQty] = useState<number>(1);
  const [formDonor, setFormDonor] = useState<string>("");
  const [formAvailability, setFormAvailability] = useState<string>("available");

  // Form state for Transplant Edit
  const [editingTransplant, setEditingTransplant] = useState<any>(null);
  const [formStatus, setFormStatus] = useState("pending");
  const [formBill, setFormBill] = useState<number | string>(0);

  const orgId = user?.orgId || user?.roleId;

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    Promise.allSettled([
      fetch(`https://organ-transplant-network.onrender.com/api/organs/inventory?org_id=${orgId}`).then(r => r.json()),
      fetch(`https://organ-transplant-network.onrender.com/api/doctors?org_id=${orgId}`).then(r => r.json()),
      fetch(`https://organ-transplant-network.onrender.com/api/transplants?org_id=${orgId}`).then(r => r.json()),
      fetch(`https://organ-transplant-network.onrender.com/api/transplants/analytics?org_id=${orgId}`).then(r => r.json()),
      fetch(`https://organ-transplant-network.onrender.com/api/auth/head/${orgId}`).then(r => r.ok ? r.json() : null),
      api.donors.list({ status: "pending" }),
      api.donors.listPledges({ org_id: orgId }),
      api.matchRequests.list({ status: "pending" }),
      api.admin.organLimits()
    ]).then(([invRes, docRes, trRes, anRes, headRes, donRes, plRes, mrRes, limitsRes]) => {
      if (invRes.status === 'fulfilled') setInventory(invRes.value);
      if (docRes.status === 'fulfilled') setDoctorList(docRes.value);
      if (trRes.status === 'fulfilled') setTransplantList(trRes.value);
      if (anRes.status === 'fulfilled') setAnalyticsData(anRes.value);
      if (headRes.status === 'fulfilled' && headRes.value) setHeadName(headRes.value.name);
      if (donRes.status === 'fulfilled') setPendingDonors(donRes.value);
      if (plRes.status === 'fulfilled') setPendingPledges(plRes.value.filter((p: any) => p.status === 'pending'));
      if (mrRes.status === 'fulfilled') setMatchRequests(mrRes.value);
      if (limitsRes.status === 'fulfilled') setOrganLimits(limitsRes.value);
      // Fetch session history
      api.sessions.list(orgId as number).then(setSessionData).catch(() => {});
      setLoading(false);
    });
  }, [orgId]);

  const openAdd = () => {
    setEditing(null); setFormName("Kidney"); setFormQty(1); setFormDonor(""); setFormAvailability("available"); setDrawerOpen(true);
  };
  const openEdit = (o: Organ) => {
    setEditing(o); setFormName(o.name); setFormQty(o.quantity); setFormDonor(o.donor_id?.toString() ?? ""); setFormAvailability(o.availability_status || "available"); setDrawerOpen(true);
  };
  const submitOrgan = () => {
    if (!orgId) return;
    
    // Check doctor availability
    const availableDocs = filterDoctorsByOrgan(formName, doctorList);
    if (availableDocs.length === 0) {
      const limit = organLimits.find(l => String(l.organ_name).toLowerCase() === formName.toLowerCase());
      const reqSpec = limit ? limit.required_specialization : 'a specialist';
      return toast.error(`Cannot add ${formName}. You need a doctor with specialization: ${reqSpec}.`);
    }

    if (editing) {
      fetch(`https://organ-transplant-network.onrender.com/api/organs/${editing.organ_id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, quantity: formQty, donor_id: formDonor ? Number(formDonor) : null, availability_status: formAvailability }),
      }).then(() => {
        setInventory((arr) => arr.map((o) => o.organ_id === editing.organ_id
          ? { ...o, name: formName as any, quantity: formQty, donor_id: formDonor ? Number(formDonor) : null, availability_status: formAvailability as any }
          : o));
        toast.success("Organ updated");
      });
    } else {
      fetch('https://organ-transplant-network.onrender.com/api/organs/add', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, quantity: formQty, donor_id: formDonor ? Number(formDonor) : null, org_id: orgId, availability_status: formAvailability }),
      }).then(r => r.json()).then(data => {
        const newOrgan: Organ = {
          organ_id: data.organ_id, name: formName as any, quantity: formQty, availability_status: formAvailability as any,
          donor_id: formDonor ? Number(formDonor) : null, org_id: orgId as number, organization_name: user?.name || "", location: "",
        };
        setInventory((arr) => [newOrgan, ...arr]);
        toast.success("Organ added to inventory");
      });
    }
    setDrawerOpen(false);
  };
  const deleteOrgan = (id: number) => {
    fetch(`https://organ-transplant-network.onrender.com/api/organs/${id}`, { method: 'DELETE' }).then(() => {
      setInventory((arr) => arr.filter((o) => o.organ_id !== id));
      toast.success("Organ removed");
    });
  };
  const changeDoctorStatus = (id: number, status: DoctorAvailability) => {
    fetch(`https://organ-transplant-network.onrender.com/api/doctors/${id}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availability_status: status })
    }).then(r => r.json()).then(data => {
      if (data.error) throw new Error(data.error);
      setDoctorList((arr) => arr.map((d) => d.doctor_id === id ? { ...d, availability_status: status } : d));
      toast.success("Doctor status updated");
    }).catch(e => toast.error(e.message));
  };
  const removeDoctor = (id: number) => {
    fetch(`https://organ-transplant-network.onrender.com/api/doctors/${id}`, { method: 'DELETE' }).then(r => r.json()).then(data => {
      if (data.error) throw new Error(data.error);
      setDoctorList((arr) => arr.filter(d => d.doctor_id !== id));
      toast.success("Doctor removed from organization");
    }).catch(e => toast.error(e.message));
  };
  const removeHead = () => {
    fetch(`https://organ-transplant-network.onrender.com/api/auth/head/${orgId}`, { method: 'DELETE' }).then(r => r.json()).then(data => {
      if (data.error) throw new Error(data.error);
      setHeadName(null);
      toast.success("Head account removed");
    }).catch(e => toast.error(e.message));
  };

  const submitTransplantUpdate = () => {
    if (!editingTransplant) return;
    fetch(`https://organ-transplant-network.onrender.com/api/transplants/${editingTransplant.transplant_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: formStatus, bill_amount: Number(formBill) })
    }).then(r => r.json()).then((d) => {
      if (d.error) throw new Error(d.error);
      setTransplantList(prev => prev.map(t => 
        t.transplant_id === editingTransplant.transplant_id 
        ? { ...t, status: formStatus, bill_amount: Number(formBill) } : t
      ));
      toast.success("Transplant record updated");
      setEditingTransplant(null);
    }).catch(e => toast.error(e.message));
  };

  const sortedTransplants = useMemo(() => {
    const arr = [...transplantList];
    arr.sort((a, b) => sortKey === "bill" ? Number(b.bill_amount) - Number(a.bill_amount) : String(b.transplant_date).localeCompare(String(a.transplant_date)));
    return arr.slice(0, 10);
  }, [sortKey, transplantList]);

  const totalOrgans = inventory.reduce((s, o) => s + o.quantity, 0);
  const availableOrgans = inventory.filter((o) => o.availability_status === "available").length;

  const nav: NavItem[] = [
    { label: "Overview", to: "/dashboard/organization", icon: Home, end: true, onClick: () => setSection("overview") },
    { label: "Verify Approvals", to: "/dashboard/organization", icon: ShieldCheck, onClick: () => setSection("donors") },
    { label: "Match Requests", to: "/dashboard/organization", icon: Activity, onClick: () => setSection("matchRequests") },
    { label: "Inventory", to: "/dashboard/organization", icon: Database, onClick: () => setSection("inventory") },
    { label: "Accounts", to: "/dashboard/organization", icon: Users, onClick: () => setSection("accounts") },
    { label: "Transplants", to: "/dashboard/organization", icon: Activity, onClick: () => setSection("billing") },
    { label: "Session History", to: "/dashboard/organization", icon: Clock, onClick: () => setSection("sessions") },
  ];

  return (
    <DashboardLayout nav={nav} title="Organization Dashboard" subtitle="Manage your hospital's inventory and accounts">

      {/* ── OVERVIEW ── */}
      {section === "overview" && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Organs" value={totalOrgans} icon={Heart} accent="primary" hint={`${availableOrgans} available`} />
            <StatCard label="Doctors" value={doctorList.length} icon={Stethoscope} accent="accent" />
            <StatCard label="Transplants" value={transplantList.length} icon={Activity} accent="success" />
            <StatCard label="Approved" value={<Badge className="bg-success/20 text-success border-0">Government verified</Badge>} icon={ShieldCheck} accent="success" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <button onClick={() => setSection("donors")} className="glass rounded-2xl p-5 text-left hover-lift">
              <ShieldCheck className="text-primary mb-2" size={22} />
              <div className="font-semibold">Pending Verifications</div>
              <div className="text-xs text-muted-foreground mt-1">{pendingPledges.length} pledges</div>
            </button>
            <button onClick={() => setSection("matchRequests")} className="glass rounded-2xl p-5 text-left hover-lift">
              <Activity className="text-primary mb-2" size={22} />
              <div className="font-semibold">Match Requests</div>
              <div className="text-xs text-muted-foreground mt-1">{matchRequests.length} pending</div>
            </button>
            <button onClick={() => setSection("inventory")} className="glass rounded-2xl p-5 text-left hover-lift">
              <Database className="text-primary mb-2" size={22} />
              <div className="font-semibold">Organ Inventory</div>
              <div className="text-xs text-muted-foreground mt-1">{inventory.length} entries</div>
            </button>
            <button onClick={() => setSection("accounts")} className="glass rounded-2xl p-5 text-left hover-lift">
              <Users className="text-primary mb-2" size={22} />
              <div className="font-semibold">Accounts</div>
              <div className="text-xs text-muted-foreground mt-1">{doctorList.length} doctors</div>
            </button>
            <button onClick={() => setSection("billing")} className="glass rounded-2xl p-5 text-left hover-lift">
              <Activity className="text-primary mb-2" size={22} />
              <div className="font-semibold">Billing</div>
              <div className="text-xs text-muted-foreground mt-1">{transplantList.length} records</div>
            </button>
          </div>
        </div>
      )}

      {/* ── VERIFY DONORS & PLEDGES ── */}
      {section === "donors" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setSection("overview")} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
            <h2 className="text-xl font-bold">Pending Verifications</h2>
          </div>

          <div className="space-y-2">
            <div className="glass-strong rounded-2xl p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Donor Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Organ Pledged</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPledges.map((p) => (
                    <TableRow key={p.pledge_id}>
                      <TableCell className="font-medium">{p.donor_name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.donor_email}</TableCell>
                      <TableCell className="font-semibold text-primary">{p.organ_type}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" className="rounded-xl bg-gradient-primary hover:opacity-90" onClick={() => {
                          const availableDocs = filterDoctorsByOrgan(p.organ_type, doctorList);
                          if (availableDocs.length === 0) {
                            const limit = organLimits.find(l => String(l.organ_name).toLowerCase() === String(p.organ_type).toLowerCase());
                            const reqSpec = limit ? limit.required_specialization : 'a specialist';
                            return toast.error(`Cannot verify ${p.organ_type}. You need a doctor with specialization: ${reqSpec}.`);
                          }
                          api.donors.approvePledge(p.pledge_id).then(() => {
                            setPendingPledges(prev => prev.filter(x => x.pledge_id !== p.pledge_id));
                            fetch(`https://organ-transplant-network.onrender.com/api/organs/inventory?org_id=${orgId}`).then(r => r.json()).then(setInventory);
                            toast.success('Pledge Verified! Organ added directly into your hospital Inventory.');
                          }).catch(e => toast.error(e.message));
                        }}>Verify & Add Organ</Button>
                        <Button size="sm" variant="outline" className="rounded-xl border-danger/40 text-danger hover:bg-danger hover:text-white" onClick={() => {
                          api.donors.rejectPledge(p.pledge_id).then(() => {
                            setPendingPledges(prev => prev.filter(x => x.pledge_id !== p.pledge_id));
                            toast.success('Organ pledge rejected.');
                          }).catch(e => toast.error(e.message));
                        }}>Reject</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pendingPledges.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground h-24">No pending organ pledges to verify.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* ── MATCH REQUESTS ── */}
      {section === "matchRequests" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setSection("overview")} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
            <h2 className="text-xl font-bold">Patient Match Requests</h2>
          </div>
          <div className="glass-strong rounded-2xl p-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Req ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Organ Type</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matchRequests.map((r) => (
                  <TableRow key={r.request_id}>
                    <TableCell className="font-medium">#{r.request_id}</TableCell>
                    <TableCell>{r.patient_name}</TableCell>
                    <TableCell className="font-semibold">{r.organ_type}</TableCell>
                    <TableCell><StatusBadge status={r.urgency_level} /></TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-right space-x-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button size="sm" className="rounded-xl bg-gradient-primary hover:opacity-90">Assign Organ</Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 rounded-2xl glass-strong border border-border/50 p-4">
                          <h4 className="font-semibold mb-3">Assign to {r.patient_name}</h4>
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label>Assign Surgeon</Label>
                              <Select onValueChange={(val) => r._selectedDoctor = val}>
                                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Choose doctor..." /></SelectTrigger>
                                <SelectContent>
                                  {filterDoctorsByOrgan(r.organ_type, doctorList).filter((d: any) => d.availability_status === 'available').map((d: any) => (
                                    <SelectItem key={d.doctor_id} value={d.doctor_id.toString()}>
                                      {d.name.startsWith('Dr.') ? d.name : `Dr. ${d.name}`} ({d.specialization})
                                    </SelectItem>
                                  ))}
                                  {filterDoctorsByOrgan(r.organ_type, doctorList).filter((d: any) => d.availability_status === 'available').length === 0 && (
                                    <SelectItem value="none" disabled>No available specialized surgeons</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button className="w-full rounded-xl bg-gradient-primary mt-2" onClick={() => {
                              if (!r._selectedDoctor) return toast.error("Please select a surgeon");
                              const matchingOrgans = inventory.filter(o => String(o.name).toLowerCase().trim() === String(r.organ_type).toLowerCase().trim());
                              if (matchingOrgans.length === 0) {
                                return toast.error(`No organs of type: ${r.organ_type} found in your inventory!`);
                              }
                              const autoOrgan = matchingOrgans.find(o => String(o.availability_status).toLowerCase().trim() === "available");
                              if (!autoOrgan) {
                                return toast.error(`Organ ${r.organ_type} found, but its status is '${matchingOrgans[0].availability_status}' (must be 'available')!`);
                              }
                              
                              api.matchRequests.assign(r.request_id, {
                                organ_id: autoOrgan.organ_id,
                                doctor_id: Number(r._selectedDoctor),
                                org_id: orgId as number
                              }).then(() => {
                                setMatchRequests(prev => prev.filter(x => x.request_id !== r.request_id));
                                setInventory(prev => prev.map(o => o.organ_id === autoOrgan.organ_id ? {...o, availability_status: "reserved" as any} : o));
                                fetch(`https://organ-transplant-network.onrender.com/api/transplants?org_id=${orgId}`).then(r => r.json()).then(setTransplantList);
                                toast.success("Organ successfully assigned to patient! Procedure scheduled.");
                              }).catch(e => toast.error(e.message));
                            }}>Confirm Assignment</Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Button size="sm" variant="outline" className="rounded-xl border-danger/40 text-danger hover:bg-danger hover:text-white" onClick={() => {
                        api.matchRequests.reject(r.request_id).then(() => {
                          setMatchRequests(prev => prev.filter(x => x.request_id !== r.request_id));
                          toast.success('Patient match request rejected.');
                        }).catch(e => toast.error(e.message));
                      }}>Reject</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {matchRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground h-24">No pending patient requests to fulfill.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── INVENTORY ── */}
      {section === "inventory" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setSection("overview")} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
              <h2 className="text-xl font-bold">Organ Inventory</h2>
            </div>
            <Button className="rounded-xl bg-gradient-primary" onClick={openAdd}>
              <Plus size={14} className="mr-1" /> Add Organ
            </Button>
          </div>
          <div className="glass-strong rounded-2xl p-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organ</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Donor Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((o: any) => (
                  <TableRow key={o.organ_id}>
                    <TableCell className="font-medium">{o.name}</TableCell>
                    <TableCell>{o.quantity}</TableCell>
                    <TableCell><StatusBadge status={o.availability_status} /></TableCell>
                    <TableCell className="text-muted-foreground">{o.donor_name || o.donor_id || "—"}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => openEdit(o)}><Pencil size={14} /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="rounded-xl text-danger hover:text-danger"><Trash2 size={14} /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove {o.name}?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently remove this organ from your inventory.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                            <AlertDialogAction className="rounded-xl bg-danger text-white" onClick={() => deleteOrgan(o.organ_id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetContent className="rounded-l-2xl">
              <SheetHeader>
                <SheetTitle>{editing ? "Edit organ" : "Add organ to inventory"}</SheetTitle>
                <SheetDescription>{editing ? "Update the details below." : "Fill in the details to register a new organ."}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label>Organ type</Label>
                  <Select value={formName} onValueChange={setFormName}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {organLimits.map((l) => <SelectItem key={l.organ_name} value={l.organ_name}>{l.organ_name}</SelectItem>)}
                      {organLimits.length === 0 && ORGAN_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" min={1} value={formQty} onChange={(e) => setFormQty(Number(e.target.value))} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Donor ID (optional)</Label>
                  <Input value={formDonor} onChange={(e) => setFormDonor(e.target.value)} placeholder="e.g. 101" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select value={formAvailability} onChange={(e) => setFormAvailability(e.target.value)} className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm">
                    <option value="available">Available</option>
                    <option value="reserved">Reserved (Pledged by donor)</option>
                    <option value="transplanted">Transplanted</option>
                  </select>
                </div>
              </div>
              <SheetFooter className="mt-6">
                <Button variant="outline" className="rounded-xl" onClick={() => setDrawerOpen(false)}>Cancel</Button>
                <Button className="rounded-xl bg-gradient-primary" onClick={submitOrgan}>{editing ? "Update" : "Add"}</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      )}

      {/* ── ACCOUNTS ── */}
      {section === "accounts" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setSection("overview")} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
            <h2 className="text-xl font-bold">Manage Accounts</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4">
              <User className="mx-auto text-primary" size={40} />
              <h3 className="font-semibold text-lg">Hospital Head Account</h3>
              {headName ? (
                <>
                  <p className="text-base font-semibold text-foreground">{headName?.startsWith('Dr.') ? headName : `Dr. ${headName}`}</p>
                  <p className="text-sm text-muted-foreground">Admin Head configuration is active.</p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="rounded-xl border-danger/40 text-danger hover:bg-danger hover:text-white">
                        <Trash2 size={14} className="mr-1" /> Remove Head
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Head Account?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete the head account. The head will no longer be able to log in.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction className="rounded-xl bg-danger text-white" onClick={removeHead}>Yes, Remove Head</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">No head account created yet.</p>
                  <p className="text-xs text-muted-foreground">Head configuration has been moved to your Organization Profile.</p>
                </>
              )}
            </div>

            <div className="glass rounded-2xl p-6 text-center space-y-4">
              <Stethoscope className="mx-auto text-primary" size={40} />
              <h3 className="font-semibold text-lg">Doctor Account</h3>
              <p className="text-sm text-muted-foreground">Create accounts for doctors so they can manage their transplant schedule.</p>
              <Sheet>
                <SheetTrigger asChild>
                  <Button className="rounded-xl w-full" variant="outline">Create Doctor Account</Button>
                </SheetTrigger>
                <SheetContent className="rounded-l-2xl">
                  <SheetHeader>
                    <SheetTitle>Register a new doctor</SheetTitle>
                    <SheetDescription>Create a doctor account for your organization.</SheetDescription>
                  </SheetHeader>
                  <div className="space-y-4 mt-6">
                    <div className="space-y-2"><Label>Full Name</Label><Input id="doc-name" placeholder="Dr. Full Name" className="rounded-xl" /></div>
                    <div className="space-y-2"><Label>Email</Label><Input id="doc-email" type="email" placeholder="doctor@example.com" className="rounded-xl" /></div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <div className="relative">
                        <Input id="doc-password" type={showDocPwd ? "text" : "password"} placeholder="Min 6 characters" className="rounded-xl" />
                        <button type="button" onClick={() => setShowDocPwd(!showDocPwd)} className="absolute right-3 top-[10px] text-muted-foreground hover:text-foreground">
                          {showDocPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Specialization</Label>
                      <Select onValueChange={(val) => {
                         const input = document.getElementById('doc-spec') as HTMLInputElement;
                         if (input) input.value = val;
                      }}>
                        <SelectTrigger className="rounded-xl w-full">
                          <SelectValue placeholder="Select Specialization" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from(new Set(organLimits.map(l => l.required_specialization))).map((spec: any) => (
                            <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <input type="hidden" id="doc-spec" />
                    </div>
                    <div className="space-y-2"><Label>Phone Number</Label><Input id="doc-phone" placeholder="+91 9876543210" className="rounded-xl" /></div>
                  </div>
                  <SheetFooter className="mt-6">
                    <Button className="rounded-xl bg-gradient-primary" onClick={() => {
                      const nameEl = document.getElementById('doc-name') as HTMLInputElement;
                      const emailEl = document.getElementById('doc-email') as HTMLInputElement;
                      const pwdEl = document.getElementById('doc-password') as HTMLInputElement;
                      const specEl = document.getElementById('doc-spec') as HTMLInputElement;
                      const phoneEl = document.getElementById('doc-phone') as HTMLInputElement;
                      if (!nameEl?.value || !emailEl?.value || !pwdEl?.value || !specEl?.value) {
                         return toast.error('Please fill all required fields');
                      }
                      if (!/^\S+@\S+\.\S+$/.test(emailEl.value)) {
                         return toast.error('Please enter a valid email address');
                      }
                      fetch('https://organ-transplant-network.onrender.com/api/auth/signup', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: nameEl.value, email: emailEl.value, password: pwdEl.value, role: 'doctor', specialization: specEl.value, phoneNumber: phoneEl.value || undefined, org_id: orgId, _orgCreated: true })
                      }).then(r => r.json()).then(data => {
                        if (data.error) throw new Error(data.error);
                        toast.success(`Doctor ${nameEl.value} account created!`);
                        setDoctorList(prev => [...prev, { doctor_id: data.user.id, name: nameEl.value, specialization: specEl.value, availability_status: "available" }]);
                      }).catch(err => toast.error(err.message));
                    }}>Create Doctor Account</Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Roster of Doctors */}
          {doctorList.length > 0 && (
            <div className="glass-strong rounded-2xl p-5 mt-4">
              <h3 className="text-lg font-semibold mb-3">Roster of Doctors</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {doctorList.map((d: any) => (
                  <div key={d.doctor_id} className="glass border border-border/50 rounded-xl p-3 flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs font-semibold">
                        {initials(d.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm truncate">{d.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{d.specialization}</div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="rounded-xl text-danger hover:text-danger shrink-0">
                          <Trash2 size={14} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove {d.name}?</AlertDialogTitle>
                          <AlertDialogDescription>This will permanently delete this doctor's account and all related records.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                          <AlertDialogAction className="rounded-xl bg-danger text-white" onClick={() => removeDoctor(d.doctor_id)}>Delete Doctor</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BILLING & TRANSPLANTS ── */}
      {section === "billing" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button onClick={() => setSection("overview")} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
              <h2 className="text-xl font-bold">Transplants & Billing Records</h2>
            </div>
          </div>
          
          <div className="glass-strong rounded-2xl p-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transplant ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Bill Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTransplants.length > 0 ? sortedTransplants.map((t) => (
                  <TableRow key={t.transplant_id}>
                    <TableCell className="font-medium">#{t.transplant_id}</TableCell>
                    <TableCell>{new Date(t.transplant_date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-muted-foreground">{t.patient_name || `ID #${t.patient_id}`}</TableCell>
                    <TableCell className="text-muted-foreground">{t.doctor_name ? (t.doctor_name.startsWith('Dr.') ? t.doctor_name : `Dr. ${t.doctor_name}`) : `ID #${t.doctor_id}`}</TableCell>
                    <TableCell><StatusBadge status={t.status || 'completed'} /></TableCell>
                    <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{Number(t.bill_amount).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => {
                        setEditingTransplant(t);
                        setFormStatus(t.status || "pending");
                        setFormBill(t.bill_amount || 0);
                      }}><Pencil size={14} /></Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                     <TableCell colSpan={7} className="text-center text-muted-foreground h-24">No billing records found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <Sheet open={!!editingTransplant} onOpenChange={(open) => !open && setEditingTransplant(null)}>
            <SheetContent className="rounded-l-2xl">
              <SheetHeader>
                <SheetTitle>Update Billing & Status</SheetTitle>
                <SheetDescription>Update procedure status and final invoice amount.</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label>Procedure Status</Label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <p className="text-xs text-muted-foreground">Marking as Completed/Cancelled automatically updates Organ inventory availability.</p>
                </div>
                <div className="space-y-2">
                  <Label>Final Bill Amount (₹)</Label>
                  <Input type="number" min={0} value={formBill} onChange={(e) => setFormBill(e.target.value)} className="rounded-xl" />
                </div>
              </div>
              <SheetFooter className="mt-6">
                <Button variant="outline" className="rounded-xl" onClick={() => setEditingTransplant(null)}>Cancel</Button>
                <Button className="rounded-xl bg-gradient-primary" onClick={submitTransplantUpdate}>Save Records</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      )}
      {/* ── SESSION HISTORY ── */}
      {section === "sessions" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setSection("overview")} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
            <h2 className="text-xl font-bold">Session History</h2>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Active Sessions" value={sessionData.stats.active} icon={Activity} accent="success" hint="Currently logged in" />
            <StatCard label="Total Logins" value={sessionData.stats.total} icon={Clock} accent="primary" hint="Last 100 sessions" />
            <StatCard label="Unique Users" value={sessionData.stats.uniqueUsers} icon={Users} accent="accent" hint="Who logged in" />
          </div>

          {/* Sessions table */}
          <div className="glass-strong rounded-2xl p-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Login Time</TableHead>
                  <TableHead>Logout Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionData.sessions.length > 0 ? sessionData.sessions.map((s) => {
                  const loginDate = new Date(s.login_time);
                  const logoutDate = s.logout_time ? new Date(s.logout_time) : null;
                  const durationMin = s.duration_minutes || 0;
                  const hours = Math.floor(durationMin / 60);
                  const mins = durationMin % 60;
                  const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

                  return (
                    <TableRow key={s.session_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-[10px] font-semibold">
                              {initials(s.display_name || s.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">{s.display_name || s.username}</div>
                            <div className="text-xs text-muted-foreground">{s.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-xl capitalize text-xs">{s.role}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {loginDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}{' '}
                        <span className="text-muted-foreground">{loginDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {logoutDate
                          ? <>{logoutDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}{' '}
                              <span className="text-muted-foreground">{logoutDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></>
                          : <span className="text-muted-foreground italic">—</span>}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{durationStr}</TableCell>
                      <TableCell>
                        {s.session_status === 'active'
                          ? <Badge className="bg-success/20 text-success border-0 rounded-xl animate-pulse-dot">● Active</Badge>
                          : <Badge variant="outline" className="rounded-xl text-muted-foreground">Ended</Badge>}
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground h-24">No session records found. Sessions are recorded when users log in.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default OrganizationDashboard;
