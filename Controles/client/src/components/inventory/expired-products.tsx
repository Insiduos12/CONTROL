import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { ProductWithExpiration, ExpirationStatus } from '@shared/schema';
import { formatDate } from '@/lib/utils/date';
import { ArrowLeft, AlertCircle, AlertTriangle, InfoIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const ITEMS_PER_PAGE = 10;
const COLORS = ['#6abf69', '#dc3545'];

interface ExpiredProductsProps {
  onBack: () => void;
}

export function ExpiredProducts({ onBack }: ExpiredProductsProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryFilter, setcategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch expiration status
  const { data: status, isLoading: isLoadingStatus } = useQuery<ExpirationStatus>({
    queryKey: ['/api/products/expiration-status'],
  });
  
  // Fetch products with expiration info
  const { data: products = [], isLoading: isLoadingProducts } = useQuery<ProductWithExpiration[]>({
    queryKey: ['/api/products/expiration'],
  });
  
  // Get only expired products
  const expiredProducts = products.filter(p => p.status === 'VENCIDO');
  
  // Filter by category and search
  const filteredProducts = expiredProducts.filter(product => {
    const matchesCategory = categoryFilter === 'all' || 
                          (product.category && product.category.toLowerCase() === categoryFilter);
    
    const matchesSearch = !searchQuery || 
                          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (product.category && product.category.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });
  
  // Sort products by days vencido (most recent first)
  const sortedProducts = [...filteredProducts].sort((a, b) => a.daysRemaining - b.daysRemaining);
  
  // Calculate total pages
  const totalPages = Math.ceil(sortedProducts.length / ITEMS_PER_PAGE);
  
  // Get current page of products
  const currentProducts = sortedProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  
  // Prepare chart data
  const chartData = [
    { name: 'Produtos Válidos', value: status?.valid || 0 },
    { name: 'Produtos Vencidos', value: status?.expired || 0 }
  ];
  
  // Get unique categories
  const categories = [...new Set(products.filter(p => p.category).map(p => p.category?.toLowerCase()))]
    .filter(Boolean) as string[];
  
  return (
    <div className="container mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-foreground">Produtos Vencidos</h2>
        <Button variant="ghost" onClick={onBack} className="text-accent hover:text-accent/80">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Menu
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Resumo</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingStatus ? (
                <div className="py-4 text-center text-muted-foreground">Carregando estatísticas...</div>
              ) : status ? (
                <>
                  <div className="mb-6">
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground">Total de Produtos:</span>
                      <span className="font-medium">{status.total}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground">Produtos Válidos:</span>
                      <span className="font-medium text-[#6abf69]">{status.valid}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground">Produtos Vencidos:</span>
                      <span className="font-medium text-destructive">{status.expired}</span>
                    </div>
                  </div>
                  
                  <div className="rounded-lg bg-muted p-4 mb-6">
                    <h4 className="text-sm font-medium mb-2">Distribuição por Status</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>OK (30+ dias)</span>
                          <span>{status.ok} produtos ({Math.round((status.ok / status.total) * 100) || 0}%)</span>
                        </div>
                        <div className="w-full bg-muted-foreground/20 rounded-full h-2">
                          <div className="bg-[#6abf69] h-2 rounded-full" style={{ width: `${(status.ok / status.total) * 100}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>ATENÇÃO (15-30 dias)</span>
                          <span>{status.attention} produtos ({Math.round((status.attention / status.total) * 100) || 0}%)</span>
                        </div>
                        <div className="w-full bg-muted-foreground/20 rounded-full h-2">
                          <div className="bg-[#ffc107] h-2 rounded-full" style={{ width: `${(status.attention / status.total) * 100}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>VENCENDO (1-7 dias)</span>
                          <span>{status.vencendo} produtos ({Math.round((status.vencendo / status.total) * 100) || 0}%)</span>
                        </div>
                        <div className="w-full bg-muted-foreground/20 rounded-full h-2">
                          <div className="bg-[#ff6b6b] h-2 rounded-full" style={{ width: `${(status.vencendo / status.total) * 100}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>VENCIDOS</span>
                          <span>{status.expired} produtos ({Math.round((status.expired / status.total) * 100) || 0}%)</span>
                        </div>
                        <div className="w-full bg-muted-foreground/20 rounded-full h-2">
                          <div className="bg-destructive h-2 rounded-full" style={{ width: `${(status.expired / status.total) * 100}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-3">Ações Recomendadas</h4>
                    <ul className="space-y-2 text-sm">
                      {status.expired > 0 && (
                        <li className="flex items-start">
                          <AlertCircle className="h-4 w-4 text-destructive mt-1 mr-2" />
                          <span>Remover {status.expired} produtos vencidos do estoque</span>
                        </li>
                      )}
                      {status.vencendo > 0 && (
                        <li className="flex items-start">
                          <AlertTriangle className="h-4 w-4 text-[#ff6b6b] mt-1 mr-2" />
                          <span>Verificar {status.vencendo} produtos prestes a vencer (menos de 7 dias)</span>
                        </li>
                      )}
                      {status.attention > 0 && (
                        <li className="flex items-start">
                          <InfoIcon className="h-4 w-4 text-accent mt-1 mr-2" />
                          <span>Avaliar promoções para {status.attention} produtos com prazo de 15-30 dias</span>
                        </li>
                      )}
                    </ul>
                  </div>
                </>
              ) : (
                <div className="py-4 text-center text-muted-foreground">Nenhum dado disponível</div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Lista de Produtos Vencidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-2">
                  <Select value={categoryFilter} onValueChange={setcategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Todas Categorias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas Categorias</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-[200px]"
                  />
                </div>
              </div>
              
              <div className="mb-6 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Quantidade']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {isLoadingProducts ? (
                <div className="py-4 text-center text-muted-foreground">Carregando produtos...</div>
              ) : currentProducts.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Data de Vencimento</TableHead>
                        <TableHead>Dias Vencidos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentProducts.map((product) => (
                        <TableRow key={`${product.id}-${product.entryId}`}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.category || 'N/A'}</TableCell>
                          <TableCell>{formatDate(new Date(product.expirationDate))}</TableCell>
                          <TableCell className="text-destructive font-medium">
                            {Math.abs(product.daysRemaining)}
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
                  Nenhum produto vencido encontrado para os filtros selecionados.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
