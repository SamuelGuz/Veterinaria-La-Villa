import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...\n');

  // ============================================
  // 1. CREAR USUARIO ADMINISTRADOR
  // ============================================
  console.log('👤 Creando usuario administrador...');
  
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@veterinaria.com' },
    update: {},
    create: {
      email: 'admin@veterinaria.com',
      password: hashedPassword,
      nombre: 'Administrador',
      rol: 'ADMIN',
    },
  });
  
  console.log(`   ✅ Usuario admin creado: ${admin.email}`);

  // ============================================
  // 2. CREAR CATEGORÍAS BÁSICAS
  // ============================================
  console.log('\n📁 Creando categorías...');
  
  const categorias = [
    { nombre: 'Medicamentos', descripcion: 'Medicinas y fármacos veterinarios' },
    { nombre: 'Alimentos', descripcion: 'Alimentos para mascotas y animales' },
    { nombre: 'Accesorios', descripcion: 'Accesorios y artículos para mascotas' },
    { nombre: 'Higiene', descripcion: 'Productos de higiene y cuidado' },
    { nombre: 'Vacunas', descripcion: 'Vacunas y biológicos' },
    { nombre: 'Suplementos', descripcion: 'Suplementos nutricionales y vitaminas' },
    { nombre: 'Antiparasitarios', descripcion: 'Productos antiparasitarios internos y externos' },
    { nombre: 'Material Quirúrgico', descripcion: 'Instrumentos y material quirúrgico' },
  ];

  for (const cat of categorias) {
    const categoria = await prisma.categoria.upsert({
      where: { id: categorias.indexOf(cat) + 1 },
      update: cat,
      create: cat,
    });
    console.log(`   ✅ Categoría creada: ${categoria.nombre}`);
  }

  // ============================================
  // 3. CREAR DISTRIBUIDORES DE EJEMPLO
  // ============================================
  console.log('\n🏢 Creando distribuidores...');
  
  const distribuidores = [
    {
      nombre: 'VetFarma S.A.',
      contacto: 'Juan Pérez',
      telefono: '555-0100',
      email: 'ventas@vetfarma.com',
      direccion: 'Calle Principal #123, Ciudad',
    },
    {
      nombre: 'PetSupplies México',
      contacto: 'María González',
      telefono: '555-0200',
      email: 'pedidos@petsupplies.mx',
      direccion: 'Av. Comercial #456, Ciudad',
    },
    {
      nombre: 'Distribuidora Animales Felices',
      contacto: 'Carlos López',
      telefono: '555-0300',
      email: 'info@animalesfelices.com',
      direccion: 'Boulevard Industrial #789, Ciudad',
    },
  ];

  for (const dist of distribuidores) {
    const distribuidor = await prisma.distribuidor.upsert({
      where: { id: distribuidores.indexOf(dist) + 1 },
      update: dist,
      create: dist,
    });
    console.log(`   ✅ Distribuidor creado: ${distribuidor.nombre}`);
  }

  // ============================================
  // 4. CREAR PRODUCTOS DE EJEMPLO
  // ============================================
  console.log('\n📦 Creando productos de ejemplo...');
  
  const productos = [
    // Medicamentos
    { nombre: 'Amoxicilina 500mg', categoriaId: 1, stockMinimo: 20, unidadMedida: 'tabletas', precioCompra: 15.00, precioVenta: 25.00 },
    { nombre: 'Meloxicam 15mg', categoriaId: 1, stockMinimo: 15, unidadMedida: 'tabletas', precioCompra: 20.00, precioVenta: 35.00 },
    { nombre: 'Enrofloxacina 50mg', categoriaId: 1, stockMinimo: 10, unidadMedida: 'tabletas', precioCompra: 25.00, precioVenta: 45.00 },
    
    // Alimentos
    { nombre: 'Croquetas Premium Perro 20kg', categoriaId: 2, stockMinimo: 5, unidadMedida: 'bolsas', precioCompra: 450.00, precioVenta: 650.00 },
    { nombre: 'Croquetas Gato Adulto 10kg', categoriaId: 2, stockMinimo: 8, unidadMedida: 'bolsas', precioCompra: 280.00, precioVenta: 420.00 },
    { nombre: 'Alimento Húmedo Perro 400g', categoriaId: 2, stockMinimo: 24, unidadMedida: 'latas', precioCompra: 25.00, precioVenta: 40.00 },
    
    // Accesorios
    { nombre: 'Collar Antipulgas Perro Grande', categoriaId: 3, stockMinimo: 10, unidadMedida: 'unidades', precioCompra: 80.00, precioVenta: 150.00 },
    { nombre: 'Correa Retráctil 5m', categoriaId: 3, stockMinimo: 5, unidadMedida: 'unidades', precioCompra: 120.00, precioVenta: 220.00 },
    
    // Higiene
    { nombre: 'Shampoo Antipulgas 500ml', categoriaId: 4, stockMinimo: 12, unidadMedida: 'frascos', precioCompra: 45.00, precioVenta: 85.00 },
    { nombre: 'Toallitas Húmedas Mascotas x100', categoriaId: 4, stockMinimo: 15, unidadMedida: 'paquetes', precioCompra: 35.00, precioVenta: 60.00 },
    
    // Vacunas
    { nombre: 'Vacuna Rabia', categoriaId: 5, stockMinimo: 20, unidadMedida: 'dosis', precioCompra: 50.00, precioVenta: 120.00 },
    { nombre: 'Vacuna Parvovirus', categoriaId: 5, stockMinimo: 15, unidadMedida: 'dosis', precioCompra: 65.00, precioVenta: 150.00 },
    { nombre: 'Vacuna Triple Felina', categoriaId: 5, stockMinimo: 10, unidadMedida: 'dosis', precioCompra: 80.00, precioVenta: 180.00 },
    
    // Suplementos
    { nombre: 'Vitaminas para Cachorro', categoriaId: 6, stockMinimo: 8, unidadMedida: 'frascos', precioCompra: 70.00, precioVenta: 130.00 },
    { nombre: 'Omega 3 Perros y Gatos', categoriaId: 6, stockMinimo: 10, unidadMedida: 'frascos', precioCompra: 90.00, precioVenta: 160.00 },
    
    // Antiparasitarios
    { nombre: 'Desparasitante Oral Perro', categoriaId: 7, stockMinimo: 25, unidadMedida: 'tabletas', precioCompra: 18.00, precioVenta: 35.00 },
    { nombre: 'Pipeta Antipulgas Perro Grande', categoriaId: 7, stockMinimo: 20, unidadMedida: 'unidades', precioCompra: 55.00, precioVenta: 100.00 },
    
    // Material Quirúrgico
    { nombre: 'Jeringas 5ml x100', categoriaId: 8, stockMinimo: 3, unidadMedida: 'cajas', precioCompra: 120.00, precioVenta: 200.00 },
    { nombre: 'Guantes Látex x100', categoriaId: 8, stockMinimo: 5, unidadMedida: 'cajas', precioCompra: 80.00, precioVenta: 140.00 },
    { nombre: 'Gasas Estériles x100', categoriaId: 8, stockMinimo: 4, unidadMedida: 'cajas', precioCompra: 45.00, precioVenta: 80.00 },
  ];

  for (const prod of productos) {
    const producto = await prisma.producto.create({
      data: prod,
    });
    
    // Crear registro en inventario_actual
    await prisma.inventarioActual.create({
      data: {
        productoId: producto.id,
        cantidadActual: 0,
      },
    });
    
    console.log(`   ✅ Producto creado: ${producto.nombre}`);
  }

  // ============================================
  // 5. CREAR MOVIMIENTOS DE EJEMPLO (COMPRAS INICIALES)
  // ============================================
  console.log('\n📊 Creando movimientos de inventario inicial...');
  
  const productosCreados = await prisma.producto.findMany();
  
  for (const producto of productosCreados) {
    const cantidadInicial = Math.floor(Math.random() * 50) + 20; // Entre 20 y 70
    
    const movimiento = await prisma.movimientoInventario.create({
      data: {
        productoId: producto.id,
        tipoMovimiento: 'COMPRA',
        cantidad: cantidadInicial,
        precioUnitario: producto.precioCompra || 0,
        total: cantidadInicial * Number(producto.precioCompra || 0),
        distribuidorId: Math.floor(Math.random() * 3) + 1,
        factura: `FAC-${String(producto.id).padStart(4, '0')}`,
        usuarioId: admin.id,
        notas: 'Stock inicial del sistema',
      },
    });
    
    // Actualizar inventario actual
    await prisma.inventarioActual.update({
      where: { productoId: producto.id },
      data: { cantidadActual: cantidadInicial },
    });
    
    console.log(`   ✅ Stock inicial agregado: ${producto.nombre} (${cantidadInicial} unidades)`);
  }

  console.log('\n✨ Seed completado exitosamente!\n');
  console.log('📋 Resumen:');
  console.log(`   - Usuarios: 1`);
  console.log(`   - Categorías: ${categorias.length}`);
  console.log(`   - Distribuidores: ${distribuidores.length}`);
  console.log(`   - Productos: ${productos.length}`);
  console.log(`   - Movimientos iniciales: ${productos.length}`);
  console.log('\n🔑 Credenciales de acceso:');
  console.log('   Email: admin@veterinaria.com');
  console.log('   Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
