// ============================================
// Controlador de Números Autorizados
// ============================================

import { Request, Response } from 'express';
import {
  getAuthorizedNumbers,
  addAuthorizedNumber,
  updateAuthorizedNumber,
  deleteAuthorizedNumber,
} from '../services/whatsapp.service';

/**
 * Obtiene todos los números autorizados
 */
export async function getAllAuthorizedNumbers(req: Request, res: Response) {
  try {
    const numbers = await getAuthorizedNumbers();
    return res.json({
      success: true,
      data: numbers,
    });
  } catch (error) {
    console.error('Error getting authorized numbers:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al obtener los números autorizados',
    });
  }
}

/**
 * Agrega un número autorizado
 */
export async function createAuthorizedNumber(req: Request, res: Response) {
  try {
    const { telefono, nombre } = req.body;

    // Validaciones
    if (!telefono || !nombre) {
      return res.status(400).json({
        success: false,
        error: 'El teléfono y nombre son requeridos',
      });
    }

    // Normalizar teléfono (solo números)
    const normalizedPhone = telefono.replace(/\D/g, '');

    if (normalizedPhone.length < 10 || normalizedPhone.length > 15) {
      return res.status(400).json({
        success: false,
        error: 'El teléfono debe tener entre 10 y 15 dígitos',
      });
    }

    const number = await addAuthorizedNumber(normalizedPhone, nombre);
    return res.status(201).json({
      success: true,
      data: number,
      message: 'Número autorizado creado exitosamente',
    });
  } catch (error: any) {
    console.error('Error creating authorized number:', error);
    
    // Manejar error de duplicado
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Este número ya está registrado',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Error al crear el número autorizado',
    });
  }
}

/**
 * Actualiza un número autorizado
 */
export async function modifyAuthorizedNumber(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { nombre, activo } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'ID inválido',
      });
    }

    const updateData: { nombre?: string; activo?: boolean } = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (activo !== undefined) updateData.activo = activo;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No hay datos para actualizar',
      });
    }

    const number = await updateAuthorizedNumber(parseInt(id), updateData);
    return res.json({
      success: true,
      data: number,
      message: 'Número actualizado exitosamente',
    });
  } catch (error: any) {
    console.error('Error updating authorized number:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Número no encontrado',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Error al actualizar el número',
    });
  }
}

/**
 * Elimina un número autorizado
 */
export async function removeAuthorizedNumber(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'ID inválido',
      });
    }

    await deleteAuthorizedNumber(parseInt(id));
    return res.json({
      success: true,
      message: 'Número eliminado exitosamente',
    });
  } catch (error: any) {
    console.error('Error deleting authorized number:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Número no encontrado',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Error al eliminar el número',
    });
  }
}
