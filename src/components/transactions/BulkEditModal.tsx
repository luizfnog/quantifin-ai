import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  parent_id: string | null;
}

interface BulkEditModalProps {
  open: boolean;
  onClose: () => void;
  selectedIds: string[];
}

const BulkEditModal = ({ open, onClose, selectedIds }: BulkEditModalProps) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  useEffect(() => {
    if (selectedCategory) {
      fetchSubcategories(selectedCategory);
    } else {
      setSubcategories([]);
      setSelectedSubcategory("");
    }
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .is("parent_id", null)
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar categorias",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchSubcategories = async (parentId: string) => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("parent_id", parentId)
        .order("name");

      if (error) throw error;
      setSubcategories(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar subcategorias",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    if (!selectedCategory) {
      toast({
        title: "Atenção",
        description: "Selecione uma categoria para continuar.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const batchSize = 100;
      const updates = {
        category_id: selectedCategory,
        subcategory_id: selectedSubcategory || null,
      };

      // Process updates in batches
      for (let i = 0; i < selectedIds.length; i += batchSize) {
        const batch = selectedIds.slice(i, i + batchSize);
        const { error } = await supabase
          .from("transactions")
          .update(updates)
          .in("id", batch);

        if (error) throw error;
      }

      toast({
        title: "Transações atualizadas",
        description: `${selectedIds.length} transação(ões) atualizada(s) com sucesso.`,
      });

      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedCategory("");
    setSelectedSubcategory("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edição em Massa</DialogTitle>
          <DialogDescription>
            Categorize {selectedIds.length} transação(ões) selecionada(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="category">Categoria *</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subcategory">Subcategoria</Label>
            <Select
              value={selectedSubcategory}
              onValueChange={setSelectedSubcategory}
              disabled={!selectedCategory || subcategories.length === 0}
            >
              <SelectTrigger id="subcategory">
                <SelectValue placeholder={
                  !selectedCategory
                    ? "Selecione uma categoria primeiro"
                    : subcategories.length === 0
                    ? "Sem subcategorias disponíveis"
                    : "Selecione uma subcategoria"
                } />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhuma</SelectItem>
                {subcategories.map((subcategory) => (
                  <SelectItem key={subcategory.id} value={subcategory.id}>
                    {subcategory.icon} {subcategory.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : "Atualizar Transações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkEditModal;
