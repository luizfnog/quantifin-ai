import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, Fragment } from "react";
import { format } from "date-fns";
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
    new Set(
      [
        ...budgets
          .map((b) => parseInt(b.month.substring(0, 4)))
          .filter((y) => !Number.isNaN(y)),
        ...transactions
          .map((t) => parseInt(t.date.substring(0, 4)))
          .filter((y) => !Number.isNaN(y)),
        currentYear - 1,
        currentYear,
        currentYear + 1,
      ]
    )
  ).sort((a, b) => b - a);

  // Generate months for selected year as strings (YYYY-MM)
  const months = Array.from({ length: 12 }, (_, i) => {
    const monthNum = (i + 1).toString().padStart(2, '0');
    return `${selectedYear}-${monthNum}`;
  });

  // Process data by subcategory
  const processData = (): SubcategoryRow[] => {
    const subcategoryMap = new Map<string, SubcategoryRow>();

    // Process budgets
    budgets.forEach(budget => {
      // Extract year-month directly from date string (YYYY-MM-DD format)
      const monthKey = budget.month.substring(0, 7); // "2025-09"
      const budgetYear = parseInt(monthKey.substring(0, 4));
      
      console.log('Budget processing:', {
        original_month: budget.month,
        extracted_monthKey: monthKey,
        budgetYear,
        selectedYear,
        category: budget.category.name,
        subcategory: budget.subcategory?.name,
        planned_amount: budget.planned_amount
      });
      
      if (budgetYear !== parseInt(selectedYear)) return;

      const key = `${budget.category.id}-${budget.subcategory?.id || 'null'}`;

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
      row.monthlyData[monthKey].planned += budget.planned_amount;
    });

    // Process transactions - show even if no budget exists
    transactions.forEach(transaction => {
      const isExpense = transaction.type === 'expense' || (typeof transaction.amount === 'number' && Number(transaction.amount) < 0);
      if (!isExpense) return;
      
      // Extract year-month directly from date string (YYYY-MM-DD format)
      const monthKey = transaction.date.substring(0, 7); // "2025-10"
      const transactionYear = parseInt(monthKey.substring(0, 4));
      
      console.log('Transaction processing:', {
        original_date: transaction.date,
        extracted_monthKey: monthKey,
        transactionYear,
        selectedYear,
        type: transaction.type,
        amount: transaction.amount,
        category_id: transaction.category_id
      });
      
      if (transactionYear !== parseInt(selectedYear)) return;

      const key = `${transaction.category_id}-${transaction.subcategory_id || 'null'}`;

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
                {months.map(monthKey => {
                  const monthIndex = parseInt(monthKey.substring(5, 7), 10) - 1;
                  const labelDate = new Date(Number(selectedYear), monthIndex, 1);
                  return (
                    <TableHead key={monthKey} colSpan={3} className="text-center border-l">
                      {format(labelDate, 'MMM', { locale: ptBR })}
                    </TableHead>
                  );
                })}
              </TableRow>
              <TableRow className="text-xs">
                <TableHead className="sticky left-0 bg-background z-10"></TableHead>
                {months.map((monthKey) => (
                  <Fragment key={monthKey}>
                    <TableHead className="text-center border-l">Prev.</TableHead>
                    <TableHead className="text-center">Real</TableHead>
                    <TableHead className="text-center">Var.</TableHead>
                  </Fragment>
                ))}
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
                  {months.map(monthKey => {
                    const data = row.monthlyData[monthKey] || { planned: 0, actual: 0, variance: 0 };
                    
                    return (
                      <Fragment key={monthKey}>
                        <TableCell className="text-right border-l font-mono text-sm">
                          {data.planned > 0 ? data.planned.toFixed(2) : (data.actual > 0 ? '0.00' : '-')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {data.actual > 0 ? data.actual.toFixed(2) : (data.planned > 0 ? '0.00' : '-')}
                        </TableCell>
                        <TableCell className="text-center">
                          {(data.planned > 0 || data.actual > 0) ? getVarianceBadge(data.variance, data.planned, data.actual) : '-'}
                        </TableCell>
                      </Fragment>
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
