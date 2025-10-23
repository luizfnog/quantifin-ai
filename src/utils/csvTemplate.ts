// Template CSV para upload de transações
export const CSV_TEMPLATE_HEADERS = [
  'Data da Transação',
  'Descrição Original do Extrato',
  'Valor (Débito/Crédito)',
  'Categoria (Opcional)',
  'Subcategoria (Opcional)'
];

export const generateCSVTemplate = () => {
  const headers = CSV_TEMPLATE_HEADERS.join(',');
  const exampleRow = '2025-01-15,Pagamento Supermercado XYZ,-250.00,Alimentação,Supermercado';
  
  return `${headers}\n${exampleRow}`;
};

export const downloadCSVTemplate = () => {
  const csvContent = generateCSVTemplate();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', 'template_transacoes_insightfinance.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  category?: string;
  subcategory?: string;
}

export const parseCSVFile = (content: string): ParsedTransaction[] => {
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  
  const transactions: ParsedTransaction[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    
    if (values.length < 3) continue; // Pula linhas inválidas
    
    const transaction: ParsedTransaction = {
      date: values[0],
      description: values[1],
      amount: parseFloat(values[2]),
      category: values[3] || undefined,
      subcategory: values[4] || undefined
    };
    
    transactions.push(transaction);
  }
  
  return transactions;
};
