import { useEffect, useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import { productosApi } from '@/lib/api';
import { Producto } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Loader2,
  Warehouse,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Filter,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

type StockFilter = 'all' | 'low' | 'ok' | 'high';

export default function Inventario() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const response = await productosApi.getAll({ activo: true });
      setProductos(response.data.data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cargar el inventario',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredProductos = useMemo(() => {
    return productos.filter((producto) => {
      const cantidad = producto.inventario?.cantidad || 0;
      const stockMinimo = producto.stockMinimo;
      const stockMaximo = producto.stockMaximo;

      switch (stockFilter) {
        case 'low':
          return cantidad <= stockMinimo;
        case 'ok':
          return cantidad > stockMinimo && cantidad < stockMaximo;
        case 'high':
          return cantidad >= stockMaximo;
        default:
          return true;
      }
    });
  }, [productos, stockFilter]);

  const stats = useMemo(() => {
    const total = productos.length;
    const stockBajo = productos.filter(
      (p) => (p.inventario?.cantidad || 0) <= p.stockMinimo
    ).length;
    const stockOk = productos.filter(
      (p) => {
        const cantidad = p.inventario?.cantidad || 0;
        return cantidad > p.stockMinimo && cantidad < p.stockMaximo;
      }
    ).length;
    const stockAlto = productos.filter(
      (p) => (p.inventario?.cantidad || 0) >= p.stockMaximo
    ).length;
    const valorTotal = productos.reduce((acc, p) => {
      const cantidad = p.inventario?.cantidad || 0;
      return acc + cantidad * Number(p.precioCompra);
    }, 0);

    return { total, stockBajo, stockOk, stockAlto, valorTotal };
  }, [productos]);

  const columns = useMemo<ColumnDef<Producto>[]>(() => [
    {
      accessorKey: 'codigo',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Código
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-mono">{row.getValue('codigo')}</span>,
    },
    {
      accessorKey: 'nombre',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Producto
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.getValue('nombre')}</p>
          <p className="text-sm text-muted-foreground">
            {row.original.categoria?.nombre}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'inventario',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Cantidad
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const cantidad = row.original.inventario?.cantidad || 0;
        const stockMinimo = row.original.stockMinimo;
        const stockMaximo = row.original.stockMaximo;
        const isLow = cantidad <= stockMinimo;
        const isHigh = cantidad >= stockMaximo;

        return (
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{cantidad}</span>
            {isLow && <AlertTriangle className="h-4 w-4 text-orange-500" />}
            {isHigh && <TrendingUp className="h-4 w-4 text-blue-500" />}
          </div>
        );
      },
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.inventario?.cantidad || 0;
        const b = rowB.original.inventario?.cantidad || 0;
        return a - b;
      },
    },
    {
      accessorKey: 'stockMinimo',
      header: 'Mín/Máx',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.stockMinimo} / {row.original.stockMaximo}
        </span>
      ),
    },
    {
      accessorKey: 'precioCompra',
      header: 'Precio Unit.',
      cell: ({ row }) => formatCurrency(Number(row.getValue('precioCompra'))),
    },
    {
      id: 'valorTotal',
      header: 'Valor Total',
      cell: ({ row }) => {
        const cantidad = row.original.inventario?.cantidad || 0;
        const precio = Number(row.original.precioCompra);
        return formatCurrency(cantidad * precio);
      },
    },
    {
      id: 'estado',
      header: 'Estado',
      cell: ({ row }) => {
        const cantidad = row.original.inventario?.cantidad || 0;
        const stockMinimo = row.original.stockMinimo;
        const stockMaximo = row.original.stockMaximo;

        if (cantidad === 0) {
          return <Badge variant="destructive">Sin Inventario</Badge>;
        }
        if (cantidad <= stockMinimo) {
          return <Badge className="bg-orange-500">Inventario Bajo</Badge>;
        }
        if (cantidad >= stockMaximo) {
          return <Badge className="bg-blue-500">Inventario Alto</Badge>;
        }
        return <Badge variant="default">Normal</Badge>;
      },
    },
    {
      accessorKey: 'ubicacion',
      header: 'Ubicación',
      cell: ({ row }) => row.original.ubicacion || '-',
    },
    {
      id: 'ultimoMovimiento',
      header: 'Último Mov.',
      cell: ({ row }) => {
        const fecha = row.original.inventario?.ultimaActualizacion;
        return fecha ? formatDate(fecha) : '-';
      },
    },
  ], []);

  const table = useReactTable({
    data: filteredProductos,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 15,
      },
    },
  });

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Inventario</h1>
        <p className="text-sm text-muted-foreground">
          Control y visualización del stock actual
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <Card 
          className={`cursor-pointer transition-all ${stockFilter === 'all' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setStockFilter('all')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-1 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${stockFilter === 'low' ? 'ring-2 ring-orange-500' : ''}`}
          onClick={() => setStockFilter('low')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Inventario Bajo</CardTitle>
            <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-1 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold text-orange-600">{stats.stockBajo}</div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${stockFilter === 'ok' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => setStockFilter('ok')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Inventario Normal</CardTitle>
            <Package className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-1 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold text-green-600">{stats.stockOk}</div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${stockFilter === 'high' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setStockFilter('high')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Inventario Alto</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-1 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold text-blue-600">{stats.stockAlto}</div>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Valor Total</CardTitle>
            <Warehouse className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-1 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold">{formatCurrency(stats.valorTotal)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Warehouse className="h-4 w-4 sm:h-5 sm:w-5" />
                Estado del Inventario
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {stockFilter !== 'all' && (
                  <Button
                    variant="link"
                    className="h-auto p-0 text-primary text-xs sm:text-sm"
                    onClick={() => setStockFilter('all')}
                  >
                    <Filter className="mr-1 h-3 w-3" />
                    Limpiar filtro
                  </Button>
                )}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar en inventario..."
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 pt-0">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="whitespace-nowrap text-xs sm:text-sm">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="text-xs sm:text-sm py-2 sm:py-4">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No se encontraron productos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-4">
            <p className="text-xs sm:text-sm text-muted-foreground">
              {table.getRowModel().rows.length}/{filteredProductos.length} productos
            </p>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Anterior</span>
              </Button>
              <span className="text-xs sm:text-sm">
                {table.getState().pagination.pageIndex + 1}/{table.getPageCount()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
              >
                <span className="hidden sm:inline mr-1">Siguiente</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
