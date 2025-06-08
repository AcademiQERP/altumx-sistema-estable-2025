import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertTriangle, TrendingUp, PlusCircle, BarChart as ChartIcon, Table as TableIcon, LineChart as LineChartIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

// Componente reutilizable para estados vacíos
interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
}

function EmptyState({ 
  title, 
  description, 
  icon = <AlertTriangle className="h-12 w-12 mb-4 text-amber-500" />,
  actionLabel,
  onAction,
  actionIcon
}: EmptyStateProps) {
  return (
    <div className="h-80 w-full flex flex-col items-center justify-center text-muted-foreground border border-dashed rounded-md p-6">
      {icon}
      <p className="text-lg font-medium">{title}</p>
      <p className="mt-2 text-center max-w-md">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button 
          onClick={onAction} 
          variant="outline" 
          className="mt-4 gap-2"
        >
          {actionIcon}
          <span>{actionLabel}</span>
        </Button>
      )}
    </div>
  );
}

// Reemplazos para las secciones de estado vacío:

// Reemplazo 1: Distribución de riesgo (línea ~504-512)
const emptyDistribution = (
  <EmptyState
    title="No hay datos disponibles"
    description={`No se encontraron instantáneas de riesgo para ${selectedMonth} ${selectedYear}.`}
    actionLabel="Generar Instantáneas"
    onAction={handleGenerateSnapshots}
    actionIcon={<PlusCircle className="h-4 w-4 mr-1" />}
    icon={<ChartIcon className="h-12 w-12 mb-4 text-amber-500" />}
  />
);

// Reemplazo 2: Tendencia histórica (línea ~564-572)
const emptyTrend = (
  <EmptyState
    title="Datos históricos insuficientes"
    description="Se necesitan instantáneas de al menos dos meses diferentes para visualizar tendencias históricas."
    actionLabel="Generar Instantáneas"
    onAction={handleGenerateSnapshots}
    actionIcon={<PlusCircle className="h-4 w-4 mr-1" />}
    icon={<LineChartIcon className="h-12 w-12 mb-4 text-amber-500" />}
  />
);

// Reemplazo 3: Datos detallados (línea ~776-784)
const emptyTable = (
  <EmptyState
    title="No hay datos detallados"
    description={`No se encontraron registros de riesgo para ${selectedMonth} ${selectedYear}.`}
    actionLabel="Generar Instantáneas"
    onAction={handleGenerateSnapshots}
    actionIcon={<PlusCircle className="h-4 w-4 mr-1" />}
    icon={<TableIcon className="h-12 w-12 mb-4 text-amber-500" />}
  />
);