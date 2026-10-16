import { cn } from "@/lib/utils";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterPillsProps {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  compact?: boolean;
}

export const FilterPills = ({ options, value, onChange, className, compact = false }: FilterPillsProps) => {
  return (
    <div className={cn("flex gap-1.5", compact ? "flex-nowrap shrink-0" : "flex-wrap", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-150 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
            compact && "whitespace-nowrap shrink-0",
            value === option.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted/60 text-muted-foreground hover:bg-muted border border-border/50"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

// Subtle data freshness indicator - smaller, less prominent
export const DataSubtitle = () => (
  <p className="text-[11px] text-muted-foreground/70 mb-2">
    Datos actualizados · últimos 30 días
  </p>
);

export default FilterPills;