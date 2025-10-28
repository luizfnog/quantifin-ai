// Template CSV para upload de transações
export const CSV_TEMPLATE_HEADERS = [
  'Data da Transação',
  'Descrição Original do Extrato',
  'Valor (Débito/Crédito)',
  'Categoria (Opcional)',
  'Subcategoria (Opcional)'
];

export const generateCSVTemplate = () => {
  const headers = CSV_TEMPLATE_HEADERS.join(';');
  const exampleExpense = '2025-01-15;Pagamento Supermercado XYZ;-250,00;Alimentação;Supermercado';
  const exampleIncome = '2025-01-20;Salário Mensal;3500,00;Renda;';
  const instructionComment = '# IMPORTANTE: Use valores NEGATIVOS para despesas (ex: -250,00) e POSITIVOS para receitas (ex: 3500,00). Use vírgula para decimais.';
  
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

const detectDelimiter = (line: string): string => {
  const semicolonCount = (line.match(/;/g) || []).length;
  const commaCount = (line.match(/,/g) || []).length;
  return semicolonCount > commaCount ? ';' : ',';
};

const parseDate = (dateStr: string): string => {
  // Try DD/MM/YYYY format first (European)
  const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try YYYY-MM-DD format (ISO)
  const yyyymmddMatch = dateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (yyyymmddMatch) {
    const [, year, month, day] = yyyymmddMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  throw new Error(`Formato de data inválido: ${dateStr}. Use DD/MM/YYYY ou YYYY-MM-DD`);
};

const parseAmount = (amountStr: string): number => {
  const raw = amountStr.trim();
  // Handle European formats: remove thousand separators and normalize decimal to dot
  let normalized = raw;
  const hasComma = raw.includes(',');
  const hasDot = raw.includes('.');
  if (hasComma && hasDot) {
    // Assume dot is thousands and comma is decimal: 2.555,18 -> 2555.18
    normalized = raw.replace(/\./g, '').replace(/,/g, '.');
  } else if (hasComma) {
    normalized = raw.replace(/,/g, '.');
  }
  // Remove any non-numeric characters except minus and dot
  normalized = normalized.replace(/[^0-9.-]/g, '');
  const amount = parseFloat(normalized);
  if (isNaN(amount)) {
    throw new Error(`Valor inválido: ${amountStr}`);
  }
  return amount;
};

export const parseCSVFile = (content: string): ParsedTransaction[] => {
  const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  
  if (lines.length < 2) {
    throw new Error('Arquivo CSV vazio ou inválido');
  }
  
  // Detect delimiter from header
  const delimiter = detectDelimiter(lines[0]);
  
  // Skip header row
  const dataLines = lines.slice(1);
  
  const transactions: ParsedTransaction[] = [];
  const errors: string[] = [];
  
  for (let i = 0; i < dataLines.length; i++) {
    const lineNumber = i + 2; // +2 because we skip header and arrays are 0-indexed
    const line = dataLines[i];
    
    try {
      const values = line.split(delimiter).map(v => v.trim());
      
      if (values.length < 3) {
        errors.push(`Linha ${lineNumber}: Dados insuficientes (mínimo 3 colunas)`);
        continue;
      }
      
      const transaction: ParsedTransaction = {
        date: parseDate(values[0]),
        description: values[1],
        amount: parseAmount(values[2]),
        category: values[3] || undefined,
        subcategory: values[4] || undefined
      };
      
      transactions.push(transaction);
    } catch (error: any) {
      errors.push(`Linha ${lineNumber}: ${error.message}`);
    }
  }
  
  if (transactions.length === 0 && errors.length > 0) {
    throw new Error(`Nenhuma transação válida encontrada.\n\nErros:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... e mais ${errors.length - 5} erros` : ''}`);
  }
  
  return transactions;
};
