"use client";

import { cn } from "@/lib/utils";

interface ScoreRingProps extends React.HTMLAttributes<HTMLDivElement> {
  score: number;
  maxScore?: number;
  size?: "sm" | "default" | "lg" | "xl";
  showLabel?: boolean;
  label?: string;
  animate?: boolean;
}

function ScoreRing({
  score,
  maxScore = 100,
  size = "default",
  showLabel = true,
  label,
  animate = true,
  className,
  ...props
}: ScoreRingProps) {
  const percentage = Math.min(100, Math.max(0, (score / maxScore) * 100));

  const sizes = {
    sm: { outer: 48, stroke: 4, textSize: "text-sm" },
    default: { outer: 80, stroke: 6, textSize: "text-xl" },
    lg: { outer: 120, stroke: 8, textSize: "text-3xl" },
    xl: { outer: 160, stroke: 10, textSize: "text-4xl" },
  };

  const { outer, stroke, textSize } = sizes[size];
  const radius = (outer - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  // Color based on score
  const getColor = () => {
    if (percentage >= 80) return { stroke: "#10B981", bg: "rgba(16, 185, 129, 0.1)" }; // Green
    if (percentage >= 60) return { stroke: "#8B5CF6", bg: "rgba(139, 92, 246, 0.1)" }; // Purple
    if (percentage >= 40) return { stroke: "#F59E0B", bg: "rgba(245, 158, 11, 0.1)" }; // Amber
    return { stroke: "#EF4444", bg: "rgba(239, 68, 68, 0.1)" }; // Red
  };

  const colors = getColor();

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      {...props}
    >
      <svg
        width={outer}
        height={outer}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={outer / 2}
          cy={outer / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx={outer / 2}
          cy={outer / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animate ? offset : offset}
          className={cn(
            "transition-all duration-1000 ease-out",
            animate && "animate-score-ring"
          )}
          style={{
            filter: `drop-shadow(0 0 6px ${colors.stroke}40)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-bold", textSize)}>{Math.round(score)}</span>
        {showLabel && (
          <span className="text-xs text-muted-foreground">
            {label || `/ ${maxScore}`}
          </span>
        )}
      </div>
    </div>
  );
}

// Mini score indicator (compact version)
interface MiniScoreProps extends React.HTMLAttributes<HTMLDivElement> {
  score: number;
  maxScore?: number;
}

function MiniScore({ score, maxScore = 100, className, ...props }: MiniScoreProps) {
  const percentage = Math.min(100, Math.max(0, (score / maxScore) * 100));

  const getColorClass = () => {
    if (percentage >= 80) return "bg-emerald-500";
    if (percentage >= 60) return "bg-purple-500";
    if (percentage >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", getColorClass())}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium">{Math.round(score)}</span>
    </div>
  );
}

export { ScoreRing, MiniScore };
