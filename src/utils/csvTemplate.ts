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
  const exampleExpense = '2025-01-15,Pagamento Supermercado XYZ,-250.00,Alimentação,Supermercado';
  const exampleIncome = '2025-01-20,Salário Mensal,3500.00,Renda,';
  const instructionComment = '# IMPORTANTE: Use valores NEGATIVOS para despesas (ex: -250.00) e POSITIVOS para receitas (ex: 3500.00)';
  
  return `${instructionComment}\n${headers}\n${exampleExpense}\n${exampleIncome}`;
};

export const downloadCSVTemplate = () => {
  const csvContent = '\uFEFF' + generateCSVTemplate(); // Add BOM for UTF-8
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
  const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  
  // Skip header row
  const dataLines = lines.slice(1);
  
  const transactions: ParsedTransaction[] = [];
  
  for (const line of dataLines) {
    const values = line.split(',').map(v => v.trim());
    
    if (values.length < 3) continue; // Pula linhas inválidas
    
    const transaction: ParsedTransaction = {
      date: values[0],
      description: values[1],
      amount: parseFloat(values[2]),
      category: values[3] || undefined,
      subcategory: values[4] || undefined
    };
    
    // Validate that amount is a valid number
    if (!isNaN(transaction.amount)) {
      transactions.push(transaction);
    }
  }
  
  return transactions;
};
