import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, Fragment } from "react";
import { format, startOfYear, endOfYear, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Budget {
  id: string;
  month: string;
  planned_amount: number;
  category: {
    id: string;
    name: string;
    color: string;
  };
  subcategory?: {
    id: string;
    name: string;
  };
}

interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: string;
  category_id: string;
  subcategory_id?: string;
  category?: {
    id: string;
    name: string;
    color: string;
  };
  subcategory?: {
    id: string;
    name: string;
  };
}

interface BudgetAnnualTableProps {
  budgets: Budget[];
  transactions: Transaction[];
}

interface MonthlyData {
  planned: number;
  actual: number;
  variance: number;
}

interface SubcategoryRow {
  categoryId: string;
  subcategoryId: string | null;
  subcategoryName: string;
  categoryName: string;
  categoryColor: string;
  monthlyData: Record<string, MonthlyData>;
}

const BudgetAnnualTable = ({ budgets, transactions }: BudgetAnnualTableProps) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  
  // Generate available years from budgets and transactions
  const availableYears = Array.from(
    new Set([
      ...budgets.map(b => new Date(b.month).getFullYear()),
      ...transactions.map(t => new Date(t.date).getFullYear()),
      currentYear - 1,
      currentYear,
      currentYear + 1,
    ])
  ).sort((a, b) => b - a);

  // Generate months for selected year
  const yearStart = startOfYear(new Date(parseInt(selectedYear), 0, 1));
  const yearEnd = endOfYear(new Date(parseInt(selectedYear), 0, 1));
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

  // Process data by subcategory
  const processData = (): SubcategoryRow[] => {
    const subcategoryMap = new Map<string, SubcategoryRow>();

    // Process budgets
    budgets.forEach(budget => {
      const budgetDate = new Date(budget.month + 'T00:00:00');
      if (budgetDate.getFullYear() !== parseInt(selectedYear)) return;

      const key = `${budget.category.id}-${budget.subcategory?.id || 'null'}`;
      const monthKey = format(budgetDate, 'yyyy-MM');

      if (!subcategoryMap.has(key)) {
        subcategoryMap.set(key, {
          categoryId: budget.category.id,
          subcategoryId: budget.subcategory?.id || null,
          subcategoryName: budget.subcategory?.name || budget.category.name,
          categoryName: budget.category.name,
          categoryColor: budget.category.color,
          monthlyData: {},
        });
      }

      const row = subcategoryMap.get(key)!;
      if (!row.monthlyData[monthKey]) {
        row.monthlyData[monthKey] = { planned: 0, actual: 0, variance: 0 };
      }
      row.monthlyData[monthKey].planned = budget.planned_amount;
    });

    // Process transactions - show even if no budget exists
    transactions.forEach(transaction => {
      if (transaction.type !== 'expense') return;
      
      const transDate = new Date(transaction.date + 'T00:00:00');
      if (transDate.getFullYear() !== parseInt(selectedYear)) return;

      const key = `${transaction.category_id}-${transaction.subcategory_id || 'null'}`;
      const monthKey = format(transDate, 'yyyy-MM');

      // Create entry even if no budget exists (Show partial data)
      if (!subcategoryMap.has(key)) {
        // Prefer info from transaction joins; fallback to budgets
        const categoryFromTx = transaction.category;
        const subcategoryFromTx = transaction.subcategory;

        let categoryName = categoryFromTx?.name;
        let categoryColor = categoryFromTx?.color;
        let subcategoryName = subcategoryFromTx?.name || '';

        if (!categoryName) {
          const category = budgets.find(b => b.category.id === transaction.category_id)?.category;
          categoryName = category?.name;
          categoryColor = category?.color;
        }
        if (!subcategoryName && transaction.subcategory_id) {
          const subcategory = budgets.find(b => b.subcategory?.id === transaction.subcategory_id)?.subcategory;
          subcategoryName = subcategory?.name || '';
        }

        if (categoryName && categoryColor) {
          subcategoryMap.set(key, {
            categoryId: transaction.category_id,
            subcategoryId: transaction.subcategory_id || null,
            subcategoryName: subcategoryName || categoryName,
            categoryName,
            categoryColor,
            monthlyData: {},
          });
        } else {
          return; // Skip if we can't resolve category info at all
        }
      }

      const row = subcategoryMap.get(key)!;
      if (!row.monthlyData[monthKey]) {
        row.monthlyData[monthKey] = { planned: 0, actual: 0, variance: 0 };
      }
      row.monthlyData[monthKey].actual += Math.abs(transaction.amount);
    });

    // Calculate variances
    subcategoryMap.forEach(row => {
      Object.keys(row.monthlyData).forEach(monthKey => {
        const data = row.monthlyData[monthKey];
        data.variance = data.actual - data.planned;
      });
    });

    return Array.from(subcategoryMap.values()).sort((a, b) => 
      a.categoryName.localeCompare(b.categoryName) || 
      a.subcategoryName.localeCompare(b.subcategoryName)
    );
  };

  const rows = processData();

  const getVarianceBadge = (variance: number, planned: number, actual: number) => {
    // Show variance even if planned is 0 (14.2 - Show partial data)
    if (planned === 0 && actual === 0) return null;
    if (planned === 0) {
      return (
        <Badge variant="outline" className="font-mono">
          Sem Orçamento
        </Badge>
      );
    }
    
    const percentOver = (variance / planned) * 100;
    
    if (variance > 0) {
      return (
        <Badge variant="destructive" className="font-mono">
          +{variance.toFixed(2)} ({percentOver.toFixed(0)}%)
        </Badge>
      );
    } else if (variance < 0) {
      return (
        <Badge variant="default" className="bg-green-600 font-mono">
          {variance.toFixed(2)} ({percentOver.toFixed(0)}%)
        </Badge>
      );
    }
    return <Badge variant="outline" className="font-mono">0.00 (0%)</Badge>;
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Acompanhamento Anual de Orçamento</CardTitle>
            <CardDescription>
              Visualização consolidada de Orçado vs. Real por subcategoria
            </CardDescription>
          </div>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                  Categoria / Subcategoria
                </TableHead>
                {months.map(month => (
                  <TableHead key={month.toISOString()} colSpan={3} className="text-center border-l">
                    {format(month, 'MMM', { locale: ptBR })}
                  </TableHead>
                ))}
              </TableRow>
              <TableRow className="text-xs">
                <TableHead className="sticky left-0 bg-background z-10"></TableHead>
                {months.map((month) => {
                  const key = format(month, 'yyyy-MM');
                  return (
                    <Fragment key={key}>
                      <TableHead key={`${key}-prev`} className="text-center border-l">Prev.</TableHead>
                      <TableHead key={`${key}-real`} className="text-center">Real</TableHead>
                      <TableHead key={`${key}-var`} className="text-center">Var.</TableHead>
                    </Fragment>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="sticky left-0 bg-background z-10 font-medium">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: row.categoryColor }}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm">{row.subcategoryName}</span>
                        <span className="text-xs text-muted-foreground">{row.categoryName}</span>
                      </div>
                    </div>
                  </TableCell>
                  {months.map(month => {
                    const monthKey = format(month, 'yyyy-MM');
                    const data = row.monthlyData[monthKey] || { planned: 0, actual: 0, variance: 0 };
                    
                    return (
                      <>
                        <TableCell key={`${month}-prev`} className="text-right border-l font-mono text-sm">
                          {data.planned > 0 ? data.planned.toFixed(2) : (data.actual > 0 ? '0.00' : '-')}
                        </TableCell>
                        <TableCell key={`${month}-real`} className="text-right font-mono text-sm">
                          {data.actual > 0 ? data.actual.toFixed(2) : (data.planned > 0 ? '0.00' : '-')}
                        </TableCell>
                        <TableCell key={`${month}-var`} className="text-center">
                          {(data.planned > 0 || data.actual > 0) ? getVarianceBadge(data.variance, data.planned, data.actual) : '-'}
                        </TableCell>
                      </>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default BudgetAnnualTable;
