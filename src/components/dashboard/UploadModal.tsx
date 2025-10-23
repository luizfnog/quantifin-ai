import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle, Download } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { downloadCSVTemplate, parseCSVFile } from "@/utils/csvTemplate";
import { supabase } from "@/integrations/supabase/client";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
}

const UploadModal = ({ open, onClose }: UploadModalProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files[0]);
    }
  };

  const handleFiles = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Formato Inválido",
        description: "Por favor, faça upload de um arquivo CSV usando o template fornecido.",
        variant: "destructive"
      });
      return;
    }
    
    setIsUploading(true);
    
    toast({
      title: "Upload Iniciado",
      description: `Processando ${file.name}...`,
    });
    
    try {
      const content = await file.text();
      const transactions = parseCSVFile(content);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      
      const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id);
      
      const categoryMap = new Map(
        categories?.map(cat => [cat.name.toLowerCase(), cat]) || []
      );
      
      const transactionsToInsert = transactions.map(t => {
        const category = t.category ? categoryMap.get(t.category.toLowerCase()) : null;
        const subcategory = t.subcategory ? 
          categories?.find(c => 
            c.name.toLowerCase() === t.subcategory?.toLowerCase() && 
            c.parent_id === category?.id
          ) : null;
        
        return {
          user_id: user.id,
          date: t.date,
          description: t.description,
          amount: t.amount,
          type: t.amount < 0 ? 'expense' : 'income',
          category_id: category?.id || null,
          subcategory_id: subcategory?.id || null,
          ai_confidence: t.category ? 100 : null
        };
      });
      
      const { error } = await supabase
        .from('transactions')
        .insert(transactionsToInsert);
      
      if (error) throw error;
      
      setIsUploading(false);
      toast({
        title: "Upload Concluído",
        description: `${transactions.length} transações foram importadas com sucesso!`,
      });
      onClose();
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      setIsUploading(false);
      toast({
        title: "Erro no Upload",
        description: "Ocorreu um erro ao processar o arquivo. Verifique o formato.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">Upload de Extrato</DialogTitle>
          <DialogDescription>
            Baixe o template CSV e preencha com suas transações
          </DialogDescription>
        </DialogHeader>

        <div className="mb-6">
          <Button
            onClick={downloadCSVTemplate}
            variant="outline"
            className="w-full mb-3"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar Template CSV
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Use o template CSV para garantir a precisão da importação
          </p>
        </div>

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
            {isUploading ? "Processando..." : "Arraste o arquivo CSV aqui"}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            ou clique para selecionar
          </p>
          
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".csv"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
          <label htmlFor="file-upload">
            <Button variant="outline" asChild disabled={isUploading}>
              <span>
                <FileText className="w-4 h-4 mr-2" />
                Escolher Arquivo CSV
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
              <strong className="text-foreground">Segurança Total:</strong> Seus dados são criptografados e processados com segurança
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadModal;
