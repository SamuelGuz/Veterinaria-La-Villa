import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Configuración base de Axios
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor para agregar token a las peticiones
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// ============================================
// TIPOS DE RESPUESTA DE LA API
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: { field: string; message: string }[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// TIPOS DE DATOS
// ============================================

export interface User {
  id: number;
  email: string;
  nombre: string;
  rol: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Categoria {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  totalProductos?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Distribuidor {
  id: number;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  activo: boolean;
  totalMovimientos?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoriaId: string;
  categoria: { id: number; nombre: string };
  distribuidorId?: string | null;
  distribuidor?: { id: number; nombre: string } | null;
  stockMinimo: number;
  stockMaximo: number;
  unidadMedida: string | null;
  ubicacion?: string | null;
  precioCompra: number | null;
  precioVenta: number | null;
  activo: boolean;
  stockActual?: number;
  stockBajo?: boolean;
  ultimaFechaCompra?: string | null;
  ultimoDistribuidor?: string | null;
  inventario?: {
    cantidad: number;
    ultimaActualizacion: string;
  } | null;
  inventarioActual?: {
    cantidadActual: number;
    ultimaActualizacion: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Movimiento {
  id: number;
  productoId: number;
  producto: { id: number; nombre: string; codigo?: string; unidadMedida: string | null };
  tipoMovimiento: 'COMPRA' | 'VENTA' | 'AJUSTE' | 'ENTRADA' | 'SALIDA' | 'DEVOLUCION';
  cantidad: number;
  precioUnitario: number;
  total: number;
  distribuidorId: number | null;
  distribuidor: { id: number; nombre: string } | null;
  factura: string | null;
  fecha: string;
  fechaMovimiento?: string; // Alias for compatibility
  usuarioId: number | null;
  usuario: { id: number; nombre: string } | null;
  notas: string | null;
  referencia?: string | null;
  createdAt: string;
}

// Alias for backwards compatibility
export type MovimientoInventario = Movimiento;

// ============================================
// SERVICIOS DE API
// ============================================

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post<ApiResponse<AuthResponse>>('/auth/login', { email, password }),
  
  register: (email: string, password: string, nombre: string) =>
    api.post<ApiResponse<AuthResponse>>('/auth/register', { email, password, nombre }),
  
  me: () => api.get<ApiResponse<User>>('/auth/me'),
  
  verify: () => api.get<ApiResponse<User>>('/auth/verify'),
};

// Productos
export const productosApi = {
  getAll: (params?: Record<string, string | number | boolean>) =>
    api.get<PaginatedResponse<Producto>>('/productos', { params }),
  
  getById: (id: number) => api.get<ApiResponse<Producto>>(`/productos/${id}`),
  
  create: (data: Partial<Producto>) =>
    api.post<ApiResponse<Producto>>('/productos', data),
  
  update: (id: number, data: Partial<Producto>) =>
    api.put<ApiResponse<Producto>>(`/productos/${id}`, data),
  
  delete: (id: number) => api.delete<ApiResponse<null>>(`/productos/${id}`),
  
  getStockBajo: () => api.get<ApiResponse<Producto[]>>('/productos/stock-bajo'),
};

// Categorías
export const categoriasApi = {
  getAll: (includeInactive?: boolean) =>
    api.get<ApiResponse<Categoria[]> & { total: number }>('/catalogo/categorias', {
      params: { includeInactive },
    }),
  
  getById: (id: number) => api.get<ApiResponse<Categoria>>(`/catalogo/categorias/${id}`),
  
  create: (data: Partial<Categoria>) =>
    api.post<ApiResponse<Categoria>>('/catalogo/categorias', data),
  
  update: (id: number, data: Partial<Categoria>) =>
    api.put<ApiResponse<Categoria>>(`/catalogo/categorias/${id}`, data),
  
  delete: (id: number) => api.delete<ApiResponse<null>>(`/catalogo/categorias/${id}`),
};

// Distribuidores
export const distribuidoresApi = {
  getAll: (includeInactive?: boolean) =>
    api.get<ApiResponse<Distribuidor[]> & { total: number }>('/catalogo/distribuidores', {
      params: { includeInactive },
    }),
  
  getById: (id: number) => api.get<ApiResponse<Distribuidor>>(`/catalogo/distribuidores/${id}`),
  
  getStats: (id: number) => api.get<ApiResponse<unknown>>(`/catalogo/distribuidores/${id}/stats`),
  
  create: (data: Partial<Distribuidor>) =>
    api.post<ApiResponse<Distribuidor>>('/catalogo/distribuidores', data),
  
  update: (id: number, data: Partial<Distribuidor>) =>
    api.put<ApiResponse<Distribuidor>>(`/catalogo/distribuidores/${id}`, data),
  
  delete: (id: number) => api.delete<ApiResponse<null>>(`/catalogo/distribuidores/${id}`),
};

// Movimientos
export const movimientosApi = {
  getAll: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<Movimiento>>('/movimientos', { params }),
  
  getById: (id: number) => api.get<ApiResponse<Movimiento>>(`/movimientos/${id}`),
  
  create: (data: {
    productoId: number;
    tipoMovimiento: 'COMPRA' | 'VENTA' | 'AJUSTE';
    cantidad: number;
    precioUnitario: number;
    distribuidorId?: number | null;
    factura?: string | null;
  }) => api.post<ApiResponse<Movimiento>>('/movimientos', data),
  
  getByProducto: (productoId: number, limit?: number) =>
    api.get<ApiResponse<Movimiento[]>>(`/movimientos/producto/${productoId}`, {
      params: { limit },
    }),
  
  getResumen: (fechaInicio?: string, fechaFin?: string) =>
    api.get<ApiResponse<unknown>>('/movimientos/resumen', {
      params: { fechaInicio, fechaFin },
    }),
};

// Estadísticas
export const estadisticasApi = {
  getDashboard: () => api.get<ApiResponse<DashboardData>>('/estadisticas/dashboard'),
  
  getStockBajo: () => api.get<ApiResponse<unknown>>('/estadisticas/stock-bajo'),
  
  getTopVendidos: (dias?: number, limit?: number) =>
    api.get<ApiResponse<unknown>>('/estadisticas/top-vendidos', {
      params: { dias, limit },
    }),
  
  getMargenes: () => api.get<ApiResponse<unknown>>('/estadisticas/margenes'),
  
  getComparativaMensual: () => api.get<ApiResponse<ComparativaMensual[]>>('/estadisticas/comparativa-mensual'),
  
  getValorInventario: () => api.get<ApiResponse<unknown>>('/estadisticas/valor-inventario'),
  
  getRotacion: (dias?: number) =>
    api.get<ApiResponse<unknown>>('/estadisticas/rotacion', { params: { dias } }),
  
  getTopDistribuidores: (limit?: number) =>
    api.get<ApiResponse<unknown>>('/estadisticas/top-distribuidores', { params: { limit } }),
};

// Tipos para estadísticas
export interface DashboardData {
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
  alertas: {
    productosStockBajo: {
      id: number;
      nombre: string;
      categoria: string;
      stockActual: number;
      stockMinimo: number;
      diferencia: number;
    }[];
  };
}

export interface ComparativaMensual {
  mes: string;
  compras: number;
  ventas: number;
  diferencia: number;
}
