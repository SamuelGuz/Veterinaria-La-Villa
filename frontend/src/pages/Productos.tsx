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
import { productosApi, categoriasApi, distribuidoresApi } from '@/lib/api';
import { Producto, Categoria, Distribuidor } from '@/lib/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
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
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const productoSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
  categoriaId: z.string().min(1, 'La categoría es requerida'),
  distribuidorId: z.string().optional(),
  precioCompra: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  precioVenta: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  stockMinimo: z.number().int().min(0, 'El stock mínimo debe ser mayor o igual a 0'),
  stockMaximo: z.number().int().min(0, 'El stock máximo debe ser mayor o igual a 0'),
  unidadMedida: z.string().optional(),
  ubicacion: z.string().optional(),
  activo: z.boolean(),
});

type ProductoFormData = z.infer<typeof productoSchema>;

export default function Productos() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [distribuidores, setDistribuidores] = useState<Distribuidor[]>([]);
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
      stockMaximo: 100,
      precioCompra: 0,
      precioVenta: 0,
    },
  });

  const fetchData = async () => {
    try {
      const [productosRes, categoriasRes, distribuidoresRes] = await Promise.all([
        productosApi.getAll(),
        categoriasApi.getAll(),
        distribuidoresApi.getAll(),
      ]);
      setProductos(productosRes.data);
      setCategorias(categoriasRes.data);
      setDistribuidores(distribuidoresRes.data);
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
      codigo: '',
      nombre: '',
      descripcion: '',
      categoriaId: '',
      distribuidorId: '',
      precioCompra: 0,
      precioVenta: 0,
      stockMinimo: 10,
      stockMaximo: 100,
      unidadMedida: 'Unidad',
      ubicacion: '',
      activo: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (producto: Producto) => {
    setEditingProducto(producto);
    reset({
      codigo: producto.codigo,
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      categoriaId: producto.categoriaId,
      distribuidorId: producto.distribuidorId || '',
      precioCompra: Number(producto.precioCompra),
      precioVenta: Number(producto.precioVenta),
      stockMinimo: producto.stockMinimo,
      stockMaximo: producto.stockMaximo,
      unidadMedida: producto.unidadMedida || 'Unidad',
      ubicacion: producto.ubicacion || '',
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
      if (editingProducto) {
        await productosApi.update(editingProducto.id, data);
        toast({
          title: 'Éxito',
          description: 'Producto actualizado correctamente',
        });
      } else {
        await productosApi.create(data);
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
      await productosApi.delete(deletingProducto.id);
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
      accessorKey: 'inventario',
      header: 'Stock',
      cell: ({ row }) => {
        const inventario = row.original.inventario;
        const cantidad = inventario?.cantidad || 0;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
          <p className="text-muted-foreground">
            Gestiona el catálogo de productos
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

      {/* Table Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Lista de Productos
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar productos..."
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
                      No se encontraron productos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between px-2 py-4">
            <p className="text-sm text-muted-foreground">
              Mostrando {table.getRowModel().rows.length} de {productos.length} productos
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

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingProducto ? 'Editar Producto' : 'Nuevo Producto'}
            </DialogTitle>
            <DialogDescription>
              {editingProducto
                ? 'Modifica los datos del producto'
                : 'Completa el formulario para crear un nuevo producto'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código *</Label>
                  <Input id="codigo" {...register('codigo')} />
                  {errors.codigo && (
                    <p className="text-sm text-red-500">{errors.codigo.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input id="nombre" {...register('nombre')} />
                  {errors.nombre && (
                    <p className="text-sm text-red-500">{errors.nombre.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input id="descripcion" {...register('descripcion')} />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.categoriaId && (
                    <p className="text-sm text-red-500">{errors.categoriaId.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="distribuidorId">Distribuidor</Label>
                  <Select
                    value={watch('distribuidorId') || ''}
                    onValueChange={(value) => setValue('distribuidorId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar distribuidor" />
                    </SelectTrigger>
                    <SelectContent>
                      {distribuidores.map((dist) => (
                        <SelectItem key={dist.id} value={dist.id}>
                          {dist.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                  <Label htmlFor="stockMaximo">Stock Máximo *</Label>
                  <Input
                    id="stockMaximo"
                    type="number"
                    {...register('stockMaximo', { valueAsNumber: true })}
                  />
                  {errors.stockMaximo && (
                    <p className="text-sm text-red-500">{errors.stockMaximo.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unidadMedida">Unidad de Medida</Label>
                  <Select
                    value={watch('unidadMedida') || 'Unidad'}
                    onValueChange={(value) => setValue('unidadMedida', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Unidad">Unidad</SelectItem>
                      <SelectItem value="Caja">Caja</SelectItem>
                      <SelectItem value="Paquete">Paquete</SelectItem>
                      <SelectItem value="Litro">Litro</SelectItem>
                      <SelectItem value="Kilogramo">Kilogramo</SelectItem>
                      <SelectItem value="Gramo">Gramo</SelectItem>
                      <SelectItem value="Mililitro">Mililitro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ubicacion">Ubicación</Label>
                  <Input id="ubicacion" {...register('ubicacion')} />
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
