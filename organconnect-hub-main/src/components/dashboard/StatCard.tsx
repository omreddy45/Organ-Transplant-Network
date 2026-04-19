import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: ReactNode;
  className?: string;
  accent?: "primary" | "accent" | "success" | "warning";
}

const accentMap = {
  primary: "from-primary/30 to-primary/5 text-primary",
  accent: "from-accent/30 to-accent/5 text-accent",
  success: "from-success/30 to-success/5 text-success",
  warning: "from-warning/30 to-warning/5 text-warning",
};

export const StatCard = ({ label, value, icon: Icon, hint, className, accent = "primary" }: Props) => (
  <div className={cn("glass-strong rounded-2xl p-5 hover-lift animate-fade-in", className)}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
        <div className="mt-2 text-2xl font-bold truncate">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </div>
      {Icon && (
        <div className={cn("h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0", accentMap[accent])}>
          <Icon size={18} />
        </div>
      )}
    </div>
  </div>
);
