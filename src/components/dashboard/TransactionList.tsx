import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, AlertCircle } from "lucide-react";

interface TransactionListProps {
  transactions?: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
    type: string;
    category?: { name: string } | null;
    ai_confidence?: number | null;
  }>;
}
const mockTransactions = [
  {
    id: 1,
    description: "Pagamento Netflix",
    amount: -39.90,
    date: "2025-10-20",
    category: "Lazer",
    confidence: 95,
    status: "pending"
  },
  {
    id: 2,
    description: "Supermercado Extra",
    amount: -234.50,
    date: "2025-10-19",
    category: "Alimentação",
    confidence: 88,
    status: "pending"
  },
  {
    id: 3,
    description: "Salário - Empresa XYZ",
    amount: 5500.00,
    date: "2025-10-15",
    category: "Renda",
    confidence: 98,
    status: "approved"
  },
  {
    id: 4,
    description: "Uber - Viagem Centro",
    amount: -25.30,
    date: "2025-10-18",
    category: "Transporte",
    confidence: 72,
    status: "pending"
  },
  {
    id: 5,
    description: "Farmácia Drogasil",
    amount: -89.40,
    date: "2025-10-17",
    category: "Saúde",
    confidence: 65,
    status: "pending"
  },
];

const TransactionList = ({ transactions }: TransactionListProps) => {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "success";
    if (confidence >= 60) return "warning";
    return "destructive";
  };

  const items = (transactions && transactions.length > 0)
    ? transactions.map((t) => ({
        id: t.id,
        description: t.description,
        amount: t.type === 'income' ? Number(t.amount) : -Number(t.amount),
        date: t.date,
        category: t.category?.name || "Sem Categoria",
        confidence: t.ai_confidence ?? 0,
        status: (t.ai_confidence ?? 0) >= 80 ? "approved" : "pending",
      }))
    : mockTransactions;

  return (
    <Card className="p-6 shadow-md border-none bg-gradient-card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold">Transações Recentes</h3>
        <Badge variant="outline" className="font-semibold">
          {items.filter(t => t.status === "pending").length} pendentes
        </Badge>
      </div>

      <div className="space-y-3">
        {items.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center justify-between p-4 rounded-lg bg-card hover:shadow-md transition-all border border-border/50"
          >
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <div>
                  <p className="font-semibold">{transaction.description}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {transaction.category}
                    </Badge>
                    <Badge 
                      variant={getConfidenceColor(transaction.confidence) as any}
                      className="text-xs"
                    >
                      {transaction.confidence}% confiança
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(transaction.date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span
                className={`text-lg font-bold ${
                  transaction.amount > 0 ? "text-success" : "text-foreground"
                }`}
              >
                {transaction.amount > 0 ? "+" : ""}R$ {Math.abs(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>

              {transaction.status === "pending" && (
                <div className="flex space-x-2">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Check className="w-4 h-4 text-success" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <AlertCircle className="w-4 h-4 text-warning" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default TransactionList;
