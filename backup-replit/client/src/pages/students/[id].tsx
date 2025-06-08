import React, { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Student, User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileText, Users, Loader2, RefreshCcw, UserPlus, Trash2 } from "lucide-react";
import { Link } from "wouter";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Tipo para las vinculaciones
interface Vinculacion {
  id?: string;
  id_alumno: number;
  id_usuario: string;
  tipo_relacion: string;
  nombre?: string;
  correo?: string;
}

export default function StudentDetail() {
  const [, params] = useRoute("/estudiantes/:id");
  const studentId = params?.id ? parseInt(params.id) : null;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // States para manejo de UI
  const [isAddFamilyModalOpen, setIsAddFamilyModalOpen] = useState(false);
  const [isRemoveFamilyModalOpen, setIsRemoveFamilyModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedParent, setSelectedParent] = useState<string | null>(null);
  const [selectedRelation, setSelectedRelation] = useState<string>("padre");
  const [selectedVinculacion, setSelectedVinculacion] = useState<Vinculacion | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Obtener datos del estudiante
  const { data: student, isLoading: studentLoading, isError: studentError, refetch: refetchStudent } = useQuery<Student>({
    queryKey: [`/api/students/${studentId}`],
    enabled: !!studentId,
  });

  // Obtener vinculaciones del alumno
  const { 
    data: vinculaciones, 
    isLoading: vinculacionesLoading, 
    isError: vinculacionesError,
    refetch: refetchVinculaciones
  } = useQuery<any[]>({
    queryKey: [`/api/vinculaciones/alumno/${studentId}`],
    enabled: !!studentId,
  });

  // Obtener lista de padres para búsqueda
  const { 
    data: padres, 
    isLoading: padresLoading 
  } = useQuery<User[]>({
    queryKey: ['/api/users?rol=padre'],
  });

  // Filtrar padres por término de búsqueda
  const filteredPadres = padres?.filter(padre => 
    padre.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    padre.correo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handlers
  const handleAddFamily = async () => {
    if (!selectedParent || !studentId) return;
    
    setIsSubmitting(true);
    try {
      const data = {
        id_alumno: studentId,
        id_usuario: selectedParent,
        tipo_relacion: selectedRelation
      };
      
      const response = await apiRequest("POST", "/api/vinculaciones", data);
      
      if (response.ok) {
        toast({
          title: "Familiar vinculado",
          description: "El familiar ha sido vinculado exitosamente al alumno.",
        });
        refetchVinculaciones();
        setIsAddFamilyModalOpen(false);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Error al vincular familiar');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo vincular al familiar",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setSelectedParent(null);
      setSelectedRelation("padre");
      setSearchTerm("");
    }
  };

  const handleRemoveFamily = async () => {
    if (!selectedVinculacion) return;
    
    setIsSubmitting(true);
    try {
      const response = await apiRequest(
        "DELETE", 
        `/api/vinculaciones/${selectedVinculacion.id_alumno}/${selectedVinculacion.id_usuario}`
      );
      
      if (response.ok) {
        toast({
          title: "Vinculación eliminada",
          description: "La vinculación ha sido eliminada exitosamente.",
        });
        refetchVinculaciones();
        setIsRemoveFamilyModalOpen(false);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Error al eliminar vinculación');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la vinculación",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setSelectedVinculacion(null);
    }
  };

  const getInitials = (name: string = "") => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (studentLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Cargando información del estudiante...</p>
      </div>
    );
  }

  if (studentError || !student) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <FileText className="h-10 w-10 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Error al cargar el estudiante</h3>
        <p className="text-sm text-muted-foreground mb-4">
          No se pudo cargar la información del estudiante
        </p>
        <Button variant="outline" onClick={() => refetchStudent()}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Intentar de nuevo
        </Button>
      </div>
    );
  }

  const tipoRelacionLabel = {
    "padre": "Padre",
    "madre": "Madre", 
    "tutor": "Tutor legal",
    "otro": "Otro responsable"
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/estudiantes">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-semibold">{student.nombreCompleto}</h1>
          </div>
          <div className="flex items-center text-sm">
            <Link href="/">
              <a className="text-primary">Inicio</a>
            </Link>
            <span className="mx-2 text-muted-foreground">/</span>
            <Link href="/estudiantes">
              <a className="text-primary">Estudiantes</a>
            </Link>
            <span className="mx-2 text-muted-foreground">/</span>
            <span>Detalle</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/estudiantes/${student.id}/editar`}>
            <Button variant="outline">
              Editar Perfil
            </Button>
          </Link>
          <Link href={`/account-statement/${student.id}`}>
            <Button>
              Estado de Cuenta
            </Button>
          </Link>
        </div>
      </div>

      {/* Información General del Estudiante */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <Avatar className="h-20 w-20 bg-blue-100 text-primary">
              <AvatarFallback className="text-xl">{getInitials(student.nombreCompleto)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{student.nombreCompleto}</h2>
              <p className="text-muted-foreground mb-2">CURP: {student.curp}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-blue-50">
                  Nivel: {student.nivel}
                </Badge>
                <Badge variant="outline" className="bg-blue-50">
                  Grupo: {student.grupoId || "Sin asignar"}
                </Badge>
                <Badge variant={student.estatus === "Activo" ? "success" : "secondary"}>
                  {student.estatus}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pestañas */}
      <Tabs defaultValue="familiares">
        <TabsList className="mb-4">
          <TabsTrigger value="familiares">
            <Users className="h-4 w-4 mr-2" />
            Familiares Vinculados
          </TabsTrigger>
          {/* Otras pestañas se pueden agregar aquí en el futuro */}
        </TabsList>

        <TabsContent value="familiares">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex justify-between items-center">
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Familiares / Responsables
                </div>
                <Button onClick={() => setIsAddFamilyModalOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Agregar Responsable
                </Button>
              </CardTitle>
              <CardDescription>
                Administra los familiares o responsables vinculados a este alumno
              </CardDescription>
            </CardHeader>
            <CardContent>
              {vinculacionesLoading ? (
                <div className="h-40 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : vinculacionesError ? (
                <div className="h-40 flex flex-col items-center justify-center">
                  <p className="text-muted-foreground mb-2">Error al cargar las vinculaciones</p>
                  <Button variant="outline" onClick={() => refetchVinculaciones()}>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Reintentar
                  </Button>
                </div>
              ) : (!vinculaciones || vinculaciones.length === 0) ? (
                <div className="h-40 flex flex-col items-center justify-center border border-dashed rounded-md">
                  <Users className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No hay familiares vinculados</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setIsAddFamilyModalOpen(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Agregar Responsable
                  </Button>
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre del responsable</TableHead>
                        <TableHead>Correo electrónico</TableHead>
                        <TableHead>Relación</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vinculaciones.map((vinculacion) => (
                        <TableRow key={`${vinculacion.id_usuario}-${vinculacion.id_alumno}`}>
                          <TableCell>{vinculacion.nombre}</TableCell>
                          <TableCell>{vinculacion.correo}</TableCell>
                          <TableCell>
                            {tipoRelacionLabel[vinculacion.tipo_relacion as keyof typeof tipoRelacionLabel] || vinculacion.tipo_relacion}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => {
                                setSelectedVinculacion(vinculacion);
                                setIsRemoveFamilyModalOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal para agregar responsable */}
      <Dialog open={isAddFamilyModalOpen} onOpenChange={setIsAddFamilyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Responsable</DialogTitle>
            <DialogDescription>
              Busca y selecciona un padre o responsable registrado para vincularlo con este alumno.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 my-4">
            <div className="space-y-2">
              <Label htmlFor="search-parent">Buscar por nombre o correo</Label>
              <Input
                id="search-parent"
                placeholder="Escribe para buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Seleccionar padre/responsable</Label>
              <div className="border rounded-md h-40 overflow-y-auto">
                {padresLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : filteredPadres?.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    No se encontraron resultados
                  </div>
                ) : (
                  <div className="p-1">
                    {filteredPadres?.map((padre) => (
                      <div
                        key={padre.id}
                        className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                          selectedParent === padre.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => setSelectedParent(padre.id)}
                      >
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarFallback className="text-xs">
                            {getInitials(padre.nombreCompleto)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{padre.nombreCompleto}</p>
                          <p className="text-xs text-muted-foreground">{padre.correo}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="relation-type">Tipo de relación</Label>
              <Select value={selectedRelation} onValueChange={setSelectedRelation}>
                <SelectTrigger id="relation-type">
                  <SelectValue placeholder="Selecciona el tipo de relación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="padre">Padre</SelectItem>
                  <SelectItem value="madre">Madre</SelectItem>
                  <SelectItem value="tutor">Tutor legal</SelectItem>
                  <SelectItem value="otro">Otro responsable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddFamilyModalOpen(false);
                setSelectedParent(null);
                setSelectedRelation("padre");
                setSearchTerm("");
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleAddFamily} 
              disabled={!selectedParent || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal para eliminar responsable */}
      <Dialog open={isRemoveFamilyModalOpen} onOpenChange={setIsRemoveFamilyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Vinculación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas desvincular a este responsable?
              Esta acción no puede deshacerse.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRemoveFamilyModalOpen(false);
                setSelectedVinculacion(null);
              }}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleRemoveFamily} 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : "Eliminar Vinculación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}