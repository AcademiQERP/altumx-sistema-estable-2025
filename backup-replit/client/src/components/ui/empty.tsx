import React from "react";
import { FolderIcon } from "lucide-react";

export interface EmptyProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export function Empty({
  title = "No hay datos",
  description = "No se encontraron datos para mostrar.",
  icon,
}: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-background border rounded-lg">
      <div className="w-12 h-12 mb-4 text-muted-foreground">
        {icon || <FolderIcon className="w-full h-full" />}
      </div>
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}