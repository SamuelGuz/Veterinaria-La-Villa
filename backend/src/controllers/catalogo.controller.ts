import { Request, Response, NextFunction } from 'express';
import * as catalogoService from '../services/catalogo.service';
import {
  CreateCategoriaInput,
  UpdateCategoriaInput,
  CreateDistribuidorInput,
  UpdateDistribuidorInput,
} from '../validators';

// ============================================
// CONTROLADORES DE CATEGORÍA
// ============================================

// Obtener todas las categorías
export const getCategorias = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const categorias = await catalogoService.getCategorias(includeInactive);

    res.status(200).json({
      success: true,
      data: categorias,
      total: categorias.length,
    });
  } catch (error) {
    next(error);
  }
};

// Obtener categoría por ID
export const getCategoriaById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const categoria = await catalogoService.getCategoriaById(id);

    res.status(200).json({
      success: true,
      data: categoria,
    });
  } catch (error) {
    next(error);
  }
};

// Crear categoría
export const createCategoria = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data: CreateCategoriaInput = req.body;
    const categoria = await catalogoService.createCategoria(data);

    res.status(201).json({
      success: true,
      message: 'Categoría creada exitosamente',
      data: categoria,
    });
  } catch (error) {
    next(error);
  }
};

// Actualizar categoría
export const updateCategoria = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const data: UpdateCategoriaInput = req.body;
    const categoria = await catalogoService.updateCategoria(id, data);

    res.status(200).json({
      success: true,
      message: 'Categoría actualizada exitosamente',
      data: categoria,
    });
  } catch (error) {
    next(error);
  }
};

// Eliminar categoría
export const deleteCategoria = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await catalogoService.deleteCategoria(id);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// CONTROLADORES DE DISTRIBUIDOR
// ============================================

// Obtener todos los distribuidores
export const getDistribuidores = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const distribuidores = await catalogoService.getDistribuidores(includeInactive);

    res.status(200).json({
      success: true,
      data: distribuidores,
      total: distribuidores.length,
    });
  } catch (error) {
    next(error);
  }
};

// Obtener distribuidor por ID
export const getDistribuidorById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const distribuidor = await catalogoService.getDistribuidorById(id);

    res.status(200).json({
      success: true,
      data: distribuidor,
    });
  } catch (error) {
    next(error);
  }
};

// Crear distribuidor
export const createDistribuidor = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data: CreateDistribuidorInput = req.body;
    const distribuidor = await catalogoService.createDistribuidor(data);

    res.status(201).json({
      success: true,
      message: 'Distribuidor creado exitosamente',
      data: distribuidor,
    });
  } catch (error) {
    next(error);
  }
};

// Actualizar distribuidor
export const updateDistribuidor = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const data: UpdateDistribuidorInput = req.body;
    const distribuidor = await catalogoService.updateDistribuidor(id, data);

    res.status(200).json({
      success: true,
      message: 'Distribuidor actualizado exitosamente',
      data: distribuidor,
    });
  } catch (error) {
    next(error);
  }
};

// Eliminar distribuidor
export const deleteDistribuidor = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await catalogoService.deleteDistribuidor(id);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

// Obtener estadísticas de distribuidor
export const getDistribuidorStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const stats = await catalogoService.getDistribuidorStats(id);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
