import { Request, Response, NextFunction } from 'express';

// Interfaz para errores personalizados
export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

// Middleware de manejo de errores global
export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  // Log del error (en producción usar un logger como Winston)
  console.error(`[ERROR] ${new Date().toISOString()}`, {
    statusCode,
    message,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// Middleware para rutas no encontradas
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.path}`,
  });
};

// Clase de error personalizado
export class CustomError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Errores comunes predefinidos
export class NotFoundError extends CustomError {
  constructor(message: string = 'Recurso no encontrado') {
    super(message, 404);
  }
}

export class BadRequestError extends CustomError {
  constructor(message: string = 'Solicitud inválida') {
    super(message, 400);
  }
}

export class UnauthorizedError extends CustomError {
  constructor(message: string = 'No autorizado') {
    super(message, 401);
  }
}

export class ForbiddenError extends CustomError {
  constructor(message: string = 'Acceso denegado') {
    super(message, 403);
  }
}

export class ConflictError extends CustomError {
  constructor(message: string = 'Conflicto con el estado actual del recurso') {
    super(message, 409);
  }
}
