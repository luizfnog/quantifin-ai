import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Upload, Edit, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import TransactionModal from "@/components/transactions/TransactionModal";
import BulkEditModal from "@/components/transactions/BulkEditModal";
import UploadModal from "@/components/dashboard/UploadModal";
import TransactionFiltersComponent, { TransactionFilters } from "@/components/transactions/TransactionFilters";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: "income" | "expense";
  ai_confidence: number | null;
  category_id: string | null;
  subcategory_id: string | null;
  categories?: {
    name: string;
    color: string;
    icon: string | null;
  } | null;
  subcategories?: {
    name: string;
    color: string;
    icon: string | null;
  } | null;
}

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const { toast } = useToast();
  const [filters, setFilters] = useState<TransactionFilters>({
    dateFrom: "",
    dateTo: "",
    amountMin: "",
    amountMax: "",
    categoryId: "",
    subcategoryId: "",
    description: "",
  });

  const fetchTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      let allData: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      // Fetch in batches to avoid Supabase default limit
      while (hasMore) {
        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .range(from, from + batchSize - 1)
          .order("date", { ascending: false });

        if (error) throw error;
        
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      // Buscar categorias separadamente
      const categoryIds = [...new Set(allData?.map(t => t.category_id).filter(Boolean))];
      const subcategoryIds = [...new Set(allData?.map(t => t.subcategory_id).filter(Boolean))];
      
      let categoryMap = new Map();
      
      // Only fetch categories if there are IDs to fetch
      if (categoryIds.length > 0 || subcategoryIds.length > 0) {
        const { data: categoriesData } = await supabase
          .from("categories")
          .select("*")
          .in('id', [...categoryIds, ...subcategoryIds]);

        categoryMap = new Map(categoriesData?.map(c => [c.id, c]) || []);
      }

      const enrichedData = allData?.map(t => ({
        ...t,
        categories: t.category_id ? categoryMap.get(t.category_id) : null,
        subcategories: t.subcategory_id ? categoryMap.get(t.subcategory_id) : null,
      }));

      setTransactions((enrichedData || []) as Transaction[]);
      setFilteredTransactions((enrichedData || []) as Transaction[]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar transações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, transactions]);

  const applyFilters = () => {
    let filtered = [...transactions];

    if (filters.dateFrom) {
      filtered = filtered.filter(t => t.date >= filters.dateFrom);
    }
    if (filters.dateTo) {
      filtered = filtered.filter(t => t.date <= filters.dateTo);
    }
    if (filters.amountMin) {
      filtered = filtered.filter(t => Math.abs(t.amount) >= parseFloat(filters.amountMin));
    }
    if (filters.amountMax) {
      filtered = filtered.filter(t => Math.abs(t.amount) <= parseFloat(filters.amountMax));
    }
    if (filters.categoryId) {
      if (filters.categoryId === "no_category") {
        filtered = filtered.filter(t => !t.category_id);
      } else {
        filtered = filtered.filter(t => t.category_id === filters.categoryId);
      }
    }
    if (filters.subcategoryId) {
      filtered = filtered.filter(t => t.subcategory_id === filters.subcategoryId);
    }
    if (filters.description) {
      const searchTerm = filters.description.toLowerCase();
      filtered = filtered.filter(t => t.description.toLowerCase().includes(searchTerm));
    }

    setFilteredTransactions(filtered);
    setCurrentPage(1);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;

      toast({
        title: "Transação excluída",
        description: "A transação foi removida com sucesso.",
      });
      setSelectedIds(new Set());
      fetchTransactions();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    try {
      const idsArray = Array.from(selectedIds);
      const batchSize = 100;
      
      // Process deletions in batches to avoid URL length limits
      for (let i = 0; i < idsArray.length; i += batchSize) {
        const batch = idsArray.slice(i, i + batchSize);
        const { error } = await supabase
          .from("transactions")
          .delete()
          .in("id", batch);
        
        if (error) throw error;
      }

      toast({
        title: "Transações excluídas",
        description: `${selectedIds.size} transação(ões) removida(s) com sucesso.`,
      });
      setSelectedIds(new Set());
      fetchTransactions();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    const isChecked = checked === true;
    if (isChecked) {
      const validIds = filteredTransactions.map(t => t.id).filter(Boolean) as string[];
      const uniqueIds = Array.from(new Set(validIds));
      setSelectedIds(new Set(uniqueIds));
      toast({
        title: "Todas as transações selecionadas",
        description: `${uniqueIds.length} transação(ões) selecionada(s) para deleção.`,
      });
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (!id) return;
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingTransaction(null);
    fetchTransactions();
  };

  const handleUploadModalClose = () => {
    setUploadModalOpen(false);
    fetchTransactions();
  };

  const handleBulkEditModalClose = () => {
    setBulkEditModalOpen(false);
    setSelectedIds(new Set());
    fetchTransactions();
  };

  const handleExportCSV = () => {
    const headers = ["Data", "Descrição", "Categoria", "Subcategoria", "Tipo", "Valor"];
    const csvContent = [
      headers.join(";"),
      ...filteredTransactions.map(t => [
        new Date(t.date).toLocaleDateString("pt-BR"),
        `"${t.description}"`,
        t.categories?.name || "",
        t.subcategories?.name || "",
        t.type === "income" ? "Receita" : "Despesa",
        Math.abs(t.amount).toFixed(2).replace(".", ",")
      ].join(";"))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `transacoes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Exportação concluída",
      description: `${filteredTransactions.length} transações exportadas com sucesso.`,
    });
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Transações</h1>
          <p className="text-muted-foreground">
            Mostrando {filteredTransactions.length} de {transactions.length} transações • Página {currentPage} de {totalPages}
          </p>
        </div>
        <div className="flex gap-3">
          {selectedIds.size > 0 && (
            <>
              <Button onClick={() => setBulkEditModalOpen(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Editar Selecionadas ({selectedIds.size})
              </Button>
              <Button variant="destructive" onClick={handleDeleteSelected}>
                <Trash2 className="w-4 h-4 mr-2" />
                Deletar Selecionadas ({selectedIds.size})
              </Button>
            </>
          )}
          <Button variant="outline" onClick={handleExportCSV} disabled={filteredTransactions.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
          <Button variant="outline" onClick={() => setUploadModalOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload CSV
          </Button>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Transação
          </Button>
        </div>
      </div>

      <TransactionFiltersComponent filters={filters} onFiltersChange={setFilters} />

      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Exibindo {startIndex + 1}-{Math.min(endIndex, filteredTransactions.length)} de {filteredTransactions.length} transações
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Itens por página:</label>
          <select 
            value={itemsPerPage} 
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
            <option value={1000}>1000</option>
          </select>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={(() => {
                    const validIds = filteredTransactions.map(t => t.id).filter(Boolean) as string[];
                    return validIds.length > 0 && validIds.every((id) => selectedIds.has(id));
                  })()}
                  onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                  title="Selecionar todas as transações"
                />
              </TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Subcategoria</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-center">IA</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  Nenhuma transação encontrada. Adicione sua primeira transação!
                </TableCell>
              </TableRow>
            ) : (
              paginatedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(transaction.id)}
                      onCheckedChange={(checked) => handleSelectOne(transaction.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(transaction.date).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="font-medium">{transaction.description}</TableCell>
                  <TableCell>
                    {transaction.categories ? (
                      <Badge
                        style={{ backgroundColor: transaction.categories.color }}
                        className="text-white"
                      >
                        {transaction.categories.icon} {transaction.categories.name}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Sem categoria</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {transaction.subcategories ? (
                      <Badge variant="outline">
                        {transaction.subcategories.icon} {transaction.subcategories.name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={transaction.type === "income" ? "default" : "secondary"}>
                      {transaction.type === "income" ? "Receita" : "Despesa"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    R$ {Math.abs(transaction.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-center">
                    {transaction.ai_confidence ? (
                      <Badge
                        variant="outline"
                        className={
                          transaction.ai_confidence > 80
                            ? "bg-success/10 text-success border-success/20"
                            : transaction.ai_confidence > 60
                            ? "bg-warning/10 text-warning border-warning/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                        }
                      >
                        {transaction.ai_confidence}%
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(transaction)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(transaction.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    onClick={() => setCurrentPage(pageNum)}
                    isActive={currentPage === pageNum}
                    className="cursor-pointer"
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <TransactionModal
        open={modalOpen}
        onClose={handleModalClose}
        transaction={editingTransaction}
      />

      <BulkEditModal
        open={bulkEditModalOpen}
        onClose={handleBulkEditModalClose}
        selectedIds={Array.from(selectedIds)}
      />

      <UploadModal
        open={uploadModalOpen}
        onClose={handleUploadModalClose}
      />
    </div>
  );
};

export default Transactions;
