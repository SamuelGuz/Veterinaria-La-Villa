import { Request, Response } from 'express';
import { distribuidorService } from '../services/distribuidor.service';

export const getAll = async (req: Request, res: Response) => {
  try {
    const { activo } = req.query;
    const activoFilter = activo === 'true' ? true : activo === 'false' ? false : undefined;
    const distribuidores = await distribuidorService.getAll(activoFilter);
    res.status(200).json({
      success: true,
      data: distribuidores,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener distribuidores',
    });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const distribuidor = await distribuidorService.getById(Number(id));
    res.status(200).json({
      success: true,
      data: distribuidor,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error instanceof Error ? error.message : 'Distribuidor no encontrado',
    });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const distribuidor = await distribuidorService.create(req.body);
    res.status(201).json({
      success: true,
      data: distribuidor,
      message: 'Distribuidor creado exitosamente',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear distribuidor',
    });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const distribuidor = await distribuidorService.update(Number(id), req.body);
    res.status(200).json({
      success: true,
      data: distribuidor,
      message: 'Distribuidor actualizado exitosamente',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar distribuidor',
    });
  }
};

export const delete_ = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await distribuidorService.delete(Number(id));
    res.status(200).json({
      success: true,
      message: 'Distribuidor eliminado exitosamente',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar distribuidor',
    });
  }
};

export const restore = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const distribuidor = await distribuidorService.restore(Number(id));
    res.status(200).json({
      success: true,
      data: distribuidor,
      message: 'Distribuidor restaurado exitosamente',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al restaurar distribuidor',
    });
  }
};
