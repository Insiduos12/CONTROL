import { InsertProduct } from "@shared/schema";

export function parseCSVString(csvString: string): InsertProduct[] {
  if (!csvString.trim()) {
    return [];
  }
  
  // Split the string by newlines
  const lines = csvString.split(/\r?\n/);
  
  // Check if this is the "Spani" format from the attached screenshot
  // Column 0: Material (código)
  // Column 1: Texto breve material (nome)
  // Column 2: Utilização livre (quantidade)
  let isSpaniFormat = false;
  const separator = csvString.includes('\t') ? '\t' : csvString.includes(';') ? ';' : ',';
  
  // Detect the most likely separator in the file
  console.log("Usando separador:", separator);
  
  // Get the header line with the appropriate separator
  const header = lines[0].split(separator).map(h => h.trim().toLowerCase());
  console.log("Cabeçalho detectado:", header);
  
  // Check for specific Spani headers
  if (header.some(h => h === 'material' || h.includes('texto')) || 
      (lines.length > 1 && lines[1].split(separator)[0].match(/^\d+$/))) {
    isSpaniFormat = true;
    console.log("Detectou formato Spani");
  }
  
  // Handle specific Spani format
  if (isSpaniFormat) {
    // Parse the data lines
    const products: InsertProduct[] = [];
    
    // Skip header row if it looks like a header
    const startRow = header.some(h => isNaN(Number(h))) ? 1 : 0;
    console.log("Iniciando leitura na linha:", startRow);
    
    for (let i = startRow; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      // Split by the detected separator
      const columns = lines[i].split(separator).map(col => col.trim());
      
      if (columns.length >= 2) {
        // Check if code is numeric and name is not
        const codeIsNumeric = !isNaN(Number(columns[0]));
        const nameIsText = isNaN(Number(columns[1])) || columns[1] === '';
        
        if (codeIsNumeric && nameIsText) {
          const product: InsertProduct = {
            code: columns[0], // Material (código)
            name: columns[1] || `Produto ${columns[0]}`, // Texto breve material (nome) ou fallback
            category: columns.length > 2 ? `Quantidade: ${columns[2]}` : undefined
          };
          
          products.push(product);
          console.log(`Processado produto: ${product.code} - ${product.name}`);
        }
      }
    }
    
    console.log(`Total de produtos processados: ${products.length}`);
    return products;
  }
  
  // Standard CSV format (fallback)
  // Find the column indices for product data
  const nameIndex = header.findIndex(h => 
    h === 'name' || h === 'nome' || h === 'produto' || h === 'descrição' || h === 'descricao'
  );
  
  const codeIndex = header.findIndex(h => 
    h === 'code' || h === 'codigo' || h === 'sku' || h === 'id' || h === 'material'
  );
  
  const categoryIndex = header.findIndex(h => 
    h === 'category' || h === 'categoria' || h === 'tipo' || h === 'grupo'
  );
  
  if (nameIndex === -1) {
    throw new Error("O arquivo CSV não contém uma coluna de nome/produto");
  }
  
  // Parse the data lines
  const products: InsertProduct[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const columns = lines[i].split(',').map(col => col.trim());
    
    const product: InsertProduct = {
      name: columns[nameIndex],
      code: codeIndex !== -1 ? columns[codeIndex] : undefined,
      category: categoryIndex !== -1 ? columns[categoryIndex] : undefined
    };
    
    if (product.name) {
      products.push(product);
    }
  }
  
  return products;
}

export function csvToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsText(file); // Alterado para ler como texto em vez de base64
    reader.onload = () => {
      if (!reader.result) {
        reject(new Error("Erro ao ler o arquivo"));
        return;
      }
      
      // Retorna o texto diretamente, sem conversão base64
      const csvText = reader.result as string;
      resolve(csvText);
    };
    reader.onerror = error => reject(error);
  });
}
