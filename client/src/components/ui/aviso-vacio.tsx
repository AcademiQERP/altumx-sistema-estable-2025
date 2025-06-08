import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface AvisoVacioProps {
  titulo: string;
  mensaje: string;
  icono?: string | React.ReactNode;
  acciones?: React.ReactNode;
  ayuda?: string;
}

export function AvisoVacio({ titulo, mensaje, icono = "📄", acciones, ayuda }: AvisoVacioProps) {
  return (
    <Card className="w-full mt-4 overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col items-center text-center p-12 bg-muted/20">
          <div className="text-5xl mb-4">{icono}</div>
          <h3 className="text-xl font-semibold mb-2">{titulo}</h3>
          <p className="text-muted-foreground max-w-lg mb-4">{mensaje}</p>
          
          {ayuda && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="inline-flex items-center text-sm text-primary hover:underline">
                    <HelpCircle className="h-4 w-4 mr-1" />
                    <span>Más información</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p>{ayuda}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {acciones && (
            <div className="mt-4">
              {acciones}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}