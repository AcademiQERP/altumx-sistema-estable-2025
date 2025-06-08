import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { InfoIcon, BookOpenIcon, ActivityIcon, HelpCircleIcon, BookmarkIcon } from "lucide-react";

export type RecommendationType = 
  | "refuerzo_conceptos" 
  | "ejercicios_adicionales" 
  | "participacion_activa" 
  | "tutoria_recomendada" 
  | "estrategias_sugeridas";

export interface Recommendation {
  id?: number;
  materiaId?: number;
  materiaNombre?: string;
  tipo: RecommendationType;
  descripcion: string;
}

interface RecommendationBlockProps {
  recommendations: Recommendation[];
  alumnoNombre?: string;
  compact?: boolean;
  aiRecommendations?: string | null;
}

const getTipoLabel = (tipo: RecommendationType): string => {
  switch (tipo) {
    case "refuerzo_conceptos":
      return "Refuerzo de conceptos";
    case "ejercicios_adicionales":
      return "Ejercicios adicionales";
    case "participacion_activa":
      return "Participación activa";
    case "tutoria_recomendada":
      return "Tutoría recomendada";
    case "estrategias_sugeridas":
      return "Estrategias sugeridas";
    default:
      return "Recomendación";
  }
};

const getTipoIcon = (tipo: RecommendationType) => {
  switch (tipo) {
    case "refuerzo_conceptos":
      return <BookOpenIcon className="h-4 w-4" />;
    case "ejercicios_adicionales":
      return <ActivityIcon className="h-4 w-4" />;
    case "participacion_activa":
      return <BookmarkIcon className="h-4 w-4" />;
    case "tutoria_recomendada":
      return <HelpCircleIcon className="h-4 w-4" />;
    case "estrategias_sugeridas":
      return <InfoIcon className="h-4 w-4" />;
    default:
      return <InfoIcon className="h-4 w-4" />;
  }
};

const getTipoColor = (tipo: RecommendationType): string => {
  switch (tipo) {
    case "refuerzo_conceptos":
      return "bg-blue-100 text-blue-800 border-blue-300";
    case "ejercicios_adicionales":
      return "bg-green-100 text-green-800 border-green-300";
    case "participacion_activa":
      return "bg-purple-100 text-purple-800 border-purple-300";
    case "tutoria_recomendada":
      return "bg-orange-100 text-orange-800 border-orange-300";
    case "estrategias_sugeridas":
      return "bg-teal-100 text-teal-800 border-teal-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
};

export const RecommendationBlock: React.FC<RecommendationBlockProps> = ({
  recommendations,
  alumnoNombre,
  compact = false,
  aiRecommendations = null,
}) => {
  if ((!recommendations || recommendations.length === 0) && !aiRecommendations) {
    return null;
  }

  // Agrupar recomendaciones por materia
  const recommendationsBySubject: Record<string, Recommendation[]> = {};
  recommendations.forEach((rec) => {
    const key = rec.materiaNombre || "General";
    if (!recommendationsBySubject[key]) {
      recommendationsBySubject[key] = [];
    }
    recommendationsBySubject[key].push(rec);
  });

  if (compact) {
    return (
      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-primary">📌</span>
          <span>Sugerencias personalizadas</span>
        </div>
        
        {/* Recomendaciones automáticas */}
        {Object.entries(recommendationsBySubject).map(([materia, recs]) => (
          <div key={materia} className="space-y-2">
            {materia !== "General" && (
              <div className="text-sm font-medium text-slate-700">{materia}</div>
            )}
            {recs.map((rec, index) => (
              <div key={index} className="text-xs bg-slate-50 p-2 rounded-md border border-slate-200">
                <div className="flex gap-1 items-center mb-1">
                  <div className="flex-shrink-0">{getTipoIcon(rec.tipo)}</div>
                  <div className="font-medium">{getTipoLabel(rec.tipo)}</div>
                </div>
                <p className="text-slate-700">{rec.descripcion}</p>
              </div>
            ))}
          </div>
        ))}
        
        {/* Recomendaciones de IA */}
        {aiRecommendations && (
          <div className="mt-3">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
              <span>✨</span>
              <span>Recomendaciones IA</span>
            </div>
            <div className="text-xs bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-md border border-blue-100 mt-1 text-blue-800">
              {aiRecommendations}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex gap-2 items-center">
          <span className="text-primary">📌</span>
          Sugerencias personalizadas
        </CardTitle>
        {alumnoNombre && (
          <CardDescription>Recomendaciones para {alumnoNombre}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {/* Recomendaciones automáticas */}
        <div className="space-y-4">
          {Object.entries(recommendationsBySubject).map(([materia, recs]) => (
            <div key={materia} className="space-y-3">
              {materia !== "General" && (
                <>
                  <h4 className="font-semibold text-sm">{materia}</h4>
                  <Separator className="my-2" />
                </>
              )}
              {recs.map((rec, index) => (
                <div key={index} className="bg-slate-50 p-3 rounded-md border border-slate-200">
                  <Badge 
                    variant="outline" 
                    className={`mb-2 ${getTipoColor(rec.tipo)}`}
                  >
                    <span className="flex items-center gap-1">
                      {getTipoIcon(rec.tipo)}
                      {getTipoLabel(rec.tipo)}
                    </span>
                  </Badge>
                  <p className="text-sm text-slate-700">{rec.descripcion}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
        
        {/* Recomendaciones de IA */}
        {aiRecommendations && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-medium text-blue-700 flex items-center">
                <span className="mr-2">✨</span>
                <span>RECOMENDACIONES IA</span>
              </h3>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-md border border-blue-100 shadow-sm">
              <p className="text-sm text-blue-900 whitespace-pre-line">{aiRecommendations}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecommendationBlock;