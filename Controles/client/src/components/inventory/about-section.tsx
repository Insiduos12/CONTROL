import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

interface AboutSectionProps {
  onBack: () => void;
}

export function AboutSection({ onBack }: AboutSectionProps) {
  return (
    <div className="container mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-foreground">Sobre Nós</h2>
        <Button variant="ghost" onClick={onBack} className="text-accent hover:text-accent/80">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Menu
        </Button>
      </div>
      
      <Card className="max-w-3xl mx-auto">
        <CardContent className="pt-6">
          <div 
            className="w-full h-48 bg-cover bg-center rounded-lg mb-6" 
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1613977257363-707ba9348227?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400')" }}
          />
          
          <h3 className="text-xl font-semibold mb-4">Controles Spani</h3>
          
          <div className="prose max-w-none">
            <p className="mb-4">
              O sistema de Controles Spani foi desenvolvido para otimizar a gestão de estoque e controle de validade de produtos, 
              ajudando empresas a reduzir perdas e melhorar o gerenciamento de inventário.
            </p>
            
            <h4 className="text-lg font-medium mt-6 mb-2">Principais Funcionalidades</h4>
            
            <ul className="list-disc pl-5 space-y-2 mb-6">
              <li><strong>Gestão de Estoque:</strong> Upload e gerenciamento de arquivos CSV com informações de produtos.</li>
              <li><strong>Controle de Validade:</strong> Registro e monitoramento de datas de validade com alertas visuais.</li>
              <li><strong>Relatórios de Vencimento:</strong> Visualização de produtos vencidos e prestes a vencer.</li>
              <li><strong>Acesso por Níveis:</strong> Gerenciamento de permissões para diferentes usuários do sistema.</li>
            </ul>
            
            <h4 className="text-lg font-medium mt-6 mb-2">Suporte</h4>
            
            <p className="mb-4">
              Para suporte técnico ou dúvidas sobre o sistema, entre em contato através do email: 
              <a href="mailto:suporte@controlesspani.com" className="text-accent hover:underline ml-1">
                suporte@controlesspani.com
              </a>
            </p>
            
            <div className="mt-8 pt-6 border-t text-sm text-muted-foreground">
              <p>Versão 1.2.5 | Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
              <p>© {new Date().getFullYear()} Controles Spani - Todos os direitos reservados</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
