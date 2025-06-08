import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ExternalLink, Shield } from "lucide-react";
import { Teacher, Student } from "@shared/schema";

interface TeacherSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeacherSelectionModal({ open, onOpenChange }: TeacherSelectionModalProps) {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: teachers } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
  });

  const filteredTeachers = teachers?.filter(teacher =>
    teacher.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.correo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenPortal = () => {
    if (!selectedTeacherId) return;
    
    const url = `/simulacion/profesor/${selectedTeacherId}`;
    window.open(url, '_blank');
    onOpenChange(false);
    setSelectedTeacherId("");
    setSearchTerm("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Seleccionar Profesor - Vista Simulada
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>🔒 Modo Seguro:</strong> Esta vista es solo para supervisión.
              No podrás realizar acciones reales en el portal del profesor.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="teacher-search">Buscar profesor</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="teacher-search"
                placeholder="Buscar por nombre o correo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="teacher-select">Seleccionar profesor</Label>
            <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un profesor..." />
              </SelectTrigger>
              <SelectContent>
                {filteredTeachers?.map(teacher => (
                  <SelectItem key={teacher.id} value={teacher.id.toString()}>
                    <div className="flex flex-col">
                      <span className="font-medium">{teacher.nombreCompleto}</span>
                      <span className="text-sm text-gray-500">{teacher.correo}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleOpenPortal}
              disabled={!selectedTeacherId}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver Portal del Profesor
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ParentSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ParentSelectionModal({ open, onOpenChange }: ParentSelectionModalProps) {
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: students } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  // Para este ejemplo, usaremos datos simulados de padres ya que no hay una tabla específica
  // En producción, esto vendría de una tabla de padres o relaciones
  const mockParents = students?.map(student => ({
    id: `parent-${student.id}`,
    name: `Padre/Madre de ${student.nombreCompleto}`,
    studentName: student.nombreCompleto,
    email: `padre.${student.nombreCompleto.toLowerCase().replace(/\s+/g, '.')}@example.com`
  }));

  const filteredParents = mockParents?.filter(parent =>
    parent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.studentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenPortal = () => {
    if (!selectedParentId) return;
    
    const url = `/simulacion/padre/${selectedParentId}`;
    window.open(url, '_blank');
    onOpenChange(false);
    setSelectedParentId("");
    setSearchTerm("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Seleccionar Padre de Familia - Vista Simulada
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              <strong>🔒 Modo Seguro:</strong> Esta vista es solo para supervisión.
              No podrás realizar acciones reales en el portal de padres.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent-search">Buscar por alumno o padre</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="parent-search"
                placeholder="Buscar por nombre del alumno..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent-select">Seleccionar padre de familia</Label>
            <Select value={selectedParentId} onValueChange={setSelectedParentId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un padre de familia..." />
              </SelectTrigger>
              <SelectContent>
                {filteredParents?.map(parent => (
                  <SelectItem key={parent.id} value={parent.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{parent.name}</span>
                      <span className="text-sm text-gray-500">Alumno: {parent.studentName}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleOpenPortal}
              disabled={!selectedParentId}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver Portal de Padres
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}