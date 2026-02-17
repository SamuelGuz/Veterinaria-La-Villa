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
import { numerosAutorizadosApi, NumeroAutorizado } from '@/lib/api';
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
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Phone,
  MessageCircle,
  Shield,
  ShieldCheck,
  ShieldX,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// ============================================
// SCHEMA DE VALIDACIÓN
// ============================================

const numeroSchema = z.object({
  telefono: z
    .string()
    .min(10, 'El teléfono debe tener al menos 10 dígitos')
    .max(15, 'El teléfono no puede exceder 15 dígitos')
    .regex(/^[\d+\-\s()]+$/, 'Solo se permiten números, +, -, espacios y paréntesis'),
  nombre: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'Máximo 100 caracteres'),
});

type NumeroFormData = z.infer<typeof numeroSchema>;

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function NumerosAutorizados() {
  const [numeros, setNumeros] = useState<NumeroAutorizado[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingNumero, setEditingNumero] = useState<NumeroAutorizado | null>(null);
  const [deletingNumero, setDeletingNumero] = useState<NumeroAutorizado | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NumeroFormData>({
    resolver: zodResolver(numeroSchema),
  });

  // ============================================
  // FETCH DATA
  // ============================================

  const fetchData = async () => {
    try {
      const response = await numerosAutorizadosApi.getAll();
      setNumeros(response.data.data || []);
    } catch (error) {
      console.error('Error fetching authorized numbers:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los números autorizados',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  const stats = useMemo(() => {
    const total = numeros.length;
    const activos = numeros.filter((n) => n.activo).length;
    const inactivos = total - activos;
    return { total, activos, inactivos };
  }, [numeros]);

  // ============================================
  // HANDLERS
  // ============================================

  const openCreateModal = () => {
    setEditingNumero(null);
    reset({ telefono: '', nombre: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (numero: NumeroAutorizado) => {
    setEditingNumero(numero);
    reset({
      telefono: numero.telefono,
      nombre: numero.nombre,
    });
    setIsModalOpen(true);
  };

  const openDeleteModal = (numero: NumeroAutorizado) => {
    setDeletingNumero(numero);
    setIsDeleteModalOpen(true);
  };

  const toggleActivo = async (numero: NumeroAutorizado) => {
    try {
      await numerosAutorizadosApi.update(numero.id, { activo: !numero.activo });
      toast({
        title: numero.activo ? 'Número desactivado' : 'Número activado',
        description: `${numero.nombre} (${numero.telefono}) fue ${numero.activo ? 'desactivado' : 'activado'}`,
      });
      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado del número',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: NumeroFormData) => {
    try {
      if (editingNumero) {
        await numerosAutorizadosApi.update(editingNumero.id, { nombre: data.nombre });
        toast({
          title: 'Número actualizado',
          description: `El nombre de ${data.telefono} fue actualizado`,
        });
      } else {
        await numerosAutorizadosApi.create({
          telefono: data.telefono,
          nombre: data.nombre,
        });
        toast({
          title: 'Número autorizado',
          description: `${data.nombre} (${data.telefono}) fue agregado exitosamente`,
        });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      const msg =
        error.response?.data?.error || 'Error al guardar el número';
      toast({
        title: 'Error',
        description: msg,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingNumero) return;
    try {
      await numerosAutorizadosApi.delete(deletingNumero.id);
      toast({
        title: 'Número eliminado',
        description: `${deletingNumero.nombre} fue eliminado de la lista de autorizados`,
      });
      setIsDeleteModalOpen(false);
      setDeletingNumero(null);
      fetchData();
    } catch (error: any) {
      const msg =
        error.response?.data?.error || 'Error al eliminar el número';
      toast({
        title: 'Error',
        description: msg,
        variant: 'destructive',
      });
    }
  };

  // ============================================
  // COLUMNAS DE LA TABLA
  // ============================================

  const columns = useMemo<ColumnDef<NumeroAutorizado>[]>(
    () => [
      {
        accessorKey: 'nombre',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 font-semibold hover:bg-transparent"
          >
            Nombre
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700">
              <MessageCircle className="h-4 w-4" />
            </div>
            <span className="font-medium">{row.original.nombre}</span>
          </div>
        ),
      },
      {
        accessorKey: 'telefono',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 font-semibold hover:bg-transparent"
          >
            Teléfono
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-gray-600">
            <Phone className="h-4 w-4" />
            <span className="font-mono">{formatPhoneDisplay(row.original.telefono)}</span>
          </div>
        ),
      },
      {
        accessorKey: 'activo',
        header: 'Estado',
        cell: ({ row }) => (
          <Badge
            variant={row.original.activo ? 'default' : 'secondary'}
            className={
              row.original.activo
                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                : 'bg-red-100 text-red-800 hover:bg-red-200'
            }
          >
            {row.original.activo ? (
              <ShieldCheck className="mr-1 h-3 w-3" />
            ) : (
              <ShieldX className="mr-1 h-3 w-3" />
            )}
            {row.original.activo ? 'Activo' : 'Inactivo'}
          </Badge>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 font-semibold hover:bg-transparent"
          >
            Registrado
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-gray-500">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEditModal(row.original)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar nombre
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleActivo(row.original)}>
                {row.original.activo ? (
                  <>
                    <UserX className="mr-2 h-4 w-4" />
                    Desactivar
                  </>
                ) : (
                  <>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Activar
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => openDeleteModal(row.original)}
                className="text-red-600 focus:text-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    []
  );

  // ============================================
  // TABLA
  // ============================================

  const table = useReactTable({
    data: numeros,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            WhatsApp — Números Autorizados
          </h1>
          <p className="text-muted-foreground">
            Gestiona los números que pueden interactuar con el bot de WhatsApp
          </p>
        </div>
        <Button onClick={openCreateModal} className="gap-2">
          <Plus className="h-4 w-4" />
          Agregar Número
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Números</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Registrados en el sistema
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <ShieldCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activos}</div>
            <p className="text-xs text-muted-foreground">
              Pueden usar el bot
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactivos</CardTitle>
            <ShieldX className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.inactivos}</div>
            <p className="text-xs text-muted-foreground">
              Acceso bloqueado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Lista de Números
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o teléfono..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {numeros.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageCircle className="mb-4 h-12 w-12 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900">
                No hay números autorizados
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Agrega un número de WhatsApp para permitirle usar el bot de inventario.
              </p>
              <Button onClick={openCreateModal} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Agregar Primer Número
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((hg) => (
                      <TableRow key={hg.id}>
                        {hg.headers.map((header) => (
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
                    {table.getRowModel().rows.length ? (
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
                          No se encontraron resultados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              {table.getPageCount() > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando{' '}
                    {table.getState().pagination.pageIndex *
                      table.getState().pagination.pageSize +
                      1}{' '}
                    a{' '}
                    {Math.min(
                      (table.getState().pagination.pageIndex + 1) *
                        table.getState().pagination.pageSize,
                      numeros.length
                    )}{' '}
                    de {numeros.length}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
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
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal Crear / Editar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              {editingNumero ? 'Editar Número' : 'Agregar Número Autorizado'}
            </DialogTitle>
            <DialogDescription>
              {editingNumero
                ? 'Modifica el nombre del contacto autorizado.'
                : 'Agrega un número de WhatsApp que podrá interactuar con el bot de inventario. Usa el formato internacional (ej: 573001234567).'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Teléfono */}
            <div className="space-y-2">
              <Label htmlFor="telefono">
                <Phone className="mr-1 inline h-4 w-4" />
                Número de WhatsApp
              </Label>
              <Input
                id="telefono"
                placeholder="573001234567"
                {...register('telefono')}
                disabled={!!editingNumero}
                className={editingNumero ? 'bg-gray-100' : ''}
              />
              {errors.telefono && (
                <p className="text-sm text-red-500">{errors.telefono.message}</p>
              )}
              {!editingNumero && (
                <p className="text-xs text-muted-foreground">
                  Formato internacional sin + ni espacios. Ej: 573001234567
                </p>
              )}
            </div>

            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del contacto</Label>
              <Input
                id="nombre"
                placeholder="Ej: Dr. García"
                {...register('nombre')}
              />
              {errors.nombre && (
                <p className="text-sm text-red-500">{errors.nombre.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingNumero ? 'Guardar Cambios' : 'Autorizar Número'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Eliminación */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Eliminar Número Autorizado</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar a{' '}
              <strong>{deletingNumero?.nombre}</strong> ({deletingNumero?.telefono})?
              <br />
              <span className="mt-2 block text-red-500">
                Esta persona ya no podrá usar el bot de WhatsApp.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// HELPERS
// ============================================

function formatPhoneDisplay(phone: string): string {
  // Format: 57 300 123 4567
  if (phone.length >= 12) {
    return `+${phone.slice(0, 2)} ${phone.slice(2, 5)} ${phone.slice(5, 8)} ${phone.slice(8)}`;
  }
  if (phone.length >= 10) {
    return `+${phone.slice(0, 2)} ${phone.slice(2, 5)} ${phone.slice(5)}`;
  }
  return phone;
}
