import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { insertProductSchema, insertProductEntrySchema, insertInventoryUploadSchema } from "@shared/schema";
import csvParser from 'csv-parser';
import { Readable } from 'stream';

// Middleware to check if user is moderator
const isModerator = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  
  if (req.user?.role !== "MODERADOR") {
    return res.status(403).json({ message: "Permissão negada: requer privilégios de MODERADOR" });
  }
  
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize storage with default data
  await storage.initialize();
  
  // Setup authentication
  setupAuth(app);

  // Get all products
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (err) {
      res.status(500).json({ message: "Erro ao buscar produtos" });
    }
  });

  // Search products by name (for autocomplete)
  app.get("/api/products/search", async (req, res) => {
    try {
      const query = req.query.q as string || "";
      console.log(`Pesquisa de produto recebida com consulta: "${query}"`);
      
      const products = await storage.searchProducts(query);
      console.log(`Resultados da pesquisa: ${products.length} produtos encontrados.`);
      
      if (products.length > 0) {
        console.log(`Primeiros 3 resultados: ${JSON.stringify(products.slice(0, 3))}`);
      }
      
      res.json(products);
    } catch (err) {
      console.error("Erro na rota de pesquisa de produtos:", err);
      res.status(500).json({ message: "Erro ao buscar produtos" });
    }
  });

  // Get product entries with expiration status
  app.get("/api/products/expiration", async (req, res) => {
    try {
      const entries = await storage.getProductEntriesWithExpiration();
      res.json(entries);
    } catch (err) {
      res.status(500).json({ message: "Erro ao buscar produtos com validade" });
    }
  });

  // Get product expiration summary statistics
  app.get("/api/products/expiration-status", async (req, res) => {
    try {
      const status = await storage.getExpirationStatus();
      res.json(status);
    } catch (err) {
      res.status(500).json({ message: "Erro ao buscar estatísticas de validade" });
    }
  });

  // Add a product entry (with expiration date)
  app.post("/api/products/entry", async (req, res) => {
    try {
      console.log('Recebidos dados para criar entrada de produto:', req.body);
      
      // Verificar se a data é uma string ou já é um objeto Date
      if (typeof req.body.expirationDate === 'string') {
        // Converter para o formato que o PostgreSQL espera (YYYY-MM-DD)
        const dateParts = req.body.expirationDate.split('T')[0];
        req.body.expirationDate = new Date(dateParts);
      }
      
      try {
        const validatedData = insertProductEntrySchema.parse(req.body);
        console.log('Dados validados com sucesso:', validatedData);
        
        const entry = await storage.createProductEntry(validatedData);
        console.log('Entrada de produto criada com sucesso:', entry);
        
        res.status(201).json(entry);
      } catch (validationErr) {
        console.error('Erro de validação:', validationErr);
        res.status(400).json({ 
          message: "Dados inválidos para criar entrada de produto",
          error: String(validationErr)
        });
      }
    } catch (err) {
      console.error('Erro ao processar requisição:', err);
      res.status(500).json({ message: "Erro interno ao criar entrada de produto" });
    }
  });

  // Mark product entry as expired
  app.patch("/api/products/entry/:id/expired", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const entry = await storage.updateProductEntryExpired(id, true);
      
      if (!entry) {
        return res.status(404).json({ message: "Entrada de produto não encontrada" });
      }
      
      res.json(entry);
    } catch (err) {
      res.status(500).json({ message: "Erro ao atualizar status de validade" });
    }
  });

  // Get inventory uploads history
  app.get("/api/inventory-uploads", async (req, res) => {
    try {
      const uploads = await storage.getInventoryUploads();
      res.json(uploads);
    } catch (err) {
      res.status(500).json({ message: "Erro ao buscar histórico de uploads" });
    }
  });

  // Upload inventory CSV (moderator only)
  app.post("/api/inventory-uploads", isModerator, async (req, res) => {
    if (!req.body.csv) {
      return res.status(400).json({ message: "Dados CSV não fornecidos" });
    }
    
    try {
      // Usar a função parseCSVString diretamente do servidor
      // O formato do CSV Spani é processado pelo parser customizado
      const csvContent = req.body.csv;
      console.log("Conteúdo CSV recebido, tamanho:", csvContent.length);
      
      // Importar a função parseCSVString do frontend
      // e utilizá-la diretamente para evitar problemas com csv-parser
      const lines = csvContent.split(/\r?\n/);
      const products: any[] = [];
      
      // Determinar o separador (tab, ponto e vírgula ou vírgula)
      const separator = csvContent.includes('\t') ? '\t' : 
                        csvContent.includes(';') ? ';' : ',';
      
      console.log("Separador detectado:", separator);
      console.log("Total de linhas:", lines.length);
      
      // Verificar se temos um cabeçalho
      const firstLine = lines[0].split(separator).map(col => col.trim());
      const hasHeader = firstLine.some(h => isNaN(Number(h)));
      const startLine = hasHeader ? 1 : 0;
      
      console.log("Tem cabeçalho:", hasHeader);
      console.log("Iniciando na linha:", startLine);
      
      // Processar cada linha
      for (let i = startLine; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const columns = line.split(separator).map(col => col.trim());
        
        if (columns.length >= 2) {
          // Formato esperado para Spani: código, nome, quantidade
          const code = columns[0];
          const name = columns[1] || `Produto ${code}`;
          const category = columns.length > 2 ? `Quantidade: ${columns[2]}` : undefined;
          
          if (code && name) {
            products.push({
              code,
              name,
              category
            });
          }
        }
      }
      
      console.log(`Produtos processados: ${products.length}`);
      
      // Filtrar produtos inválidos
      const validProducts = products.filter(p => p.name && p.name.trim() !== "");
      
      // Log para depuração
      console.log("Produtos válidos para inserção:", JSON.stringify(validProducts.slice(0, 3)));
      
      try {
        // Adicionar produtos ao banco de dados
        const createdProducts = await storage.createProducts(validProducts);
        console.log(`Produtos inseridos com sucesso: ${createdProducts.length}`);
        
        // Registrar o upload
        const upload = await storage.createInventoryUpload({
          filename: req.body.filename || "estoque.csv",
          uploadedBy: req.user?.id || 0,
          productsCount: createdProducts.length,
          status: "active"
        });
        
        res.status(201).json({ 
          message: "Upload de estoque concluído com sucesso", 
          upload,
          productsCount: createdProducts.length 
        });
      } catch (insertError) {
        console.error("Erro ao inserir produtos:", insertError);
        res.status(500).json({ message: "Erro ao inserir produtos no banco de dados" });
      }
      
    } catch (err) {
      console.error("Erro ao processar CSV:", err);
      res.status(500).json({ message: "Erro ao processar arquivo CSV" });
    }
  });

  // Deletar upload de inventário
  app.delete("/api/inventory-uploads/:id", isModerator, async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID de upload inválido" });
    }
    
    try {
      const success = await storage.deleteInventoryUpload(id);
      
      if (success) {
        res.status(200).json({ message: "Upload excluído com sucesso" });
      } else {
        res.status(404).json({ message: "Upload não encontrado" });
      }
    } catch (error) {
      console.error("Erro ao excluir upload:", error);
      res.status(500).json({ message: "Erro ao excluir upload" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
