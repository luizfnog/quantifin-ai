import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Download, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BudgetUploadModal from "@/components/budget/BudgetUploadModal";
import BudgetVsActualChart from "@/components/budget/BudgetVsActualChart";
import BudgetTable from "@/components/budget/BudgetTable";
import { downloadBudgetTemplate } from "@/utils/budgetTemplate";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const Budget = () => {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));
  const { toast } = useToast();

  const { data: budgets, refetch: refetchBudgets } = useQuery({
    queryKey: ["budgets", selectedMonth],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const monthStr = format(selectedMonth, "yyyy-MM-01");
      
      const { data, error } = await supabase
        .from("budgets")
        .select(`
          *,
          category:categories!budgets_category_id_fkey(id, name, color, icon),
          subcategory:categories!budgets_subcategory_id_fkey(id, name, color, icon)
        `)
        .eq("user_id", user.id)
        .eq("month", monthStr);

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

          <Button onClick={() => setUploadModalOpen(true)} className="bg-gradient-primary hover:shadow-glow">
            <Upload className="w-4 h-4 mr-2" />
            Importar Orçamento
          </Button>
        </div>
      </div>

      <BudgetVsActualChart 
        budgets={budgets || []} 
        transactions={transactions || []}
      />

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Detalhamento do Orçamento</h2>
        <BudgetTable 
          budgets={budgets || []} 
          transactions={transactions || []}
          onUpdate={refetchBudgets}
        />
      </Card>

      <BudgetUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={refetchBudgets}
      />
    </div>
  );
};

export default Budget;
