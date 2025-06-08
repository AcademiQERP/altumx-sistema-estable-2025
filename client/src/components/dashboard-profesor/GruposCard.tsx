import { 
  Card, 
  CardContent
} from "@/components/ui/card";
import { Users } from "lucide-react";

interface GruposCardProps {
  cantidad: number;
}

export default function GruposCard({ cantidad }: GruposCardProps) {
  return (
    <Card className="bg-white border rounded-xl shadow-sm overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center">
          <div className="rounded-full bg-primary/10 p-2.5 mr-4">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-muted-foreground text-sm font-medium">Grupos Asignados</h3>
            <p className="text-xl font-semibold mt-1">{cantidad}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}