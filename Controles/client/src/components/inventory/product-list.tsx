import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Trash2 } from 'lucide-react';
import { ProductWithExpiration } from '@shared/schema';
import { ExpirationBadge } from '@/components/ui/expiration-badge';
import { formatDate } from '@/lib/utils/date';
import { useToast } from '@/hooks/use-toast';

const ITEMS_PER_PAGE = 10;

interface ProductListProps {
  onBack?: () => void;
}

export function ProductList({ onBack }: ProductListProps) {
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch products with expiration info
  const { data: products = [], isLoading } = useQuery<ProductWithExpiration[]>({
    queryKey: ['/api/products/expiration'],
  });
  
  // Filter products based on status and search query
  const filteredProducts = products.filter(product => {
    const matchesFilter = filter === 'all' || 
                          (filter === 'ok' && product.status === 'OK') ||
                          (filter === 'attention' && product.status === 'ATTENTION') ||
                          (filter === 'vencendo' && product.status === 'VENCENDO') ||
                          (filter === 'vencido' && product.status === 'VENCIDO');
    
    const matchesSearch = !searchQuery || 
                          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (product.category && product.category.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesFilter && matchesSearch;
  });
  
  // Sort products by expiration date (nearest first)
  const sortedProducts = [...filteredProducts].sort((a, b) => a.daysRemaining - b.daysRemaining);
  
  // Calculate total pages
  const totalPages = Math.ceil(sortedProducts.length / ITEMS_PER_PAGE);
  
  // Get current page of products
  const currentProducts = sortedProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  
  // Mark product as expired mutation
  const markAsExpiredMutation = useMutation({
    mutationFn: async (entryId: number) => {
      const response = await apiRequest('PATCH', `/api/products/entry/${entryId}/expired`, { isExpired: true });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products/expiration'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products/expiration-status'] });
      toast({
        title: 'Produto atualizado',
        description: 'Produto marcado como vencido com sucesso'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar produto',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Produtos por Validade</CardTitle>
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            Voltar ao Menu
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-2">
            <Select 
              value={filter} 
              onValueChange={setFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ok">OK (30+ dias)</SelectItem>
                <SelectItem value="attention">ATENÇÃO (15-30 dias)</SelectItem>
                <SelectItem value="vencendo">VENCENDO (7 dias)</SelectItem>
                <SelectItem value="vencido">VENCIDOS</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Buscar produtos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-[200px]"
            />
          </div>
        </div>
        
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Carregando produtos...</div>
        ) : currentProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Dias Restantes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentProducts.map((product) => (
                  <TableRow key={`${product.id}-${product.entryId}`}>
                    <TableCell className="font-medium">
                      {product.name}
                      {product.category && (
                        <span className="text-xs text-muted-foreground block">
                          {product.category}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(new Date(product.expirationDate))}</TableCell>
                    <TableCell className={product.daysRemaining < 0 ? 'text-destructive font-medium' : ''}>
                      {product.daysRemaining < 0 
                        ? `${Math.abs(product.daysRemaining)} dia(s) vencido` 
                        : `${product.daysRemaining} dia(s)`}
                    </TableCell>
                    <TableCell>
                      <ExpirationBadge status={product.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {product.status !== 'VENCIDO' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => markAsExpiredMutation.mutate(product.entryId)}
                            disabled={markAsExpiredMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={sortedProducts.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Nenhum produto encontrado para os filtros selecionados.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
