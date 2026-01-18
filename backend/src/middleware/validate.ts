import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';

// Middleware para validar request body con Zod
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        res.status(400).json({
          success: false,
          message: 'Error de validación',
          errors,
        });
        return;
      }
      next(error);
    }
  };
};

// Middleware para validar query params con Zod
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        res.status(400).json({
          success: false,
          message: 'Error de validación en parámetros',
          errors,
        });
        return;
      }
      next(error);
    }
  };
};

// Middleware para validar params (URL)
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        res.status(400).json({
          success: false,
          message: 'Error de validación en parámetros de URL',
          errors,
        });
        return;
      }
      next(error);
    }
  };
};
