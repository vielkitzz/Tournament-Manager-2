import { Shield } from "lucide-react";
import { useState } from "react";

interface TeamLogoProps {
  src?: string;
  alt?: string;
  size?: number;
  className?: string;
  iconClassName?: string;
}

/**
 * Renders a team/tournament logo with fallback.
 * If the image fails to load (404, etc.), shows a Shield icon instead.
 */
export default function TeamLogo({
  src,
  alt = "",
  size = 20,
  className,
  iconClassName,
}: TeamLogoProps) {
  const [failed, setFailed] = useState(false);

  const containerClass =
    className ??
    `w-${size <= 16 ? "4" : size <= 20 ? "5" : size <= 24 ? "6" : size <= 28 ? "7" : size <= 48 ? "12" : "14"} h-${size <= 16 ? "4" : size <= 20 ? "5" : size <= 24 ? "6" : size <= 28 ? "7" : size <= 48 ? "12" : "14"} flex items-center justify-center shrink-0`;

  if (!src || failed) {
    return (
      <div className={containerClass}>
        <Shield className={iconClassName ?? "w-3.5 h-3.5 text-muted-foreground"} />
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <img src={src} alt={alt} className="w-full h-full object-contain" onError={() => setFailed(true)} />
    </div>
  );
}
