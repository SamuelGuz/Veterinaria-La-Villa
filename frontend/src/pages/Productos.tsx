import { useEffect, useState, useMemo } from 'react';
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
  ColumnFiltersState,
} from '@tanstack/react-table';
import { productosApi, categoriasApi } from '@/lib/api';
import { Producto, Categoria } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  Package,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const productoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
  categoriaId: z.string().min(1, 'La categoría es requerida'),
  precioCompra: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  precioVenta: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  stockMinimo: z.number().int().min(0, 'El stock mínimo debe ser mayor o igual a 0'),
  unidadMedida: z.string().optional(),
  activo: z.boolean(),
});

type ProductoFormData = z.infer<typeof productoSchema>;

export default function Productos() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [deletingProducto, setDeletingProducto] = useState<Producto | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductoFormData>({
    resolver: zodResolver(productoSchema),
    defaultValues: {
      activo: true,
      stockMinimo: 10,
      precioCompra: 0,
      precioVenta: 0,
    },
  });

  const fetchData = async () => {
    try {
      const [productosRes, categoriasRes] = await Promise.all([
        productosApi.getAll({ limit: 1000 }),
        categoriasApi.getAll(),
      ]);
      setProductos(productosRes.data.data || []);
      setCategorias(categoriasRes.data.data || []);
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

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingProducto(null);
    reset({
      nombre: '',
      descripcion: '',
      categoriaId: '',
      precioCompra: 0,
      precioVenta: 0,
      stockMinimo: 10,
      unidadMedida: 'unidades',
      activo: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (producto: Producto) => {
    setEditingProducto(producto);
    reset({
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      categoriaId: String(producto.categoriaId),
      precioCompra: Number(producto.precioCompra),
      precioVenta: Number(producto.precioVenta),
      stockMinimo: producto.stockMinimo,
      unidadMedida: producto.unidadMedida || 'unidades',
      activo: producto.activo,
    });
    setIsModalOpen(true);
  };

  const openDeleteModal = (producto: Producto) => {
    setDeletingProducto(producto);
    setIsDeleteModalOpen(true);
  };

  const onSubmit = async (data: ProductoFormData) => {
    try {
      // Preparar datos para el backend (solo campos que acepta)
      const payload = {
        nombre: data.nombre,
        descripcion: data.descripcion || null,
        categoriaId: String(parseInt(data.categoriaId)),
        stockMinimo: data.stockMinimo,
        unidadMedida: data.unidadMedida || 'unidades',
        precioCompra: data.precioCompra,
        precioVenta: data.precioVenta,
        activo: data.activo,
      };
      
      if (editingProducto) {
        await productosApi.update(parseInt(editingProducto.id as any), payload);
        toast({
          title: 'Éxito',
          description: 'Producto actualizado correctamente',
        });
      } else {
        await productosApi.create(payload);
        toast({
          title: 'Éxito',
          description: 'Producto creado correctamente',
        });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Error al guardar el producto',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingProducto) return;
    try {
      await productosApi.delete(parseInt(deletingProducto.id as any));
      toast({
        title: 'Éxito',
        description: 'Producto eliminado correctamente',
      });
      setIsDeleteModalOpen(false);
      setDeletingProducto(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Error al eliminar el producto',
        variant: 'destructive',
      });
    }
  };

  const columns = useMemo<ColumnDef<Producto>[]>(() => [
    {
      accessorKey: 'id',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-mono">#{row.getValue('id')}</span>,
    },
    {
      accessorKey: 'nombre',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Nombre
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: 'categoria',
      header: 'Categoría',
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.categoria?.nombre}</Badge>
      ),
    },
    {
      accessorKey: 'precioCompra',
      header: 'P. Compra',
      cell: ({ row }) => formatCurrency(Number(row.getValue('precioCompra'))),
    },
    {
      accessorKey: 'precioVenta',
      header: 'P. Venta',
      cell: ({ row }) => formatCurrency(Number(row.getValue('precioVenta'))),
    },
    {
      accessorKey: 'stockActual',
      header: 'Inventario',
      cell: ({ row }) => {
        const cantidad = row.original.stockActual ?? row.original.inventarioActual?.cantidadActual ?? 0;
        const stockMinimo = row.original.stockMinimo;
        const isLow = cantidad <= stockMinimo;
        return (
          <Badge variant={isLow ? 'destructive' : 'secondary'}>
            {cantidad}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'ultimaFechaCompra',
      header: 'Últ. Compra',
      cell: ({ row }) => {
        const fecha = row.original.ultimaFechaCompra;
        if (!fecha) return <span className="text-muted-foreground text-sm">-</span>;
        return (
          <span className="text-sm">
            {formatDate(fecha)}
          </span>
        );
      },
    },
    {
      accessorKey: 'activo',
      header: 'Estado',
      cell: ({ row }) => (
        <Badge variant={row.getValue('activo') ? 'default' : 'secondary'}>
          {row.getValue('activo') ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEditModal(row.original)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => openDeleteModal(row.original)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], []);

  const table = useReactTable({
    data: productos,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calcular estadísticas
  const stats = {
    total: productos.length,
    stockBajo: productos.filter(p => (p.stockActual ?? p.inventarioActual?.cantidadActual ?? 0) <= p.stockMinimo).length,
    stockNormal: productos.filter(p => {
      const stock = p.stockActual ?? p.inventarioActual?.cantidadActual ?? 0;
      return stock > p.stockMinimo && stock <= p.stockMinimo * 3;
    }).length,
    stockAlto: productos.filter(p => (p.stockActual ?? p.inventarioActual?.cantidadActual ?? 0) > p.stockMinimo * 3).length,
    valorTotal: productos.reduce((acc, p) => acc + ((p.stockActual ?? p.inventarioActual?.cantidadActual ?? 0) * (Number(p.precioVenta) || 0)), 0),
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Productos</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona el catálogo de productos
          </p>
        </div>
        <Button onClick={openCreateModal} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total</CardTitle>
            <Package className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Inventario Bajo</CardTitle>
            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-red-600">{stats.stockBajo}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Normal</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-yellow-600">{stats.stockNormal}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Inventario Alto</CardTitle>
            <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-green-600">{stats.stockAlto}</div>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">{formatCurrency(stats.valorTotal)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
              Lista de Productos
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar productos..."
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-2 py-3 sm:py-4">
            <p className="text-xs sm:text-sm text-muted-foreground">
              {table.getRowModel().rows.length} de {productos.length}
            </p>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs sm:text-sm">
                {table.getState().pagination.pageIndex + 1}/{table.getPageCount()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {editingProducto ? 'Editar Producto' : 'Nuevo Producto'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {editingProducto
                ? 'Modifica los datos del producto'
                : 'Completa el formulario para crear un nuevo producto'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input id="nombre" {...register('nombre')} />
                {errors.nombre && (
                  <p className="text-sm text-red-500">{errors.nombre.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input id="descripcion" {...register('descripcion')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoriaId">Categoría *</Label>
                <Select
                  value={watch('categoriaId')}
                  onValueChange={(value) => setValue('categoriaId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.categoriaId && (
                  <p className="text-sm text-red-500">{errors.categoriaId.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="precioCompra">Precio Compra *</Label>
                  <Input
                    id="precioCompra"
                    type="number"
                    step="0.01"
                    {...register('precioCompra', { valueAsNumber: true })}
                  />
                  {errors.precioCompra && (
                    <p className="text-sm text-red-500">{errors.precioCompra.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="precioVenta">Precio Venta *</Label>
                  <Input
                    id="precioVenta"
                    type="number"
                    step="0.01"
                    {...register('precioVenta', { valueAsNumber: true })}
                  />
                  {errors.precioVenta && (
                    <p className="text-sm text-red-500">{errors.precioVenta.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stockMinimo">Stock Mínimo *</Label>
                  <Input
                    id="stockMinimo"
                    type="number"
                    {...register('stockMinimo', { valueAsNumber: true })}
                  />
                  {errors.stockMinimo && (
                    <p className="text-sm text-red-500">{errors.stockMinimo.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unidadMedida">Unidad de Medida</Label>
                  <Select
                    value={watch('unidadMedida') || 'unidades'}
                    onValueChange={(value) => setValue('unidadMedida', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unidades">Unidades</SelectItem>
                      <SelectItem value="caja">Caja</SelectItem>
                      <SelectItem value="paquete">Paquete</SelectItem>
                      <SelectItem value="litro">Litro</SelectItem>
                      <SelectItem value="kilogramo">Kilogramo</SelectItem>
                      <SelectItem value="gramo">Gramo</SelectItem>
                      <SelectItem value="mililitro">Mililitro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="activo"
                  {...register('activo')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="activo">Producto activo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingProducto ? 'Guardar Cambios' : 'Crear Producto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar el producto "{deletingProducto?.nombre}"?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
