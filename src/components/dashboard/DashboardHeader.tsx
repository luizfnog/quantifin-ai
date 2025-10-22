import { Button } from "@/components/ui/button";
import { Upload, Menu } from "lucide-react";

interface DashboardHeaderProps {
  onUpload: () => void;
}

const DashboardHeader = ({ onUpload }: DashboardHeaderProps) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-lg shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <span className="text-xl font-bold text-white">F</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                FinFlow
              </h1>
              <p className="text-xs text-muted-foreground">Inteligência Financeira</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button 
            onClick={onUpload}
            variant="default"
            className="bg-gradient-primary hover:shadow-glow transition-all"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
