import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import { ArrowUp, ArrowDown, Info } from "lucide-react";
import { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconBgColor: string;
  helpText?: string;
  change?: {
    value: string;
    type: "increase" | "decrease" | "neutral";
  };
}

export default function StatCard({ 
  title, 
  value, 
  icon, 
  iconBgColor,
  helpText,
  change 
}: StatCardProps) {
  return (
    <Card className="bg-white border rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-200 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`rounded-full ${iconBgColor} p-3 mr-4 shadow-sm`}>
              {icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-muted-foreground text-sm font-medium">{title}</h3>
                {helpText && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground hover:text-primary transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-48">{helpText}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <p className="text-2xl font-bold mt-1 text-gray-900">{value}</p>
            </div>
          </div>
        </div>
        
        {change && (
          <div className={`mt-3 text-xs font-medium flex items-center
            ${change.type === "increase" ? "text-emerald-600" : 
              change.type === "decrease" ? "text-red-600" : 
              "text-muted-foreground"}`
          }>
            {change.type === "increase" && <ArrowUp className="h-3 w-3 mr-1" />}
            {change.type === "decrease" && <ArrowDown className="h-3 w-3 mr-1" />}
            <span className="text-muted-foreground">{change.value}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
