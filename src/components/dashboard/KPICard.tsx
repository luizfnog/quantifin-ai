import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  variant: "success" | "warning" | "primary" | "accent";
  trend?: "up" | "down";
  trendValue?: string;
  description?: string;
}

const KPICard = ({ title, value, icon, variant, trend, trendValue, description }: KPICardProps) => {
  const variantStyles = {
    success: "bg-gradient-success",
    warning: "bg-gradient-to-br from-warning to-warning/80",
    primary: "bg-gradient-primary",
    accent: "bg-gradient-to-br from-accent to-accent/80",
  };

  const content = (
    <Card className="relative overflow-hidden border-none shadow-md hover:shadow-lg transition-all group">
      <div className="absolute inset-0 bg-gradient-card opacity-50" />
      
      <div className="relative p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className={cn(
            "p-3 rounded-xl shadow-md transition-transform group-hover:scale-110",
            variantStyles[variant]
          )}>
            <div className="text-white">
              {icon}
            </div>
          </div>
          
          {trend && trendValue && (
            <div className={cn(
              "flex items-center space-x-1 text-sm font-medium",
              trend === "up" ? "text-success" : "text-destructive"
            )}>
              {trend === "up" ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{trendValue}</span>
            </div>
          )}
        </div>

        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
      </div>
    </Card>
  );

  if (description) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>{description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
};

export default KPICard;
