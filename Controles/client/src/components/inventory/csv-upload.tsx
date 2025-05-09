import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UploadCloud, AlertCircle, Check, ArrowLeft, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { csvToBase64 } from '@/lib/utils/csv-parser';
import { formatDate } from '@/lib/utils/date';
import { InventoryUpload } from '@shared/schema';

interface CSVUploadProps {
  onBack: () => void;
}

export function CSVUpload({ onBack }: CSVUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{visible: boolean, success: boolean, message: string, details: string}>({
    visible: false,
    success: false,
    message: '',
    details: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch upload history
  const { data: uploads = [], isLoading: isLoadingUploads } = useQuery<InventoryUpload[]>({
    queryKey: ['/api/inventory-uploads'],
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const csvContent = await csvToBase64(file);
      const response = await apiRequest('POST', '/api/inventory-uploads', {
        csv: csvContent,
        filename: file.name
      });
      return await response.json();
    },
    onSuccess: (data) => {
      // Mostrar mensagem detalhada do resultado do processamento
      setUploadStatus({
        visible: true,
        success: true,
        message: 'Arquivo enviado com sucesso!',
        details: `${selectedFile?.name} - ${data.productsCount} produtos carregados` + 
                 (data.message ? `\n${data.message}` : '')
      });
      
      // Atualizar as listas de produtos e histórico de uploads
      queryClient.invalidateQueries({ queryKey: ['/api/inventory-uploads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      
      // Notificar o usuário
      toast({
        title: 'Upload concluído',
        description: `${data.productsCount} produtos foram processados com sucesso.`,
        variant: 'default'
      });
    },
    onError: (error: Error) => {
      setUploadStatus({
        visible: true,
        success: false,
        message: 'Erro ao enviar arquivo',
        details: error.message
      });
      toast({
        title: 'Erro ao enviar arquivo',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    if (file.name.endsWith('.csv')) {
      setSelectedFile(file);
      handleFileUpload(file);
    } else {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione um arquivo CSV válido.',
        variant: 'destructive'
      });
    }
  };

  const handleFileUpload = (file: File) => {
    if (!user) {
      toast({
        title: 'Não autenticado',
        description: 'Você precisa estar logado para fazer upload de arquivos.',
        variant: 'destructive'
      });
      return;
    }
    
    uploadMutation.mutate(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  // Mutation para deletar um upload de inventário
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/inventory-uploads/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      // Atualizar a lista de uploads
      queryClient.invalidateQueries({ queryKey: ['/api/inventory-uploads'] });
      
      // Notificar o usuário
      toast({
        title: 'Upload excluído',
        description: 'O upload foi excluído com sucesso.',
        variant: 'default'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir upload',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  const deleteUpload = (id: number) => {
    if (!user) {
      toast({
        title: 'Não autenticado',
        description: 'Você precisa estar logado para excluir uploads.',
        variant: 'destructive'
      });
      return;
    }
    
    if (window.confirm('Tem certeza que deseja excluir este upload? Esta ação não pode ser desfeita.')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="container mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-foreground">Gerenciamento de Estoque</h2>
        <Button variant="ghost" onClick={onBack} className="text-accent hover:text-accent/80">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Menu
        </Button>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Upload de Arquivo CSV</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-b pb-4 mb-6">
            <p className="text-muted-foreground text-sm">Faça upload do arquivo de estoque para atualizar o sistema</p>
          </div>
          
          <div className="mb-6">
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-gray-300'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={triggerFileInput}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".csv" 
                onChange={handleFileChange}
              />
              <UploadCloud className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">Arraste e solte o arquivo CSV aqui</p>
              <p className="text-muted-foreground text-sm mb-4">ou</p>
              <Button variant="secondary">
                Selecionar arquivo
              </Button>
            </div>
          </div>
          
          {uploadStatus.visible && (
            <div className={`mb-6 p-4 rounded-lg ${uploadStatus.success ? 'bg-[#6abf69]/10' : 'bg-destructive/10'}`}>
              <div className="flex items-center">
                {uploadStatus.success ? (
                  <Check className="h-5 w-5 mr-2 text-[#6abf69]" />
                ) : (
                  <AlertCircle className="h-5 w-5 mr-2 text-destructive" />
                )}
                <div>
                  <p className="font-medium">{uploadStatus.message}</p>
                  <p className="text-sm text-muted-foreground">{uploadStatus.details}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Histórico de Uploads</h3>
            {isLoadingUploads ? (
              <div className="py-4 text-center text-muted-foreground">Carregando histórico...</div>
            ) : uploads.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Data de Upload</TableHead>
                    <TableHead>Qtde. Produtos</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploads.map((upload) => (
                    <TableRow key={upload.id}>
                      <TableCell>{upload.filename}</TableCell>
                      <TableCell>{formatDate(new Date(upload.uploadedAt))}</TableCell>
                      <TableCell>{upload.productsCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            upload.status === 'active' 
                              ? 'bg-[#6abf69]/20 text-[#6abf69]' 
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {upload.status === 'active' ? 'Ativo' : 'Arquivado'}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-destructive hover:text-destructive/80"
                            onClick={() => deleteUpload(upload.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-4 text-center text-muted-foreground">
                Nenhum upload encontrado. Faça o upload do seu primeiro arquivo CSV.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
