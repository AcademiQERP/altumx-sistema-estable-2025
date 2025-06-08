import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle
} from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Download, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useState } from "react";

// En una aplicación real, estos datos vendrían de la API
const ATTENDANCE_DATA = [
  { day: "Lun", present: 80, tardy: 10, absent: 5, justified: 5, total: 20 },
  { day: "Mar", present: 75, tardy: 10, absent: 10, justified: 5, total: 20 },
  { day: "Mié", present: 85, tardy: 5, absent: 5, justified: 5, total: 20 },
  { day: "Jue", present: 70, tardy: 15, absent: 10, justified: 5, total: 20 },
  { day: "Vie", present: 65, tardy: 15, absent: 15, justified: 5, total: 20 }
];

// Función para calcular el promedio de la semana
const calculateWeeklyAverage = () => {
  const totalPresent = ATTENDANCE_DATA.reduce((sum, day) => sum + day.present, 0);
  const totalTardy = ATTENDANCE_DATA.reduce((sum, day) => sum + day.tardy, 0);
  const totalAbsent = ATTENDANCE_DATA.reduce((sum, day) => sum + day.absent, 0);
  const totalJustified = ATTENDANCE_DATA.reduce((sum, day) => sum + day.justified, 0);
  
  const days = ATTENDANCE_DATA.length;
  return {
    day: "Prom",
    present: Math.round(totalPresent / days),
    tardy: Math.round(totalTardy / days),
    absent: Math.round(totalAbsent / days),
    justified: Math.round(totalJustified / days),
    total: 20
  };
};

// Función para obtener indicador de tendencia
const getTrendIndicator = (current: number, average: number) => {
  const difference = current - average;
  if (difference > 2) return { icon: TrendingUp, color: "text-green-500", text: "↗" };
  if (difference < -2) return { icon: TrendingDown, color: "text-red-500", text: "↘" };
  return { icon: Minus, color: "text-gray-500", text: "→" };
};

// Función para exportar el gráfico (simulada)
const exportChart = (format: 'png' | 'pdf') => {
  // En una implementación real, esto usaría html2canvas o similar
  console.log(`Exportando gráfico como ${format.toUpperCase()}`);
  alert(`Funcionalidad de exportación ${format.toUpperCase()} en desarrollo`);
};

export default function AttendanceChart() {
  const [timeframe, setTimeframe] = useState("7days");
  const weeklyAverage = calculateWeeklyAverage();
  const extendedData = [...ATTENDANCE_DATA, weeklyAverage];
  
  // Obtener datos del último día para el resumen
  const lastDay = ATTENDANCE_DATA[ATTENDANCE_DATA.length - 1];
  const lastDayTrend = getTrendIndicator(lastDay.present, weeklyAverage.present);
  
  return (
    <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-blue-50/30">
      <CardHeader className="pb-4 flex flex-row justify-between items-center">
        <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          📊 Resumen de Asistencia
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select defaultValue={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[180px] border-gray-200 hover:border-blue-300 transition-colors">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Últimos 7 días</SelectItem>
              <SelectItem value="30days">Últimos 30 días</SelectItem>
              <SelectItem value="semester">Este semestre</SelectItem>
            </SelectContent>
          </Select>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportChart('png')}
                  className="text-gray-600 hover:text-blue-600"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Exportar gráfico</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white rounded-lg p-3 shadow-sm border">
          <div className="flex flex-wrap gap-4 items-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 shadow-sm"></div>
              <span className="font-medium text-gray-700">Presente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-500 shadow-sm"></div>
              <span className="font-medium text-gray-700">Retardo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500 shadow-sm"></div>
              <span className="font-medium text-gray-700">Ausente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gray-400 shadow-sm"></div>
              <span className="font-medium text-gray-700">Justificado</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex">
            {/* Eje Y con escala numérica */}
            <div className="flex flex-col justify-between h-72 pr-3 text-xs text-gray-500 font-medium">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
              <span>0%</span>
            </div>
            
            {/* Gráfico de barras con tooltips */}
            <div className="flex-1 h-72 flex items-end justify-center gap-4 overflow-x-auto pb-4">
              <TooltipProvider>
                {extendedData.map((data, index) => {
                  const total = data.present + data.tardy + data.absent + data.justified;
                  const isAverage = data.day === "Prom";
                  const trend = !isAverage ? getTrendIndicator(data.present, weeklyAverage.present) : null;
                  const presentCount = Math.round((data.present / 100) * data.total);
                  const tardyCount = Math.round((data.tardy / 100) * data.total);
                  const absentCount = Math.round((data.absent / 100) * data.total);
                  const justifiedCount = Math.round((data.justified / 100) * data.total);
                  
                  return (
                    <div key={index} className="flex flex-col items-center group flex-shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={`w-14 rounded-lg h-[220px] relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border ${
                            isAverage 
                              ? 'bg-gradient-to-b from-blue-50 to-gray-50 border-blue-300 border-2' 
                              : 'bg-gray-50 border-gray-200'
                          }`}>
                            {/* Barra de Presente */}
                            <div 
                              className={`absolute bottom-0 w-full transition-all duration-500 ease-out ${
                                isAverage 
                                  ? 'bg-blue-600 group-hover:bg-blue-700' 
                                  : 'bg-blue-500 group-hover:bg-blue-600'
                              }`}
                              style={{ height: `${(data.present / 100) * 220}px` }}
                            >
                              {data.present > 15 && (
                                <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                                  {data.present}%
                                </div>
                              )}
                            </div>
                            
                            {/* Barra de Retardo */}
                            <div 
                              className={`absolute w-full transition-all duration-500 ease-out ${
                                isAverage 
                                  ? 'bg-amber-600 group-hover:bg-amber-700' 
                                  : 'bg-amber-500 group-hover:bg-amber-600'
                              }`}
                              style={{ 
                                height: `${(data.tardy / 100) * 220}px`, 
                                bottom: `${(data.present / 100) * 220}px` 
                              }}
                            >
                              {data.tardy > 8 && (
                                <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                                  {data.tardy}%
                                </div>
                              )}
                            </div>
                            
                            {/* Barra de Ausente */}
                            <div 
                              className={`absolute w-full transition-all duration-500 ease-out ${
                                isAverage 
                                  ? 'bg-red-600 group-hover:bg-red-700' 
                                  : 'bg-red-500 group-hover:bg-red-600'
                              }`}
                              style={{ 
                                height: `${(data.absent / 100) * 220}px`, 
                                bottom: `${((data.present + data.tardy) / 100) * 220}px` 
                              }}
                            >
                              {data.absent > 8 && (
                                <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                                  {data.absent}%
                                </div>
                              )}
                            </div>
                            
                            {/* Barra de Justificado */}
                            <div 
                              className={`absolute w-full transition-all duration-500 ease-out ${
                                isAverage 
                                  ? 'bg-gray-500 group-hover:bg-gray-600' 
                                  : 'bg-gray-400 group-hover:bg-gray-500'
                              }`}
                              style={{ 
                                height: `${(data.justified / 100) * 220}px`, 
                                bottom: `${((data.present + data.tardy + data.absent) / 100) * 220}px` 
                              }}
                            >
                              {data.justified > 8 && (
                                <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                                  {data.justified}%
                                </div>
                              )}
                            </div>

                            {/* Indicador de tendencia */}
                            {trend && (
                              <div className={`absolute top-1 right-1 ${trend.color}`}>
                                <trend.icon className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-white border border-gray-200 shadow-lg p-3 rounded-lg">
                          <div className="space-y-2">
                            <h4 className="font-semibold text-gray-800 text-center">
                              {isAverage ? "Promedio Semanal" : data.day}
                            </h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <span>Presente: <strong>{data.present}% ({presentCount})</strong></span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                <span>Retardo: <strong>{data.tardy}% ({tardyCount})</strong></span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <span>Ausente: <strong>{data.absent}% ({absentCount})</strong></span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                                <span>Justificado: <strong>{data.justified}% ({justifiedCount})</strong></span>
                              </div>
                            </div>
                            <div className="pt-2 border-t border-gray-100 text-center">
                              <span className="text-xs text-gray-600">Total: <strong>{total}% ({data.total} estudiantes)</strong></span>
                            </div>
                            {trend && (
                              <div className="pt-1 border-t border-gray-100 text-center">
                                <span className={`text-xs ${trend.color} font-medium`}>
                                  Tendencia: {trend.text} vs promedio
                                </span>
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                      
                      {/* Etiqueta del día */}
                      <span className={`mt-4 text-sm font-semibold ${
                        isAverage ? 'text-blue-700' : 'text-gray-700'
                      }`}>
                        {data.day}
                        {trend && (
                          <span className={`ml-1 ${trend.color}`}>{trend.text}</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Resumen textual automático */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-blue-100 rounded-full p-1">
              📋
            </div>
            <h3 className="font-semibold text-gray-800">Resumen del Día – {lastDay.day}</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">• Asistencia general:</span>
                <span className="font-medium text-blue-600">{lastDay.present}% de asistencia</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">• Retardos:</span>
                <span className="font-medium text-amber-600">{lastDay.tardy}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">• Ausencias sin justificar:</span>
                <span className="font-medium text-red-600">{lastDay.absent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">• Justificados:</span>
                <span className="font-medium text-gray-600">{lastDay.justified}%</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="bg-white rounded-lg p-3 border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-700">🧠 Interpretación:</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {lastDay.present >= 80 
                    ? "Excelente nivel de asistencia. Mantener las estrategias actuales." 
                    : lastDay.present >= 70 
                    ? "Nivel de asistencia aceptable. Considerar enviar recordatorios." 
                    : "Nivel de asistencia bajo. Se sugiere implementar medidas correctivas inmediatas."
                  }
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-3 border">
                <div className="flex items-center gap-2 mb-2">
                  <lastDayTrend.icon className={`h-4 w-4 ${lastDayTrend.color}`} />
                  <span className="text-sm font-medium text-gray-700">📈 Tendencia semanal:</span>
                </div>
                <p className="text-xs text-gray-600">
                  {lastDayTrend.text === "↗" && "Tendencia ascendente vs promedio semanal"}
                  {lastDayTrend.text === "↘" && "Tendencia descendente vs promedio semanal"}
                  {lastDayTrend.text === "→" && "Tendencia estable vs promedio semanal"}
                  {` (${weeklyAverage.present}%)`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
