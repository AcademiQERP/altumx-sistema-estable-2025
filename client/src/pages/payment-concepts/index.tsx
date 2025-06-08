import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { PaymentConcept } from "@shared/schema";
import { Plus, Edit, Trash2, Copy, Filter } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  formatCurrency, 
  getConceptStatus, 
  getStatusColor, 
  getTipoAplicacionText,
  getNivelAplicableText,
  clonePaymentConcept 
} from "@/utils/payment-concept-utils";

export default function PaymentConceptsList() {
  const { toast } = useToast();
  const [conceptToDelete, setConceptToDelete] = useState<PaymentConcept | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterNivel, setFilterNivel] = useState<string | null>(null);

  const { data: concepts = [], isLoading, error } = useQuery({
    queryKey: ['/api/payment-concepts'],
    refetchOnWindowFocus: false,
  });

  const handleDelete = async () => {
    if (!conceptToDelete) return;

    try {
      await apiRequest(
        'DELETE',
        `/api/payment-concepts/${conceptToDelete.id}`
      );

      queryClient.invalidateQueries({ queryKey: ['/api/payment-concepts'] });
      toast({
        title: "Concepto eliminado",
        description: "El concepto de pago ha sido eliminado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el concepto de pago",
        variant: "destructive",
      });
    } finally {
      setConceptToDelete(null);
    }
  };

  const handleClonar = async (concept: PaymentConcept) => {
    try {
      const clonedConcept = clonePaymentConcept(concept);
      
      await apiRequest(
        "POST",
        "/api/payment-concepts",
        clonedConcept
      );

      queryClient.invalidateQueries({ queryKey: ['/api/payment-concepts'] });
      
      toast({
        title: "Concepto clonado",
        description: `Se ha creado una copia de "${concept.nombre}" correctamente`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo clonar el concepto de pago",
        variant: "destructive",
      });
    }
  };

  // Filtramos los conceptos según los criterios de búsqueda
  const filteredConcepts = Array.isArray(concepts) ? concepts.filter(concept => {
    const matchesSearch = !searchTerm || 
      concept.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (concept.descripcion && concept.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = !filterType || filterType === "todos" || concept.tipoAplicacion === filterType;
    
    const matchesNivel = !filterNivel || filterNivel === "todos" || concept.nivelAplicable === filterNivel;
    
    return matchesSearch && matchesType && matchesNivel;
  }) : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2">Cargando conceptos de pago...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-500">
          <p>Error al cargar los conceptos de pago</p>
          <p className="text-sm">Por favor, intente nuevamente más tarde</p>
        </div>
      </div>
    );
  }

  // Extraer niveles únicos para el filtro
  const niveles = Array.isArray(concepts) 
    ? [...new Set(concepts.filter(c => c.nivelAplicable).map(c => c.nivelAplicable))]
    : [];

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">🧾 Conceptos de Pago</h1>
          <p className="text-muted-foreground">
            Gestiona las categorías de cobro activas por nivel educativo y tipo
          </p>
        </div>
        <Link href="/payment-concepts/new">
          <Button title="Registrar un nuevo tipo de cobro">
            <Plus className="mr-2 h-4 w-4" />
            + Crear nuevo concepto
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Conceptos de Pago</CardTitle>
          <CardDescription>
            Listado de todos los conceptos de pago disponibles en el sistema
          </CardDescription>
          
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Input
                placeholder="🔍 Buscar concepto por nombre o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              <Filter className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
            </div>
            
            <div className="flex flex-col space-y-1">
              <label className="text-sm font-medium">Tipo de aplicación:</label>
              <Select value={filterType || ""} onValueChange={(value) => setFilterType(value || null)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Tipo de aplicación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="mensual">Mensual</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col space-y-1">
              <label className="text-sm font-medium">Nivel escolar:</label>
              <Select value={filterNivel || ""} onValueChange={(value) => setFilterNivel(value || null)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los niveles</SelectItem>
                  {niveles.map((nivel) => (
                    <SelectItem key={nivel} value={nivel}>{nivel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredConcepts.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nivel</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConcepts.map((concept: PaymentConcept) => {
                    const status = getConceptStatus(concept);
                    return (
                      <TableRow key={concept.id}>
                        <TableCell className="font-medium">
                          <div>
                            {concept.nombre}
                            {concept.categoriaContable && (
                              <span className="block mt-1 text-xs text-muted-foreground">
                                Categoría: {concept.categoriaContable}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getTipoAplicacionText(concept.tipoAplicacion)}</TableCell>
                        <TableCell>{getNivelAplicableText(concept.nivelAplicable)}</TableCell>
                        <TableCell className="flex items-center">💲 {formatCurrency(concept.montoBase)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(status)}>
                            {status === "activo" ? "✅ Activo" : status === "vencido" ? "❌ Vencido" : "🔜 Próximo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleClonar(concept)}
                              title="Duplicar concepto"
                              aria-label="Duplicar concepto"
                            >
                              <Copy className="h-4 w-4" />
                              <span className="sr-only">Clonar</span>
                            </Button>
                            <Link href={`/payment-concepts/edit/${concept.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Editar concepto"
                                aria-label="Editar concepto"
                              >
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Editar</span>
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setConceptToDelete(concept)}
                              title="Eliminar concepto"
                              aria-label="Eliminar concepto"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Eliminar</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterType || filterNivel 
                  ? "No se encontraron conceptos de pago con los filtros aplicados" 
                  : "No hay conceptos de pago registrados"}
              </p>
              {!searchTerm && !filterType && !filterNivel && (
                <Link href="/payment-concepts/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Concepto
                  </Button>
                </Link>
              )}
              {(searchTerm || filterType || filterNivel) && (
                <Button variant="outline" onClick={() => {
                  setSearchTerm("");
                  setFilterType(null);
                  setFilterNivel(null);
                }}>
                  Limpiar filtros
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!conceptToDelete} onOpenChange={() => setConceptToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el concepto de pago{" "}
              <span className="font-semibold">{conceptToDelete?.nombre}</span>. Esta acción
              no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}