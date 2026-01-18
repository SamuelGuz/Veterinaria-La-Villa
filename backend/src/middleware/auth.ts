import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../config/database';

// Extender el tipo Request para incluir el usuario
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        nombre: string;
        rol: string;
      };
    }
  }
}

interface JwtPayload {
  userId: number;
  email: string;
  rol: string;
}

// Middleware de autenticación
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Obtener el token del header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Token de autenticación no proporcionado',
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verificar el token
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    // Buscar el usuario en la base de datos
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no encontrado',
      });
      return;
    }

    // Agregar el usuario al request
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Token inválido',
      });
      return;
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expirado',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Error de autenticación',
    });
  }
};

// Middleware para verificar rol de administrador
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
    return;
  }

  if (req.user.rol !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requiere rol de administrador',
    });
    return;
  }

  next();
};

// Middleware opcional de autenticación (no falla si no hay token)
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
      },
    });

    if (user) {
      req.user = user;
    }
    
    next();
  } catch {
    // Ignorar errores de token y continuar sin usuario
    next();
  }
};
