import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { LetterAnimation } from '@/components/ui/letter-animation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { CSVUpload } from '@/components/inventory/csv-upload';
import { AboutSection } from '@/components/inventory/about-section';
import { ExpiredProducts } from '@/components/inventory/expired-products';
import { ProductForm } from '@/components/inventory/product-form';
import { ProductList } from '@/components/inventory/product-list';
import { Navbar } from '@/components/ui/navbar';
import { ClipboardList, CalendarX, InfoIcon, Boxes, User, LogOut } from 'lucide-react';

export default function LandingPage() {
  const { user, logoutMutation } = useAuth();
  const [, navigate] = useLocation();
  const [activeSection, setActiveSection] = useState<string>('landing');
  const [showMenu, setShowMenu] = useState(false);
  
  // Show menu options after title animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowMenu(true);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Check login status on component mount
  useEffect(() => {
    // Refresh user data if needed
  }, []);
  
  // Menu option variants for animation
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };
  
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };
  
  // Handle navigation to auth page
  const handleLoginClick = () => {
    navigate('/auth');
  };
  
  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Show section based on menu option clicked
  const showSection = (section: string) => {
    if (section === 'estoque' && user?.role !== 'MODERADOR') {
      alert('Você precisa ter privilégios de MODERADOR para acessar esta seção');
      return;
    }
    
    setActiveSection(section);
  };
  
  // Return to landing page
  const backToMenu = () => {
    setActiveSection('landing');
  };
  
  // Handle product added event
  const handleProductAdded = () => {
    // Could add logic here if needed when product is added
  };
  
  // Render active section
  const renderSection = () => {
    switch (activeSection) {
      case 'estoque':
        return <CSVUpload onBack={backToMenu} />;
      case 'lancamento':
        return (
          <div className="container mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-foreground">Lançamento de Produtos</h2>
              <Button variant="ghost" onClick={backToMenu} className="text-accent hover:text-accent/80">
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Menu
              </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <ProductForm onProductAdded={handleProductAdded} onBack={backToMenu} />
              </div>
              <div className="lg:col-span-2">
                <ProductList onBack={backToMenu} />
              </div>
            </div>
          </div>
        );
      case 'vencidos':
        return <ExpiredProducts onBack={backToMenu} />;
      case 'sobre':
        return <AboutSection onBack={backToMenu} />;
      default:
        return null;
    }
  };
  
  return (
    <div className="min-h-screen">
      {/* Navbar sempre visível em todas as seções */}
      {activeSection !== 'landing' && (
        <Navbar onNavigate={showSection} activeSection={activeSection} />
      )}
      
      {activeSection === 'landing' ? (
        <div className="relative min-h-screen flex flex-col items-center justify-center text-white z-10">
          {/* Background */}
          <div 
            className="absolute inset-0 bg-cover bg-center z-0" 
            style={{ 
              backgroundImage: "url('https://images.unsplash.com/photo-1522383225653-ed111181a951?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080')", 
              filter: "brightness(0.4)" 
            }}
          />
          
          <div className="container mx-auto px-4 text-center relative z-10">
            {/* Animated Title */}
            <LetterAnimation 
              text="CONTROLES SPANI" 
              className="text-4xl md:text-5xl font-bold mb-10 tracking-wide"
              delay={500}
              staggerDelay={0.1}
            />
            
            {/* Menu Options */}
            {showMenu && (
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8"
                variants={container}
                initial="hidden"
                animate="show"
              >
                {user?.role === 'MODERADOR' && (
                  <motion.div 
                    className="cursor-pointer bg-white/10 backdrop-blur-md rounded-lg p-6 hover:bg-white/20 transition-all shadow-lg hover:-translate-y-1"
                    onClick={() => showSection('estoque')}
                    variants={item}
                  >
                    <Boxes className="w-10 h-10 text-primary mb-4" />
                    <h2 className="text-xl font-semibold">Estoque</h2>
                    <p className="mt-2 text-sm text-white/80">Gerenciar arquivo de estoque</p>
                  </motion.div>
                )}
                
                <motion.div 
                  className="cursor-pointer bg-white/10 backdrop-blur-md rounded-lg p-6 hover:bg-white/20 transition-all shadow-lg hover:-translate-y-1"
                  onClick={() => showSection('lancamento')}
                  variants={item}
                >
                  <ClipboardList className="w-10 h-10 text-secondary mb-4" />
                  <h2 className="text-xl font-semibold">Lançamento</h2>
                  <p className="mt-2 text-sm text-white/80">Registrar produtos e datas</p>
                </motion.div>
                
                <motion.div 
                  className="cursor-pointer bg-white/10 backdrop-blur-md rounded-lg p-6 hover:bg-white/20 transition-all shadow-lg hover:-translate-y-1"
                  onClick={() => showSection('vencidos')}
                  variants={item}
                >
                  <CalendarX className="w-10 h-10 text-[#dc3545] mb-4" />
                  <h2 className="text-xl font-semibold">Vencidos</h2>
                  <p className="mt-2 text-sm text-white/80">Visualizar produtos vencidos</p>
                </motion.div>
                
                <motion.div 
                  className="cursor-pointer bg-white/10 backdrop-blur-md rounded-lg p-6 hover:bg-white/20 transition-all shadow-lg hover:-translate-y-1"
                  onClick={() => showSection('sobre')}
                  variants={item}
                >
                  <InfoIcon className="w-10 h-10 text-accent mb-4" />
                  <h2 className="text-xl font-semibold">Sobre nós</h2>
                  <p className="mt-2 text-sm text-white/80">Informações sobre o sistema</p>
                </motion.div>
              </motion.div>
            )}
            
            {/* Login/User Area */}
            {showMenu && (
              <motion.div 
                className="mt-12 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                {user ? (
                  <div className="inline-flex items-center bg-white/10 backdrop-blur-md rounded-full px-4 py-2">
                    <User className="h-5 w-5 mr-2" />
                    <span className="mr-2">{user.username}</span>
                    <span className="text-xs bg-accent/80 px-2 py-0.5 rounded-full mr-2">{user.role}</span>
                    <Button size="sm" variant="ghost" onClick={handleLogout}>
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={handleLoginClick} 
                    className="bg-pink-300 hover:bg-pink-400 text-white font-medium"
                  >
                    <User className="h-4 w-4 mr-2" /> Login
                  </Button>
                )}
              </motion.div>
            )}
          </div>
        </div>
      ) : (
        // Render active section
        <div className="py-8">
          {renderSection()}
        </div>
      )}
    </div>
  );
}

// Need to import this here to avoid circular dependency
import { ArrowLeft } from 'lucide-react';
