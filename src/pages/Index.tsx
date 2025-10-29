import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Upload, TrendingUp, DollarSign, PieChart, Calendar as CalendarIcon, Wallet, TrendingDown, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import KPICard from "@/components/dashboard/KPICard";
import TransactionList from "@/components/dashboard/TransactionList";
import CategoryChart from "@/components/dashboard/CategoryChart";
import UploadModal from "@/components/dashboard/UploadModal";
import BudgetStatusAlert from "@/components/dashboard/BudgetStatusAlert";
const Index = () => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));

  const startDate = format(selectedMonth, "yyyy-MM-01");
  const endDate = format(endOfMonth(selectedMonth), "yyyy-MM-dd");

  // Fetch expenses and incomes for the selected month
  const { data: monthExpenses } = useQuery({
    queryKey: ["dashboard-expenses", startDate, endDate],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select(`*, category:categories!transactions_category_id_fkey(id, name, color, icon), subcategory:categories!transactions_subcategory_id_fkey(id, name, color, icon)`) 
        .eq("user_id", user.id)
        .eq("type", "expense")
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data || [];
    }
  });

  const { data: monthIncomes } = useQuery({
    queryKey: ["dashboard-incomes", startDate, endDate],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "income")
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data || [];
    }
  });

  const { data: recentTransactions } = useQuery({
    queryKey: ["dashboard-recent", startDate, endDate],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select(`*, category:categories!transactions_category_id_fkey(id, name, color, icon), subcategory:categories!transactions_subcategory_id_fkey(id, name, color, icon)`) 
        .eq("user_id", user.id)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch all historical transactions for accumulated balance
  const { data: allTransactions } = useQuery({
    queryKey: ["all-transactions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      let allData: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .range(from, from + batchSize - 1)
          .order("date", { ascending: true });

        if (error) throw error;
        
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }
      
      console.log('Total transactions fetched:', allData.length);
      console.log('Sample transactions:', allData.slice(0, 5).map(t => ({ 
        type: t.type, 
        amount: t.amount, 
        desc: t.description.substring(0, 30) 
      })));
      
      return allData;
    }
  });

  const kpis = useMemo(() => {
    const totalExpense = (monthExpenses || []).reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    const totalIncome = (monthIncomes || []).reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    const balance = totalIncome - totalExpense;
    
    // Calculate accumulated historical balance (all time)
    const accumulatedBalance = (allTransactions || []).reduce((sum: number, t: any) => {
      if (t.type === "income") return sum + Number(t.amount);
      if (t.type === "expense") return sum - Number(t.amount);
      return sum;
    }, 0);
    
    console.log('DEBUG Saldo Acumulado:', {
      totalTransactions: allTransactions?.length,
      incomeCount: allTransactions?.filter((t: any) => t.type === 'income').length,
      expenseCount: allTransactions?.filter((t: any) => t.type === 'expense').length,
      totalIncome: allTransactions?.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0),
      totalExpense: allTransactions?.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0),
      accumulatedBalance
    });

    // Calculate safety margin (average monthly income - average monthly fixed expenses)
    const incomesByMonth = new Map<string, number>();
    const fixedExpensesByMonth = new Map<string, number>();
    const totalExpensesByMonth = new Map<string, number>();
    
    (allTransactions || []).forEach((t: any) => {
      const monthKey = t.date.substring(0, 7); // YYYY-MM
      if (t.type === "income") {
        incomesByMonth.set(monthKey, (incomesByMonth.get(monthKey) || 0) + Number(t.amount));
      } else if (t.type === "expense") {
        totalExpensesByMonth.set(monthKey, (totalExpensesByMonth.get(monthKey) || 0) + Number(t.amount));
        // Only count recurring expenses as fixed
        if (t.is_recurring === true) {
          fixedExpensesByMonth.set(monthKey, (fixedExpensesByMonth.get(monthKey) || 0) + Number(t.amount));
        }
      }
    });

    const avgMonthlyIncome = incomesByMonth.size > 0 
      ? Array.from(incomesByMonth.values()).reduce((a, b) => a + b, 0) / incomesByMonth.size 
      : 0;
    const avgMonthlyFixedExpense = fixedExpensesByMonth.size > 0
      ? Array.from(fixedExpensesByMonth.values()).reduce((a, b) => a + b, 0) / fixedExpensesByMonth.size
      : 0;
    const avgMonthlyExpense = totalExpensesByMonth.size > 0
      ? Array.from(totalExpensesByMonth.values()).reduce((a, b) => a + b, 0) / totalExpensesByMonth.size
      : 0;
    const safetyMargin = avgMonthlyIncome - avgMonthlyFixedExpense;

    // Calculate income diversification index (number of unique income categories)
    const incomeCategories = new Set(
      (allTransactions || [])
        .filter((t: any) => t.type === "income" && t.category_id)
        .map((t: any) => t.category_id)
    );
    const diversificationIndex = incomeCategories.size;

    // Simple heuristic for health score
    const healthScore = Math.max(0, Math.min(100, Math.round(70 + (balance >= 0 ? 10 : -10))));
    
    return { 
      totalExpense, 
      totalIncome, 
      balance, 
      healthScore,
      accumulatedBalance,
      safetyMargin,
      diversificationIndex,
      avgMonthlyIncome,
      avgMonthlyExpense
    };
  }, [monthExpenses, monthIncomes, allTransactions]);

  type CatAgg = { category: string; amount: number; percentage: number; subcategories?: { category: string; amount: number; percentage: number }[] };
  const topExpenses: CatAgg[] = useMemo(() => {
    const expenses = monthExpenses || [];
    const byCat = new Map<string, { amount: number; subs: Map<string, number> }>();
    for (const t of expenses) {
      const catName = t.category?.name || "Sem Categoria";
      const subName = t.subcategory?.name || undefined;
      if (!byCat.has(catName)) byCat.set(catName, { amount: 0, subs: new Map() });
      const entry = byCat.get(catName)!;
      entry.amount += Number(t.amount);
      if (subName) entry.subs.set(subName, (entry.subs.get(subName) || 0) + Number(t.amount));
    }
    const total = Array.from(byCat.values()).reduce((s, v) => s + v.amount, 0) || 1;
    const arr: CatAgg[] = Array.from(byCat.entries()).map(([name, v]) => ({
      category: name,
      amount: v.amount,
      percentage: (v.amount / total) * 100,
      subcategories: Array.from(v.subs.entries()).map(([sname, sval]) => ({
        category: sname,
        amount: sval,
        percentage: (sval / total) * 100,
      }))
    }));
    // Sort by amount desc and take top 5
    return arr.sort((a, b) => b.amount - a.amount).slice(0, 5);
  }, [monthExpenses]);

  return (
    <div className="bg-background">
      <DashboardHeader onUpload={() => setShowUploadModal(true)} />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedMonth}
                onSelect={(date) => date && setSelectedMonth(startOfMonth(date))}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* KPIs Grid - Primary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Saldo Acumulado Total"
            value={`R$ ${kpis.accumulatedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={<Wallet className="w-5 h-5" />}
            variant={kpis.accumulatedBalance >= 0 ? "success" : "warning"}
            trend={kpis.accumulatedBalance >= 0 ? "up" : "down"}
            trendValue={kpis.accumulatedBalance >= 0 ? "Patrimônio Positivo" : "Saldo Negativo"}
            description="Saldo acumulado histórico: soma líquida (Receitas - Despesas) de todas as transações registradas, representando seu patrimônio líquido gerenciado na plataforma."
          />

          <KPICard
            title="Balanço Mensal"
            value={`R$ ${kpis.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={<DollarSign className="w-5 h-5" />}
            variant="primary"
            trend={kpis.balance >= 0 ? "up" : "down"}
            trendValue={kpis.balance >= 0 ? "Superávit" : "Déficit"}
            description="Receitas menos despesas no mês selecionado."
          />

          <KPICard
            title="Receitas"
            value={`R$ ${kpis.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={<PieChart className="w-5 h-5" />}
            variant="accent"
            trend="up"
            trendValue="Acumulado do mês"
            description="Total de receitas no período."
          />

          <KPICard
            title="Despesas"
            value={`R$ ${kpis.totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={<PieChart className="w-5 h-5" />}
            variant="warning"
            trend="down"
            trendValue="Acumulado do mês"
            description="Total de despesas no período."
          />
        </div>

        {/* KPIs Grid - Strategic Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Margem de Segurança"
            value={`R$ ${kpis.safetyMargin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={<Shield className="w-5 h-5" />}
            variant={kpis.safetyMargin >= 0 ? "success" : "warning"}
            trend={kpis.safetyMargin >= 0 ? "up" : "down"}
            trendValue={kpis.safetyMargin >= 0 ? "Margem Positiva" : "Atenção"}
            description="Média mensal de receitas menos despesas fixas. Mostra o valor médio disponível para gastos variáveis, investimentos e reservas de emergência."
          />

          <KPICard
            title="Diversificação de Receita"
            value={`${kpis.diversificationIndex} ${kpis.diversificationIndex === 1 ? 'fonte' : 'fontes'}`}
            icon={<TrendingUp className="w-5 h-5" />}
            variant="primary"
            trend={kpis.diversificationIndex > 1 ? "up" : "down"}
            trendValue={kpis.diversificationIndex > 1 ? "Diversificado" : "Concentrado"}
            description="Número de fontes distintas de receita (categorias). Quanto maior, mais robusto e resiliente é seu perfil financeiro em caso de perda de uma fonte."
          />

          <KPICard
            title="Saúde Financeira"
            value={`${kpis.healthScore}/100`}
            icon={<TrendingUp className="w-5 h-5" />}
            variant="success"
            trend={kpis.healthScore >= 70 ? "up" : "down"}
            trendValue={kpis.healthScore >= 70 ? "+Saudável" : "Atenção"}
            description="Indicador geral com base no balanço do mês selecionado."
          />

          <KPICard
            title="Média Mensal de Receitas"
            value={`R$ ${kpis.avgMonthlyIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={<TrendingUp className="w-5 h-5" />}
            variant="accent"
            trend="up"
            trendValue="Histórico completo"
            description="Média de todas as receitas mensais registradas. Útil para planejamento financeiro de longo prazo."
          />
        </div>

        {/* Budget Status Alert */}
        <BudgetStatusAlert />

        {/* Charts and Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <CategoryChart data={topExpenses} />
          </div>
          <div className="lg:col-span-2">
            <TransactionList transactions={recentTransactions || []} />
          </div>
        </div>

        {/* Upload CTA */}
        <Card className="p-8 text-center bg-gradient-card border-primary/20 shadow-lg">
          <Upload className="w-12 h-12 mx-auto mb-4 text-primary" />
          <h3 className="text-2xl font-bold mb-2">Começar Análise</h3>
          <p className="text-muted-foreground mb-6">
            Faça upload do seu extrato bancário e deixe a IA categorizar automaticamente suas transações
          </p>
          <Button 
            onClick={() => setShowUploadModal(true)}
            size="lg"
            className="bg-gradient-primary hover:shadow-glow transition-all"
          >
            <Upload className="w-5 h-5 mr-2" />
            Fazer Upload de Extrato
          </Button>
        </Card>
      </main>

      <UploadModal open={showUploadModal} onClose={() => setShowUploadModal(false)} />
    </div>
  );
};

export default Index;
