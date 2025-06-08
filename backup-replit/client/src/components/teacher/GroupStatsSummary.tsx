import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { 
  UsersRound, 
  LineChart, 
  PercentIcon, 
  AlertTriangle, 
  CheckCircle
} from "lucide-react";

export interface GroupStatsSummaryProps {
  groupName: string;
  isLoading?: boolean;
  stats?: {
    promedioGeneral?: string | number;
    porcentajeAsistencia?: string | number;
    totalAlumnos?: number;
    porcentajeAprobados?: string | number;
    estudiantesEnRiesgo?: number;
    nivel?: string;
  };
}

export const GroupStatsSummary: React.FC<GroupStatsSummaryProps> = ({
  groupName,
  isLoading = false,
  stats = {}
}) => {
  // Garantizar que stats es un objeto
  const safeStats = stats || {};

  // Función para procesar números/strings en formato decimal
  const formatNumber = (value: string | number | undefined): string => {
    if (typeof value === 'number') {
      return value.toFixed(1);
    } else if (typeof value === 'string') {
      try {
        return parseFloat(value).toFixed(1);
      } catch (e) {
        return '0.0';
      }
    }
    return '0.0';
  };

  return (
    <Card className="bg-[#F0F2F5] border-none shadow-sm">
      <CardContent className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#1F3C88]">{groupName}</h2>
            {safeStats.nivel && (
              <p className="text-sm text-muted-foreground">{safeStats.nivel}</p>
            )}
          </div>
          
          {isLoading ? (
            <div className="flex items-center">
              <div className="w-5 h-5 mr-2 border-2 border-t-transparent border-[#1F3C88] rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Cargando estadísticas...</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4 sm:gap-6 md:gap-8">
              {/* Total de estudiantes */}
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <UsersRound className="h-5 w-5 text-[#1F3C88]" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estudiantes</p>
                  <p className="text-lg font-semibold">{safeStats.totalAlumnos || 0}</p>
                </div>
              </div>
              
              {/* Promedio general */}
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <LineChart className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Promedio</p>
                  <p className="text-lg font-semibold">
                    {formatNumber(safeStats.promedioGeneral)}
                  </p>
                </div>
              </div>
              
              {/* Asistencia */}
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <PercentIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Asistencia</p>
                  <p className="text-lg font-semibold">
                    {formatNumber(safeStats.porcentajeAsistencia)}%
                  </p>
                </div>
              </div>
              
              {/* Tasa de aprobación */}
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Aprobación</p>
                  <p className="text-lg font-semibold">
                    {formatNumber(safeStats.porcentajeAprobados)}%
                  </p>
                </div>
              </div>
              
              {/* Estudiantes en riesgo */}
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">En riesgo</p>
                  <p className="text-lg font-semibold">{safeStats.estudiantesEnRiesgo || 0}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};