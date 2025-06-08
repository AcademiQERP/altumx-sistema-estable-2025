import { 
  Card, 
  CardContent
} from "@/components/ui/card";
import { CalendarCheck } from "lucide-react";

interface AsistenciaCardProps {
  porcentaje: number;
}

export default function AsistenciaCard({ porcentaje }: AsistenciaCardProps) {
  return (
    <Card className="bg-white border rounded-xl shadow-sm overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center">
          <div className="rounded-full bg-emerald-100 p-2.5 mr-4">
            <CalendarCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-muted-foreground text-sm font-medium">Asistencia Promedio</h3>
            <p className="text-xl font-semibold mt-1">{porcentaje}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}