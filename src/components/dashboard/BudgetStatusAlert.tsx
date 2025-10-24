import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth } from "date-fns";

const BudgetStatusAlert = () => {
  const navigate = useNavigate();
  const currentMonth = startOfMonth(new Date());

  const { data: budgetStatus } = useQuery({
    queryKey: ["budgetStatus", currentMonth],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const monthStr = format(currentMonth, "yyyy-MM-01");
      const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      // Fetch budgets
      const { data: budgets } = await supabase
        .from("budgets")
        .select("*, category:categories!budgets_category_id_fkey(id, name)")
        .eq("user_id", user.id)
        .eq("month", monthStr);

      if (!budgets || budgets.length === 0) return null;

      // Fetch transactions
      const { data: transactions } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "expense")
        .gte("date", monthStr)
        .lte("date", endDate);

      if (!transactions) return null;

      // Calculate status for each category
      const categoryMap = new Map<string, { name: string; planned: number; actual: number }>();

      budgets.forEach(budget => {
        const catId = budget.category_id;
        if (!categoryMap.has(catId)) {
          categoryMap.set(catId, {
            name: budget.category.name,
            planned: 0,
            actual: 0,
          });
        }
        categoryMap.get(catId)!.planned += Number(budget.planned_amount);
      });

      transactions.forEach(transaction => {
        const catId = transaction.category_id;
        if (catId && categoryMap.has(catId)) {
          categoryMap.get(catId)!.actual += Number(transaction.amount);
        }
      });

      let redCount = 0;
      let yellowCount = 0;
      let greenCount = 0;

      categoryMap.forEach(cat => {
        const percentage = (cat.actual / cat.planned) * 100;
        if (percentage >= 100) redCount++;
        else if (percentage >= 80) yellowCount++;
        else greenCount++;
      });

      return { redCount, yellowCount, greenCount, total: categoryMap.size };
    },
  });

  if (!budgetStatus || budgetStatus.total === 0) return null;

  const { redCount, yellowCount, greenCount } = budgetStatus;

  return (
    <Card className="p-6 bg-gradient-card border-none shadow-md">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {redCount > 0 ? (
              <AlertTriangle className="w-5 h-5 text-destructive" />
            ) : yellowCount > 0 ? (
              <TrendingUp className="w-5 h-5 text-warning" />
            ) : (
              <CheckCircle className="w-5 h-5 text-success" />
            )}
            <h3 className="text-lg font-semibold">Status do Orçamento</h3>
          </div>

          <div className="space-y-1 text-sm">
            {redCount > 0 && (
              <p className="text-destructive font-medium">
                {redCount} {redCount === 1 ? "categoria acima" : "categorias acima"} do orçado
              </p>
            )}
            {yellowCount > 0 && (
              <p className="text-warning">
                {yellowCount} {yellowCount === 1 ? "categoria próxima" : "categorias próximas"} do limite
              </p>
            )}
            {greenCount > 0 && (
              <p className="text-success">
                {greenCount} {greenCount === 1 ? "categoria dentro" : "categorias dentro"} do orçado
              </p>
            )}
          </div>
        </div>

        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate("/budget")}
          className="hover:bg-primary/10"
        >
          Ver Detalhes
        </Button>
      </div>
    </Card>
  );
};

export default BudgetStatusAlert;
