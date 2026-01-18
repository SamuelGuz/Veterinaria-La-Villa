import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUIStore } from '@/store';
import { cn } from '@/lib/utils';

export function Layout() {
  const { sidebarOpen } = useUIStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div
        className={cn(
          'transition-all duration-300',
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
        )}
      >
        <Header />
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
