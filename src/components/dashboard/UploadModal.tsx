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
      const arrayBuffer = await file.arrayBuffer();
      const decoder = new TextDecoder('utf-8');
      let content = decoder.decode(arrayBuffer);
      
      // Remove BOM if present
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      
      const transactions = parseCSVFile(content);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      
      // Fetch all existing categories
      const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id);
      
      const categoryMap = new Map(
        categories?.map(cat => [cat.name.toLowerCase().trim(), cat]) || []
      );
      
      // Collect unique categories and subcategories from CSV
      const uniqueParentCategories = new Set<string>();
      const uniqueSubcategories = new Map<string, string>(); // subcategory -> parent category
      
      for (const t of transactions) {
        if (t.category?.trim()) {
          const categoryName = t.category.trim();
          const categoryKey = categoryName.toLowerCase();
          
          if (!categoryMap.has(categoryKey)) {
            uniqueParentCategories.add(categoryName);
          }
          
          if (t.subcategory?.trim()) {
            const subcategoryName = t.subcategory.trim();
            const subcategoryKey = `${categoryKey}::${subcategoryName.toLowerCase()}`;
            
            if (!uniqueSubcategories.has(subcategoryKey)) {
              uniqueSubcategories.set(subcategoryKey, categoryName);
            }
          }
        }
      }
      
      // Insert or update parent categories using upsert
      if (uniqueParentCategories.size > 0) {
        try {
          const { data: newCats, error: catError } = await supabase
            .from('categories')
            .upsert(
              Array.from(uniqueParentCategories).map(name => ({
                user_id: user.id,
                name: name,
                color: '#6b7280',
                icon: '📦',
                parent_id: null
              })),
              { 
                onConflict: 'user_id,name',
                ignoreDuplicates: true 
              }
            )
            .select();
          
          if (catError) {
            console.error('Erro ao criar categorias:', catError);
            throw new Error(`Erro ao criar categorias: ${catError.message}`);
          }
          
          // Update categoryMap with new categories
          newCats?.forEach(cat => categoryMap.set(cat.name.toLowerCase().trim(), cat));
        } catch (error) {
          console.error('Erro ao inserir categorias pai:', error);
          throw error;
        }
      }
      
      // Refetch all categories to ensure we have the latest data
      const { data: updatedCategories } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id);
      
      const updatedCategoryMap = new Map(
        updatedCategories?.map(cat => [cat.name.toLowerCase().trim(), cat]) || []
      );
      
      // Now handle subcategories
      if (uniqueSubcategories.size > 0) {
        const subcategoriesToInsert = [];
        
        for (const [key, parentCategoryName] of uniqueSubcategories.entries()) {
          const subcategoryName = key.split('::')[1];
          const parentCategory = updatedCategoryMap.get(parentCategoryName.toLowerCase().trim());
          
          if (parentCategory) {
            // Check if subcategory already exists
            const subcatExists = updatedCategories?.find(c => 
              c.name.toLowerCase().trim() === subcategoryName && 
              c.parent_id === parentCategory.id
            );
            
            if (!subcatExists) {
              subcategoriesToInsert.push({
                user_id: user.id,
                name: key.split('::')[1].split('').map((c, i) => i === 0 ? c.toUpperCase() : c).join('').replace(/[a-z]+/g, match => match.charAt(0).toUpperCase() + match.slice(1).toLowerCase()),
                color: parentCategory.color,
                icon: '📌',
                parent_id: parentCategory.id
              });
            }
          }
        }
        
        if (subcategoriesToInsert.length > 0) {
          try {
            // Get the actual subcategory name from the original map
            const subcatsWithCorrectNames = Array.from(uniqueSubcategories.entries()).map(([key, parentName]) => {
              const subcategoryName = key.split('::')[1];
              const parentCategory = updatedCategoryMap.get(parentName.toLowerCase().trim());
              
              if (!parentCategory) return null;
              
              // Check if already exists
              const exists = updatedCategories?.find(c => 
                c.name.toLowerCase().trim() === subcategoryName && 
                c.parent_id === parentCategory.id
              );
              
              if (exists) return null;
              
              // Find original casing from transactions
              const originalName = transactions.find(t => 
                t.subcategory?.toLowerCase().trim() === subcategoryName
              )?.subcategory?.trim();
              
              return {
                user_id: user.id,
                name: originalName || subcategoryName,
                color: parentCategory.color,
                icon: '📌',
                parent_id: parentCategory.id
              };
            }).filter(Boolean);
            
            if (subcatsWithCorrectNames.length > 0) {
              const { error: subError } = await supabase
                .from('categories')
                .upsert(subcatsWithCorrectNames, { 
                  onConflict: 'user_id,name',
                  ignoreDuplicates: true 
                })
                .select();
              
              if (subError) {
                console.error('Erro ao criar subcategorias:', subError);
                throw new Error(`Erro ao criar subcategorias: ${subError.message}`);
              }
            }
          } catch (error) {
            console.error('Erro ao inserir subcategorias:', error);
            throw error;
          }
        }
      }
      
      // Refetch all categories one more time before inserting transactions
      const { data: finalCategories } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id);
      
      const finalCategoryMap = new Map(
        finalCategories?.map(cat => [cat.name.toLowerCase().trim(), cat]) || []
      );
      
      // Prepare transactions for insertion with error tracking
      const transactionsToInsert = [];
      const errors: string[] = [];
      
      for (const t of transactions) {
        try {
          const category = t.category ? finalCategoryMap.get(t.category.toLowerCase().trim()) : null;
          let subcategory = null;
          
          if (t.subcategory && category) {
            subcategory = finalCategories?.find(c => 
              c.name.toLowerCase().trim() === t.subcategory?.toLowerCase().trim() && 
              c.parent_id === category.id
            ) || null;
          }
          
          transactionsToInsert.push({
            user_id: user.id,
            date: t.date,
            description: t.description,
            amount: Math.abs(t.amount),
            type: t.amount < 0 ? 'expense' : 'income',
            category_id: category?.id || null,
            subcategory_id: subcategory?.id || null,
            ai_confidence: category ? 100 : 85
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
          errors.push(`Linha ${t.lineNumber}: ${errorMsg}`);
        }
      }
      
      if (errors.length > 0 && transactionsToInsert.length === 0) {
        throw new Error(`Erros encontrados:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... e mais ${errors.length - 5} erros` : ''}`);
      }
      
      // Insert transactions
      const { error: transError } = await supabase
        .from('transactions')
        .insert(transactionsToInsert);
      
      if (transError) {
        console.error('Erro ao inserir transações:', transError);
        throw new Error(`Erro ao inserir transações: ${transError.message}`);
      }
      
      setIsUploading(false);
      
      const successMsg = errors.length > 0 
        ? `${transactionsToInsert.length} transações importadas com ${errors.length} avisos.`
        : `${transactionsToInsert.length} transações importadas com sucesso!`;
      
      toast({
        title: "Upload Concluído",
        description: successMsg,
      });
      
      if (errors.length > 0) {
        console.warn('Avisos durante importação:', errors);
      }
      
      // Force refresh to update Dashboard
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
      onClose();
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      setIsUploading(false);
      const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro ao processar o arquivo. Verifique o formato.";
      toast({
        title: "Erro no Upload",
        description: errorMessage,
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
