import { cn } from "@/lib/utils";

type Status =
  | "pending" | "completed" | "cancelled"
  | "available" | "reserved" | "transplanted"
  | "available_doctor" | "busy" | "on_leave"
  | "normal" | "high" | "critical"
  | "approved" | "rejected" | string;

const map: Record<string, { label: string; color: string; pulse?: boolean }> = {
  pending: { label: "Pending", color: "bg-warning/15 text-warning border-warning/30" },
  completed: { label: "Completed", color: "bg-success/15 text-success border-success/30" },
  cancelled: { label: "Cancelled", color: "bg-danger/15 text-danger border-danger/30" },
  available: { label: "Available", color: "bg-success/15 text-success border-success/30", pulse: true },
  reserved: { label: "Reserved", color: "bg-warning/15 text-warning border-warning/30" },
  transplanted: { label: "Transplanted", color: "bg-primary/15 text-primary border-primary/30" },
  matched: { label: "Matched", color: "bg-primary/15 text-primary border-primary/30", pulse: true },
  available_doctor: { label: "Available", color: "bg-success/15 text-success border-success/30", pulse: true },
  busy: { label: "Busy", color: "bg-warning/15 text-warning border-warning/30" },
  on_leave: { label: "On Leave", color: "bg-muted text-muted-foreground border-border" },
  normal: { label: "Normal", color: "bg-secondary text-secondary-foreground border-border" },
  high: { label: "High", color: "bg-warning/15 text-warning border-warning/30" },
  critical: { label: "Critical", color: "bg-danger/15 text-danger border-danger/30", pulse: true },
  approved: { label: "Approved", color: "bg-success/15 text-success border-success/30" },
  rejected: { label: "Rejected", color: "bg-danger/15 text-danger border-danger/30" },
};

interface Props {
  status: Status;
  className?: string;
}

export const StatusBadge = ({ status, className }: Props) => {
  const cfg = map[status] || { label: status, color: "bg-muted text-muted-foreground border-border" };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border",
        cfg.color,
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full bg-current",
          cfg.pulse && "animate-pulse-dot",
        )}
      />
      {cfg.label}
    </span>
  );
};
