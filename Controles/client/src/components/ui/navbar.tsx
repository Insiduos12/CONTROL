import { useAuth } from '@/hooks/use-auth';
import { Button } from './button';
import { Home, ClipboardList, CalendarX, InfoIcon, Boxes, User, LogOut } from 'lucide-react';

interface NavbarProps {
  onNavigate: (section: string) => void;
  activeSection: string;
}

export function Navbar({ onNavigate, activeSection }: NavbarProps) {
  const { user, logoutMutation } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  return (
    <div className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-sm border-b">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onNavigate('landing')}
              className={activeSection === 'landing' ? "bg-accent/20" : ""}
            >
              <Home className="h-4 w-4 mr-2" />
              Início
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onNavigate('lancamento')}
              className={activeSection === 'lancamento' ? "bg-accent/20" : ""}
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Lançamento
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onNavigate('vencidos')}
              className={activeSection === 'vencidos' ? "bg-accent/20" : ""}
            >
              <CalendarX className="h-4 w-4 mr-2" />
              Vencidos
            </Button>
            
            {user?.role === 'MODERADOR' && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onNavigate('estoque')}
                className={activeSection === 'estoque' ? "bg-accent/20" : ""}
              >
                <Boxes className="h-4 w-4 mr-2" />
                Estoque
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onNavigate('sobre')}
              className={activeSection === 'sobre' ? "bg-accent/20" : ""}
            >
              <InfoIcon className="h-4 w-4 mr-2" />
              Sobre
            </Button>
          </div>
          
          {user ? (
            <div className="flex items-center space-x-2">
              <div className="text-sm px-3 py-1 rounded-full bg-background border">
                <span className="mr-1">{user.username}</span>
                <span className="text-xs bg-accent/80 px-2 py-0.5 rounded-full">{user.role}</span>
              </div>
              <Button size="sm" variant="ghost" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button 
              size="sm" 
              className="bg-pink-300 hover:bg-pink-400 text-white"
              onClick={() => window.location.href = '/auth'}
            >
              <User className="h-4 w-4 mr-2" />
              Login
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}