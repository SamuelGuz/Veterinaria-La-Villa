import { Request, Response, NextFunction } from 'express';
import * as estadisticasService from '../services/estadisticas.service';

// Dashboard resumen general
export const getDashboardResumen = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const resumen = await estadisticasService.getDashboardResumen();

    res.status(200).json({
      success: true,
      data: resumen,
    });
  } catch (error) {
    next(error);
  }
};

// Productos con stock bajo
export const getProductosStockBajo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const productos = await estadisticasService.getProductosStockBajo();

    res.status(200).json({
      success: true,
      data: productos,
      total: productos.length,
    });
  } catch (error) {
    next(error);
  }
};

// Top productos vendidos
export const getTopProductosVendidos = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dias = parseInt(req.query.dias as string, 10) || 30;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const productos = await estadisticasService.getTopProductosVendidos(dias, limit);

    res.status(200).json({
      success: true,
      data: productos,
      periodo: `Últimos ${dias} días`,
    });
  } catch (error) {
    next(error);
  }
};

// Márgenes por producto
export const getMargenesPorProducto = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const margenes = await estadisticasService.getMargenesPorProducto();

    res.status(200).json({
      success: true,
      data: margenes,
      total: margenes.length,
    });
  } catch (error) {
    next(error);
  }
};

// Comparativa mensual compras vs ventas
export const getComparativaMensual = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const comparativa = await estadisticasService.getComparativaMensual();

    res.status(200).json({
      success: true,
      data: comparativa,
    });
  } catch (error) {
    next(error);
  }
};

// Valor del inventario
export const getValorInventario = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const valor = await estadisticasService.getValorInventario();

    res.status(200).json({
      success: true,
      data: valor,
    });
  } catch (error) {
    next(error);
  }
};

// Rotación de inventario
export const getRotacionInventario = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dias = parseInt(req.query.dias as string, 10) || 30;
    const rotacion = await estadisticasService.getRotacionInventario(dias);

    res.status(200).json({
      success: true,
      data: rotacion,
      periodo: `Últimos ${dias} días`,
    });
  } catch (error) {
    next(error);
  }
};

// Top distribuidores
export const getTopDistribuidores = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const distribuidores = await estadisticasService.getTopDistribuidores(limit);

    res.status(200).json({
      success: true,
      data: distribuidores,
      total: distribuidores.length,
    });
  } catch (error) {
    next(error);
  }
};
