import { Heart } from "lucide-react";

interface Props {
  size?: number;
  withText?: boolean;
  className?: string;
}

export const Logo = ({ size = 28, withText = true, className = "" }: Props) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <div className="relative flex items-center justify-center rounded-xl bg-gradient-primary p-2 shadow-glow">
      <Heart size={size * 0.7} className="text-primary-foreground fill-primary-foreground" />
    </div>
    {withText && (
      <span className="text-xl font-bold tracking-tight">
        Organ<span className="gradient-text">Connect</span>
      </span>
    )}
  </div>
);
