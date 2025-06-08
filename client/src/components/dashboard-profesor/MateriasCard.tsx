import { 
  Card, 
  CardContent
} from "@/components/ui/card";
import { BookOpen } from "lucide-react";

interface MateriasCardProps {
  cantidad: number;
}

export default function MateriasCard({ cantidad }: MateriasCardProps) {
  return (
    <Card className="bg-white border rounded-xl shadow-sm overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center">
          <div className="rounded-full bg-orange-100 p-2.5 mr-4">
            <BookOpen className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-muted-foreground text-sm font-medium">Materias Impartidas</h3>
            <p className="text-xl font-semibold mt-1">{cantidad}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}