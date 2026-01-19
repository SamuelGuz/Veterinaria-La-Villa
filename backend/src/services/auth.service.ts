import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { config } from '../config';
import { LoginInput, RegisterInput } from '../validators';
import { ConflictError, UnauthorizedError } from '../middleware/errorHandler';

interface AuthResult {
  user: {
    id: number;
    email: string;
    nombre: string;
    rol: string;
  };
  token: string;
}

// Generar token JWT
const generateToken = (userId: number, email: string, rol: string): string => {
  return jwt.sign(
    { userId, email, rol },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] }
  );
};

// Servicio de Login
export const login = async (data: LoginInput): Promise<AuthResult> => {
  const { email, password } = data;

  // Buscar usuario por email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new UnauthorizedError('Credenciales inválidas');
  }

  // Verificar contraseña
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new UnauthorizedError('Credenciales inválidas');
  }

  // Generar token
  const token = generateToken(user.id, user.email, user.rol);

  return {
    user: {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
    },
    token,
  };
};

// Servicio de Registro
export const register = async (data: RegisterInput): Promise<AuthResult> => {
  const { email, password, nombre, rol } = data;

  // Verificar si el email ya existe
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ConflictError('El email ya está registrado');
  }

  // Hash de la contraseña
  const hashedPassword = await bcrypt.hash(password, 10);

  // Crear usuario
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      nombre,
      rol: rol || 'USER',
    },
  });

  // Generar token
  const token = generateToken(user.id, user.email, user.rol);

  return {
    user: {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
    },
    token,
  };
};

// Obtener usuario por ID
export const getUserById = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      nombre: true,
      rol: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
};

// Actualizar usuario
export const updateUser = async (
  userId: number,
  data: { email?: string; nombre?: string; password?: string; rol?: string }
) => {
  const updateData: any = { ...data };

  // Si se proporciona nueva contraseña, hashearla
  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 10);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      nombre: true,
      rol: true,
      updatedAt: true,
    },
  });

  return user;
};

// Verificar token y obtener usuario
export const verifyToken = async (token: string) => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as {
      userId: number;
      email: string;
      rol: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
      },
    });

    return user;
  } catch {
    return null;
  }
};
