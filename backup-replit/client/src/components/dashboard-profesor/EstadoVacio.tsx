import { Card, CardContent } from "@/components/ui/card";
import { FolderX } from "lucide-react";

export default function EstadoVacio() {
  return (
    <Card className="mt-10 bg-white border rounded-xl shadow-sm overflow-hidden">
      <CardContent className="flex flex-col items-center justify-center py-10">
        <div className="rounded-full bg-muted p-6 mb-5">
          <FolderX className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-medium mb-2">No tienes grupos asignados</h3>
        <p className="text-muted-foreground text-center max-w-md">
          No hay grupos asignados a tu cuenta. Contacta con el administrador del sistema para solicitar la asignación de grupos.
        </p>
      </CardContent>
    </Card>
  );
}