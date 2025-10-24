import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Budget {
  id: string;
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
}

const BudgetTable = ({ budgets, transactions }: BudgetTableProps) => {
  const calculateActual = (categoryId: string, subcategoryId: string | null) => {
    return transactions
      .filter(t => 
        t.category_id === categoryId && 
        (subcategoryId ? t.subcategory_id === subcategoryId : true)
      )
      .reduce((sum, t) => sum + Number(t.amount), 0);
  };

  const getStatusBadge = (actual: number, planned: number) => {
    const percentage = (actual / planned) * 100;
    
    if (percentage < 80) {
      return <Badge className="bg-success/20 text-success hover:bg-success/30">Dentro do Orçado</Badge>;
    } else if (percentage < 100) {
      return <Badge className="bg-warning/20 text-warning hover:bg-warning/30">Próximo do Limite</Badge>;
    } else {
      return <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30">Acima do Orçado</Badge>;
    }
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {budgets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
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
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default BudgetTable;
