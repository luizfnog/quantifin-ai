import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import BudgetModal from "./BudgetModal";

interface Budget {
  id: string;
  month: string;
  category_id: string;
  subcategory_id: string | null;
  planned_amount: number;
  category: { id: string; name: string; color: string; icon: string | null };
  subcategory?: { id: string; name: string; color: string; icon: string | null };
}

interface Transaction {
  id: string;
  amount: number;
  category_id: string | null;
  subcategory_id: string | null;
}

interface BudgetTableProps {
  budgets: Budget[];
  transactions: Transaction[];
  onUpdate: () => void;
  selectedMonth: Date;
}

const BudgetTable = ({ budgets, transactions, onUpdate, selectedMonth }: BudgetTableProps) => {
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();
  const calculateActual = (categoryId: string, subcategoryId: string | null) => {
    return Math.abs(
      transactions
        .filter(t => 
          t.category_id === categoryId && 
          (subcategoryId ? t.subcategory_id === subcategoryId : true)
        )
        .reduce((sum, t) => sum + Number(t.amount), 0)
    );
  };

  const getStatusBadge = (actual: number, planned: number) => {
    // Normalize to cents to avoid float artifacts
    const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
    const plannedR = round2(planned);
    const actualR = round2(actual);

    if (plannedR === 0) {
      return <Badge className="bg-muted/20 text-muted-foreground hover:bg-muted/30">Sem Orçamento</Badge>;
    }

    const varianceR = round2(actualR - plannedR);
    const percentage = plannedR !== 0 ? (actualR / plannedR) * 100 : 0;

    // Exactly at the limit (R$ 0,00 de diferença)
    if (varianceR === 0) {
      return <Badge className="bg-primary/20 text-primary hover:bg-primary/30">No Limite</Badge>;
    }

    if (percentage < 80) {
      return <Badge className="bg-success/20 text-success hover:bg-success/30">Dentro do Orçado</Badge>;
    } else if (percentage < 100) {
      return <Badge className="bg-warning/20 text-warning hover:bg-warning/30">Próximo do Limite</Badge>;
    } else {
      return <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30">Acima do Orçado</Badge>;
    }
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("budgets").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Orçamento excluído com sucesso!" });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingBudget(null);
    onUpdate();
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Categoria</TableHead>
            <TableHead>Subcategoria</TableHead>
            <TableHead className="text-right">Orçado</TableHead>
            <TableHead className="text-right">Real</TableHead>
            <TableHead className="text-right">Diferença</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {budgets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Nenhum orçamento cadastrado
              </TableCell>
            </TableRow>
          ) : (
            budgets.map(budget => {
              const actual = calculateActual(budget.category_id, budget.subcategory_id);
              const planned = Number(budget.planned_amount);
              const difference = actual - planned;
              
              return (
                <TableRow key={budget.id}>
                  <TableCell className="font-medium">
                    {budget.category.icon && <span className="mr-2">{budget.category.icon}</span>}
                    {budget.category.name}
                  </TableCell>
                  <TableCell>
                    {budget.subcategory ? (
                      <>
                        {budget.subcategory.icon && <span className="mr-2">{budget.subcategory.icon}</span>}
                        {budget.subcategory.name}
                      </>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">R$ {planned.toFixed(2)}</TableCell>
                  <TableCell className="text-right">R$ {actual.toFixed(2)}</TableCell>
                  <TableCell className={`text-right font-semibold ${difference > 0 ? 'text-destructive' : 'text-success'}`}>
                    R$ {Math.abs(difference).toFixed(2)} {difference > 0 ? '↑' : '↓'}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(actual, planned)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex gap-2 justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(budget)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(budget.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <BudgetModal
        open={modalOpen}
        onClose={handleModalClose}
        onSuccess={onUpdate}
        budget={editingBudget}
        defaultMonth={selectedMonth}
      />
    </div>
  );
};

export default BudgetTable;
