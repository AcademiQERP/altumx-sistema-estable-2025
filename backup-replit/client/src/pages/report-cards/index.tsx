import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, FileText, RefreshCcw, Eye, Download, ArrowDown, ArrowUp, Filter } from "lucide-react";
import { Student } from "@shared/schema";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function ReportCardsList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  
  // Estado para ordenamiento
  const [sortField, setSortField] = useState<string>("nombreCompleto");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  // Referencia para autocompletado
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const { data: students, isLoading, isError, refetch } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  // Actualizar sugerencias cuando cambia el término de búsqueda
  useEffect(() => {
    if (!students || searchTerm.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    const nameMatches = students
      .filter(student => 
        student.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.curp.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .map(student => student.nombreCompleto)
      .slice(0, 5);
    
    const curpMatches = students
      .filter(student => 
        student.curp.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !nameMatches.includes(student.nombreCompleto)
      )
      .map(student => student.curp)
      .slice(0, 3);
    
    setSuggestions([...nameMatches, ...curpMatches]);
    setShowSuggestions(nameMatches.length > 0 || curpMatches.length > 0);
  }, [searchTerm, students]);
  
  // Manejar clic fuera de las sugerencias para ocultarlas
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  // Filter students by search term
  const filteredStudents = students?.filter(student => {
    return student.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
           student.curp.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  // Ordenar estudiantes
  const sortedStudents = [...(filteredStudents || [])].sort((a, b) => {
    let fieldA: string | number = "";
    let fieldB: string | number = "";
    
    if (sortField === "nombreCompleto") {
      fieldA = a.nombreCompleto.toLowerCase();
      fieldB = b.nombreCompleto.toLowerCase();
    } else if (sortField === "curp") {
      fieldA = a.curp.toLowerCase();
      fieldB = b.curp.toLowerCase();
    } else if (sortField === "grupoId") {
      fieldA = a.grupoId || 0;
      fieldB = b.grupoId || 0;
    } else if (sortField === "nivel") {
      fieldA = a.nivel?.toLowerCase() || "";
      fieldB = b.nivel?.toLowerCase() || "";
    }
    
    if (fieldA < fieldB) return sortDirection === "asc" ? -1 : 1;
    if (fieldA > fieldB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part?.[0] || "")
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };
  
  // Maneja el ordenamiento al hacer clic en los encabezados
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };
  
  // Destaca la fila seleccionada y restablece después de un tiempo
  const highlightRow = (id: number) => {
    setSelectedRow(id);
    setTimeout(() => {
      setSelectedRow(null);
    }, 2000);
  };

  return (
    <TooltipProvider>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Boletas Académicas</h1>
        <div className="flex items-center text-sm">
          <Link href="/">
            <a className="text-primary">Inicio</a>
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <span>Boletas</span>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Boletas por Alumno</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Sección de búsqueda con autocompletado */}
          <div className="flex flex-col sm:flex-row justify-between mb-4 gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                ref={searchInputRef}
                placeholder="🔍 Buscar por nombre o CURP..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
              />
              
              {/* Sugerencias de autocompletado */}
              {showSuggestions && (
                <div className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 max-h-52 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                      onClick={() => {
                        setSearchTerm(suggestion);
                        setShowSuggestions(false);
                      }}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCcw className="h-4 w-4" />
              </Button>
              <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="gap-1.5">
                    <Filter className="h-4 w-4" />
                    <span>🔍 Filtros Avanzados</span>
                    <Badge variant="secondary" className="text-xs ml-1">Experimental</Badge>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 p-4 border rounded-md bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Grupo</label>
                      <Select disabled>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos los grupos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos los grupos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nivel</label>
                      <Select disabled>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos los niveles" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos los niveles</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Estado académico</label>
                      <Select disabled>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos los estados" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos los estados</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      Función experimental - Disponible próximamente
                    </Badge>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>

          {isError && (
            <div className="flex flex-col items-center justify-center py-8">
              <FileText className="h-10 w-10 text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium">Error al cargar alumnos</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Ocurrió un error al cargar la lista de alumnos
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
                    <TableHead onClick={() => handleSort("nombreCompleto")} className="cursor-pointer">
                      <div className="flex items-center">
                        Estudiante
                        {sortField === "nombreCompleto" && (
                          <span className="ml-1">
                            {sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead onClick={() => handleSort("curp")} className="cursor-pointer">
                      <div className="flex items-center">
                        CURP
                        {sortField === "curp" && (
                          <span className="ml-1">
                            {sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead onClick={() => handleSort("grupoId")} className="cursor-pointer">
                      <div className="flex items-center">
                        Grupo
                        {sortField === "grupoId" && (
                          <span className="ml-1">
                            {sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead onClick={() => handleSort("nivel")} className="cursor-pointer">
                      <div className="flex items-center">
                        Nivel
                        {sortField === "nivel" && (
                          <span className="ml-1">
                            {sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <div className="flex justify-center">
                            <RefreshCcw className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : sortedStudents?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No se encontraron estudiantes
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedStudents?.map((student) => (
                      <TableRow 
                        key={student.id} 
                        className={`hover:bg-muted/50 transition-colors duration-200 ${selectedRow === student.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                      >
                        <TableCell>
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 mr-2 bg-blue-100 text-primary">
                              <AvatarFallback>{getInitials(student.nombreCompleto)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{student.nombreCompleto}</span>
                          </div>
                        </TableCell>
                        <TableCell>{student.curp}</TableCell>
                        <TableCell>{student.grupoId || "Sin asignar"}</TableCell>
                        <TableCell>{student.nivel}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center space-x-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-primary"
                                  onClick={() => {
                                    highlightRow(student.id);
                                    window.location.href = `/boletas/${student.id}`;
                                  }}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  📄 Consultar Boleta
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Haz clic para consultar y exportar la boleta académica del alumno</p>
                              </TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button disabled variant="outline" size="icon" className="text-primary opacity-50">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Descargar como PDF (Próximamente)</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
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
    </TooltipProvider>
  );
}
