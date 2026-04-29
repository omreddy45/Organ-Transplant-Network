import { useEffect, useState } from "react";
import {
  Home, Users, Building2, Heart, Activity, Shield, Database, Trash2, Search, FileText,
} from "lucide-react";
import { DashboardLayout, NavItem } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";

type Section = "overview" | "users" | "organizations" | "audit" | "organLimits";

const AdminDashboard = () => {
  const { user } = useAuth();
  const [section, setSection] = useState<Section>("overview");
  const [stats, setStats] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [organLimits, setOrganLimits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      api.admin.stats(),
      api.admin.users(),
      api.admin.organizations(),
      api.admin.auditLog(),
      api.admin.organLimits(),
    ]).then(([statsRes, usersRes, orgsRes, auditRes, limitsRes]) => {
      if (statsRes.status === "fulfilled") setStats(statsRes.value);
      if (usersRes.status === "fulfilled") setUsers(usersRes.value);
      if (orgsRes.status === "fulfilled") setOrganizations(orgsRes.value);
      if (auditRes.status === "fulfilled") setAuditLog(auditRes.value);
      if (limitsRes.status === "fulfilled") setOrganLimits(limitsRes.value);
      setLoading(false);
    });
  }, []);

  const fetchUsers = (role?: string, search?: string) => {
    api.admin.users({ role: role || roleFilter, search: search || searchQuery })
      .then(setUsers)
      .catch(() => {});
  };

  const deleteUser = (userId: number) => {
    api.admin.deleteUser(userId).then(() => {
      setUsers(prev => prev.filter(u => u.user_id !== userId));
      toast.success("User account deleted");
      // Refresh stats
      api.admin.stats().then(setStats).catch(() => {});
      api.admin.auditLog().then(setAuditLog).catch(() => {});
    }).catch(e => toast.error(e.message));
  };

  const nav: NavItem[] = [
    { label: "Overview", to: "/dashboard/admin", icon: Home, end: true, onClick: () => setSection("overview") },
    { label: "All Users", to: "/dashboard/admin", icon: Users, onClick: () => setSection("users") },
    { label: "Organizations", to: "/dashboard/admin", icon: Building2, onClick: () => setSection("organizations") },
    { label: "Audit Log", to: "/dashboard/admin", icon: FileText, onClick: () => setSection("audit") },
    { label: "Organ Limits", to: "/dashboard/admin", icon: Database, onClick: () => setSection("organLimits") },
  ];

  if (loading) {
    return (
      <DashboardLayout nav={nav} title="Admin Dashboard" subtitle="System-wide control panel">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading admin panel...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout nav={nav} title="Admin Dashboard" subtitle="System-wide control panel">

      {/* ── OVERVIEW ── */}
      {section === "overview" && (
        <div className="space-y-6 animate-fade-in">
          {/* Admin badge */}
          <div className="glass-strong rounded-2xl p-6 bg-gradient-to-r from-primary/10 to-accent/10">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-gradient-primary flex items-center justify-center">
                <Shield className="text-white" size={28} />
              </div>
              <div>
                <h2 className="text-xl font-bold">System Administrator</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Full control over all organizations, donors, patients, and doctors.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Users" value={stats.totalUsers || 0} icon={Users} accent="primary" />
            <StatCard label="Organizations" value={stats.totalOrganizations || 0} icon={Building2} accent="accent" />
            <StatCard label="Available Organs" value={stats.availableOrgans || 0} icon={Heart} accent="success" />
            <StatCard label="Transplants Done" value={stats.completedTransplants || 0} icon={Activity} accent="warning" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Donors" value={stats.totalDonors || 0} icon={Heart} accent="primary" hint={`${stats.pendingDonors || 0} pending`} />
            <StatCard label="Patients" value={stats.totalPatients || 0} icon={Users} accent="accent" />
            <StatCard label="Doctors" value={stats.totalDoctors || 0} icon={Activity} accent="success" />
            <StatCard label="Pending Requests" value={stats.pendingRequests || 0} icon={Database} accent="warning" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <button onClick={() => setSection("users")} className="glass rounded-2xl p-5 text-left hover-lift">
              <Users className="text-primary mb-2" size={22} />
              <div className="font-semibold">Manage Users</div>
              <div className="text-xs text-muted-foreground mt-1">{stats.totalUsers || 0} accounts</div>
            </button>
            <button onClick={() => setSection("organizations")} className="glass rounded-2xl p-5 text-left hover-lift">
              <Building2 className="text-primary mb-2" size={22} />
              <div className="font-semibold">Organizations</div>
              <div className="text-xs text-muted-foreground mt-1">{stats.totalOrganizations || 0} registered</div>
            </button>
            <button onClick={() => setSection("audit")} className="glass rounded-2xl p-5 text-left hover-lift">
              <FileText className="text-primary mb-2" size={22} />
              <div className="font-semibold">Audit Log</div>
              <div className="text-xs text-muted-foreground mt-1">{auditLog.length} records</div>
            </button>
            <button onClick={() => setSection("organLimits")} className="glass rounded-2xl p-5 text-left hover-lift">
              <Database className="text-primary mb-2" size={22} />
              <div className="font-semibold">Organ Limits</div>
              <div className="text-xs text-muted-foreground mt-1">Biological reference</div>
            </button>
          </div>
        </div>
      )}

      {/* ── ALL USERS ── */}
      {section === "users" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setSection("overview")} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
            <h2 className="text-xl font-bold">All Users</h2>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder="Search by name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchUsers()}
                className="pl-10 rounded-xl"
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); fetchUsers(v); }}>
              <SelectTrigger className="w-40 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="patient">Patients</SelectItem>
                <SelectItem value="donor">Donors</SelectItem>
                <SelectItem value="doctor">Doctors</SelectItem>
                <SelectItem value="organization">Organizations</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="rounded-xl" onClick={() => fetchUsers()}>
              <Search size={14} className="mr-1" /> Search
            </Button>
          </div>

          <div className="glass-strong rounded-2xl p-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-mono text-muted-foreground">#{u.user_id}</TableCell>
                    <TableCell className="font-medium">{u.display_name || u.username}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-xl capitalize text-xs">{u.role}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {u.role !== "admin" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="rounded-xl text-danger hover:text-danger">
                              <Trash2 size={14} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete {u.display_name || u.username}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this user and all related data (donations, transplants, etc.). This action is logged in the audit trail.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                              <AlertDialogAction className="rounded-xl bg-danger text-white" onClick={() => deleteUser(u.user_id)}>
                                Delete Account
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground h-24">No users found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── ORGANIZATIONS ── */}
      {section === "organizations" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setSection("overview")} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
            <h2 className="text-xl font-bold">All Organizations</h2>
          </div>
          <div className="glass-strong rounded-2xl p-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hospital</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>License</TableHead>
                  <TableHead>Head</TableHead>
                  <TableHead>Doctors</TableHead>
                  <TableHead>Organs</TableHead>
                  <TableHead>Transplants</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((o) => (
                  <TableRow key={o.org_id}>
                    <TableCell className="font-medium">{o.name}</TableCell>
                    <TableCell className="text-muted-foreground">{o.location}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{o.license_number}</TableCell>
                    <TableCell>{o.head_name ? <span className="font-medium">{o.head_name}</span> : <span className="text-muted-foreground italic">None</span>}</TableCell>
                    <TableCell className="font-semibold">{o.doctor_count}</TableCell>
                    <TableCell className="font-semibold">{o.organ_count}</TableCell>
                    <TableCell className="font-semibold">{o.transplant_count}</TableCell>
                    <TableCell>
                      {o.government_approved
                        ? <Badge className="bg-success/20 text-success border-0 rounded-xl">Approved</Badge>
                        : <Badge variant="outline" className="rounded-xl text-muted-foreground">Pending</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
                {organizations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground h-24">No organizations registered.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── AUDIT LOG ── */}
      {section === "audit" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setSection("overview")} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
            <h2 className="text-xl font-bold">Audit Log (Deleted Records Backup)</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            All deleted records are automatically backed up by database triggers. This log shows the last 100 deletions.
          </p>
          <div className="glass-strong rounded-2xl p-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Record ID</TableHead>
                  <TableHead>Data (JSON)</TableHead>
                  <TableHead>Deleted At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLog.map((a) => (
                  <TableRow key={a.audit_id}>
                    <TableCell className="font-mono text-muted-foreground">#{a.audit_id}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-xl text-xs">{a.table_name}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{a.record_id}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground font-mono">
                      <Dialog>
                        <DialogTrigger asChild>
                          <button className="text-primary hover:underline max-w-[150px] truncate block text-left">
                            {typeof a.record_data === 'string' ? a.record_data : JSON.stringify(a.record_data)}
                          </button>
                        </DialogTrigger>
                        <DialogContent className="rounded-2xl max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Deleted Record Data (JSON)</DialogTitle>
                          </DialogHeader>
                          <pre className="bg-muted p-4 rounded-xl text-xs overflow-auto max-h-[60vh] mt-4 font-mono whitespace-pre-wrap break-all">
                            {(() => {
                              try {
                                return JSON.stringify(typeof a.record_data === 'string' ? JSON.parse(a.record_data) : a.record_data, null, 2);
                              } catch {
                                return typeof a.record_data === 'string' ? a.record_data : JSON.stringify(a.record_data);
                              }
                            })()}
                          </pre>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(a.deleted_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="rounded-xl text-primary hover:text-primary hover:bg-primary/10" onClick={() => {
                        api.admin.restoreAuditRecord(a.audit_id).then(() => {
                          toast.success(`Record restored to ${a.table_name} successfully`);
                          setAuditLog(prev => prev.filter(x => x.audit_id !== a.audit_id));
                        }).catch(e => toast.error(e.message));
                      }}>
                        Restore
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {auditLog.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                      No deleted records yet. When users or records are deleted, they will appear here as backup.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── ORGAN LIMITS ── */}
      {section === "organLimits" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setSection("overview")} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
            <h2 className="text-xl font-bold">Biological Organ Donation Limits</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            These limits enforce realistic organ donation constraints. Donors cannot exceed these limits in the system.
          </p>

          <div className="flex justify-end">
            <Sheet>
              <SheetTrigger asChild>
                <Button className="rounded-xl bg-gradient-primary">
                  <Database size={14} className="mr-1" /> Add Organ Type
                </Button>
              </SheetTrigger>
              <SheetContent className="rounded-l-2xl">
                <SheetHeader>
                  <SheetTitle>Add New Organ Type</SheetTitle>
                  <SheetDescription>Define a new organ type with its required specialization and donation limit.</SheetDescription>
                </SheetHeader>
                <div className="space-y-4 mt-6">
                  <div className="space-y-2"><Label>Organ Name</Label><Input id="organ-name" placeholder="e.g. Intestine" className="rounded-xl" /></div>
                  <div className="space-y-2"><Label>Required Doctor Specialization</Label><Input id="organ-spec" placeholder="e.g. Gastroenterology" className="rounded-xl" /></div>
                  <div className="space-y-2"><Label>Max Donations Allowed</Label><Input id="organ-max" type="number" min="1" placeholder="1" className="rounded-xl" /></div>
                  <div className="space-y-2"><Label>Description (Optional)</Label><Input id="organ-desc" placeholder="Medical reasoning..." className="rounded-xl" /></div>
                </div>
                <SheetFooter className="mt-6">
                  <Button className="rounded-xl bg-gradient-primary" onClick={() => {
                    const name = (document.getElementById('organ-name') as HTMLInputElement).value;
                    const spec = (document.getElementById('organ-spec') as HTMLInputElement).value;
                    const max = parseInt((document.getElementById('organ-max') as HTMLInputElement).value);
                    const desc = (document.getElementById('organ-desc') as HTMLInputElement).value;
                    if (!name || !spec || !max) return toast.error('Name, specialization, and max donations are required');
                    
                    api.admin.addOrganLimit({ organ_name: name, required_specialization: spec, max_donations: max, description: desc })
                      .then(() => {
                        toast.success("Organ type added");
                        api.admin.organLimits().then(setOrganLimits).catch(() => {});
                      })
                      .catch((e) => toast.error(e.message));
                  }}>Add Organ Type</Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>

          <div className="glass-strong rounded-2xl p-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organ</TableHead>
                  <TableHead>Required Specialization</TableHead>
                  <TableHead>Max Donations</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organLimits.map((l) => (
                  <TableRow key={l.organ_name}>
                    <TableCell className="font-semibold">{l.organ_name}</TableCell>
                    <TableCell className="text-muted-foreground">{l.required_specialization}</TableCell>
                    <TableCell>
                      <Badge className="bg-primary/20 text-primary border-0 rounded-xl font-mono">{l.max_donations}×</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{l.description}</TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="rounded-xl text-danger hover:text-danger">
                            <Trash2 size={14} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {l.organ_name} Limit?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove the organ type. You cannot do this if there are existing inventory items or pledges associated with it.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                            <AlertDialogAction className="rounded-xl bg-danger text-white" onClick={() => {
                              api.admin.deleteOrganLimit(l.organ_name).then(() => {
                                toast.success("Organ type removed");
                                setOrganLimits(prev => prev.filter(x => x.organ_name !== l.organ_name));
                              }).catch((e) => toast.error(e.message));
                            }}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminDashboard;
