import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
}

const UploadModal = ({ open, onClose }: UploadModalProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = (files: File[]) => {
    // Simulação de upload - será substituído por lógica real
    toast({
      title: "Upload Iniciado",
      description: `${files.length} arquivo(s) sendo processado pela IA...`,
    });
    
    setTimeout(() => {
      toast({
        title: "Upload Concluído!",
        description: "Transações categorizadas com sucesso.",
      });
      onClose();
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">Upload de Extrato</DialogTitle>
          <DialogDescription>
            Envie seus extratos bancários nos formatos CSV, OFX, PDF ou XLSX
          </DialogDescription>
        </DialogHeader>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${
            isDragging
              ? "border-primary bg-primary/5 shadow-glow"
              : "border-border hover:border-primary/50"
          }`}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-primary" />
          <p className="text-lg font-semibold mb-2">
            Arraste arquivos aqui
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            ou clique para selecionar
          </p>
          
          <input
            type="file"
            id="file-upload"
            className="hidden"
            multiple
            accept=".csv,.ofx,.pdf,.xlsx,.xls"
            onChange={handleFileSelect}
          />
          <label htmlFor="file-upload">
            <Button variant="outline" asChild>
              <span>
                <FileText className="w-4 h-4 mr-2" />
                Escolher Arquivos
              </span>
            </Button>
          </label>
        </div>

        <div className="space-y-3 pt-4">
          <div className="flex items-start space-x-2 text-sm">
            <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
            <p className="text-muted-foreground">
              <strong className="text-foreground">Categorização Automática:</strong> A IA analisa cada transação e sugere a categoria apropriada
            </p>
          </div>
          <div className="flex items-start space-x-2 text-sm">
            <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
            <p className="text-muted-foreground">
              <strong className="text-foreground">Segurança Total:</strong> Seus dados são criptografados e processados localmente
            </p>
          </div>
          <div className="flex items-start space-x-2 text-sm">
            <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
            <p className="text-muted-foreground">
              <strong className="text-foreground">Formatos Aceitos:</strong> CSV, OFX, PDF, XLSX
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadModal;
