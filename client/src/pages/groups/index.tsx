import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { 
  AlertCircle, 
  PlusCircle, 
  Search, 
  Edit, 
  Trash2, 
  Users, 
  RefreshCcw, 
  Calendar, 
  Brush, 
  Archive,
  Eye
} from "lucide-react";
import { Group } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GroupCleanupAssistant } from "@/components/groups/GroupCleanupAssistant";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GroupsList() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState("todos");
  const [showArchived, setShowArchived] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [groupToCleanup, setGroupToCleanup] = useState<Group | null>(null);
  const [isCleanupOpen, setIsCleanupOpen] = useState(false);

  const { data: groups, isLoading, isError, refetch } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  // Filter groups by search term, level and archive status
  const filteredGroups = groups?.filter(group => {
    const matchesSearch = group.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === "todos" || group.nivel === filterLevel;
    const matchesArchiveStatus = showArchived || group.estado === "activo" || group.estado === undefined;
    return matchesSearch && matchesLevel && matchesArchiveStatus;
  });

  const [dependencyError, setDependencyError] = useState<string | null>(null);
  
  const handleDeleteGroup = async () => {
    if (groupToDelete) {
      try {
        // Limpiar mensajes de error previos
        setDependencyError(null);
        
        const response = await apiRequest("DELETE", `/api/groups/${groupToDelete.id}`);
        
        // Si hay respuesta pero no es ok (código 2xx)
        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (e) {
            errorData = { message: "Error desconocido en el servidor" };
          }
          
          // Verificar si es un error por dependencias (409 Conflict)
          if (response.status === 409) {
            if (errorData.formattedMessage) {
              setDependencyError(errorData.formattedMessage);
            } else {
              setDependencyError(
                "No se puede eliminar el grupo porque tiene dependencias activas. " +
                "Verifique si hay alumnos, profesores, horarios o materias asignadas."
              );
            }
            return;
          }
          
          // Si no es error de dependencias, mostrar mensaje genérico
          toast({
            title: "Error",
            description: errorData.message || "No se pudo eliminar el grupo",
            variant: "destructive",
          });
          return;
        }
        
        // Si la respuesta es ok, procesar el resultado
        try {
          const data = await response.json();
          if (data.success) {
            toast({
              title: "Grupo eliminado",
              description: "El grupo ha sido eliminado correctamente",
            });
            refetch();
            setGroupToDelete(null);
          } else {
            toast({
              title: "Error",
              description: data.message || "Ocurrió un error al eliminar el grupo",
              variant: "destructive",
            });
          }
        } catch (e) {
          // Si no hay JSON válido pero el status es OK, asumimos éxito
          if (response.status === 204) {
            toast({
              title: "Grupo eliminado",
              description: "El grupo ha sido eliminado correctamente",
            });
            refetch();
            setGroupToDelete(null);
          }
        }
      } catch (error) {
        console.error("Error al eliminar grupo:", error);
        toast({
          title: "Error",
          description: "No se pudo eliminar el grupo debido a un error de conexión",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Grupos</h1>
          <div className="flex items-center text-sm">
            <Button
              variant="link"
              className="p-0 h-auto text-primary"
              onClick={() => navigate("/")}
            >
              Inicio
            </Button>
            <span className="mx-2 text-muted-foreground">/</span>
            <span>Grupos</span>
          </div>
        </div>
        <Button
          onClick={() => navigate("/grupos/nuevo")}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Nuevo Grupo
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Lista de Grupos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col mb-4 gap-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar grupo..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={filterLevel} onValueChange={setFilterLevel}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Nivel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los niveles</SelectItem>
                    <SelectItem value="Preescolar">Preescolar</SelectItem>
                    <SelectItem value="Primaria">Primaria</SelectItem>
                    <SelectItem value="Secundaria">Secundaria</SelectItem>
                    <SelectItem value="Preparatoria">Preparatoria</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => refetch()}>
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <Switch
                id="show-archived"
                checked={showArchived}
                onCheckedChange={setShowArchived}
              />
              <Label htmlFor="show-archived" className="text-sm">
                Mostrar grupos archivados
              </Label>
            </div>
          </div>

          {isError && (
            <div className="flex flex-col items-center justify-center py-8">
              <Users className="h-10 w-10 text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium">Error al cargar grupos</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Ocurrió un error al cargar la lista de grupos
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Intentar de nuevo
              </Button>
            </div>
          )}

          {!isError && (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Nivel</TableHead>
                    <TableHead>Ciclo Escolar</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={4} className="h-24 text-center">
                          <div className="flex justify-center">
                            <RefreshCcw className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredGroups?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No se encontraron grupos
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredGroups?.map((group) => (
                      <TableRow key={group.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{group.nombre}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50">
                            {group.nivel}
                          </Badge>
                        </TableCell>
                        <TableCell>{group.cicloEscolar}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-green-600 hover:text-green-700"
                            onClick={() => navigate(`/grupos/${group.id}/horario`)}
                            title="Ver horario"
                          >
                            <Calendar className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-primary hover:text-blue-700"
                            onClick={() => navigate(`/grupos/${group.id}/editar`)}
                            title="Editar grupo"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-amber-600 hover:text-amber-700"
                            onClick={() => {
                              setGroupToCleanup(group);
                              setIsCleanupOpen(true);
                            }}
                            title="Asistente de limpieza"
                          >
                            <Brush className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-red-700"
                            onClick={() => setGroupToDelete(group)}
                            title="Eliminar grupo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Delete Dialog */}
      <Dialog open={!!groupToDelete} onOpenChange={() => {
        setGroupToDelete(null);
        setDependencyError(null);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro que deseas eliminar el grupo {groupToDelete?.nombre}?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          
          {dependencyError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No se puede eliminar el grupo</AlertTitle>
              <AlertDescription>
                <div className="mt-2 text-sm whitespace-pre-line">
                  {dependencyError}
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setGroupToDelete(null);
                setDependencyError(null);
              }}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteGroup}
              disabled={!!dependencyError}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Asistente de Limpieza */}
      <GroupCleanupAssistant
        groupId={groupToCleanup?.id || null}
        isOpen={isCleanupOpen}
        onClose={() => {
          setIsCleanupOpen(false);
          setGroupToCleanup(null);
        }}
        onComplete={() => {
          refetch();
          toast({
            title: "Operación completada",
            description: "Se ha completado la operación de limpieza del grupo correctamente."
          });
        }}
      />
    </>
  );
}
