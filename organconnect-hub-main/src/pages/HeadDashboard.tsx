import { useEffect, useMemo, useState } from "react";
import {
  Home, Stethoscope, Activity, Users,
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
} from "recharts";
import { DashboardLayout, NavItem } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { ChartTooltip } from "@/components/dashboard/ChartTooltip";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover as UIPopover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { type DoctorAvailability } from "@/lib/mockData";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Section = "overview" | "doctors" | "transplants";

const PIE_COLORS = [
  "hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))",
  "hsl(var(--warning))", "hsl(var(--primary-glow))", "hsl(256 89% 50%)",
  "hsl(18 100% 60%)", "hsl(280 90% 70%)",
];

const initials = (name: string) => name.split(" ").slice(-2).map((p) => p[0]).join("");

const HeadDashboard = () => {
  const { user } = useAuth();
  const [section, setSection] = useState<Section>("overview");
  const [doctorList, setDoctorList] = useState<any[]>([]);
  const [transplantList, setTransplantList] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>({ monthly: [], mix: [], growth: [] });
  const [sortKey, setSortKey] = useState<"date" | "bill">("date");
  const [loading, setLoading] = useState(true);
  const [selectedDocInfo, setSelectedDocInfo] = useState<any>(null);
  const [orgName, setOrgName] = useState<string>("");

  const orgId = user?.orgId;

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    Promise.allSettled([
      fetch(`https://organ-transplant-network.onrender.com/api/doctors?org_id=${orgId}`).then(r => r.json()),
      fetch(`https://organ-transplant-network.onrender.com/api/transplants?org_id=${orgId}`).then(r => r.json()),
      fetch(`https://organ-transplant-network.onrender.com/api/transplants/analytics?org_id=${orgId}`).then(r => r.json()),
      fetch(`https://organ-transplant-network.onrender.com/api/auth/org/${orgId}`).then(r => r.ok ? r.json() : { name: "" })
    ]).then(([docRes, trRes, anRes, orgRes]) => {
      if (docRes.status === 'fulfilled') setDoctorList(docRes.value);
      if (trRes.status === 'fulfilled') setTransplantList(trRes.value);
      if (anRes.status === 'fulfilled') setAnalyticsData(anRes.value);
      if (orgRes.status === 'fulfilled' && orgRes.value?.name) setOrgName(orgRes.value.name);
      setLoading(false);
    });
  }, [orgId]);

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

  const sortedTransplants = useMemo(() => {
    const arr = [...transplantList];
    arr.sort((a, b) => sortKey === "bill" ? Number(b.bill_amount) - Number(a.bill_amount) : String(b.transplant_date).localeCompare(String(a.transplant_date)));
    return arr.slice(0, 10);
  }, [sortKey, transplantList]);

  const nav: NavItem[] = [
    { label: "Overview", to: "/dashboard/head", icon: Home, end: true, onClick: () => setSection("overview") },
    { label: "Doctors", to: "/dashboard/head", icon: Stethoscope, onClick: () => setSection("doctors") },
    { label: "Transplants", to: "/dashboard/head", icon: Activity, onClick: () => setSection("transplants") },
  ];

  if (loading) {
     return (
       <DashboardLayout nav={nav} title="Head Dashboard" subtitle={orgName || "Hospital analytics and doctor management"}>
         <div className="flex items-center justify-center p-20 text-muted-foreground animate-pulse">Loading analytics...</div>
       </DashboardLayout>
     );
  }

  return (
    <DashboardLayout nav={nav} title="Head Dashboard" subtitle={orgName || "Hospital analytics and doctor management"}>
      {/* ── OVERVIEW ── */}
      {section === "overview" && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Total Doctors" value={doctorList.length} icon={Stethoscope} accent="primary" />
            <StatCard label="Transplant Records" value={transplantList.length} icon={Activity} accent="success" />
            <StatCard label="Active Leaves" value={doctorList.filter(d => d.availability_status === 'on_leave').length} icon={Users} accent="warning" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={() => setSection("doctors")} className="glass rounded-2xl p-5 text-left hover-lift">
              <Stethoscope className="text-primary mb-2" size={22} />
              <div className="font-semibold">Manage Doctors</div>
              <div className="text-xs text-muted-foreground mt-1">{doctorList.length} doctors on staff</div>
            </button>
            <button onClick={() => setSection("transplants")} className="glass rounded-2xl p-5 text-left hover-lift">
              <Activity className="text-primary mb-2" size={22} />
              <div className="font-semibold">Transplant Records</div>
              <div className="text-xs text-muted-foreground mt-1">{transplantList.length} total records</div>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-strong rounded-2xl p-5">
              <h3 className="text-sm font-semibold mb-4">Monthly Transplants</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analyticsData.monthly && analyticsData.monthly.length > 0 ? analyticsData.monthly : [{month:'N/A',transplants:0}]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <RTooltip content={<ChartTooltip />} />
                  <Bar dataKey="transplants" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="glass-strong rounded-2xl p-5">
              <h3 className="text-sm font-semibold mb-4">Organ Mix</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={analyticsData.mix && analyticsData.mix.length > 0 ? analyticsData.mix : [{name:'No data',value:1}]} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4} label={({ name }) => name}>
                    {(analyticsData.mix && analyticsData.mix.length > 0 ? analyticsData.mix : [{name:'No data',value:1}]).map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <RTooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── DOCTORS ── */}
      {section === "doctors" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setSection("overview")} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
            <h2 className="text-xl font-bold">Doctors Directory</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {doctorList.map((d) => (
              <div key={d.doctor_id} className="glass rounded-xl p-4 hover-lift">
                <div className="flex items-start gap-3">
                  <Avatar className="h-11 w-11">
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs font-semibold">
                      {initials(d.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{d.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{d.specialization}</div>
                    <div className="mt-2">
                      <StatusBadge status={d.availability_status === "available" ? "available_doctor" : d.availability_status} />
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 rounded-xl" onClick={() => setSelectedDocInfo(d)}>View Details</Button>
                  <UIPopover>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="outline" className="rounded-xl">Status</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-40 p-1 rounded-xl" align="end">
                      {(["available", "busy", "on_leave"] as DoctorAvailability[]).map((s) => (
                        <button key={s} className={cn("w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-muted", d.availability_status === s && "bg-muted font-medium")} onClick={() => changeDoctorStatus(d.doctor_id, s)}>
                          {s === "on_leave" ? "On Leave" : s === "busy" ? "Busy" : "Available"}
                        </button>
                      ))}
                    </PopoverContent>
                  </UIPopover>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TRANSPLANTS ── */}
      {section === "transplants" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setSection("overview")} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
              <h2 className="text-xl font-bold">Transplant Records</h2>
            </div>
            <Select value={sortKey} onValueChange={(v: any) => setSortKey(v)}>
              <SelectTrigger className="w-44 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Sort by date</SelectItem>
                <SelectItem value="bill">Sort by bill</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="glass-strong rounded-2xl p-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Organ</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Bill</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTransplants.map((t) => (
                  <TableRow key={t.transplant_id}>
                    <TableCell className="text-muted-foreground">{format(new Date(t.transplant_date), "MMM d")}</TableCell>
                    <TableCell className="font-medium">{t.patient_name}</TableCell>
                    <TableCell className="text-muted-foreground">{t.doctor_name}</TableCell>
                    <TableCell>{t.organ_name}</TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                    <TableCell className="text-right font-medium">₹{t.bill_amount.toLocaleString("en-IN")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      {/* ── DOCTOR DETAILS DIALOG ── */}
      <Dialog open={!!selectedDocInfo} onOpenChange={() => setSelectedDocInfo(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{selectedDocInfo?.name?.startsWith('Dr.') ? selectedDocInfo.name : `Dr. ${selectedDocInfo?.name}`}</DialogTitle>
            <DialogDescription>{selectedDocInfo?.specialization}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm mt-4">
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={selectedDocInfo?.availability_status === "available" ? "available_doctor" : selectedDocInfo?.availability_status} />
            </div>
             <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Contact</span>
              <span className="font-medium">{selectedDocInfo?.phones?.[0] || 'No phone recorded'}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Doctor ID</span>
              <span className="font-medium">#{selectedDocInfo?.doctor_id}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default HeadDashboard;
