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
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string | null;
}

interface CategoryModalProps {
  open: boolean;
  onClose: () => void;
  category?: Category | null;
}

const categorySchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(50),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Cor inválida"),
  icon: z.string().max(10).nullable(),
});

const CategoryModal = ({ open, onClose, category }: CategoryModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    color: "#10b981",
    icon: "",
  });

  useEffect(() => {
    if (open) {
      if (category) {
        setFormData({
          name: category.name,
          color: category.color,
          icon: category.icon || "",
        });
      } else {
        setFormData({
          name: "",
          color: "#10b981",
          icon: "",
        });
      }
    }
  }, [open, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = categorySchema.parse({
        name: formData.name,
        color: formData.color,
        icon: formData.icon || null,
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (category) {
        const { error } = await supabase
          .from("categories")
          .update(validatedData)
          .eq("id", category.id);
        if (error) throw error;
        toast({ title: "Categoria atualizada com sucesso!" });
      } else {
        const { error } = await supabase.from("categories").insert([{
          name: validatedData.name,
          color: validatedData.color,
          icon: validatedData.icon,
          user_id: user.id,
        }]);
        if (error) throw error;
        toast({ title: "Categoria adicionada com sucesso!" });
      }

      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar categoria",
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
            {category ? "Editar Categoria" : "Nova Categoria"}
          </DialogTitle>
          <DialogDescription>
            Configure os detalhes da categoria
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              maxLength={50}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="icon">Emoji (opcional)</Label>
            <Input
              id="icon"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              maxLength={10}
              placeholder="🏠"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Cor</Label>
            <div className="flex gap-2">
              <Input
                id="color"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                pattern="^#[0-9A-F]{6}$"
                maxLength={7}
              />
            </div>
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

export default CategoryModal;
