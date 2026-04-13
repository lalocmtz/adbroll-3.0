import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";
import { useState } from "react";

interface FilterBarProps {
  onFilterChange?: (filters: FilterState) => void;
}

interface FilterState {
  category?: string;
  date?: string;
  product?: string;
  language?: string;
}

const FilterBar = ({ onFilterChange }: FilterBarProps) => {
  const [filters, setFilters] = useState<FilterState>({});
  const [showFilters, setShowFilters] = useState(false);

  const categories = ["Belleza", "Tecnología", "Fitness", "Moda", "Hogar"];
  const dateRanges = ["Hoy", "Esta semana", "Este mes", "Todo"];

  const toggleFilter = (type: keyof FilterState, value: string) => {
    const newFilters = { ...filters };
    if (newFilters[type] === value) {
      delete newFilters[type];
    } else {
      newFilters[type] = value;
    }
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
    onFilterChange?.({});
  };

  const activeFilterCount = Object.keys(filters).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filtros
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Limpiar
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="grid gap-4 p-4 rounded-lg border border-border bg-card">
          <div>
            <p className="text-sm font-medium mb-2">Categoría</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Badge
                  key={cat}
                  variant={filters.category === cat ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleFilter("category", cat)}
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Fecha</p>
            <div className="flex flex-wrap gap-2">
              {dateRanges.map((date) => (
                <Badge
                  key={date}
                  variant={filters.date === date ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleFilter("date", date)}
                >
                  {date}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
