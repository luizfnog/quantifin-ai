export const downloadBudgetTemplate = () => {
  const headers = [
    "Mês/Ano",
    "Categoria-Pai",
    "Subcategoria-Filho",
    "Valor Orçado"
  ];

  const exampleRows = [
    ["2025-01-01", "Habitação", "Aluguel/Financiamento", "1500.00"],
    ["2025-01-01", "Habitação", "Conta de Luz", "150.00"],
    ["2025-01-01", "Alimentação", "Supermercado", "800.00"],
    ["2025-01-01", "Transporte", "Combustível", "300.00"],
  ];

  const csvContent = [
    headers.join(","),
    ...exampleRows.map(row => row.join(","))
  ].join("\n");

  // Add BOM for UTF-8 encoding
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", "template_orcamento_finflow.csv");
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
