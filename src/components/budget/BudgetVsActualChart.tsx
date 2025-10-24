import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

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
  category?: { id: string; name: string; color: string; icon: string | null };
  subcategory?: { id: string; name: string; color: string; icon: string | null };
}

interface BudgetVsActualChartProps {
  budgets: Budget[];
  transactions: Transaction[];
}

const BudgetVsActualChart = ({ budgets, transactions }: BudgetVsActualChartProps) => {
  // Group by parent category
  const categoryMap = new Map<string, {
    name: string;
    planned: number;
    actual: number;
    color: string;
    subcategories: Map<string, { name: string; planned: number; actual: number }>;
  }>();

  // Process budgets
  budgets.forEach(budget => {
    const categoryId = budget.category_id;
    const categoryName = budget.category.name;
    
    if (!categoryMap.has(categoryId)) {
      categoryMap.set(categoryId, {
        name: categoryName,
        planned: 0,
        actual: 0,
        color: budget.category.color,
        subcategories: new Map(),
      });
    }

    const category = categoryMap.get(categoryId)!;
    category.planned += Number(budget.planned_amount);

    if (budget.subcategory) {
      const subId = budget.subcategory.id;
      const subName = budget.subcategory.name;
      if (!category.subcategories.has(subId)) {
        category.subcategories.set(subId, { name: subName, planned: 0, actual: 0 });
      }
      category.subcategories.get(subId)!.planned += Number(budget.planned_amount);
    }
  });

  // Process transactions
  transactions.forEach(transaction => {
    const categoryId = transaction.category_id;
    if (!categoryId) return;

    if (categoryMap.has(categoryId)) {
      const category = categoryMap.get(categoryId)!;
      category.actual += Number(transaction.amount);

      if (transaction.subcategory_id && category.subcategories.has(transaction.subcategory_id)) {
        category.subcategories.get(transaction.subcategory_id)!.actual += Number(transaction.amount);
      }
    }
  });

  const chartData = Array.from(categoryMap.values()).map(cat => ({
    name: cat.name,
    planned: cat.planned,
    actual: cat.actual,
    color: cat.color,
    subcategories: Array.from(cat.subcategories.values()),
  }));

  const getBarColor = (actual: number, planned: number) => {
    if (actual < planned * 0.8) return "hsl(var(--success))"; // Green
    if (actual < planned) return "hsl(var(--warning))"; // Yellow
    return "hsl(var(--destructive))"; // Red
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const percentage = data.planned > 0 ? ((data.actual / data.planned) * 100).toFixed(1) : 0;

    return (
      <div className="bg-card border rounded-lg shadow-lg p-4 space-y-2">
        <p className="font-semibold text-sm">{data.name}</p>
        <div className="space-y-1 text-xs">
          <p className="text-primary">Orçado: R$ {data.planned.toFixed(2)}</p>
          <p className="text-muted-foreground">Real: R$ {data.actual.toFixed(2)}</p>
          <p className="font-semibold">Utilização: {percentage}%</p>
        </div>
        
        {data.subcategories && data.subcategories.length > 0 && (
          <div className="mt-3 pt-2 border-t">
            <p className="text-xs font-semibold mb-1">Subcategorias:</p>
            {data.subcategories.map((sub: any, idx: number) => {
              const subPercentage = sub.planned > 0 ? ((sub.actual / sub.planned) * 100).toFixed(0) : 0;
              return (
                <p key={idx} className="text-xs text-muted-foreground">
                  {sub.name}: {subPercentage}%
                </p>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Evolução: Orçado vs. Real</h2>
      
      {chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <p>Nenhum orçamento cadastrado para este período</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="planned" name="Orçado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="actual" name="Real" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.actual, entry.planned)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default BudgetVsActualChart;
