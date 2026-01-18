import { Request, Response, NextFunction } from 'express';
import * as productoService from '../services/producto.service';
import { CreateProductoInput, UpdateProductoInput, QueryProductosInput } from '../validators';

// Obtener todos los productos
export const getProductos = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = req.query as unknown as QueryProductosInput;
    const result = await productoService.getProductos(query);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

// Obtener producto por ID
export const getProductoById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const producto = await productoService.getProductoById(id);

    res.status(200).json({
      success: true,
      data: producto,
    });
  } catch (error) {
    next(error);
  }
};

// Crear producto
export const createProducto = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data: CreateProductoInput = req.body;
    const producto = await productoService.createProducto(data);

    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      data: producto,
    });
  } catch (error) {
    next(error);
  }
};

// Actualizar producto
export const updateProducto = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const data: UpdateProductoInput = req.body;
    const producto = await productoService.updateProducto(id, data);

    res.status(200).json({
      success: true,
      message: 'Producto actualizado exitosamente',
      data: producto,
    });
  } catch (error) {
    next(error);
  }
};

// Eliminar producto
export const deleteProducto = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await productoService.deleteProducto(id);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

// Obtener productos con stock bajo
export const getProductosStockBajo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const productos = await productoService.getProductosStockBajo();

    res.status(200).json({
      success: true,
      data: productos,
      total: productos.length,
    });
  } catch (error) {
    next(error);
  }
};
