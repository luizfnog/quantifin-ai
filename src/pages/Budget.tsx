import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Download, Calendar, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BudgetUploadModal from "@/components/budget/BudgetUploadModal";
import BudgetModal from "@/components/budget/BudgetModal";
import BudgetVsActualChart from "@/components/budget/BudgetVsActualChart";
import BudgetTable from "@/components/budget/BudgetTable";
import BudgetAnnualTable from "@/components/budget/BudgetAnnualTable";
import { downloadBudgetTemplate } from "@/utils/budgetTemplate";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const Budget = () => {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));
  const { toast } = useToast();

  const { data: budgets, refetch: refetchBudgets } = useQuery({
    queryKey: ["budgets", selectedMonth],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const startDate = format(selectedMonth, "yyyy-MM-01");
      const endDate = format(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1), "yyyy-MM-01");
      
      const { data, error } = await supabase
        .from("budgets")
        .select(`
          *,
          category:categories!category_id(id, name, color, icon),
          subcategory:categories!subcategory_id(id, name, color, icon)
        `)
        .eq("user_id", user.id)
        .gte("month", startDate)
        .lt("month", endDate);

      if (error) throw error;
      return data;
    },
  });

  const { data: transactions } = useQuery({
    queryKey: ["transactions", selectedMonth],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const startDate = format(selectedMonth, "yyyy-MM-01");
      const endDate = format(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0), "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          category:categories!transactions_category_id_fkey(id, name, color, icon),
          subcategory:categories!transactions_subcategory_id_fkey(id, name, color, icon)
        `)
        .eq("user_id", user.id)
        .eq("type", "expense")
        .gte("date", startDate)
        .lte("date", endDate);

      if (error) throw error;
      return data;
    },
  });

  // Fetch all budgets for annual view
  const { data: allBudgets } = useQuery({
    queryKey: ["budgets-all"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("budgets")
        .select(`
          *,
          category:categories!category_id(id, name, color, icon),
          subcategory:categories!subcategory_id(id, name, color, icon)
        `)
        .eq("user_id", user.id)
        .order("month", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Fetch all transactions for annual view
  const { data: allTransactions } = useQuery({
    queryKey: ["transactions-all"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          category:categories!transactions_category_id_fkey(id, name, color, icon),
          subcategory:categories!transactions_subcategory_id_fkey(id, name, color, icon)
        `)
        .eq("user_id", user.id)
        .eq("type", "expense");

      if (error) throw error;
      return data;
    },
  });

  const handleDownloadTemplate = () => {
    downloadBudgetTemplate();
    toast({
      title: "Template baixado",
      description: "O template de orçamento foi baixado com sucesso em formato UTF-8.",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Orçamento & Metas
          </h1>
          <p className="text-muted-foreground mt-1">
            Compare seu planejamento com os gastos reais (BXA - Budget vs Actual)
          </p>
        </div>

        <div className="flex gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start">
                <Calendar className="w-4 h-4 mr-2" />
                {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={selectedMonth}
                onSelect={(date) => date && setSelectedMonth(startOfMonth(date))}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Template
          </Button>

          <Button variant="outline" onClick={() => setUploadModalOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Importar CSV
          </Button>

          <Button onClick={() => setBudgetModalOpen(true)} className="bg-gradient-primary hover:shadow-glow">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Orçamento
          </Button>
        </div>
      </div>

      <BudgetVsActualChart 
        budgets={budgets || []} 
        transactions={transactions || []}
      />

      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Detalhamento do Orçamento</h2>
          <p className="text-sm text-muted-foreground">
            {budgets && budgets.length > 0 ? `${budgets.length} orçamento(s) cadastrado(s)` : 'Nenhum orçamento'}
          </p>
        </div>
        <BudgetTable 
          budgets={budgets || []} 
          transactions={transactions || []}
          onUpdate={refetchBudgets}
          selectedMonth={selectedMonth}
        />
      </Card>

      <BudgetAnnualTable 
        budgets={allBudgets || []} 
        transactions={allTransactions || []} 
      />

      <BudgetUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={refetchBudgets}
      />

      <BudgetModal
        open={budgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
        onSuccess={refetchBudgets}
        defaultMonth={selectedMonth}
      />
    </div>
  );
};

export default Budget;
