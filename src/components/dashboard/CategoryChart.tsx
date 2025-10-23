import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
  subcategories?: CategoryData[];
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
  const [selectedCategory, setSelectedCategory] = useState<CategoryData | null>(null);
  
  const currentData = selectedCategory?.subcategories || data;
  const chartData = currentData.map((item) => ({
    name: item.category,
    value: item.amount,
    subcategories: item.subcategories,
  }));

  const handlePieClick = (_: any, index: number) => {
    const clickedItem = currentData[index];
    if (clickedItem.subcategories && clickedItem.subcategories.length > 0 && !selectedCategory) {
      setSelectedCategory(clickedItem);
    }
  };

  const handleBack = () => {
    setSelectedCategory(null);
  };

  return (
    <Card className="p-6 shadow-md border-none bg-gradient-card">
      <div className="flex items-center justify-between mb-4">
        {selectedCategory && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="hover:bg-muted"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>
        )}
        <h3 className="text-lg font-bold flex-1 text-center">
          {selectedCategory ? selectedCategory.category : "Top Categorias"}
        </h3>
        {selectedCategory && <div className="w-20" />}
      </div>
      
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
            onClick={handlePieClick}
            cursor={!selectedCategory ? "pointer" : "default"}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-card border border-border p-3 rounded-lg shadow-lg">
                    <p className="font-semibold">{data.name}</p>
                    <p className="text-sm text-muted-foreground">
                      R$ {data.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    {data.subcategories && data.subcategories.length > 0 && !selectedCategory && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <p className="text-xs font-medium mb-1">Subcategorias:</p>
                        {data.subcategories.map((sub: CategoryData, i: number) => (
                          <p key={i} className="text-xs text-muted-foreground">
                            {sub.category}: {sub.percentage.toFixed(0)}%
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-4 space-y-2">
        {currentData.map((item, index) => (
          <div 
            key={item.category} 
            className="flex items-center justify-between text-sm cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
            onClick={() => {
              if (item.subcategories && item.subcategories.length > 0 && !selectedCategory) {
                setSelectedCategory(item);
              }
            }}
          >
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
