import { Request, Response, NextFunction } from 'express';
import * as movimientoService from '../services/movimiento.service';
import { CreateMovimientoInput, QueryMovimientosInput } from '../validators';

// Obtener todos los movimientos
export const getMovimientos = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = req.query as unknown as QueryMovimientosInput;
    const result = await movimientoService.getMovimientos(query);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

// Obtener movimiento por ID
export const getMovimientoById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const movimiento = await movimientoService.getMovimientoById(id);

    res.status(200).json({
      success: true,
      data: movimiento,
    });
  } catch (error) {
    next(error);
  }
};

// Crear movimiento
export const createMovimiento = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data: CreateMovimientoInput = req.body;
    const usuarioId = req.user?.id;
    const movimiento = await movimientoService.createMovimiento(data, usuarioId);

    res.status(201).json({
      success: true,
      message: `Movimiento de ${data.tipoMovimiento.toLowerCase()} registrado exitosamente`,
      data: movimiento,
    });
  } catch (error) {
    next(error);
  }
};

// Obtener movimientos por producto
export const getMovimientosByProducto = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const productoId = parseInt(req.params.productoId, 10);
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const movimientos = await movimientoService.getMovimientosByProducto(productoId, limit);

    res.status(200).json({
      success: true,
      data: movimientos,
      total: movimientos.length,
    });
  } catch (error) {
    next(error);
  }
};

// Resumen de movimientos por periodo
export const getResumenMovimientos = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    
    const inicio = fechaInicio 
      ? new Date(fechaInicio as string) 
      : new Date(new Date().setDate(new Date().getDate() - 30));
    
    const fin = fechaFin 
      ? new Date(fechaFin as string) 
      : new Date();

    const resumen = await movimientoService.getResumenMovimientos(inicio, fin);

    res.status(200).json({
      success: true,
      data: resumen,
      periodo: {
        inicio,
        fin,
      },
    });
  } catch (error) {
    next(error);
  }
};
