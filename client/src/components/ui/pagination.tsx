import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  // No mostrar paginación si solo hay una página
  if (totalPages <= 1) return null;

  // Función para generar el rango de páginas a mostrar
  const getPageRange = () => {
    const delta = 1; // Cuántas páginas mostrar a cada lado de la actual
    const range: number[] = [];
    
    // Siempre incluir la primera página
    range.push(1);
    
    // Generar rango alrededor de la página actual
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }
    
    // Siempre incluir la última página si hay más de una
    if (totalPages > 1) {
      range.push(totalPages);
    }
    
    // Eliminar duplicados (por si acaso)
    return [...new Set(range)];
  };

  const pageRange = getPageRange();

  return (
    <div className="flex items-center justify-center space-x-2 py-4">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Página anterior</span>
      </Button>
      
      {pageRange.map((page, index) => {
        // Añadir un indicador si hay saltos entre las páginas mostradas
        if (index > 0 && page > pageRange[index - 1] + 1) {
          return (
            <React.Fragment key={`ellipsis-${page}`}>
              <div className="px-2">...</div>
              <Button
                variant={currentPage === page ? "default" : "outline"}
                onClick={() => onPageChange(page)}
                className="h-9 w-9"
              >
                {page}
              </Button>
            </React.Fragment>
          );
        }
        
        return (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            onClick={() => onPageChange(page)}
            className="h-9 w-9"
          >
            {page}
          </Button>
        );
      })}
      
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Página siguiente</span>
      </Button>
    </div>
  );
}