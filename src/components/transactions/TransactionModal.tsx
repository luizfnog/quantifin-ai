import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: "income" | "expense";
  category_id: string | null;
}

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
}

const transactionSchema = z.object({
  description: z.string().trim().min(1, "Descrição é obrigatória").max(200),
  amount: z.number().positive("Valor deve ser positivo"),
  date: z.string().min(1, "Data é obrigatória"),
  type: z.enum(["income", "expense"]),
  category_id: z.string().nullable(),
});

const TransactionModal = ({ open, onClose, transaction }: TransactionModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    type: "expense" as "income" | "expense",
    category_id: "",
  });

  useEffect(() => {
    if (open) {
      fetchCategories();
      if (transaction) {
        setFormData({
          description: transaction.description,
          amount: Math.abs(transaction.amount).toString(),
          date: transaction.date,
          type: transaction.type,
          category_id: transaction.category_id || "",
        });
      } else {
        setFormData({
          description: "",
          amount: "",
          date: new Date().toISOString().split("T")[0],
          type: "expense",
          category_id: "",
        });
      }
    }
  }, [open, transaction]);

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("id, name, icon").order("name");
    setCategories(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = transactionSchema.parse({
        description: formData.description,
        amount: parseFloat(formData.amount),
        date: formData.date,
        type: formData.type,
        category_id: formData.category_id || null,
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (transaction) {
        const { error } = await supabase
          .from("transactions")
          .update(validatedData)
          .eq("id", transaction.id);
        if (error) throw error;
        toast({ title: "Transação atualizada com sucesso!" });
      } else {
        const { error } = await supabase.from("transactions").insert([{
          description: validatedData.description,
          amount: validatedData.amount,
          date: validatedData.date,
          type: validatedData.type,
          category_id: validatedData.category_id,
          user_id: user.id,
        }]);
        if (error) throw error;
        toast({ title: "Transação adicionada com sucesso!" });
      }

      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar transação",
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
            {transaction ? "Editar Transação" : "Nova Transação"}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados da transação abaixo
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              maxLength={200}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={formData.type}
              onValueChange={(value: "income" | "expense") =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Despesa</SelectItem>
                <SelectItem value="income">Receita</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) =>
                setFormData({ ...formData, category_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

export default TransactionModal;
