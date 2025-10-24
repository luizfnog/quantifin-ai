import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import CategoryModal from "@/components/categories/CategoryModal";

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  parent_id: string | null;
}

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { toast } = useToast();

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar categorias",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;

      toast({
        title: "Categoria excluída",
        description: "A categoria foi removida com sucesso.",
      });
      fetchCategories();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingCategory(null);
    fetchCategories();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const parentCategories = categories.filter(c => !c.parent_id);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Categorias
          </h1>
          <p className="text-muted-foreground">
            Organize suas transações por categorias principais e subcategorias
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="bg-gradient-primary hover:shadow-glow">
          <Plus className="w-4 h-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      <div className="space-y-6">
        {categories.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              Nenhuma categoria encontrada. Adicione sua primeira categoria!
            </p>
          </Card>
        ) : (
          parentCategories.map((parent) => {
            const children = categories.filter(c => c.parent_id === parent.id);
            
            return (
              <Card key={parent.id} className="p-6">
                {/* Parent Category Header */}
                <div className="flex items-start justify-between mb-4 pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-14 h-14 rounded-lg flex items-center justify-center text-3xl"
                      style={{ backgroundColor: parent.color + "30" }}
                    >
                      {parent.icon || "📦"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-xl">{parent.name}</h3>
                        <Badge variant="outline">Categoria Principal</Badge>
                      </div>
                      <Badge
                        style={{ backgroundColor: parent.color }}
                        className="text-white mt-1"
                      >
                        {parent.color}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(parent)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(parent.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Subcategories */}
                {children.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                      Subcategorias ({children.length}):
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {children.map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded flex items-center justify-center text-lg"
                              style={{ backgroundColor: child.color + "20" }}
                            >
                              {child.icon || "📄"}
                            </div>
                            <span className="font-medium text-sm">{child.name}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(child)}
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(child.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Nenhuma subcategoria criada. Clique em "Nova Categoria" e selecione esta como categoria pai.
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      <CategoryModal
        open={modalOpen}
        onClose={handleModalClose}
        category={editingCategory}
      />
    </div>
  );
};

export default Categories;
