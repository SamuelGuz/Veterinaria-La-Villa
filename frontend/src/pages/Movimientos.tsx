import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { movimientosApi, productosApi, distribuidoresApi } from '@/lib/api';
import { MovimientoInventario, Producto, Distribuidor } from '@/lib/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Search,
  Loader2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  RefreshCw,
  Filter,
  X,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

type TipoMovimiento = 'COMPRA' | 'VENTA' | 'AJUSTE';

const movimientoSchema = z.object({
  productoId: z.string().min(1, 'El producto es requerido'),
  tipoMovimiento: z.enum(['COMPRA', 'VENTA', 'AJUSTE']),
  cantidad: z.number().int().min(1, 'La cantidad debe ser mayor a 0'),
  precioUnitario: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  distribuidorId: z.string().optional(),
  factura: z.string().optional(),
});

type MovimientoFormData = z.infer<typeof movimientoSchema>;

const tipoMovimientoConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  COMPRA: { label: 'Compra', icon: ArrowUpRight, color: 'text-green-600', bg: 'bg-green-100' },
  VENTA: { label: 'Venta', icon: ArrowDownRight, color: 'text-red-600', bg: 'bg-red-100' },
  AJUSTE: { label: 'Ajuste', icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-100' },
  ENTRADA: { label: 'Entrada', icon: ArrowUpRight, color: 'text-green-600', bg: 'bg-green-100' },
  SALIDA: { label: 'Salida', icon: ArrowDownRight, color: 'text-red-600', bg: 'bg-red-100' },
  DEVOLUCION: { label: 'Devolución', icon: ArrowLeftRight, color: 'text-orange-600', bg: 'bg-orange-100' },
};

export default function Movimientos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [distribuidores, setDistribuidores] = useState<Distribuidor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'fecha', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [productoSearch, setProductoSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<TipoMovimiento | 'all'>('all');
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MovimientoFormData>({
    resolver: zodResolver(movimientoSchema),
    defaultValues: {
      tipoMovimiento: 'ENTRADA',
      cantidad: 1,
      precioUnitario: 0,
    },
  });

  const selectedProductoId = watch('productoId');
  const selectedTipoMovimiento = watch('tipoMovimiento');

  useEffect(() => {
    if (selectedProductoId) {
      const producto = productos.find((p) => p.id === selectedProductoId);
      if (producto) {
        if (selectedTipoMovimiento === 'COMPRA') {
          setValue('precioUnitario', Number(producto.precioCompra) || 0);
        } else if (selectedTipoMovimiento === 'VENTA') {
          setValue('precioUnitario', Number(producto.precioVenta) || 0);
        } else {
          setValue('precioUnitario', Number(producto.precioVenta));
        }
      }
    }
  }, [selectedProductoId, selectedTipoMovimiento, productos, setValue]);

  const fetchData = async () => {
    try {
      const [movimientosRes, productosRes, distribuidoresRes] = await Promise.all([
        movimientosApi.getAll({ limit: 500 }),
        productosApi.getAll({ activo: true, limit: 1000 }),
        distribuidoresApi.getAll(),
      ]);
      setMovimientos(movimientosRes.data.data || []);
      setProductos(productosRes.data.data || []);
      setDistribuidores(distribuidoresRes.data.data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Detectar parámetro de URL para abrir modal automáticamente
  useEffect(() => {
    const action = searchParams.get('action');
    if (action && productos.length > 0) {
      const tipoMap: Record<string, TipoMovimiento> = {
        'compra': 'COMPRA',
        'venta': 'VENTA',
        'ajuste': 'AJUSTE'
      };
      const tipo = tipoMap[action.toLowerCase()];
      if (tipo) {
        reset({
          productoId: '',
          tipoMovimiento: tipo,
          cantidad: 1,
          precioUnitario: 0,
          distribuidorId: '',
          factura: '',
        });
        setProductoSearch('');
        setIsModalOpen(true);
        // Limpiar el parámetro de URL
        setSearchParams({});
      }
    }
  }, [searchParams, productos]);

  // Filtrar productos por búsqueda
  const productosFiltrados = useMemo(() => {
    if (!productoSearch) return productos;
    const search = productoSearch.toLowerCase();
    return productos.filter(p => 
      p.nombre.toLowerCase().includes(search) || 
      p.codigo?.toLowerCase().includes(search)
    );
  }, [productos, productoSearch]);

  useEffect(() => {
    fetchData();
  }, []);

  const filteredMovimientos = useMemo(() => {
    return movimientos.filter((mov) => {
      if (tipoFilter !== 'all' && mov.tipoMovimiento !== tipoFilter) return false;
      if (dateFilter.from) {
        const movDate = new Date(mov.fecha);
        const fromDate = new Date(dateFilter.from);
        if (movDate < fromDate) return false;
      }
      if (dateFilter.to) {
        const movDate = new Date(mov.fecha);
        const toDate = new Date(dateFilter.to);
        toDate.setHours(23, 59, 59);
        if (movDate > toDate) return false;
      }
      return true;
    });
  }, [movimientos, tipoFilter, dateFilter]);

  const openCreateModal = () => {
    reset({
      productoId: '',
      tipoMovimiento: 'COMPRA',
      cantidad: 1,
      precioUnitario: 0,
      distribuidorId: '',
      factura: '',
    });
    setProductoSearch('');
    setIsModalOpen(true);
  };

  const onSubmit = async (data: MovimientoFormData) => {
    try {
      await movimientosApi.create({
        productoId: parseInt(data.productoId),
        tipoMovimiento: data.tipoMovimiento as 'COMPRA' | 'VENTA' | 'AJUSTE',
        cantidad: data.cantidad,
        precioUnitario: data.precioUnitario,
        distribuidorId: data.distribuidorId ? parseInt(data.distribuidorId) : null,
        factura: data.factura || null,
        notas: data.notas || null,
      });
      toast({
        title: 'Éxito',
        description: 'Movimiento registrado correctamente',
      });
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Error al registrar el movimiento',
        variant: 'destructive',
      });
    }
  };

  const clearFilters = () => {
    setTipoFilter('all');
    setDateFilter({ from: '', to: '' });
    setGlobalFilter('');
  };

  const hasActiveFilters = tipoFilter !== 'all' || dateFilter.from || dateFilter.to;

  const columns = useMemo<ColumnDef<MovimientoInventario>[]>(() => [
    {
      accessorKey: 'fecha',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Fecha
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const fecha = row.getValue('fecha') as string;
        return formatDate(fecha, true);
      },
    },
    {
      accessorKey: 'tipoMovimiento',
      header: 'Tipo',
      cell: ({ row }) => {
        const tipo = row.getValue('tipoMovimiento') as string;
        const config = tipoMovimientoConfig[tipo] || tipoMovimientoConfig['AJUSTE'];
        const Icon = config.icon;
        return (
          <div className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', config.bg, config.color)}>
            <Icon className="h-3 w-3" />
            {config.label}
          </div>
        );
      },
    },
    {
      accessorKey: 'producto',
      header: 'Producto',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.producto?.nombre}</p>
          <p className="text-xs text-muted-foreground font-mono">
            {row.original.producto?.codigo}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'cantidad',
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
        const tipo = row.original.tipoMovimiento;
        const cantidad = row.getValue('cantidad') as number;
        const isNegative = tipo === 'VENTA';
        return (
          <span className={cn('font-medium', isNegative ? 'text-red-600' : 'text-green-600')}>
            {isNegative ? '-' : '+'}{cantidad}
          </span>
        );
      },
    },
    {
      accessorKey: 'precioUnitario',
      header: 'Precio Unit.',
      cell: ({ row }) => formatCurrency(Number(row.getValue('precioUnitario'))),
    },
    {
      accessorKey: 'total',
      header: 'Total',
      cell: ({ row }) => formatCurrency(Number(row.getValue('total'))),
    },
    {
      accessorKey: 'referencia',
      header: 'Referencia',
      cell: ({ row }) => row.getValue('referencia') || '-',
    },
    {
      accessorKey: 'usuario',
      header: 'Usuario',
      cell: ({ row }) => row.original.usuario?.nombre || '-',
    },
  ], []);

  const table = useReactTable({
    data: filteredMovimientos,
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Movimientos</h1>
          <p className="text-muted-foreground">
            Registro de entradas, salidas y ajustes de inventario
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Movimiento
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-48">
              <Label className="text-sm">Tipo de Movimiento</Label>
              <Select
                value={tipoFilter}
                onValueChange={(value) => setTipoFilter(value as TipoMovimiento | 'all')}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ENTRADA">Entrada</SelectItem>
                  <SelectItem value="SALIDA">Salida</SelectItem>
                  <SelectItem value="AJUSTE">Ajuste</SelectItem>
                  <SelectItem value="DEVOLUCION">Devolución</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Label className="text-sm">Desde</Label>
              <Input
                type="date"
                value={dateFilter.from}
                onChange={(e) => setDateFilter((prev) => ({ ...prev, from: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div className="w-40">
              <Label className="text-sm">Hasta</Label>
              <Input
                type="date"
                value={dateFilter.to}
                onChange={(e) => setDateFilter((prev) => ({ ...prev, to: e.target.value }))}
                className="mt-1"
              />
            </div>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-3 w-3" />
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              Historial de Movimientos
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar movimientos..."
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
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
                        <TableCell key={cell.id}>
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
                      No se encontraron movimientos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between px-2 py-4">
            <p className="text-sm text-muted-foreground">
              Mostrando {table.getRowModel().rows.length} de {filteredMovimientos.length} movimientos
            </p>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Página {table.getState().pagination.pageIndex + 1} de{' '}
                {table.getPageCount()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Movimiento</DialogTitle>
            <DialogDescription>
              Registra una compra, venta o ajuste de inventario
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="tipoMovimiento">Tipo de Movimiento *</Label>
                <Select
                  value={watch('tipoMovimiento')}
                  onValueChange={(value) => setValue('tipoMovimiento', value as TipoMovimiento)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMPRA">
                      <div className="flex items-center gap-2">
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                        Compra (Entrada)
                      </div>
                    </SelectItem>
                    <SelectItem value="VENTA">
                      <div className="flex items-center gap-2">
                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                        Venta (Salida)
                      </div>
                    </SelectItem>
                    <SelectItem value="AJUSTE">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-blue-600" />
                        Ajuste
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="productoId">Producto *</Label>
                <div className="space-y-2">
                  <Input
                    placeholder="Buscar producto..."
                    value={productoSearch}
                    onChange={(e) => setProductoSearch(e.target.value)}
                    className="mb-2"
                  />
                  <Select
                    value={watch('productoId')}
                    onValueChange={(value) => setValue('productoId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar producto" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {productosFiltrados.length > 0 ? (
                        productosFiltrados.map((producto) => (
                          <SelectItem key={producto.id} value={producto.id}>
                            <div className="flex items-center justify-between gap-4 w-full">
                              <span className="flex-1">{producto.nombre}</span>
                              <Badge variant={
                                (producto.stockActual || producto.inventarioActual?.cantidadActual || 0) === 0 
                                  ? 'destructive' 
                                  : 'secondary'
                              } className="text-xs">
                                Stock: {producto.stockActual || producto.inventarioActual?.cantidadActual || 0}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          No se encontraron productos
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {errors.productoId && (
                  <p className="text-sm text-red-500">{errors.productoId.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cantidad">Cantidad *</Label>
                  <Input
                    id="cantidad"
                    type="number"
                    min="1"
                    {...register('cantidad', { valueAsNumber: true })}
                  />
                  {errors.cantidad && (
                    <p className="text-sm text-red-500">{errors.cantidad.message}</p>
                  )}
                </div>
                {selectedTipoMovimiento === 'COMPRA' && (
                  <div className="space-y-2">
                    <Label htmlFor="precioUnitario">Precio Unitario *</Label>
                    <Input
                      id="precioUnitario"
                      type="number"
                      step="0.01"
                      min="0"
                      {...register('precioUnitario', { valueAsNumber: true })}
                    />
                    {errors.precioUnitario && (
                      <p className="text-sm text-red-500">{errors.precioUnitario.message}</p>
                    )}
                  </div>
                )}
              </div>

              {selectedTipoMovimiento === 'COMPRA' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="distribuidorId">Distribuidor</Label>
                    <Select
                      value={watch('distribuidorId') || ''}
                      onValueChange={(value) => setValue('distribuidorId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar distribuidor (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {distribuidores.map((dist) => (
                          <SelectItem key={dist.id} value={String(dist.id)}>
                            {dist.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="factura">Número de Factura</Label>
                    <Input
                      id="factura"
                      placeholder="Ej: F-12345"
                      {...register('factura')}
                    />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar Movimiento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
