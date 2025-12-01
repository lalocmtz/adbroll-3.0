import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Filter, X } from "lucide-react";

interface FilterSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories: string[];
  selectedDate: string;
  onDateChange: (date: string) => void;
}

const FilterSidebar = ({
  open,
  onOpenChange,
  selectedCategory,
  onCategoryChange,
  categories,
  selectedDate,
  onDateChange,
}: FilterSidebarProps) => {
  const dateRanges = ["Hoy", "Esta semana", "Este mes", "Todo"];

  const clearFilters = () => {
    onCategoryChange("all");
    onDateChange("all");
  };

  const activeFilterCount = 
    (selectedCategory !== "all" ? 1 : 0) + 
    (selectedDate !== "all" ? 1 : 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Categoría */}
          <div>
            <p className="text-sm font-medium mb-3">Categoría</p>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={selectedCategory === "all" ? "default" : "outline"}
                className="cursor-pointer px-3 py-1.5"
                onClick={() => onCategoryChange("all")}
              >
                Todos
              </Badge>
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  className="cursor-pointer px-3 py-1.5"
                  onClick={() => onCategoryChange(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>

          {/* Fecha */}
          <div>
            <p className="text-sm font-medium mb-3">Fecha</p>
            <div className="flex flex-wrap gap-2">
              {dateRanges.map((date) => (
                <Badge
                  key={date}
                  variant={selectedDate === date ? "default" : "outline"}
                  className="cursor-pointer px-3 py-1.5"
                  onClick={() => onDateChange(date)}
                >
                  {date}
                </Badge>
              ))}
            </div>
          </div>

          {/* Botón Limpiar */}
          {activeFilterCount > 0 && (
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="w-full gap-2"
              >
                <X className="h-4 w-4" />
                Limpiar filtros
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FilterSidebar;
