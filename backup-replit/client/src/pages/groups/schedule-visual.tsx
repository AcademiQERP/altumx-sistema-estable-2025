import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import WeeklyScheduleGrid from "@/components/schedule/WeeklyScheduleGrid";

// Definir interfaz para el grupo
interface Group {
  id: number;
  nombre: string;
  nivel: string;
  cicloEscolar: string;
}

export default function VisualSchedulePage() {
  const { id } = useParams<{ id: string }>();
  const groupId = parseInt(id);
  
  // Consulta para obtener información del grupo
  const { 
    data: group, 
    isLoading: isLoadingGroup,
    error: groupError
  } = useQuery({
    queryKey: ['/api/groups', groupId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/groups/${groupId}`);
      return res.json() as Promise<Group>;
    },
    enabled: !!groupId && !isNaN(groupId)
  });
  
  // Mostrar estado de carga
  if (isLoadingGroup) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Mostrar error si no se encuentra el grupo
  if (groupError || !group) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>No se pudo cargar la información del grupo. Por favor, inténtelo de nuevo.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Renderizar la cuadrícula semanal con la información del grupo
  return <WeeklyScheduleGrid groupId={groupId} groupName={group.nombre} />;
}