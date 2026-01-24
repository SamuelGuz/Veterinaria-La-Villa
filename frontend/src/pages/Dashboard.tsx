import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { estadisticasApi } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  BarChart3,
  Plus,
  Minus,
  Layers,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

// Interfaces que coinciden con el backend
interface DashboardStats {
  productos: {
    total: number;
    stockBajo: number;
    conStock: number;
  };
  inventario: {
    valorTotal: number;
    porCategoria: { nombre: string; valor: number }[];
  };
  movimientosMes: {
    total: number;
    monto: number;
  };
  ventasMes: {
    total: number;
    monto: number;
  };
  comprasMes: {
    total: number;
    monto: number;
  };
  catalogos: {
    categorias: number;
    distribuidores: number;
  };
}

interface ProductoStockBajo {
  id: number;
  nombre: string;
  categoria: string;
  stockActual: number;
  stockMinimo: number;
  diferencia: number;
}

interface TopProducto {
  productoId: number;
  nombre: string;
  totalVendido: number;
  ingresos: number;
}

interface ComparativaMensual {
  mes: string;
  compras: number;
  ventas: number;
  diferencia: number;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6', '#a855f7', '#6366f1'];

const MESES_NOMBRES: Record<string, string> = {
  '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
};

const formatMes = (mes: string) => {
  const parts = mes.split('-');
  if (parts.length < 2) return mes;
  const [year, month] = parts;
  return `${MESES_NOMBRES[month] || month} ${year?.slice(2) || ''}`;
};

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

        const dashData = dashboardRes.data?.data || dashboardRes.data;
        setStats(dashData as DashboardStats);
        
        const stockData = stockBajoRes.data?.data || stockBajoRes.data;
        setStockBajo(Array.isArray(stockData) ? stockData : []);
        
        const topData = topRes.data?.data || topRes.data;
        setTopProductos(Array.isArray(topData) ? topData : []);
        
        const compData = comparativaRes.data?.data || comparativaRes.data;
        setComparativa(Array.isArray(compData) ? compData : []);
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

  // Preparar datos para ApexCharts
  const comparativaCategories = comparativa.map(item => formatMes(item.mes));
  const comprasSeries = comparativa.map(item => item.compras);
  const ventasSeries = comparativa.map(item => item.ventas);

  const categoriasLabels = stats?.inventario?.porCategoria?.map(cat => cat.nombre) || [];
  const categoriasValues = stats?.inventario?.porCategoria?.map(cat => cat.valor) || [];

  // Configuración del gráfico de barras (Compras vs Ventas)
  const barChartOptions: ApexOptions = {
    chart: {
      type: 'bar',
      height: 350,
      animations: {
        enabled: true,
        speed: 1000,
        animateGradually: {
          enabled: true,
          delay: 150
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350
        }
      },
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: false,
          zoom: false,
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: false
        }
      },
      dropShadow: {
        enabled: true,
        top: 2,
        left: 2,
        blur: 4,
        opacity: 0.1
      }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        borderRadius: 8,
        borderRadiusApplication: 'end',
        dataLabels: {
          position: 'top'
        }
      },
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent']
    },
    xaxis: {
      categories: comparativaCategories,
      labels: {
        style: {
          fontSize: '12px',
          fontFamily: 'inherit'
        }
      }
    },
    yaxis: {
      labels: {
        formatter: (value: number) => `$${(value / 1000).toFixed(0)}k`,
        style: {
          fontSize: '12px'
        }
      }
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.3,
        gradientToColors: ['#f87171', '#34d399'],
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 0.8,
        stops: [0, 100]
      }
    },
    colors: ['#ef4444', '#10b981'],
    tooltip: {
      y: {
        formatter: (value: number) => formatCurrency(value)
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '13px',
      markers: {
        size: 8,
        shape: 'circle'
      }
    },
    grid: {
      borderColor: '#e5e7eb',
      strokeDashArray: 4
    }
  };

  const barChartSeries = [
    {
      name: 'Compras',
      data: comprasSeries
    },
    {
      name: 'Ventas',
      data: ventasSeries
    }
  ];

  // Configuración del gráfico de dona (Categorías)
  const donutChartOptions: ApexOptions = {
    chart: {
      type: 'donut',
      animations: {
        enabled: true,
        speed: 1200,
        animateGradually: {
          enabled: true,
          delay: 200
        },
        dynamicAnimation: {
          enabled: true,
          speed: 500
        }
      },
      dropShadow: {
        enabled: true,
        top: 3,
        left: 0,
        blur: 4,
        opacity: 0.15
      }
    },
    labels: categoriasLabels,
    colors: COLORS.slice(0, categoriasLabels.length),
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: '14px',
              fontWeight: 600
            },
            value: {
              show: true,
              fontSize: '18px',
              fontWeight: 700,
              formatter: (val: string) => formatCurrency(Number(val))
            },
            total: {
              show: true,
              label: 'Total',
              fontSize: '14px',
              fontWeight: 600,
              formatter: () => formatCurrency(categoriasValues.reduce((a, b) => a + b, 0))
            }
          }
        },
        expandOnClick: true
      }
    },
    dataLabels: {
      enabled: false
    },
    legend: {
      position: 'right',
      fontSize: '12px',
      markers: {
        size: 10,
        shape: 'circle'
      },
      itemMargin: {
        vertical: 3
      },
      formatter: (seriesName: string, opts: { seriesIndex: number; w: { globals: { series: number[] } } }) => {
        const value = opts.w.globals.series[opts.seriesIndex];
        return `${seriesName.length > 12 ? seriesName.substring(0, 12) + '...' : seriesName}: ${formatCurrency(value)}`;
      }
    },
    tooltip: {
      y: {
        formatter: (value: number) => formatCurrency(value)
      }
    },
    stroke: {
      width: 2,
      colors: ['#fff']
    },
    responsive: [{
      breakpoint: 480,
      options: {
        legend: {
          position: 'bottom'
        }
      }
    }]
  };

  // Configuración del gráfico de área (Tendencia)
  const areaChartOptions: ApexOptions = {
    chart: {
      type: 'area',
      height: 300,
      animations: {
        enabled: true,
        speed: 1500,
        animateGradually: {
          enabled: true,
          delay: 100
        },
        dynamicAnimation: {
          enabled: true,
          speed: 400
        }
      },
      toolbar: {
        show: false
      },
      zoom: {
        enabled: false
      },
      dropShadow: {
        enabled: true,
        top: 3,
        left: 0,
        blur: 3,
        opacity: 0.1
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    xaxis: {
      categories: comparativaCategories,
      labels: {
        style: {
          fontSize: '12px'
        }
      },
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false
      }
    },
    yaxis: {
      labels: {
        formatter: (value: number) => `$${(value / 1000).toFixed(0)}k`,
        style: {
          fontSize: '12px'
        }
      }
    },
    colors: ['#10b981', '#ef4444'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.5,
        opacityTo: 0.1,
        stops: [0, 90, 100]
      }
    },
    tooltip: {
      y: {
        formatter: (value: number) => formatCurrency(value)
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '13px'
    },
    grid: {
      borderColor: '#e5e7eb',
      strokeDashArray: 4
    },
    markers: {
      size: 5,
      colors: ['#10b981', '#ef4444'],
      strokeColors: '#fff',
      strokeWidth: 2,
      hover: {
        size: 8,
        sizeOffset: 3
      }
    }
  };

  const areaChartSeries = [
    {
      name: 'Ventas',
      data: ventasSeries
    },
    {
      name: 'Compras',
      data: comprasSeries
    }
  ];

  // Configuración del gráfico de barras horizontal (Top Productos)
  const topProductosData = topProductos.slice(0, 10);
  const horizontalBarOptions: ApexOptions = {
    chart: {
      type: 'bar',
      height: 300,
      animations: {
        enabled: true,
        speed: 1200,
        animateGradually: {
          enabled: true,
          delay: 100
        }
      },
      toolbar: {
        show: false
      }
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '70%',
        borderRadius: 6,
        borderRadiusApplication: 'end',
        distributed: true,
        dataLabels: {
          position: 'center'
        }
      }
    },
    colors: ['#3b82f6', '#60a5fa', '#93c5fd', '#818cf8', '#a78bfa', '#c4b5fd', '#6366f1', '#4f46e5', '#4338ca', '#3730a3'],
    dataLabels: {
      enabled: true,
      formatter: (val: number) => formatCurrency(val),
      style: {
        fontSize: '11px',
        fontWeight: 600,
        colors: ['#fff']
      },
      offsetX: 0
    },
    xaxis: {
      categories: topProductosData.map(p => 
        p.nombre.length > 25 ? p.nombre.substring(0, 25) + '...' : p.nombre
      ),
      labels: {
        formatter: (value: string) => `$${(Number(value) / 1000).toFixed(0)}k`,
        style: {
          fontSize: '11px'
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          fontSize: '11px'
        },
        maxWidth: 180
      }
    },
    tooltip: {
      y: {
        formatter: (value: number) => formatCurrency(value)
      }
    },
    legend: {
      show: false
    },
    grid: {
      borderColor: '#e5e7eb',
      strokeDashArray: 4,
      xaxis: {
        lines: {
          show: true
        }
      },
      yaxis: {
        lines: {
          show: false
        }
      }
    }
  };

  const horizontalBarSeries = [{
    name: 'Ingresos',
    data: topProductosData.map(p => p.ingresos)
  }];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Panel Principal</h1>
          <p className="text-sm text-muted-foreground">
            Resumen general del inventario
          </p>
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2">
          <Button 
            onClick={() => navigate('/movimientos?action=compra')}
            className="bg-green-600 hover:bg-green-700 group text-sm"
          >
            <Plus className="h-4 w-4 mr-1 sm:mr-2 transition-transform group-hover:rotate-90 duration-300" />
            <span className="hidden sm:inline">Nueva </span>Compra
          </Button>
          <Button 
            onClick={() => navigate('/movimientos?action=venta')}
            variant="destructive"
            className="group text-sm"
          >
            <Minus className="h-4 w-4 mr-1 sm:mr-2 transition-transform group-hover:scale-125 duration-300" />
            <span className="hidden sm:inline">Nueva </span>Venta
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="card-hover animate-slideInUp stagger-1 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 transition-transform group-hover:scale-125 group-hover:rotate-12 duration-300" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">{formatNumber(stats?.productos?.total || 0)}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {stats?.productos?.conStock || 0} con stock
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover animate-slideInUp stagger-2 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Valor Inventario</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 transition-transform group-hover:scale-125 group-hover:-rotate-12 duration-300" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-green-600">{formatCurrency(stats?.inventario?.valorTotal || 0)}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Precios de compra
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover animate-slideInUp stagger-3 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Ventas Mes</CardTitle>
            <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500 transition-transform group-hover:scale-125 group-hover:rotate-12 duration-300" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-purple-600">{formatCurrency(stats?.ventasMes?.monto || 0)}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {stats?.ventasMes?.total || 0} transacciones
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover animate-slideInUp stagger-4 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Inventario Bajo</CardTitle>
            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500 transition-transform group-hover:scale-125 group-hover:rotate-12 duration-300" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-orange-600">
              {formatNumber(stats?.productos?.stockBajo || 0)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Bajo mínimo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Segundo Row de Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="card-hover animate-slideInUp stagger-5 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Compras Mes</CardTitle>
            <ArrowDownRight className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 transition-transform group-hover:translate-x-1 group-hover:translate-y-1 duration-300" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-red-600">
              {formatCurrency(stats?.comprasMes?.monto || 0)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {stats?.comprasMes?.total || 0} compras
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover animate-slideInUp stagger-6 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Movimientos</CardTitle>
            <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 transition-transform group-hover:-translate-x-1 group-hover:-translate-y-1 duration-300" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">{formatNumber(stats?.movimientosMes?.total || 0)}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Este mes
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover animate-slideInUp stagger-7 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Categorías</CardTitle>
            <Layers className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-500 transition-transform group-hover:scale-125 duration-300" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">{formatNumber(stats?.catalogos?.categorias || 0)}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Activas
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover animate-slideInUp stagger-8 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Proveedores</CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-teal-500 transition-transform group-hover:scale-125 duration-300" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">{formatNumber(stats?.catalogos?.distribuidores || 0)}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Registrados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-7">
        {/* Comparativa Mensual Chart */}
        <Card className="lg:col-span-4 card-hover animate-fadeIn">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
              Compras vs Ventas
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Últimos meses
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0">
            {comparativa.length > 0 ? (
              <Chart
                options={barChartOptions}
                series={barChartSeries}
                type="bar"
                height={280}
              />
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground/50 mb-2" />
                  <p className="text-sm">No hay datos</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Categorías Donut Chart */}
        <Card className="lg:col-span-3 card-hover animate-fadeIn">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Layers className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
              Por Categoría
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Distribución del inventario
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0">
            {categoriasValues.length > 0 ? (
              <Chart
                options={donutChartOptions}
                series={categoriasValues}
                type="donut"
                height={280}
              />
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                <div className="text-center">
                  <Layers className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground/50 mb-2" />
                  <p className="text-sm">No hay datos</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tendencia de Ventas */}
      <Card className="card-hover animate-fadeIn">
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
            Tendencia Mensual
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Evolución de ventas y compras
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 pt-0">
          {comparativa.length > 0 ? (
            <Chart
              options={areaChartOptions}
              series={areaChartSeries}
              type="area"
              height={250}
            />
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground/50 mb-2" />
                <p className="text-sm">No hay datos</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tables Row */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
        {/* Top Productos */}
        <Card className="card-hover animate-slideInLeft">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              Top Vendidos
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Productos más vendidos
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="space-y-2 sm:space-y-3">
              {topProductos.length > 0 ? (
                topProductos.slice(0, 5).map((producto, index) => (
                  <div 
                    key={producto.productoId} 
                    className="flex items-center hover:bg-gray-50 dark:hover:bg-gray-800 p-1.5 sm:p-2 rounded-lg transition-all duration-200 hover:translate-x-1"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className={`flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full text-xs sm:text-sm font-bold text-white transition-transform hover:scale-110 ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-amber-600' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="ml-2 sm:ml-4 flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium leading-none truncate" title={producto.nombre}>
                        {producto.nombre}
                      </p>
                      <p className="text-[10px] sm:text-sm text-muted-foreground">
                        {formatNumber(producto.totalVendido)} uds
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-xs sm:text-sm font-bold text-green-600">
                        {formatCurrency(producto.ingresos)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  <BarChart3 className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground/50" />
                  <p className="mt-2 text-sm">No hay datos</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Inventario Bajo */}
        <Card className="card-hover animate-slideInLeft" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
              Inventario Bajo
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Necesitan reabastecimiento
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="space-y-2 sm:space-y-3">
              {stockBajo.length > 0 ? (
                stockBajo.slice(0, 5).map((producto, index) => (
                  <div 
                    key={producto.id} 
                    className="flex items-center hover:bg-gray-50 dark:hover:bg-gray-800 p-1.5 sm:p-2 rounded-lg transition-all duration-200 hover:translate-x-1"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className={`flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-transform hover:scale-110 ${
                      producto.stockActual === 0 ? 'bg-red-100' : 'bg-orange-100'
                    }`}>
                      <AlertTriangle className={`h-3 w-3 sm:h-4 sm:w-4 ${
                        producto.stockActual === 0 ? 'text-red-600' : 'text-orange-600'
                      }`} />
                    </div>
                    <div className="ml-2 sm:ml-4 flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium leading-none truncate" title={producto.nombre}>
                        {producto.nombre}
                      </p>
                      <p className="text-[10px] sm:text-sm text-muted-foreground truncate">
                        {producto.categoria}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <Badge variant={producto.stockActual === 0 ? 'destructive' : 'secondary'} className="text-[10px] sm:text-xs">
                        {producto.stockActual}/{producto.stockMinimo}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  <Package className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-green-500/50" />
                  <p className="mt-2 text-green-600 font-medium text-sm">¡Todo en orden!</p>
                </div>
              )}
            </div>
            {stockBajo.length > 5 && (
              <Button 
                variant="outline" 
                className="w-full mt-3 sm:mt-4 text-xs sm:text-sm"
                onClick={() => navigate('/inventario?filter=stockBajo')}
              >
                Ver todos ({stockBajo.length})
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de barras horizontal de Top Productos - Solo en pantallas grandes */}
      {topProductos.length > 0 && (
        <Card className="card-hover animate-fadeIn hidden sm:block">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
              Ingresos por Producto
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Top 10 productos por ingresos
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0">
            <Chart
              options={horizontalBarOptions}
              series={horizontalBarSeries}
              type="bar"
              height={Math.max(250, topProductosData.length * 40)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
