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
}

export const FilterPills = ({ options, value, onChange, className }: FilterPillsProps) => {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 h-8",
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

export const DataSubtitle = () => (
  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
    📊 Datos actualizados – últimos 30 días
  </p>
);

export default FilterPills;
