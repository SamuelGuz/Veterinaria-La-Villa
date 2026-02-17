import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore, useUIStore } from '@/store';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Package,
  ArrowRightLeft,
  Tags,
  Truck,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';
import LogoImg from '../../../utils/Logo.png';

const menuItems = [
  {
    title: 'Panel Principal',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    title: 'Productos',
    icon: Package,
    href: '/productos',
  },
  {
    title: 'Movimientos',
    icon: ArrowRightLeft,
    href: '/movimientos',
  },
  {
    title: 'Categorías',
    icon: Tags,
    href: '/categorias',
  },
  {
    title: 'Proveedores',
    icon: Truck,
    href: '/distribuidores',
  },
  {
    title: 'WhatsApp Bot',
    icon: MessageCircle,
    href: '/whatsapp-numeros',
  },
];

export function Sidebar() {
  const location = useLocation();
  const { sidebarOpen, toggleSidebar, mobileMenuOpen, setMobileMenuOpen } = useUIStore();
  const { user } = useAuthStore();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, setMobileMenuOpen]);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r bg-white transition-all duration-300',
        // Desktop behavior
        'hidden lg:block',
        sidebarOpen ? 'lg:w-64' : 'lg:w-16',
        // Mobile behavior - full width slide in
        mobileMenuOpen && 'block w-72 shadow-2xl'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-36 items-center justify-center border-b px-4 relative">
          <div className={cn(
            "flex items-center justify-center overflow-hidden transition-all duration-300 p-0 m-0",
            sidebarOpen ? "h-36 w-36" : "h-32 w-32"
          )}>
            <img 
              src={LogoImg} 
              alt="Veterinaria La Villa" 
              className="h-full w-full object-cover hover:scale-110 transition-transform duration-300 p-0 m-0"
              style={{ objectPosition: 'center' }}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="absolute right-2 top-2"
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                style={{ animationDelay: `${index * 50}ms` }}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                  'transition-all duration-200 ease-out',
                  'hover:translate-x-1 hover:shadow-md active:scale-95',
                  'animate-slideInLeft',
                  isActive
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  !sidebarOpen && 'justify-center px-2 hover:translate-x-0'
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-200",
                  "group-hover:scale-110"
                )} />
                {sidebarOpen && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="border-t p-3">
          {sidebarOpen && (
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-gray-800">{user?.nombre}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
