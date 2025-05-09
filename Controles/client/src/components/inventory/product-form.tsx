import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Product } from '@shared/schema';
import { Loader2, FilePlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Form schema
const productEntrySchema = z.object({
  productId: z.coerce.number().min(1, 'Produto é obrigatório'),
  expirationDate: z.string().min(1, 'Data de validade é obrigatória'),
  quantity: z.coerce.number().min(1, 'Quantidade deve ser pelo menos 1'),
  notes: z.string().optional()
});

type ProductEntryFormValues = z.infer<typeof productEntrySchema>;

interface ProductFormProps {
  onProductAdded: () => void;
  onBack?: () => void;
}

export function ProductForm({ onProductAdded, onBack }: ProductFormProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  
  // Fetch all products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });
  
  // Search products
  const { data: searchResults = [], isLoading: isSearching } = useQuery<Product[]>({
    queryKey: ['/api/products/search', searchQuery],
    queryFn: async ({ queryKey }) => {
      if (!searchQuery.trim()) return [];
      
      console.log('Buscando produtos com a consulta:', searchQuery);
      
      try {
        const response = await fetch(`/api/products/search?q=${encodeURIComponent(searchQuery)}`);
        
        if (!response.ok) {
          console.error('Erro na busca de produtos:', response.status, response.statusText);
          throw new Error('Failed to search products');
        }
        
        const data = await response.json();
        console.log(`Encontrados ${data.length} produtos na busca por "${searchQuery}"`, data);
        return data;
      } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        throw error;
      }
    },
    enabled: searchQuery.trim().length > 0
  });
  
  // Add product entry mutation
  const addProductEntryMutation = useMutation({
    mutationFn: async (data: ProductEntryFormValues) => {
      const response = await apiRequest('POST', '/api/products/entry', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Produto adicionado',
        description: 'Produto lançado com sucesso'
      });
      form.reset({
        productId: 0,
        expirationDate: '',
        quantity: 1,
        notes: ''
      });
      setSearchQuery('');
      queryClient.invalidateQueries({ queryKey: ['/api/products/expiration'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products/expiration-status'] });
      onProductAdded();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao adicionar produto',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Form setup
  const form = useForm<ProductEntryFormValues>({
    resolver: zodResolver(productEntrySchema),
    defaultValues: {
      productId: 0,
      expirationDate: new Date().toISOString().split('T')[0],
      quantity: 1,
      notes: ''
    }
  });
  
  // Set min date to today
  const today = new Date().toISOString().split('T')[0];
  
  // Handle form submission
  const onSubmit = (values: ProductEntryFormValues) => {
    console.log('Enviando dados para o servidor:', values);
    
    // Validar se o produto foi selecionado corretamente
    if (values.productId <= 0) {
      toast({
        title: 'Erro ao adicionar produto',
        description: 'Selecione um produto da lista',
        variant: 'destructive'
      });
      return;
    }
    
    // Verificar se a data é válida
    if (!values.expirationDate) {
      toast({
        title: 'Erro ao adicionar produto',
        description: 'Data de validade inválida',
        variant: 'destructive'
      });
      return;
    }
    
    addProductEntryMutation.mutate(values);
  };
  
  // Handle product search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setShowResults(query.length > 0);
  };
  
  // Handle product selection from search results
  const handleSelectProduct = (product: Product) => {
    form.setValue('productId', product.id);
    setSearchQuery(product.name);
    setShowResults(false);
  };
  
  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = () => {
      setShowResults(false);
    };
    
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Novo Lançamento</CardTitle>
        {onBack && (
          <Button variant="outline" size="sm" onClick={onBack}>
            Voltar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Produto</FormLabel>
                  <div className="relative">
                    <Input
                      placeholder="Digite para pesquisar..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowResults(searchQuery.length > 0);
                      }}
                    />
                    {showResults && (
                      <div className="absolute left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-10 max-h-60 overflow-hidden">
                        <ScrollArea className="max-h-60" scrollHideDelay={0}>
                          {isSearching ? (
                            <div className="p-2 text-center">
                              <Loader2 className="animate-spin h-4 w-4 mx-auto text-muted-foreground" />
                            </div>
                          ) : searchResults.length > 0 ? (
                            <div className="py-1">
                              {searchResults.map((product) => (
                                <div
                                  key={product.id}
                                  className="px-3 py-2 hover:bg-accent/50 cursor-pointer border-b border-border/20 last:border-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectProduct(product);
                                  }}
                                >
                                  <div className="font-medium text-sm">{product.name}</div>
                                  {product.code && <div className="text-xs text-muted-foreground">Código: {product.code}</div>}
                                </div>
                              ))}
                              {searchResults.length >= 100 && (
                                <div className="p-2 text-center text-xs text-muted-foreground">
                                  Exibindo primeiros 100 resultados. Continue digitando para refinar a busca.
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-2 text-center text-muted-foreground">
                              Nenhum produto encontrado
                            </div>
                          )}
                        </ScrollArea>
                      </div>
                    )}
                    <input type="hidden" {...field} />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="expirationDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Validade</FormLabel>
                  <FormControl>
                    <Input type="date" min={today} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full" disabled={addProductEntryMutation.isPending}>
              {addProductEntryMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adicionando...
                </>
              ) : (
                <>
                  <FilePlus className="mr-2 h-4 w-4" />
                  Adicionar Produto
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
