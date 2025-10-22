import { useState } from "react";
import { Upload, TrendingUp, TrendingDown, DollarSign, PieChart, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import KPICard from "@/components/dashboard/KPICard";
import TransactionList from "@/components/dashboard/TransactionList";
import CategoryChart from "@/components/dashboard/CategoryChart";
import UploadModal from "@/components/dashboard/UploadModal";

const Index = () => {
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Mock data - será substituído por dados reais do backend
  const kpiData = {
    healthScore: 78,
    balance: 4250.80,
    balanceChange: 12.5,
    projection30Days: 3890.50,
    fixedCostRate: 45,
    topExpenses: [
      { category: "Moradia", amount: 1200, percentage: 35 },
      { category: "Alimentação", amount: 800, percentage: 23 },
      { category: "Transporte", amount: 450, percentage: 13 },
    ]
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onUpload={() => setShowUploadModal(true)} />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Saúde Financeira"
            value={`${kpiData.healthScore}/100`}
            icon={<TrendingUp className="w-5 h-5" />}
            variant="success"
            trend={kpiData.healthScore > 70 ? "up" : "down"}
            trendValue={`${kpiData.healthScore > 70 ? '+' : ''}${kpiData.healthScore - 70} pontos`}
          />
          
          <KPICard
            title="Balanço Mensal"
            value={`R$ ${kpiData.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={<DollarSign className="w-5 h-5" />}
            variant="primary"
            trend={kpiData.balanceChange > 0 ? "up" : "down"}
            trendValue={`${kpiData.balanceChange > 0 ? '+' : ''}${kpiData.balanceChange}%`}
          />
          
          <KPICard
            title="Projeção 30 Dias"
            value={`R$ ${kpiData.projection30Days.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={<Calendar className="w-5 h-5" />}
            variant="accent"
            trend={kpiData.projection30Days > kpiData.balance ? "up" : "down"}
            trendValue={`${((kpiData.projection30Days - kpiData.balance) / kpiData.balance * 100).toFixed(1)}%`}
          />
          
          <KPICard
            title="Taxa Esforço Fixo"
            value={`${kpiData.fixedCostRate}%`}
            icon={<PieChart className="w-5 h-5" />}
            variant={kpiData.fixedCostRate < 50 ? "success" : "warning"}
            trend={kpiData.fixedCostRate < 50 ? "up" : "down"}
            trendValue={kpiData.fixedCostRate < 50 ? "Saudável" : "Atenção"}
          />
        </div>

        {/* Charts and Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <CategoryChart data={kpiData.topExpenses} />
          </div>
          
          <div className="lg:col-span-2">
            <TransactionList />
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
