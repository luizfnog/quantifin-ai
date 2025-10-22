import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
}

interface CategoryChartProps {
  data: CategoryData[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--success))",
];

const CategoryChart = ({ data }: CategoryChartProps) => {
  const chartData = data.map((item) => ({
    name: item.category,
    value: item.amount,
  }));

  return (
    <Card className="p-6 shadow-md border-none bg-gradient-card">
      <h3 className="text-lg font-bold mb-4">Top Categorias</h3>
      
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={90}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-4 space-y-2">
        {data.map((item, index) => (
          <div key={item.category} className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="font-medium">{item.category}</span>
            </div>
            <span className="text-muted-foreground">
              R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default CategoryChart;
