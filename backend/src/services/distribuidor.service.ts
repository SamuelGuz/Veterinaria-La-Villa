import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DistribuidorService {
  // Obtener todos los distribuidores
  async getAll(activo?: boolean) {
    const where = activo !== undefined ? { activo } : {};
    return await prisma.distribuidor.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Obtener un distribuidor por ID
  async getById(id: number) {
    const distribuidor = await prisma.distribuidor.findUnique({
      where: { id },
      include: {
        movimientos: {
          select: {
            id: true,
            cantidad: true,
            tipoMovimiento: true,
            total: true,
            fecha: true,
            createdAt: true,
          },
        },
      },
    });

    if (!distribuidor) {
      throw new Error('Distribuidor no encontrado');
    }

    return distribuidor;
  }

  // Crear un nuevo distribuidor
  async create(data: {
    nombre: string;
    contacto?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
  }) {
    return await prisma.distribuidor.create({
      data: {
        nombre: data.nombre,
        contacto: data.contacto,
        telefono: data.telefono,
        email: data.email,
        direccion: data.direccion,
        activo: true,
      },
    });
  }

  // Actualizar un distribuidor
  async update(
    id: number,
    data: {
      nombre?: string;
      contacto?: string;
      telefono?: string;
      email?: string;
      direccion?: string;
      activo?: boolean;
    }
  ) {
    const distribuidor = await prisma.distribuidor.findUnique({
      where: { id },
    });

    if (!distribuidor) {
      throw new Error('Distribuidor no encontrado');
    }

    return await prisma.distribuidor.update({
      where: { id },
      data,
    });
  }

  // Eliminar un distribuidor (soft delete)
  async delete(id: number) {
    const distribuidor = await prisma.distribuidor.findUnique({
      where: { id },
    });

    if (!distribuidor) {
      throw new Error('Distribuidor no encontrado');
    }

    return await prisma.distribuidor.update({
      where: { id },
      data: { activo: false },
    });
  }

  // Restaurar un distribuidor eliminado
  async restore(id: number) {
    return await prisma.distribuidor.update({
      where: { id },
      data: { activo: true },
    });
  }
}

export const distribuidorService = new DistribuidorService();
