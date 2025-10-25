import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Budget {
  id: string;
  month: string;
  category_id: string;
  subcategory_id: string | null;
  planned_amount: number;
}

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

interface BudgetModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  budget?: Budget | null;
  defaultMonth: Date;
}

const BudgetModal = ({ open, onClose, onSuccess, budget, defaultMonth }: BudgetModalProps) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    month: format(defaultMonth, "yyyy-MM-dd"),
    category_id: "",
    subcategory_id: "",
    planned_amount: "",
  });

  useEffect(() => {
    if (open) {
      fetchCategories();
      if (budget) {
        setFormData({
          month: budget.month,
          category_id: budget.category_id,
          subcategory_id: budget.subcategory_id || "",
          planned_amount: budget.planned_amount.toString(),
        });
      } else {
        setFormData({
          month: format(defaultMonth, "yyyy-MM-dd"),
          category_id: "",
          subcategory_id: "",
          planned_amount: "",
        });
      }
    }
  }, [open, budget, defaultMonth]);

  const fetchCategories = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .is("parent_id", null)
      .order("name");

    if (data) setCategories(data);
  };

  const fetchSubcategories = async (parentId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .eq("parent_id", parentId)
      .order("name");

    if (data) setSubcategories(data);
  };

  useEffect(() => {
    if (formData.category_id) {
      fetchSubcategories(formData.category_id);
    } else {
      setSubcategories([]);
      setFormData(prev => ({ ...prev, subcategory_id: "" }));
    }
  }, [formData.category_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const amount = parseFloat(formData.planned_amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Valor orçado deve ser um número positivo");
      }

      const budgetData = {
        user_id: user.id,
        month: formData.month,
        category_id: formData.category_id,
        subcategory_id: formData.subcategory_id || null,
        planned_amount: amount,
      };

      if (budget) {
        const { error } = await supabase
          .from("budgets")
          .update(budgetData)
          .eq("id", budget.id);
        if (error) throw error;
        toast({ title: "Orçamento atualizado com sucesso!" });
      } else {
        const { error } = await supabase
          .from("budgets")
          .upsert([budgetData], {
            onConflict: "user_id,month,category_id,subcategory_id",
            ignoreDuplicates: false,
          });
        if (error) throw error;
        toast({ title: "Orçamento adicionado com sucesso!" });
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar orçamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {budget ? "Editar Orçamento" : "Novo Orçamento"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="month">Mês</Label>
            <Input
              id="month"
              type="month"
              value={formData.month.substring(0, 7)}
              onChange={(e) => setFormData({ ...formData, month: e.target.value + "-01" })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria Principal</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {subcategories.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategoria (opcional)</Label>
              <Select
                value={formData.subcategory_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, subcategory_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a subcategoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {subcategories.map((subcat) => (
                    <SelectItem key={subcat.id} value={subcat.id}>
                      {subcat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Valor Orçado (R$)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.planned_amount}
              onChange={(e) => setFormData({ ...formData, planned_amount: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BudgetModal;
