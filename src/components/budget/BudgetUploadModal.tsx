import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { parse } from "date-fns";

interface BudgetUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BudgetUploadModal = ({ open, onClose, onSuccess }: BudgetUploadModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const parseCSV = (text: string): string[][] => {
    const lines = text.split("\n").filter(line => line.trim());
    return lines.map(line => {
      const values: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      return values;
    });
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "Nenhum arquivo selecionado",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const arrayBuffer = await file.arrayBuffer();
      const decoder = new TextDecoder('utf-8');
      let text = decoder.decode(arrayBuffer);
      
      // Remove BOM if present
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
      }
      
      const rows = parseCSV(text);
      
      // Skip header
      const dataRows = rows.slice(1);

      // Fetch all categories for mapping
      const { data: categories } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id);

      if (!categories) throw new Error("Failed to fetch categories");

      const budgetsToInsert = [];

      for (const row of dataRows) {
        if (row.length < 4) continue;

        const [monthStr, parentCategoryName, subcategoryName, amountStr] = row;

        // Parse month
        let month: Date;
        try {
          month = parse(monthStr, "yyyy-MM-dd", new Date());
        } catch {
          continue;
        }

        // Find parent category
        const parentCategory = categories.find(
          c => c.name.toLowerCase() === parentCategoryName.toLowerCase() && !c.parent_id
        );

        if (!parentCategory) continue;

        // Find subcategory
        const subcategory = categories.find(
          c => c.name.toLowerCase() === subcategoryName.toLowerCase() && c.parent_id === parentCategory.id
        );

        const amount = parseFloat(amountStr.replace(",", "."));
        if (isNaN(amount)) continue;

        budgetsToInsert.push({
          user_id: user.id,
          month: month.toISOString().split("T")[0],
          category_id: parentCategory.id,
          subcategory_id: subcategory?.id || null,
          planned_amount: amount,
        });
      }

      if (budgetsToInsert.length === 0) {
        throw new Error("Nenhum orçamento válido encontrado no arquivo");
      }

      const { error } = await supabase
        .from("budgets")
        .upsert(budgetsToInsert, {
          onConflict: "user_id,month,category_id,subcategory_id",
          ignoreDuplicates: false,
        });

      if (error) throw error;

      toast({
        title: "Orçamento importado com sucesso",
        description: `${budgetsToInsert.length} itens de orçamento foram importados.`,
      });

      onSuccess();
      onClose();
      setFile(null);
    } catch (error: any) {
      toast({
        title: "Erro ao importar orçamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar Orçamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Faça upload do arquivo CSV com seu orçamento mensal. Certifique-se de usar o template fornecido e encoding UTF-8.
            </p>
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </div>

          {file && (
            <p className="text-sm text-muted-foreground">
              Arquivo selecionado: {file.name}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={uploading}>
              Cancelar
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !file}>
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? "Importando..." : "Importar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BudgetUploadModal;
