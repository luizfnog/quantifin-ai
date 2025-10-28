export const downloadBudgetTemplate = () => {
  const headers = [
    "Mês/Ano",
    "Categoria-Pai",
    "Subcategoria-Filho",
    "Valor Orçado"
  ];

  const exampleRows = [
    ["01/01/2025", "Habitação", "Aluguel/Financiamento", "1500,00"],
    ["01/01/2025", "Habitação", "Conta de Luz", "150,00"],
    ["01/01/2025", "Alimentação", "Supermercado", "800,00"],
    ["01/01/2025", "Transporte", "Combustível", "300,00"],
  ];

  const instructionComment = "# IMPORTANTE: Use formato DD/MM/AAAA para datas. Valores devem ser positivos. Encoding UTF-8. Use vírgula para decimais.";
  
  const csvContent = [
    instructionComment,
    headers.join(";"),
    ...exampleRows.map(row => row.join(";"))
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
