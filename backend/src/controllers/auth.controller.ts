import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { LoginInput, RegisterInput } from '../validators';

// Login
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data: LoginInput = req.body;
    const result = await authService.login(data);

    res.status(200).json({
      success: true,
      message: 'Login exitoso',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Registro
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data: RegisterInput = req.body;
    const result = await authService.register(data);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Obtener usuario actual
export const me = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
      return;
    }

    const user = await authService.getUserById(req.user.id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// Actualizar usuario actual
export const updateMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
      return;
    }

    const user = await authService.updateUser(req.user.id, req.body);

    res.status(200).json({
      success: true,
      message: 'Usuario actualizado',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// Verificar token
export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        valid: false,
        message: 'Token no proporcionado',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const user = await authService.verifyToken(token);

    if (!user) {
      res.status(401).json({
        success: false,
        valid: false,
        message: 'Token inválido',
      });
      return;
    }

    res.status(200).json({
      success: true,
      valid: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
