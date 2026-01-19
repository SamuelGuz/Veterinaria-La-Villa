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
} from '@tanstack/react-table';
import { distribuidoresApi } from '@/lib/api';
import { Distribuidor } from '@/lib/api';
import { formatDate } from '@/lib/utils';
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
  Truck,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Building2,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const distribuidorSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100, 'Máximo 100 caracteres'),
  contacto: z.string().max(100, 'Máximo 100 caracteres').optional(),
  telefono: z.string().max(20, 'Máximo 20 caracteres').optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  direccion: z.string().max(255, 'Máximo 255 caracteres').optional(),
  notas: z.string().max(500, 'Máximo 500 caracteres').optional(),
  activo: z.boolean(),
});

type DistribuidorFormData = z.infer<typeof distribuidorSchema>;

export default function Distribuidores() {
  const [distribuidores, setDistribuidores] = useState<Distribuidor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingDistribuidor, setEditingDistribuidor] = useState<Distribuidor | null>(null);
  const [deletingDistribuidor, setDeletingDistribuidor] = useState<Distribuidor | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DistribuidorFormData>({
    resolver: zodResolver(distribuidorSchema),
    defaultValues: {
      activo: true,
    },
  });

  const fetchData = async () => {
    try {
      const response = await distribuidoresApi.getAll();
      setDistribuidores(response.data.data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los distribuidores',
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
    setEditingDistribuidor(null);
    reset({
      nombre: '',
      contacto: '',
      telefono: '',
      email: '',
      direccion: '',
      notas: '',
      activo: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (distribuidor: Distribuidor) => {
    setEditingDistribuidor(distribuidor);
    reset({
      nombre: distribuidor.nombre,
      contacto: distribuidor.contacto || '',
      telefono: distribuidor.telefono || '',
      email: distribuidor.email || '',
      direccion: distribuidor.direccion || '',
      notas: distribuidor.notas || '',
      activo: distribuidor.activo,
    });
    setIsModalOpen(true);
  };

  const openDeleteModal = (distribuidor: Distribuidor) => {
    setDeletingDistribuidor(distribuidor);
    setIsDeleteModalOpen(true);
  };

  const onSubmit = async (data: DistribuidorFormData) => {
    try {
      // Clean empty strings
      const cleanData = {
        ...data,
        email: data.email || undefined,
        contacto: data.contacto || undefined,
        telefono: data.telefono || undefined,
        direccion: data.direccion || undefined,
        notas: data.notas || undefined,
      };

      if (editingDistribuidor) {
        await distribuidoresApi.update(editingDistribuidor.id, cleanData);
        toast({
          title: 'Éxito',
          description: 'Distribuidor actualizado correctamente',
        });
      } else {
        await distribuidoresApi.create(cleanData);
        toast({
          title: 'Éxito',
          description: 'Distribuidor creado correctamente',
        });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Error al guardar el distribuidor',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingDistribuidor) return;
    try {
      await distribuidoresApi.delete(deletingDistribuidor.id);
      toast({
        title: 'Éxito',
        description: 'Distribuidor eliminado correctamente',
      });
      setIsDeleteModalOpen(false);
      setDeletingDistribuidor(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Error al eliminar el distribuidor',
        variant: 'destructive',
      });
    }
  };

  const columns = useMemo<ColumnDef<Distribuidor>[]>(() => [
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
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Truck className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium">{row.getValue('nombre')}</span>
        </div>
      ),
    },
    {
      accessorKey: 'contacto',
      header: 'Contacto',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span>{row.getValue('contacto') || '-'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'telefono',
      header: 'Teléfono',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span>{row.getValue('telefono') || '-'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{row.getValue('email') || '-'}</span>
        </div>
      ),
    },
    {
      accessorKey: '_count',
      header: 'Productos',
      cell: ({ row }) => {
        const count = (row.original as any)._count?.productos || 0;
        return (
          <Badge variant="secondary">
            {count} producto{count !== 1 ? 's' : ''}
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
    data: distribuidores,
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
          <h1 className="text-3xl font-bold tracking-tight">Distribuidores</h1>
          <p className="text-muted-foreground">
            Gestiona los proveedores y distribuidores
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Distribuidor
        </Button>
      </div>

      {/* Table Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Lista de Distribuidores
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar distribuidores..."
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
                      No se encontraron distribuidores.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between px-2 py-4">
            <p className="text-sm text-muted-foreground">
              Mostrando {table.getRowModel().rows.length} de {distribuidores.length} distribuidores
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
                {table.getPageCount() || 1}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingDistribuidor ? 'Editar Distribuidor' : 'Nuevo Distribuidor'}
            </DialogTitle>
            <DialogDescription>
              {editingDistribuidor
                ? 'Modifica los datos del distribuidor'
                : 'Completa el formulario para crear un nuevo distribuidor'}
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contacto">Persona de Contacto</Label>
                  <Input id="contacto" {...register('contacto')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input id="telefono" {...register('telefono')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input id="direccion" {...register('direccion')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas">Notas</Label>
                <Input id="notas" {...register('notas')} />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="activo"
                  {...register('activo')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="activo">Distribuidor activo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingDistribuidor ? 'Guardar Cambios' : 'Crear Distribuidor'}
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
              ¿Estás seguro de que deseas eliminar el distribuidor "{deletingDistribuidor?.nombre}"?
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
