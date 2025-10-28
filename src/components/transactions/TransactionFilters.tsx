import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { X, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  parent_id: string | null;
}

export interface TransactionFilters {
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
  categoryId: string;
  subcategoryId: string;
  description: string;
}

interface TransactionFiltersProps {
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
}

const TransactionFiltersComponent = ({ filters, onFiltersChange }: TransactionFiltersProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (filters.categoryId) {
      fetchSubcategories(filters.categoryId);
    } else {
      setSubcategories([]);
    }
  }, [filters.categoryId]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .is("parent_id", null)
      .order("name");
    if (data) setCategories(data);
  };

  const fetchSubcategories = async (parentId: string) => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("parent_id", parentId)
      .order("name");
    if (data) setSubcategories(data);
  };

  const handleFilterChange = (key: keyof TransactionFilters, value: string) => {
    const actualValue = value === "all" ? "" : value;
    const newFilters = { ...filters, [key]: actualValue };
    if (key === "categoryId") {
      newFilters.subcategoryId = "";
    }
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    onFiltersChange({
      dateFrom: "",
      dateTo: "",
      amountMin: "",
      amountMax: "",
      categoryId: "",
      subcategoryId: "",
      description: "",
    });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== "");

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <h3 className="font-semibold">Filtros</h3>
          {hasActiveFilters && (
            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
              Ativos
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Ocultar" : "Expandir"}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="dateFrom">Data Inicial</Label>
            <Input
              id="dateFrom"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="dateTo">Data Final</Label>
            <Input
              id="dateTo"
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange("dateTo", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="amountMin">Valor Mínimo</Label>
            <Input
              id="amountMin"
              type="number"
              step="0.01"
              placeholder="R$ 0,00"
              value={filters.amountMin}
              onChange={(e) => handleFilterChange("amountMin", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="amountMax">Valor Máximo</Label>
            <Input
              id="amountMax"
              type="number"
              step="0.01"
              placeholder="R$ 0,00"
              value={filters.amountMax}
              onChange={(e) => handleFilterChange("amountMax", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="category">Categoria</Label>
            <Select
              value={filters.categoryId || "all"}
              onValueChange={(value) => handleFilterChange("categoryId", value)}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="no_category">Sem Categoria</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="subcategory">Subcategoria</Label>
            <Select
              value={filters.subcategoryId || "all"}
              onValueChange={(value) => handleFilterChange("subcategoryId", value)}
              disabled={!filters.categoryId}
            >
              <SelectTrigger id="subcategory">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {subcategories.map((subcat) => (
                  <SelectItem key={subcat.id} value={subcat.id}>
                    {subcat.icon} {subcat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              type="text"
              placeholder="Buscar na descrição..."
              value={filters.description}
              onChange={(e) => handleFilterChange("description", e.target.value)}
            />
          </div>
        </div>
      )}
    </Card>
  );
};

export default TransactionFiltersComponent;
