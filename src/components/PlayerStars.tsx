import { Star, StarHalf } from "lucide-react";
import { playerStars } from "@/lib/playerSkill";
import { cn } from "@/lib/utils";

interface PlayerStarsProps {
  skill: number;
  teamRate: number | undefined | null;
  size?: number;
  className?: string;
  /** Show "x.x" numeric label after the stars */
  showNumber?: boolean;
}

/**
 * Renders 1.0 to 5.0 stars (with half-stars) based on the player's
 * skill relative to the club's exigência. Never reveals the raw skill
 * value — only the visual rating.
 */
export default function PlayerStars({
  skill,
  teamRate,
  size = 16,
  className,
  showNumber = false,
}: PlayerStarsProps) {
  const value = playerStars(skill, teamRate);
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.5;
  const empty = 5 - full - (hasHalf ? 1 : 0);

  return (
    <span
      className={cn("inline-flex items-center gap-0.5 align-middle", className)}
      title={`${value.toFixed(1)} estrelas`}
      aria-label={`${value.toFixed(1)} estrelas`}
    >
      {Array.from({ length: full }).map((_, i) => (
        <Star
          key={`f-${i}`}
          width={size}
          height={size}
          className="fill-amber-400 text-amber-400"
        />
      ))}
      {hasHalf && (
        <StarHalf
          width={size}
          height={size}
          className="fill-amber-400 text-amber-400"
        />
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <Star
          key={`e-${i}`}
          width={size}
          height={size}
          className="text-muted-foreground/40"
        />
      ))}
      {showNumber && (
        <span className="ml-1 text-xs text-muted-foreground tabular-nums">
          {value.toFixed(1)}
        </span>
      )}
    </span>
  );
}