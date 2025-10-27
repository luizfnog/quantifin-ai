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
  color: string;
  icon: string | null;
  parent_id: string | null;
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
  parent_id: z.string().nullable(),
});

const CategoryModal = ({ open, onClose, category }: CategoryModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [parentCategories, setParentCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    color: "#10b981",
    icon: "",
    parent_id: null as string | null,
  });

  useEffect(() => {
    if (open) {
      fetchParentCategories();
      if (category) {
        setFormData({
          name: category.name,
          color: category.color,
          icon: category.icon || "",
          parent_id: category.parent_id,
        });
      } else {
        setFormData({
          name: "",
          color: "#10b981",
          icon: "",
          parent_id: null,
        });
      }
    }
  }, [open, category]);

  const fetchParentCategories = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .is('parent_id', null);

    if (data) {
      setParentCategories(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = categorySchema.parse({
        name: formData.name,
        color: formData.color,
        icon: formData.icon || null,
        parent_id: formData.parent_id,
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
          parent_id: validatedData.parent_id,
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
            <Label htmlFor="parent">Tipo</Label>
            <Select 
              value={formData.parent_id || "parent"} 
              onValueChange={(value) => setFormData({ ...formData, parent_id: value === "parent" ? null : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="parent">Categoria Principal</SelectItem>
                {parentCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    Subcategoria de {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
            <Label htmlFor="icon">Ícone (opcional)</Label>
            <Select
              value={formData.icon || "none"}
              onValueChange={(value) => setFormData({ ...formData, icon: value === "none" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um ícone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem ícone</SelectItem>
                <SelectItem value="🏠">🏠 Casa</SelectItem>
                <SelectItem value="🍔">🍔 Comida</SelectItem>
                <SelectItem value="🚗">🚗 Transporte</SelectItem>
                <SelectItem value="💊">💊 Saúde</SelectItem>
                <SelectItem value="🎮">🎮 Lazer</SelectItem>
                <SelectItem value="📚">📚 Educação</SelectItem>
                <SelectItem value="💰">💰 Renda</SelectItem>
                <SelectItem value="📦">📦 Outros</SelectItem>
                <SelectItem value="🔑">🔑 Chave</SelectItem>
                <SelectItem value="💡">💡 Luz</SelectItem>
                <SelectItem value="💧">💧 Água</SelectItem>
                <SelectItem value="📡">📡 Internet</SelectItem>
                <SelectItem value="🏢">🏢 Condomínio</SelectItem>
                <SelectItem value="🛒">🛒 Supermercado</SelectItem>
                <SelectItem value="🍽️">🍽️ Restaurante</SelectItem>
                <SelectItem value="⛽">⛽ Combustível</SelectItem>
                <SelectItem value="🚌">🚌 Ônibus</SelectItem>
                <SelectItem value="🔧">🔧 Manutenção</SelectItem>
                <SelectItem value="👨‍⚕️">👨‍⚕️ Médico</SelectItem>
                <SelectItem value="🏥">🏥 Hospital</SelectItem>
                <SelectItem value="💳">💳 Cartão</SelectItem>
                <SelectItem value="🎯">🎯 Meta</SelectItem>
                <SelectItem value="📱">📱 Telefone</SelectItem>
                <SelectItem value="👕">👕 Vestuário</SelectItem>
                <SelectItem value="✈️">✈️ Viagem</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Cor</Label>
            <div className="flex gap-2">
              <Input
                id="color"
                type="color"
                value={formData.color}
                onChange={(e) => {
                  const hexValue = e.target.value.toUpperCase();
                  setFormData({ ...formData, color: hexValue });
                }}
                className="w-20 h-10"
              />
              <Input
                value={formData.color}
                onChange={(e) => {
                  let value = e.target.value.toUpperCase();
                  if (!value.startsWith('#')) {
                    value = '#' + value;
                  }
                  setFormData({ ...formData, color: value });
                }}
                pattern="^#[0-9A-F]{6}$"
                maxLength={7}
                placeholder="#10B981"
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
