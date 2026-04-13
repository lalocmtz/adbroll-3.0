import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Search, ExternalLink } from "lucide-react";

interface VideoItem {
  id: string;
  title: string | null;
  video_url: string;
  thumbnail_url: string | null;
  creator_handle: string | null;
  product_name: string | null;
  product_id: string | null;
  sales: number | null;
  revenue_mxn: number | null;
  views: number | null;
  candidateScore?: number;
  matchedKeywords?: string[];
}

interface Props {
  videos: VideoItem[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onUnlink: (videoId: string) => void;
  searchText: string;
  onSearchChange: (text: string) => void;
  filter: "all" | "unlinked" | "linked";
  onFilterChange: (filter: "all" | "unlinked" | "linked") => void;
  loading: boolean;
}

const formatNum = (n: number | null | undefined): string => {
  if (!n) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
};

export const AttributionVideoList = ({
  videos, selectedIds, onToggle, onSelectAll, onDeselectAll,
  onUnlink, searchText, onSearchChange, filter, onFilterChange, loading,
}: Props) => {
  const filtered = videos.filter(v => {
    if (filter === "unlinked" && v.product_id) return false;
    if (filter === "linked" && !v.product_id) return false;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      return (v.title?.toLowerCase().includes(q)) ||
             (v.product_name?.toLowerCase().includes(q)) ||
             (v.creator_handle?.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div className="space-y-3">
      {/* Search + Filters */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar video..."
          value={searchText}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "unlinked", "linked"] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange(f)}
            className="text-xs h-7"
          >
            {f === "all" ? "Todos" : f === "unlinked" ? "Sin producto" : "Con producto"}
          </Button>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} videos
        </span>
      </div>

      {/* Bulk actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onSelectAll} className="text-xs h-7">
          Seleccionar todos
        </Button>
        <Button variant="outline" size="sm" onClick={onDeselectAll} className="text-xs h-7">
          Deseleccionar
        </Button>
        {selectedIds.size > 0 && (
          <Badge variant="secondary" className="text-xs">
            {selectedIds.size} seleccionados
          </Badge>
        )}
      </div>

      {/* Video list */}
      <ScrollArea className="h-[500px]">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Cargando videos...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No hay videos</p>
        ) : (
          <div className="space-y-1.5">
            {filtered.map(video => (
              <Card 
                key={video.id} 
                className={`transition-colors ${selectedIds.has(video.id) ? 'ring-2 ring-primary bg-primary/5' : ''}`}
              >
                <CardContent className="p-2.5 flex items-center gap-2.5">
                  <Checkbox
                    checked={selectedIds.has(video.id)}
                    onCheckedChange={() => onToggle(video.id)}
                  />
                  
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt="" className="w-14 h-10 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-10 rounded bg-muted flex-shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{video.title || 'Sin título'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        @{video.creator_handle || '—'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ${formatNum(video.revenue_mxn)} • {formatNum(video.views)} views
                      </span>
                    </div>
                    {video.product_name && (
                      <Badge variant="outline" className="text-[10px] h-4 mt-0.5">
                        {video.product_name}
                      </Badge>
                    )}
                    {video.candidateScore !== undefined && video.candidateScore > 0 && (
                      <Badge variant="secondary" className="text-[10px] h-4 mt-0.5 ml-1">
                        Score: {(video.candidateScore * 100).toFixed(0)}%
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {video.product_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); onUnlink(video.id); }}
                        title="Desvincular"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <a
                      href={video.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
