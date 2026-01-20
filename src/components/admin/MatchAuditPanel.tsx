import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Wrench,
  ChevronDown,
  ChevronUp,
  Target,
  Link2Off,
  AlertCircle,
  Sparkles,
  Eye,
  ImageOff
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface VisualAnalysis {
  productoDetectado: string;
  confianza: number;
  keywords: string[];
}

interface AuditIssue {
  videoId: string;
  videoRank: number | null;
  videoTitle: string | null;
  thumbnailUrl: string | null;
  transcriptSnippet: string | null;
  productId: string | null;
  productName: string | null;
  issueType: 'cross_market' | 'keyword_mismatch' | 'low_confidence' | 'missing_match' | 'visual_mismatch';
  severity: 'critical' | 'high' | 'medium' | 'low';
  details: string;
  visualAnalysis?: VisualAnalysis;
}

interface AuditSummary {
  totalIssues: number;
  byType: {
    crossMarket: number;
    keywordMismatch: number;
    visualMismatch: number;
    lowConfidence: number;
    missingMatch: number;
  };
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  fixedCount: number;
  visionAnalyzedCount: number;
  executionTimeMs: number;
}

interface AuditResult {
  success: boolean;
  summary: AuditSummary;
  issues: AuditIssue[];
  market: string;
  autoFixApplied: boolean;
  visionEnabled: boolean;
}

interface MatchAuditPanelProps {
  market: string;
  onAuditComplete?: () => void;
}

const issueTypeLabels = {
  cross_market: { label: "Cross-Market", icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
  keyword_mismatch: { label: "Keyword Mismatch", icon: Target, color: "text-orange-600", bg: "bg-orange-100" },
  visual_mismatch: { label: "Visual Mismatch", icon: ImageOff, color: "text-purple-600", bg: "bg-purple-100" },
  low_confidence: { label: "Baja Confianza", icon: AlertCircle, color: "text-yellow-600", bg: "bg-yellow-100" },
  missing_match: { label: "Sin Match", icon: Link2Off, color: "text-blue-600", bg: "bg-blue-100" }
};

export function MatchAuditPanel({ market, onAuditComplete }: MatchAuditPanelProps) {
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [autoFix, setAutoFix] = useState(false);
  const [useVision, setUseVision] = useState(false);
  const [topVideosOnly, setTopVideosOnly] = useState(200);
  const [isIssuesOpen, setIsIssuesOpen] = useState(false);
  const { toast } = useToast();

  const runAudit = async () => {
    setIsAuditing(true);
    setAuditResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("audit-video-matches", {
        body: { 
          market, 
          autoFix, 
          onlyTop: topVideosOnly,
          useVision
        }
      });

      if (error) throw error;

      setAuditResult(data);
      
      const { summary } = data;
      
      if (summary.totalIssues === 0) {
        toast({
          title: "✅ Auditoría perfecta",
          description: `Sin problemas detectados en los TOP ${topVideosOnly} videos de ${market.toUpperCase()}`,
        });
      } else {
        toast({
          title: autoFix ? "🔧 Auditoría + Corrección completada" : "🔍 Auditoría completada",
          description: `${summary.totalIssues} problemas${autoFix ? `, ${summary.fixedCount} corregidos` : ""}${useVision ? ` (${summary.visionAnalyzedCount} analizados con Vision)` : ""} (${summary.executionTimeMs}ms)`,
          variant: summary.bySeverity.critical > 0 ? "destructive" : "default"
        });
      }

      if (autoFix && summary.fixedCount > 0 && onAuditComplete) {
        onAuditComplete();
      }
    } catch (error: any) {
      toast({
        title: "Error en auditoría",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsAuditing(false);
    }
  };

  const getQualityScore = () => {
    if (!auditResult) return null;
    const { summary } = auditResult;
    const criticalWeight = summary.bySeverity.critical * 10;
    const highWeight = summary.bySeverity.high * 5;
    const mediumWeight = summary.bySeverity.medium * 2;
    const lowWeight = summary.bySeverity.low * 1;
    const totalWeight = criticalWeight + highWeight + mediumWeight + lowWeight;
    const maxWeight = topVideosOnly * 10;
    const score = Math.max(0, 100 - (totalWeight / maxWeight) * 100);
    return Math.round(score);
  };

  const qualityScore = getQualityScore();

  return (
    <Card className="border-2 border-amber-200 bg-gradient-to-r from-amber-50/50 to-orange-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-lg">Auditoría de Matches</CardTitle>
          </div>
          {qualityScore !== null && (
            <Badge 
              variant="outline" 
              className={`text-lg font-bold ${
                qualityScore >= 90 ? 'border-green-500 text-green-600' :
                qualityScore >= 70 ? 'border-yellow-500 text-yellow-600' :
                'border-red-500 text-red-600'
              }`}
            >
              {qualityScore}% Calidad
            </Badge>
          )}
        </div>
        <CardDescription>
          Verifica la calidad de vinculación video-producto en {market.toUpperCase()}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 p-3 rounded-lg bg-background/80 border">
          <div className="flex items-center gap-2">
            <Label htmlFor="top-videos" className="text-sm whitespace-nowrap">Revisar TOP:</Label>
            <select
              id="top-videos"
              value={topVideosOnly}
              onChange={(e) => setTopVideosOnly(Number(e.target.value))}
              className="h-8 px-2 rounded border text-sm"
              disabled={isAuditing}
            >
              <option value={50}>50 videos</option>
              <option value={100}>100 videos</option>
              <option value={200}>200 videos</option>
              <option value={300}>300 videos</option>
              <option value={500}>500 videos</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              id="use-vision"
              checked={useVision}
              onCheckedChange={setUseVision}
              disabled={isAuditing}
            />
            <Label htmlFor="use-vision" className="text-sm flex items-center gap-1">
              <Eye className="h-3 w-3" />
              Vision IA
            </Label>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              id="auto-fix"
              checked={autoFix}
              onCheckedChange={setAutoFix}
              disabled={isAuditing}
            />
            <Label htmlFor="auto-fix" className="text-sm flex items-center gap-1">
              <Wrench className="h-3 w-3" />
              Auto-corregir
            </Label>
          </div>
        </div>

        {/* Vision Info */}
        {useVision && (
          <div className="flex items-center gap-2 p-2 rounded bg-purple-100 border border-purple-200 text-sm">
            <Eye className="h-4 w-4 text-purple-600" />
            <span className="text-purple-700">
              <strong>Vision IA:</strong> Analizará thumbnails para detectar productos mal etiquetados (TOP 50 videos)
            </span>
          </div>
        )}

        {/* Run Button */}
        <Button
          onClick={runAudit}
          disabled={isAuditing}
          className="w-full"
          variant={autoFix ? "default" : "outline"}
        >
          {isAuditing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              {useVision ? "Analizando con Vision IA..." : "Auditando..."}
            </>
          ) : (
            <>
              {useVision ? <Eye className="h-4 w-4 mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
              {autoFix 
                ? (useVision ? "🔍👁️ Auditar con Vision y Corregir" : "🔧 Auditar y Corregir")
                : (useVision ? "👁️ Auditoría Visual Profunda" : "🔍 Ejecutar Auditoría")
              }
            </>
          )}
        </Button>

        {/* Results */}
        {auditResult && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-5 gap-2">
              <div className="text-center p-2 rounded bg-red-100 border border-red-200">
                <p className="text-xl font-bold text-red-600">{auditResult.summary.byType.crossMarket}</p>
                <p className="text-xs text-red-600">Cross-Market</p>
              </div>
              <div className="text-center p-2 rounded bg-orange-100 border border-orange-200">
                <p className="text-xl font-bold text-orange-600">{auditResult.summary.byType.keywordMismatch}</p>
                <p className="text-xs text-orange-600">Keyword</p>
              </div>
              <div className="text-center p-2 rounded bg-purple-100 border border-purple-200">
                <p className="text-xl font-bold text-purple-600">{auditResult.summary.byType.visualMismatch}</p>
                <p className="text-xs text-purple-600">Visual</p>
              </div>
              <div className="text-center p-2 rounded bg-yellow-100 border border-yellow-200">
                <p className="text-xl font-bold text-yellow-600">{auditResult.summary.byType.lowConfidence}</p>
                <p className="text-xs text-yellow-600">Baja Conf.</p>
              </div>
              <div className="text-center p-2 rounded bg-blue-100 border border-blue-200">
                <p className="text-xl font-bold text-blue-600">{auditResult.summary.byType.missingMatch}</p>
                <p className="text-xs text-blue-600">Sin Match</p>
              </div>
            </div>

            {/* Severity Bar */}
            {auditResult.summary.totalIssues > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Distribución por severidad</span>
                  <span>{auditResult.summary.totalIssues} issues totales</span>
                </div>
                <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                  {auditResult.summary.bySeverity.critical > 0 && (
                    <div 
                      className="bg-red-500" 
                      style={{ width: `${(auditResult.summary.bySeverity.critical / auditResult.summary.totalIssues) * 100}%` }}
                    />
                  )}
                  {auditResult.summary.bySeverity.high > 0 && (
                    <div 
                      className="bg-orange-500" 
                      style={{ width: `${(auditResult.summary.bySeverity.high / auditResult.summary.totalIssues) * 100}%` }}
                    />
                  )}
                  {auditResult.summary.bySeverity.medium > 0 && (
                    <div 
                      className="bg-yellow-500" 
                      style={{ width: `${(auditResult.summary.bySeverity.medium / auditResult.summary.totalIssues) * 100}%` }}
                    />
                  )}
                  {auditResult.summary.bySeverity.low > 0 && (
                    <div 
                      className="bg-blue-500" 
                      style={{ width: `${(auditResult.summary.bySeverity.low / auditResult.summary.totalIssues) * 100}%` }}
                    />
                  )}
                </div>
                <div className="flex gap-3 text-xs flex-wrap">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    Critical: {auditResult.summary.bySeverity.critical}
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    High: {auditResult.summary.bySeverity.high}
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    Medium: {auditResult.summary.bySeverity.medium}
                  </span>
                </div>
              </div>
            )}

            {/* Vision Stats */}
            {auditResult.visionEnabled && auditResult.summary.visionAnalyzedCount > 0 && (
              <div className="flex items-center gap-2 p-2 rounded bg-purple-100 border border-purple-200">
                <Eye className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-purple-700">
                  <strong>{auditResult.summary.visionAnalyzedCount}</strong> videos analizados con Vision IA
                </span>
              </div>
            )}

            {/* Fixed Count */}
            {auditResult.autoFixApplied && auditResult.summary.fixedCount > 0 && (
              <div className="flex items-center gap-2 p-2 rounded bg-green-100 border border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">
                  <strong>{auditResult.summary.fixedCount}</strong> problemas corregidos automáticamente. 
                  Ejecuta "Procesar Paralelo" para re-vincular.
                </span>
              </div>
            )}

            {/* Issues List (Collapsible) */}
            {auditResult.issues.length > 0 && (
              <Collapsible open={isIssuesOpen} onOpenChange={setIsIssuesOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Ver {auditResult.issues.length} problemas detectados
                    </span>
                    {isIssuesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ScrollArea className="h-80 rounded border p-2">
                    <div className="space-y-2">
                      {auditResult.issues.map((issue, idx) => {
                        const IssueIcon = issueTypeLabels[issue.issueType].icon;
                        return (
                          <div 
                            key={idx} 
                            className={`p-2 rounded text-sm border-l-4 ${
                              issue.severity === 'critical' ? 'border-l-red-500 bg-red-50' :
                              issue.severity === 'high' ? 'border-l-orange-500 bg-orange-50' :
                              issue.severity === 'medium' ? 'border-l-yellow-500 bg-yellow-50' :
                              'border-l-blue-500 bg-blue-50'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {/* Thumbnail Preview */}
                              {issue.thumbnailUrl && (
                                <img 
                                  src={issue.thumbnailUrl} 
                                  alt="Thumbnail"
                                  className="w-16 h-16 object-cover rounded shrink-0"
                                  onError={(e) => (e.currentTarget.style.display = 'none')}
                                />
                              )}
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className="text-xs">
                                    Rank #{issue.videoRank || '?'}
                                  </Badge>
                                  <span className={`text-xs font-medium flex items-center gap-1 ${issueTypeLabels[issue.issueType].color}`}>
                                    <IssueIcon className="h-3 w-3" />
                                    {issueTypeLabels[issue.issueType].label}
                                  </span>
                                </div>
                                
                                {/* Product Name */}
                                {issue.productName && (
                                  <p className="text-xs font-medium mt-1">
                                    Producto: <span className="text-muted-foreground">{issue.productName}</span>
                                  </p>
                                )}
                                
                                {/* Visual Analysis Result */}
                                {issue.visualAnalysis && (
                                  <div className="mt-1 p-1 rounded bg-purple-50 border border-purple-200">
                                    <p className="text-xs text-purple-700">
                                      👁️ Vision detectó: <strong>{issue.visualAnalysis.productoDetectado}</strong>
                                      <span className="ml-1">({(issue.visualAnalysis.confianza * 100).toFixed(0)}%)</span>
                                    </p>
                                  </div>
                                )}
                                
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {issue.details}
                                </p>
                                
                                {issue.transcriptSnippet && (
                                  <p className="text-xs italic text-muted-foreground mt-1 line-clamp-1">
                                    🎤 "{issue.transcriptSnippet}..."
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Perfect Score Message */}
            {auditResult.summary.totalIssues === 0 && (
              <div className="flex items-center justify-center gap-2 p-4 rounded bg-green-100 border border-green-200">
                <Sparkles className="h-5 w-5 text-green-600" />
                <span className="text-green-700 font-medium">
                  ¡Todos los TOP {topVideosOnly} videos están correctamente vinculados!
                </span>
              </div>
            )}
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded space-y-1">
          <p><strong>🔍 La auditoría detecta:</strong></p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li><strong>Cross-Market:</strong> Videos MX vinculados a productos US (o viceversa)</li>
            <li><strong>Keyword Mismatch:</strong> Video dice "Alexa" pero producto es "Xiaomi"</li>
            <li><strong className="text-purple-600">Visual Mismatch:</strong> El thumbnail muestra un producto diferente al vinculado</li>
            <li><strong>Baja Confianza:</strong> Matches con {'<'}70% confidence en videos TOP</li>
            <li><strong>Sin Match:</strong> Videos importantes sin producto vinculado</li>
          </ul>
          <p className="mt-2"><strong>👁️ Vision IA</strong> usa Gemini para "ver" los thumbnails y detectar qué producto se vende visualmente.</p>
          <p><strong>🔧 Auto-corregir</strong> desvincula matches incorrectos para re-vincular correctamente.</p>
        </div>
      </CardContent>
    </Card>
  );
}
