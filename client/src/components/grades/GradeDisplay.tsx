import { Info } from "lucide-react";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

export type GradeCategory = "optimo" | "satisfactorio" | "enProceso" | "bajo" | "critico";

interface GradeDisplayProps {
  grade: number;
  showIcon?: boolean;
  showLabel?: boolean;
  showColor?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "badge" | "pill" | "text";
}

export const getCategoryFromGrade = (grade: number): GradeCategory => {
  if (grade >= 9) return "optimo";
  if (grade >= 8) return "satisfactorio";
  if (grade >= 7) return "enProceso";
  if (grade >= 6) return "bajo";
  return "critico";
};

export const getCategoryLabel = (category: GradeCategory): string => {
  switch (category) {
    case "optimo": return "Óptimo";
    case "satisfactorio": return "Satisfactorio";
    case "enProceso": return "En proceso";
    case "bajo": return "Bajo";
    case "critico": return "Crítico";
    default: return "";
  }
};

export const getCategoryIcon = (category: GradeCategory): string => {
  switch (category) {
    case "optimo": return "✅";
    case "satisfactorio": return "🟦";
    case "enProceso": return "⚠️";
    case "bajo": return "🚨";
    case "critico": return "❌";
    default: return "";
  }
};

export const getCategoryColor = (category: GradeCategory): string => {
  switch (category) {
    case "optimo": return "bg-green-100 text-green-800 border-green-200";
    case "satisfactorio": return "bg-blue-100 text-blue-800 border-blue-200";
    case "enProceso": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "bajo": return "bg-orange-100 text-orange-800 border-orange-200";
    case "critico": return "bg-red-100 text-red-800 border-red-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export const getCategoryDescription = (category: GradeCategory): string => {
  switch (category) {
    case "optimo": return "Nivel óptimo de desempeño (9.0 - 10.0)";
    case "satisfactorio": return "Nivel satisfactorio de desempeño (8.0 - 8.9)";
    case "enProceso": return "Nivel en proceso de desempeño (7.0 - 7.9)";
    case "bajo": return "Nivel bajo de desempeño (6.0 - 6.9)";
    case "critico": return "Nivel crítico de desempeño (menor a 6.0)";
    default: return "";
  }
};

export function GradeDisplay({ 
  grade, 
  showIcon = true, 
  showLabel = true,
  showColor = true,
  size = "md",
  variant = "badge"
}: GradeDisplayProps) {
  // Asegurarse de que el grado esté en escala 0-10
  const normalizedGrade = grade > 10 ? grade / 10 : grade;
  
  // Obtener la categoría y sus atributos
  const category = getCategoryFromGrade(normalizedGrade);
  const label = getCategoryLabel(category);
  const icon = getCategoryIcon(category);
  const colorClasses = showColor ? getCategoryColor(category) : "bg-gray-50 text-gray-800 border-gray-200";
  const description = getCategoryDescription(category);
  
  // Estilos según el tamaño
  const sizeClasses = {
    sm: "text-xs py-0.5 px-1.5",
    md: "text-sm py-1 px-2",
    lg: "text-base py-1.5 px-3"
  };
  
  // Estilos según la variante
  const variantClasses = {
    badge: `inline-flex items-center rounded-md border ${colorClasses} ${sizeClasses[size]}`,
    pill: `inline-flex items-center rounded-full border ${colorClasses} ${sizeClasses[size]}`,
    text: "inline-flex items-center"
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={variantClasses[variant]}>
            <span className="font-medium">{normalizedGrade.toFixed(1)}</span>
            {showIcon && (
              <span className="ml-1">{icon}</span>
            )}
            {showLabel && (
              <span className="ml-1 font-normal">{label}</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5" />
            <p className="text-sm">{description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}