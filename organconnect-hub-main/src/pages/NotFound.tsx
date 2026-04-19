import { Link } from "react-router-dom";
import { Heart, Droplet, Activity, Wind, Eye, Bone, Sparkles, ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const icons = [Heart, Droplet, Activity, Wind, Eye, Bone, Sparkles, ShieldCheck];

const NotFound = () => (
  <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
    {Array.from({ length: 14 }).map((_, i) => {
      const Icon = icons[i % icons.length];
      const size = 24 + ((i * 13) % 56);
      const top = (i * 37) % 100;
      const left = (i * 23) % 100;
      const delay = (i * 0.4) % 6;
      return (
        <Icon
          key={i}
          size={size}
          className="absolute text-primary/15"
          style={{
            top: `${top}%`,
            left: `${left}%`,
            animation: `drift ${8 + (i % 6)}s ease-in-out ${delay}s infinite`,
          }}
        />
      );
    })}

    <div className="relative z-10 text-center px-6">
      <div className="text-[120px] md:text-[180px] font-bold leading-none gradient-text">404</div>
      <h1 className="mt-2 text-2xl md:text-3xl font-bold">This page doesn't exist in our network</h1>
      <p className="mt-3 text-muted-foreground max-w-md mx-auto">
        The page you're looking for may have been moved, removed, or never existed.
      </p>
      <Button asChild className="mt-8 rounded-xl bg-gradient-primary shadow-glow hover:opacity-90">
        <Link to="/"><ArrowLeft size={16} className="mr-2" /> Go Home</Link>
      </Button>
    </div>
  </div>
);

export default NotFound;
