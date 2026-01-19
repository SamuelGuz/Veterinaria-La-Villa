import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  LogOut,
  Settings,
} from 'lucide-react';

const menuItems = [
  {
    title: 'Dashboard',
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
    title: 'Distribuidores',
    icon: Truck,
    href: '/distribuidores',
  },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { logout, user } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r bg-white transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-lg font-bold text-white">V</span>
              </div>
              <span className="font-semibold text-gray-800">Veterinaria</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={cn(sidebarOpen ? '' : 'mx-auto')}
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
          {menuItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  !sidebarOpen && 'justify-center px-2'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {sidebarOpen && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="border-t p-2">
          {sidebarOpen ? (
            <div className="mb-2 px-3 py-2">
              <p className="text-sm font-medium text-gray-800">{user?.nombre}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          ) : null}
          <Button
            variant="ghost"
            size={sidebarOpen ? 'default' : 'icon'}
            className={cn(
              'w-full text-gray-600 hover:text-gray-900',
              !sidebarOpen && 'justify-center'
            )}
            onClick={() => navigate('/configuracion')}
          >
            <Settings className="h-5 w-5" />
            {sidebarOpen && <span className="ml-2">Configuración</span>}
          </Button>
          <Button
            variant="ghost"
            size={sidebarOpen ? 'default' : 'icon'}
            className={cn(
              'w-full text-red-600 hover:bg-red-50 hover:text-red-700',
              !sidebarOpen && 'justify-center'
            )}
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            {sidebarOpen && <span className="ml-2">Cerrar Sesión</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
}
