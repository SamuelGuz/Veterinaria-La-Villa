import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { estadisticasApi } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  DollarSign, 
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  BarChart3,
  Plus,
  Minus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface DashboardStats {
  totalProductos: number;
  productosActivos: number;
  productosInactivos: number;
  valorInventario: number;
  productosStockBajo: number;
  entradasHoy: number;
  salidasHoy: number;
  movimientosHoy: number;
  categorias: { nombre: string; cantidad: number }[];
}

interface ProductoStockBajo {
  id: string;
  nombre: string;
  codigo: string;
  cantidad: number;
  stockMinimo: number;
}

interface TopProducto {
  id: string;
  nombre: string;
  codigo: string;
  totalVendido: number;
  totalIngresos: number;
}

interface ComparativaMensual {
  mes: string;
  entradas: number;
  salidas: number;
  valorEntradas: number;
  valorSalidas: number;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [stockBajo, setStockBajo] = useState<ProductoStockBajo[]>([]);
  const [topProductos, setTopProductos] = useState<TopProducto[]>([]);
  const [comparativa, setComparativa] = useState<ComparativaMensual[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardRes, stockBajoRes, topRes, comparativaRes] = await Promise.all([
          estadisticasApi.getDashboard(),
          estadisticasApi.getStockBajo(),
          estadisticasApi.getTopVendidos(),
          estadisticasApi.getComparativaMensual(),
        ]);

        setStats(dashboardRes.data);
        setStockBajo(stockBajoRes.data);
        setTopProductos(topRes.data);
        setComparativa(comparativaRes.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Resumen general del inventario de Veterinaria La Villa
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => navigate('/movimientos?action=compra')}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Compra
          </Button>
          <Button 
            onClick={() => navigate('/movimientos?action=venta')}
            variant="destructive"
          >
            <Minus className="h-4 w-4 mr-2" />
            Nueva Venta
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats?.totalProductos || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.productosActivos} activos, {stats?.productosInactivos} inactivos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor del Inventario</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.valorInventario || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Basado en precios de compra
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Movimientos Hoy</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats?.movimientosHoy || 0)}</div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center text-green-600">
                <ArrowUpRight className="h-3 w-3" />
                {stats?.entradasHoy} entradas
              </span>
              <span className="flex items-center text-red-600">
                <ArrowDownRight className="h-3 w-3" />
                {stats?.salidasHoy} salidas
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatNumber(stats?.productosStockBajo || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Productos por debajo del mínimo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Comparativa Mensual Chart */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Comparativa Mensual</CardTitle>
            <CardDescription>
              Entradas vs Salidas de los últimos 6 meses
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={comparativa}>
                <defs>
                  <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSalidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ color: '#374151' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="valorEntradas" 
                  name="Entradas"
                  stroke="#10b981" 
                  fillOpacity={1}
                  fill="url(#colorEntradas)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="valorSalidas" 
                  name="Salidas"
                  stroke="#ef4444" 
                  fillOpacity={1}
                  fill="url(#colorSalidas)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Categorías Pie Chart */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Productos por Categoría</CardTitle>
            <CardDescription>
              Distribución del inventario
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.categorias || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="cantidad"
                  nameKey="nombre"
                  label={({ nombre, percent }) => `${nombre} (${(percent * 100).toFixed(0)}%)`}
                >
                  {stats?.categorias?.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Productos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Top Productos Vendidos
            </CardTitle>
            <CardDescription>
              Productos más vendidos del mes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProductos.length > 0 ? (
                topProductos.slice(0, 5).map((producto, index) => (
                  <div key={producto.id} className="flex items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                      {index + 1}
                    </div>
                    <div className="ml-4 flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{producto.nombre}</p>
                      <p className="text-sm text-muted-foreground">{producto.codigo}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatNumber(producto.totalVendido)} uds</p>
                      <p className="text-sm text-muted-foreground">{formatCurrency(producto.totalIngresos)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-2">No hay datos de ventas</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stock Bajo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-orange-600" />
              Productos con Stock Bajo
            </CardTitle>
            <CardDescription>
              Productos que necesitan reabastecimiento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stockBajo.length > 0 ? (
                stockBajo.slice(0, 5).map((producto) => (
                  <div key={producto.id} className="flex items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="ml-4 flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{producto.nombre}</p>
                      <p className="text-sm text-muted-foreground">{producto.codigo}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={producto.cantidad === 0 ? 'destructive' : 'secondary'}>
                        {producto.cantidad} / {producto.stockMinimo}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-2">Todo el inventario está en orden</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
