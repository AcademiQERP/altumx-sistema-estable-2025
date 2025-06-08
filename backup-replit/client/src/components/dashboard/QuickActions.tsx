import { Link } from "wouter";
import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserPlus, Users, ClipboardCheck, BarChart, FileEdit, MessageSquareText, Settings } from "lucide-react";

export default function QuickActions() {
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);

  return (
    <>
      <Card className="mb-6 bg-white border rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-200 overflow-hidden">
        <CardHeader className="pb-4 border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-semibold">Acciones Rápidas</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-muted-foreground hover:text-primary"
              onClick={() => setIsCustomizeModalOpen(true)}
            >
              <Settings className="h-4 w-4 mr-1" />
              Personalizar
            </Button>
          </div>
        </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Link href="/estudiantes/nuevo">
            <div className="flex flex-col items-center gap-3 group cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-all duration-200">
              <div className="h-14 w-14 bg-blue-50 text-primary rounded-full flex items-center justify-center transition-all group-hover:bg-primary group-hover:text-white group-hover:scale-110 shadow-sm">
                <UserPlus className="h-6 w-6" />
              </div>
              <span className="text-sm text-muted-foreground text-center font-medium group-hover:text-gray-900">Nuevo Alumno</span>
            </div>
          </Link>
          
          <Link href="/grupos/nuevo">
            <div className="flex flex-col items-center gap-3 group cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-all duration-200">
              <div className="h-14 w-14 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center transition-all group-hover:bg-purple-600 group-hover:text-white group-hover:scale-110 shadow-sm">
                <Users className="h-6 w-6" />
              </div>
              <span className="text-sm text-muted-foreground text-center font-medium group-hover:text-gray-900">Nuevo Grupo</span>
            </div>
          </Link>
          
          <Link href="/asistencias/nueva">
            <div className="flex flex-col items-center gap-3 group cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-all duration-200">
              <div className="h-14 w-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center transition-all group-hover:bg-emerald-600 group-hover:text-white group-hover:scale-110 shadow-sm">
                <ClipboardCheck className="h-6 w-6" />
              </div>
              <span className="text-sm text-muted-foreground text-center font-medium group-hover:text-gray-900">Asistencia</span>
            </div>
          </Link>
          
          <Link href="/calificaciones/nueva">
            <div className="flex flex-col items-center gap-3 group cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-all duration-200">
              <div className="h-14 w-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center transition-all group-hover:bg-amber-600 group-hover:text-white group-hover:scale-110 shadow-sm">
                <BarChart className="h-6 w-6" />
              </div>
              <span className="text-sm text-muted-foreground text-center font-medium group-hover:text-gray-900">Calificaciones</span>
            </div>
          </Link>
          
          <Link href="/tareas/nueva">
            <div className="flex flex-col items-center gap-3 group cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-all duration-200">
              <div className="h-14 w-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center transition-all group-hover:bg-rose-600 group-hover:text-white group-hover:scale-110 shadow-sm">
                <FileEdit className="h-6 w-6" />
              </div>
              <span className="text-sm text-muted-foreground text-center font-medium group-hover:text-gray-900">Nueva Tarea</span>
            </div>
          </Link>
          
          <Link href="/comunicacion">
            <div className="flex flex-col items-center gap-3 group cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-all duration-200">
              <div className="h-14 w-14 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center transition-all group-hover:bg-sky-600 group-hover:text-white group-hover:scale-110 shadow-sm">
                <MessageSquareText className="h-6 w-6" />
              </div>
              <span className="text-sm text-muted-foreground text-center font-medium group-hover:text-gray-900">Mensaje</span>
            </div>
          </Link>
        </div>
      </CardContent>
    </Card>

    {/* Modal de Personalización */}
    <Dialog open={isCustomizeModalOpen} onOpenChange={setIsCustomizeModalOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ⚙️ Personaliza tus accesos rápidos
          </DialogTitle>
          <DialogDescription>
            Esta función permitirá reordenar u ocultar accesos según tus preferencias. Próximamente disponible.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end mt-6">
          <Button onClick={() => setIsCustomizeModalOpen(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
