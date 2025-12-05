import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompactPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const CompactPagination = ({ currentPage, totalPages, onPageChange }: CompactPaginationProps) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
          currentPage === 1 
            ? "text-muted-foreground/40 cursor-not-allowed" 
            : "text-muted-foreground hover:bg-muted"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      
      {getPageNumbers().map((page, idx) => (
        <button
          key={idx}
          onClick={() => typeof page === "number" && onPageChange(page)}
          disabled={page === "..."}
          className={cn(
            "w-8 h-8 rounded-full text-xs font-medium transition-colors",
            page === currentPage
              ? "bg-primary text-primary-foreground"
              : page === "..."
              ? "text-muted-foreground cursor-default"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          {page}
        </button>
      ))}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
          currentPage === totalPages 
            ? "text-muted-foreground/40 cursor-not-allowed" 
            : "text-muted-foreground hover:bg-muted"
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
};

export default CompactPagination;
