import { products, type Product, type InsertProduct, users, type User, type InsertUser, productEntries, type ProductEntry, type InsertProductEntry, inventoryUploads, type InventoryUpload, type InsertInventoryUpload, type ProductWithExpiration, type ExpirationStatus } from "@shared/schema";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { addDays, isBefore, differenceInDays } from "date-fns";
import { db } from "./db";
import { eq, like, sql } from "drizzle-orm";
import { pool } from "./db";

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Product methods
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductByName(name: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  createProducts(products: InsertProduct[]): Promise<Product[]>;
  searchProducts(query: string): Promise<Product[]>;
  
  // Product Entry methods
  getProductEntries(): Promise<ProductEntry[]>;
  getProductEntry(id: number): Promise<ProductEntry | undefined>;
  createProductEntry(entry: InsertProductEntry): Promise<ProductEntry>;
  updateProductEntryExpired(id: number, isExpired: boolean): Promise<ProductEntry | undefined>;
  getProductEntriesWithExpiration(): Promise<ProductWithExpiration[]>;
  getExpirationStatus(): Promise<ExpirationStatus>;
  
  // Inventory Upload methods
  getInventoryUploads(): Promise<InventoryUpload[]>;
  createInventoryUpload(upload: InsertInventoryUpload): Promise<InventoryUpload>;
  
  // Initialize default data
  initialize(): Promise<void>;
  
  // Session store
  sessionStore: any; // Using any to avoid type issues with session.SessionStore
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;
  
  constructor() {
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }
  
  // Initialize default data
  async initialize() {
    // Check if admin user exists, if not create it
    const existingAdmin = await this.getUserByUsername("admin");
    if (!existingAdmin) {
      // Import hashPassword from auth and hash the password
      const { hashPassword } = await import("./auth");
      const hashedPassword = await hashPassword("admin123");
      
      await this.createUser({
        username: "admin",
        password: hashedPassword,
        role: "MODERADOR"
      });
      
      console.log("Admin user created successfully");
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const role = insertUser.role || 'USER'; // Ensure role is never undefined
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, role })
      .returning();
    return user;
  }
  
  // Product methods
  async getProducts(): Promise<Product[]> {
    const results = await db.select().from(products);
    console.log(`Recuperados ${results.length} produtos do banco de dados`);
    if (results.length > 0) {
      console.log('Amostra de produtos:', JSON.stringify(results.slice(0, 3)));
    }
    return results;
  }
  
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }
  
  async getProductByName(name: string): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.name, name));
    return product || undefined;
  }
  
  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values({
        ...insertProduct,
        createdAt: new Date(),
        code: insertProduct.code || null,
        category: insertProduct.category || null
      })
      .returning();
    return product;
  }
  
  async createProducts(insertProducts: InsertProduct[]): Promise<Product[]> {
    console.log(`Tentando criar ${insertProducts.length} produtos`);
    if (insertProducts.length === 0) return [];
    
    // Inserir produtos, evitando duplicatas usando verificação manual de nome
    const existingProductNames = new Set<string>();
    const productsToCreate: InsertProduct[] = [];
    
    // Verificar quais produtos já existem pelo nome
    for (const product of insertProducts) {
      const existingProduct = await this.getProductByName(product.name);
      if (!existingProduct) {
        productsToCreate.push(product);
      } else {
        existingProductNames.add(product.name);
      }
    }
    
    console.log(`Encontrados ${existingProductNames.size} produtos já existentes. Criando ${productsToCreate.length} novos produtos.`);
    
    if (productsToCreate.length === 0) {
      return []; // Nenhum produto novo para criar
    }
    
    try {
      // Inserir todos os produtos novos de uma vez
      const createdProducts = await db
        .insert(products)
        .values(
          productsToCreate.map(p => ({
            ...p,
            createdAt: new Date(),
            code: p.code || null,
            category: p.category || null
          }))
        )
        .returning();
      
      console.log(`Produtos criados com sucesso: ${createdProducts.length}`);
      return createdProducts;
    } catch (error) {
      console.error("Erro ao inserir produtos:", error);
      
      // Abordagem alternativa: inserir um por um
      const results: Product[] = [];
      for (const product of productsToCreate) {
        try {
          const [created] = await db
            .insert(products)
            .values({
              ...product,
              createdAt: new Date(),
              code: product.code || null,
              category: product.category || null
            })
            .returning();
          
          if (created) {
            results.push(created);
          }
        } catch (innerError) {
          console.error(`Erro ao inserir produto ${product.name}:`, innerError);
        }
      }
      
      console.log(`Alternativa: ${results.length} produtos criados com abordagem individual`);
      return results;
    }
  }
  
  async searchProducts(query: string): Promise<Product[]> {
    if (!query.trim()) return [];
    
    // Consultando produtos com nome similar (case-insensitive)
    try {
      const lowerQuery = query.toLowerCase();
      const allProducts = await this.getProducts();
      
      // Filtrar produtos pelo nome
      const filteredProducts = allProducts.filter(product => 
        product.name.toLowerCase().includes(lowerQuery)
      );
      
      // Limitar a 100 resultados para melhor desempenho
      return filteredProducts.slice(0, 100);
    } catch (error) {
      console.error("Erro ao pesquisar produtos:", error);
      return [];
    }
  }
  
  // Product Entry methods
  async getProductEntries(): Promise<ProductEntry[]> {
    return await db.select().from(productEntries);
  }
  
  async getProductEntry(id: number): Promise<ProductEntry | undefined> {
    const [entry] = await db.select().from(productEntries).where(eq(productEntries.id, id));
    return entry || undefined;
  }
  
  async createProductEntry(insertEntry: InsertProductEntry): Promise<ProductEntry> {
    const [entry] = await db
      .insert(productEntries)
      .values({
        ...insertEntry,
        createdAt: new Date(),
        isExpired: isBefore(insertEntry.expirationDate, new Date()),
        quantity: insertEntry.quantity || 1,
        notes: insertEntry.notes || null
      })
      .returning();
    return entry;
  }
  
  async updateProductEntryExpired(id: number, isExpired: boolean): Promise<ProductEntry | undefined> {
    const [updatedEntry] = await db
      .update(productEntries)
      .set({ isExpired })
      .where(eq(productEntries.id, id))
      .returning();
    return updatedEntry;
  }
  
  async getProductEntriesWithExpiration(): Promise<ProductWithExpiration[]> {
    const entries = await this.getProductEntries();
    const result: ProductWithExpiration[] = [];
    
    for (const entry of entries) {
      const product = await this.getProduct(entry.productId);
      if (!product) continue;
      
      const now = new Date();
      const daysRemaining = differenceInDays(entry.expirationDate, now);
      
      let status: 'OK' | 'ATTENTION' | 'VENCENDO' | 'VENCIDO';
      if (daysRemaining < 0) {
        status = 'VENCIDO';
      } else if (daysRemaining <= 7) {
        status = 'VENCENDO';
      } else if (daysRemaining <= 15) {
        status = 'ATTENTION';
      } else {
        status = 'OK';
      }
      
      result.push({
        id: product.id,
        name: product.name,
        code: product.code || undefined,
        category: product.category || undefined,
        expirationDate: entry.expirationDate,
        quantity: entry.quantity,
        daysRemaining,
        status,
        notes: entry.notes || undefined,
        entryId: entry.id
      });
    }
    
    return result;
  }
  
  async getExpirationStatus(): Promise<ExpirationStatus> {
    const entries = await this.getProductEntriesWithExpiration();
    
    const status: ExpirationStatus = {
      total: entries.length,
      valid: 0,
      expired: 0,
      ok: 0,
      attention: 0,
      vencendo: 0
    };
    
    for (const entry of entries) {
      if (entry.status === 'VENCIDO') {
        status.expired++;
      } else {
        status.valid++;
        
        if (entry.status === 'OK') {
          status.ok++;
        } else if (entry.status === 'ATTENTION') {
          status.attention++;
        } else if (entry.status === 'VENCENDO') {
          status.vencendo++;
        }
      }
    }
    
    return status;
  }
  
  // Inventory Upload methods
  async getInventoryUploads(): Promise<InventoryUpload[]> {
    const uploads = await db.select().from(inventoryUploads);
    return uploads.sort((a, b) => 
      b.uploadedAt.getTime() - a.uploadedAt.getTime()
    );
  }
  
  async createInventoryUpload(insertUpload: InsertInventoryUpload): Promise<InventoryUpload> {
    const [upload] = await db
      .insert(inventoryUploads)
      .values({
        ...insertUpload,
        uploadedAt: new Date()
      })
      .returning();
    return upload;
  }
  
  async deleteInventoryUpload(id: number): Promise<boolean> {
    try {
      const [deletedUpload] = await db
        .delete(inventoryUploads)
        .where(eq(inventoryUploads.id, id))
        .returning();
      
      return !!deletedUpload;
    } catch (error) {
      console.error(`Erro ao excluir upload de inventário ${id}:`, error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();