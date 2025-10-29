import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState, Fragment } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, ChevronRight } from "lucide-react";

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

interface CategoryAggregatedRow {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  monthlyData: Record<string, MonthlyData>;
  subcategories: SubcategoryRow[];
}

const BudgetAnnualTable = ({ budgets, transactions }: BudgetAnnualTableProps) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
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

  // Process data by subcategory and aggregate by category
  const processData = (): CategoryAggregatedRow[] => {
    const subcategoryMap = new Map<string, SubcategoryRow>();

    // Process budgets
    budgets.forEach(budget => {
      // Normalize month: if date is the last day of the month, count for the next month
      const rawMonthKey = budget.month.substring(0, 7); // "YYYY-MM"
      const day = parseInt(budget.month.substring(8, 10), 10); // DD
      const y = parseInt(rawMonthKey.substring(0, 4), 10);
      const m = parseInt(rawMonthKey.substring(5, 7), 10);
      const lastDay = new Date(y, m, 0).getDate();
      let monthKey = rawMonthKey;
      if (day === lastDay) {
        const nextY = m === 12 ? y + 1 : y;
        const nextM = m === 12 ? 1 : m + 1;
        monthKey = `${nextY}-${String(nextM).padStart(2, '0')}`;
      }
      const budgetYear = parseInt(monthKey.substring(0, 4), 10);
      
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
      // Process all transactions (both income and expense)
      
      // Use the transaction's calendar month directly (no shifting)
      const rawMonthKey = transaction.date.substring(0, 7); // "YYYY-MM"
      const monthKey = rawMonthKey;
      const transactionYear = parseInt(monthKey.substring(0, 4));
      
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
      // Use absolute value for all transactions to ensure they display correctly
      const absoluteAmount = Math.abs(Number(transaction.amount));
      row.monthlyData[monthKey].actual += absoluteAmount;
    });

    // Calculate variances
    subcategoryMap.forEach(row => {
      Object.keys(row.monthlyData).forEach(monthKey => {
        const data = row.monthlyData[monthKey];
        data.variance = data.actual - data.planned;
      });
    });

    const subcategoryRows = Array.from(subcategoryMap.values()).sort((a, b) => 
      a.categoryName.localeCompare(b.categoryName) || 
      a.subcategoryName.localeCompare(b.subcategoryName)
    );

    // Aggregate by category
    const categoryMap = new Map<string, CategoryAggregatedRow>();

    subcategoryRows.forEach(subRow => {
      if (!categoryMap.has(subRow.categoryId)) {
        categoryMap.set(subRow.categoryId, {
          categoryId: subRow.categoryId,
          categoryName: subRow.categoryName,
          categoryColor: subRow.categoryColor,
          monthlyData: {},
          subcategories: [],
        });
      }

      const categoryRow = categoryMap.get(subRow.categoryId)!;
      categoryRow.subcategories.push(subRow);

      // Aggregate monthly data
      Object.entries(subRow.monthlyData).forEach(([monthKey, data]) => {
        if (!categoryRow.monthlyData[monthKey]) {
          categoryRow.monthlyData[monthKey] = { planned: 0, actual: 0, variance: 0 };
        }
        categoryRow.monthlyData[monthKey].planned += data.planned;
        categoryRow.monthlyData[monthKey].actual += data.actual;
        categoryRow.monthlyData[monthKey].variance += data.variance;
      });
    });

    return Array.from(categoryMap.values()).sort((a, b) => 
      a.categoryName.localeCompare(b.categoryName)
    );
  };

  const categoryRows = processData();

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

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
                <TableHead className="sticky left-0 bg-background z-10 min-w-[200px] shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
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
                <TableHead className="sticky left-0 bg-background z-10 shadow-[2px_0_4px_rgba(0,0,0,0.1)]"></TableHead>
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
              {categoryRows.map((categoryRow) => {
                const isExpanded = expandedCategories.has(categoryRow.categoryId);
                const hasSubcategories = categoryRow.subcategories.length > 0;

                return (
                  <Fragment key={categoryRow.categoryId}>
                    {/* Parent Category Row */}
                    <TableRow className="bg-muted/50 font-semibold hover:bg-muted/70">
                      <TableCell className="sticky left-0 bg-muted z-10 shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center gap-2">
                          {hasSubcategories && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleCategory(categoryRow.categoryId)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: categoryRow.categoryColor }}
                          />
                          <span className="text-sm">{categoryRow.categoryName}</span>
                        </div>
                      </TableCell>
                      {months.map(monthKey => {
                        const data = categoryRow.monthlyData[monthKey] || { planned: 0, actual: 0, variance: 0 };
                        
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

                    {/* Subcategory Rows (Drill-down) */}
                    {isExpanded && hasSubcategories && categoryRow.subcategories.map((subRow, subIdx) => (
                      <TableRow key={`${categoryRow.categoryId}-${subIdx}`} className="bg-background/50">
                        <TableCell className="sticky left-0 bg-background z-10 pl-12">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">↳</span>
                            <span className="text-sm">{subRow.subcategoryName}</span>
                          </div>
                        </TableCell>
                        {months.map(monthKey => {
                          const data = subRow.monthlyData[monthKey] || { planned: 0, actual: 0, variance: 0 };
                          
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
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default BudgetAnnualTable;
