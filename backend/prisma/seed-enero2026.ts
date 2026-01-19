import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Limpiando base de datos...');
  
  // Limpiar en orden correcto por las foreign keys
  await prisma.movimientoInventario.deleteMany();
  await prisma.inventarioActual.deleteMany();
  await prisma.producto.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.distribuidor.deleteMany();
  // Mantener usuarios
  
  console.log('✅ Base de datos limpia');

  // Crear usuario admin si no existe
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
  console.log('👤 Usuario admin verificado');

  // Crear categorías
  console.log('📁 Creando categorías...');
  const categorias = await Promise.all([
    prisma.categoria.create({ data: { nombre: 'Guantes y Protección', descripcion: 'Guantes de todo tipo y equipos de protección personal' } }),
    prisma.categoria.create({ data: { nombre: 'Jeringas y Agujas', descripcion: 'Jeringas desechables y agujas de todo tipo' } }),
    prisma.categoria.create({ data: { nombre: 'Medicamentos Veterinarios', descripcion: 'Medicamentos, antibióticos y tratamientos' } }),
    prisma.categoria.create({ data: { nombre: 'Equipos de Fumigación', descripcion: 'Fumigadoras y accesorios' } }),
    prisma.categoria.create({ data: { nombre: 'Ferretería', descripcion: 'Puntillas, alambre, herramientas, machetas, fundas' } }),
    prisma.categoria.create({ data: { nombre: 'Equipos de Montura', descripcion: 'Frenos, riendas, sillas, sinchas y accesorios equinos' } }),
    prisma.categoria.create({ data: { nombre: 'Accesorios Mascotas', descripcion: 'Collares, correas y accesorios para perros y gatos' } }),
    prisma.categoria.create({ data: { nombre: 'Sales y Minerales', descripcion: 'Sales mineralizadas y suplementos' } }),
    prisma.categoria.create({ data: { nombre: 'Vacunas', descripcion: 'Vacunas para animales' } }),
    prisma.categoria.create({ data: { nombre: 'Alimentos Mascotas', descripcion: 'Alimentos para perros y gatos' } }),
    prisma.categoria.create({ data: { nombre: 'Control de Plagas', descripcion: 'Insecticidas, raticidas y control de plagas' } }),
    prisma.categoria.create({ data: { nombre: 'Accesorios Varios', descripcion: 'Llaveros, navajas, linternas, estuches y otros' } }),
    prisma.categoria.create({ data: { nombre: 'Lazos y Cuerdas', descripcion: 'Lazos, cuerdas y cordones' } }),
    prisma.categoria.create({ data: { nombre: 'Avicultura', descripcion: 'Bebederos, comederos y accesorios para aves' } }),
    prisma.categoria.create({ data: { nombre: 'Agroinsumos', descripcion: 'Herbicidas, fungicidas y productos agrícolas' } }),
    prisma.categoria.create({ data: { nombre: 'Higiene Mascotas', descripcion: 'Shampoos, jabones y productos de higiene' } }),
  ]);

  const catMap: Record<string, number> = {};
  categorias.forEach(c => { catMap[c.nombre] = c.id; });

  // Crear distribuidores
  console.log('🚚 Creando distribuidores...');
  const distribuidores = await Promise.all([
    prisma.distribuidor.create({ data: { nombre: 'Paisas', contacto: 'Contacto Paisas' } }),
    prisma.distribuidor.create({ data: { nombre: 'Agro Paisa', contacto: 'Contacto Agro Paisa' } }),
    prisma.distribuidor.create({ data: { nombre: 'Mil Herrajes', contacto: 'Contacto Mil Herrajes' } }),
  ]);

  const distMap: Record<string, number> = {};
  distribuidores.forEach(d => { distMap[d.nombre.toLowerCase()] = d.id; });

  // Función para mapear distribuidor
  const getDistId = (dist: string | null): number | null => {
    if (!dist) return null;
    const d = dist.toLowerCase().trim();
    if (d === 'paisas') return distMap['paisas'];
    if (d.includes('agro') && d.includes('paisa')) return distMap['agro paisa'];
    if (d.includes('herraje') || d === 'mil herrajes') return distMap['mil herrajes'];
    return null;
  };

  // Función para determinar categoría por nombre del producto
  const getCatId = (nombre: string): number => {
    const n = nombre.toLowerCase();
    
    // Guantes
    if (n.includes('guante')) return catMap['Guantes y Protección'];
    if (n.includes('tapabocas') || n.includes('respirador')) return catMap['Guantes y Protección'];
    if (n.includes('manga') && (n.includes('palpar') || n.includes('tela'))) return catMap['Guantes y Protección'];
    
    // Jeringas y Agujas
    if (n.includes('jeringa') || n.includes('aguja')) return catMap['Jeringas y Agujas'];
    
    // Vacunas
    if (n.includes('vacuna')) return catMap['Vacunas'];
    
    // Fumigadoras
    if (n.includes('fumigador')) return catMap['Equipos de Fumigación'];
    
    // Ferretería (machetas, fundas, alambres, etc.)
    if (n.includes('macheta') || n.includes('machete')) return catMap['Ferretería'];
    if (n.includes('funda') && (n.includes('gallo') || n.includes('socorrana') || n.includes('puntas'))) return catMap['Ferretería'];
    if (n.includes('puntilla') || n.includes('alambre') || n.includes('grapa')) return catMap['Ferretería'];
    if (n.includes('cuchillo') || n.includes('navaja') && n.includes('capar')) return catMap['Ferretería'];
    if (n.includes('hilo') && n.includes('atafa')) return catMap['Ferretería'];
    if (n.includes('plastico') && n.includes('calibre')) return catMap['Ferretería'];
    if (n.includes('canasto') && n.includes('cafetero')) return catMap['Ferretería'];
    if (n.includes('tela verde')) return catMap['Ferretería'];
    
    // Equipos de Montura
    if (n.includes('sinch') || n.includes('arcio') || n.includes('baticola') || n.includes('cuellero')) return catMap['Equipos de Montura'];
    if (n.includes('alfombra')) return catMap['Equipos de Montura'];
    
    // Accesorios Mascotas
    if (n.includes('collar') || n.includes('cuello') || n.includes('pechera')) return catMap['Accesorios Mascotas'];
    if (n.includes('bozal') || n.includes('pañoleta')) return catMap['Accesorios Mascotas'];
    
    // Sales y Minerales
    if (n.includes('sal ') || n.includes('sal ') || n.includes('premezcla') || n.includes('mineral') || n.includes('ganafo')) return catMap['Sales y Minerales'];
    if (n.startsWith('sal ')) return catMap['Sales y Minerales'];
    
    // Alimentos Mascotas
    if (n.includes('chunky') || n.includes('ringo') || n.includes('pedegree') || n.includes('italcan')) return catMap['Alimentos Mascotas'];
    if (n.includes('delidog') || n.includes('menu natural') || n.includes('qdican')) return catMap['Alimentos Mascotas'];
    if (n.includes('bombonera') || n.includes('nutri bar')) return catMap['Alimentos Mascotas'];
    if (n.includes('arena gatos')) return catMap['Alimentos Mascotas'];
    if (n.includes('lactoremplazador')) return catMap['Alimentos Mascotas'];
    if (n.includes('maiz vermifugo')) return catMap['Alimentos Mascotas'];
    
    // Control de Plagas
    if (n.includes('campeon') || n.includes('cucaracha') || n.includes('trampa')) return catMap['Control de Plagas'];
    if (n.includes('raid') || n.includes('hormiga') || n.includes('hormitox')) return catMap['Control de Plagas'];
    if (n.includes('sicario') || n.includes('lorsban') || n.includes('neftalina')) return catMap['Control de Plagas'];
    if (n.includes('tabla') && n.includes('raton')) return catMap['Control de Plagas'];
    if (n.includes('gel cucaracha') || n.includes('cinta') && n.includes('mosca')) return catMap['Control de Plagas'];
    if (n.includes('isovex') && n.includes('hormiga')) return catMap['Control de Plagas'];
    if (n.includes('finpronil')) return catMap['Control de Plagas'];
    if (n.includes('bolfo')) return catMap['Control de Plagas'];
    
    // Accesorios Varios
    if (n.includes('llavero')) return catMap['Accesorios Varios'];
    if (n.includes('estuche') && (n.includes('navaja') || n.includes('celular') || n.includes('cuero'))) return catMap['Accesorios Varios'];
    if (n.includes('forro') && n.includes('celular')) return catMap['Accesorios Varios'];
    if (n.includes('portacuchillo')) return catMap['Accesorios Varios'];
    if (n.includes('navajas surtidas') || n.includes('patacabra')) return catMap['Accesorios Varios'];
    if (n.includes('bolsa') && n.includes('café')) return catMap['Accesorios Varios'];
    if (n.includes('semiponcho')) return catMap['Accesorios Varios'];
    if (n.includes('rollos') && n.includes('licra')) return catMap['Accesorios Varios'];
    
    // Lazos y Cuerdas
    if (n.includes('lazo') || n.includes('cuerda')) return catMap['Lazos y Cuerdas'];
    
    // Avicultura
    if (n.includes('bebedero') || n.includes('comedero')) return catMap['Avicultura'];
    
    // Agroinsumos
    if (n.includes('metsulfuron') || n.includes('partner') || n.includes('parnerth')) return catMap['Agroinsumos'];
    if (n.includes('emboscada') || n.includes('glicocafe') || n.includes('manzate')) return catMap['Agroinsumos'];
    if (n.includes('pilarsato') || n.includes('panzer') && n.includes('litro')) return catMap['Agroinsumos'];
    
    // Higiene Mascotas
    if (n.includes('shampu') || n.includes('champu') || n.includes('shampoo')) return catMap['Higiene Mascotas'];
    if (n.includes('jabon') && n.includes('antipulgas')) return catMap['Higiene Mascotas'];
    
    // Por defecto medicamentos veterinarios
    return catMap['Medicamentos Veterinarios'];
  };

  // Datos del inventario real - ENERO 2026
  interface InventarioItem {
    fecha: string;
    nombre: string;
    cantidad: number | null;
    precioCompra: number | null;
    distribuidor: string | null;
    precioVenta: number | null;
  }
  
  const inventarioReal: InventarioItem[] = [
    { fecha: '2026-01-17', nombre: 'guantes gloves rojo y negro', cantidad: 15, precioCompra: 3000, distribuidor: null, precioVenta: 6000 },
    { fecha: '2026-01-17', nombre: 'guantes de cuero largo', cantidad: 2, precioCompra: 10000, distribuidor: null, precioVenta: 30000 },
    { fecha: '2026-01-17', nombre: 'guantes de cuero corto', cantidad: 3, precioCompra: 5000, distribuidor: null, precioVenta: 10500 },
    { fecha: '2026-01-17', nombre: 'guantes guadaña tela blanco y negro', cantidad: 14, precioCompra: 3000, distribuidor: null, precioVenta: 6000 },
    { fecha: '2026-01-17', nombre: 'campeon cucrachas', cantidad: 11, precioCompra: 400, distribuidor: 'paisas', precioVenta: 1000 },
    { fecha: '2026-01-17', nombre: 'jeringas 5 ml', cantidad: 100, precioCompra: 250, distribuidor: null, precioVenta: 500 },
    { fecha: '2026-01-17', nombre: 'jeringas 2 ml', cantidad: 124, precioCompra: 250, distribuidor: null, precioVenta: 450 },
    { fecha: '2026-01-17', nombre: 'jeringas 10 ml', cantidad: 132, precioCompra: 300, distribuidor: null, precioVenta: 1000 },
    { fecha: '2026-01-17', nombre: 'jeringas 20 ml', cantidad: 103, precioCompra: 420, distribuidor: null, precioVenta: 1000 },
    { fecha: '2026-01-17', nombre: 'jeringas 3ml', cantidad: 58, precioCompra: 250, distribuidor: null, precioVenta: 500 },
    { fecha: '2026-01-17', nombre: 'jeringas de insulina', cantidad: 134, precioCompra: 168, distribuidor: null, precioVenta: 500 },
    { fecha: '2026-01-17', nombre: 'agujas 16 X 1/2', cantidad: null, precioCompra: 130, distribuidor: null, precioVenta: 250 },
    { fecha: '2026-01-17', nombre: 'mangas palpar', cantidad: 36, precioCompra: 900, distribuidor: null, precioVenta: 2000 },
    { fecha: '2026-01-17', nombre: 'agujas 18 1/2', cantidad: 177, precioCompra: 150, distribuidor: null, precioVenta: 250 },
    { fecha: '2026-01-17', nombre: 'respirador industrial', cantidad: 1, precioCompra: 15825, distribuidor: 'agro paisa', precioVenta: 23000 },
    { fecha: '2026-01-17', nombre: 'agujas sutura recta', cantidad: 11, precioCompra: 1000, distribuidor: 'mil herrajes', precioVenta: 2500 },
    { fecha: '2026-01-17', nombre: 'agujas sutura curva', cantidad: 1, precioCompra: 1000, distribuidor: null, precioVenta: 1500 },
    { fecha: '2026-01-17', nombre: 'agujas super larga', cantidad: 1, precioCompra: 1200, distribuidor: 'mil herrajes', precioVenta: 1800 },
    { fecha: '2026-01-17', nombre: 'aguja recta pequeña', cantidad: 4, precioCompra: 1000, distribuidor: null, precioVenta: 1500 },
    { fecha: '2026-01-17', nombre: 'guantes quirurgicos x pares', cantidad: 100, precioCompra: 1000, distribuidor: null, precioVenta: 1500 },
    { fecha: '2026-01-17', nombre: 'tapabocas desechables', cantidad: 85, precioCompra: 250, distribuidor: null, precioVenta: 500 },
    { fecha: '2026-01-17', nombre: 'llaveros animales finos', cantidad: 7, precioCompra: 10000, distribuidor: null, precioVenta: 12000 },
    { fecha: '2026-01-17', nombre: 'llaveros comunes', cantidad: 10, precioCompra: 5000, distribuidor: null, precioVenta: 7000 },
    { fecha: '2026-01-17', nombre: 'cuchillos solos', cantidad: 8, precioCompra: 2000, distribuidor: null, precioVenta: 2500 },
    { fecha: '2025-01-24', nombre: 'vacuna neumodiar', cantidad: 27, precioCompra: 4760, distribuidor: null, precioVenta: 7500 },
    { fecha: '2025-01-24', nombre: 'prendizoo 20 MG tabletas', cantidad: 36, precioCompra: 900, distribuidor: null, precioVenta: 1800 },
    { fecha: '2025-01-24', nombre: 'Algicam 4MgX 10 tabletas perros', cantidad: 10, precioCompra: 2400, distribuidor: null, precioVenta: 3500 },
    { fecha: '2025-01-24', nombre: 'Diciclin 200 tableta', cantidad: 16, precioCompra: 1000, distribuidor: null, precioVenta: 2500 },
    { fecha: '2025-01-24', nombre: 'Diciclin 100 tableta', cantidad: 30, precioCompra: 1200, distribuidor: null, precioVenta: 2000 },
    { fecha: '2025-01-24', nombre: 'zimpar tabletas', cantidad: 19, precioCompra: 1360, distribuidor: null, precioVenta: 2000 },
    { fecha: '2025-01-24', nombre: 'Derrivon X 250 ml', cantidad: 1, precioCompra: 33000, distribuidor: null, precioVenta: 43000 },
    { fecha: '2025-01-24', nombre: 'Nexabest ungüento X 200 grs', cantidad: 2, precioCompra: 26000, distribuidor: null, precioVenta: 32000 },
    { fecha: '2025-01-24', nombre: 'Arciones', cantidad: 4, precioCompra: 15000, distribuidor: null, precioVenta: 20000 },
    { fecha: '2025-01-24', nombre: 'fumigadora Activa', cantidad: 2, precioCompra: 232200, distribuidor: null, precioVenta: 295000 },
    { fecha: '2025-01-24', nombre: 'lazos', cantidad: null, precioCompra: null, distribuidor: null, precioVenta: null },
    { fecha: '2025-03-06', nombre: 'purga canipets 2 ml', cantidad: 11, precioCompra: 4200, distribuidor: null, precioVenta: 5000 },
    { fecha: '2025-03-06', nombre: 'purga jeringa perros CANIPETS X 5 ml', cantidad: 6, precioCompra: 5000, distribuidor: null, precioVenta: 7000 },
    { fecha: '2025-03-06', nombre: 'ultrachoiche X 10 DS', cantidad: 8, precioCompra: 15000, distribuidor: null, precioVenta: 20000 },
    { fecha: '2025-03-06', nombre: 'azul metileno sobre', cantidad: 28, precioCompra: 6400, distribuidor: null, precioVenta: 7500 },
    { fecha: '2025-03-06', nombre: 'funda socorrana solas', cantidad: 9, precioCompra: 22000, distribuidor: null, precioVenta: 27000 },
    { fecha: '2025-03-06', nombre: 'macheta solas', cantidad: 13, precioCompra: 18000, distribuidor: null, precioVenta: 22000 },
    { fecha: '2025-03-06', nombre: 'premezcla mineral GanafoX kilos', cantidad: 33, precioCompra: 9200, distribuidor: null, precioVenta: 12000 },
    { fecha: '2025-03-06', nombre: 'italcan X 30 kilos', cantidad: 26, precioCompra: 3666, distribuidor: null, precioVenta: 5000 },
    { fecha: '2025-03-06', nombre: 'lazo matizado 8 mm X mts', cantidad: 300, precioCompra: 963, distribuidor: null, precioVenta: 1500 },
    { fecha: '2025-03-06', nombre: 'destetadores pequeños', cantidad: 36, precioCompra: 1500, distribuidor: null, precioVenta: 4000 },
    { fecha: '2025-03-06', nombre: 'trevesec 30 ml', cantidad: 2, precioCompra: 19000, distribuidor: null, precioVenta: 28000 },
    { fecha: '2025-03-06', nombre: 'sobres pedegree', cantidad: 36, precioCompra: 2537, distribuidor: null, precioVenta: 3000 },
    { fecha: '2025-03-06', nombre: 'shampu cojin antipulgas', cantidad: 7, precioCompra: 3898, distribuidor: null, precioVenta: 6000 },
    { fecha: '2025-03-06', nombre: 'raid antipulgas', cantidad: 4, precioCompra: 16953, distribuidor: null, precioVenta: 19000 },
    { fecha: '2025-03-06', nombre: 'raid azul', cantidad: 9, precioCompra: 16415, distribuidor: null, precioVenta: 18500 },
    { fecha: '2025-04-16', nombre: 'chunky adulto x 500 grs', cantidad: 9, precioCompra: 3504, distribuidor: null, precioVenta: 4800 },
    { fecha: '2025-04-16', nombre: 'chunky cachorro x 500 grs', cantidad: 10, precioCompra: 4537, distribuidor: null, precioVenta: 5000 },
    { fecha: '2025-04-16', nombre: 'Delidog pote comida mojada', cantidad: 7, precioCompra: 3982, distribuidor: null, precioVenta: 5000 },
    { fecha: '2025-04-16', nombre: 'Menu natural surtido salchichon', cantidad: 2, precioCompra: 6000, distribuidor: null, precioVenta: 7000 },
    { fecha: '2025-04-16', nombre: 'Menu natural cremoso', cantidad: 54, precioCompra: 1645, distribuidor: null, precioVenta: 2000 },
    { fecha: '2025-04-16', nombre: 'bombonera Nutri bar chocolatina', cantidad: 18, precioCompra: 2356, distribuidor: null, precioVenta: 2500 },
    { fecha: '2025-04-16', nombre: 'Potenzol 3000 Lt', cantidad: 1, precioCompra: 31800, distribuidor: null, precioVenta: 35000 },
    { fecha: '2025-04-16', nombre: 'cuelleros grandes', cantidad: 3, precioCompra: 6000, distribuidor: null, precioVenta: 10000 },
    { fecha: '2025-04-16', nombre: 'oxitetraciclina Mk 50 X 50 ML', cantidad: 9, precioCompra: 10100, distribuidor: null, precioVenta: 14500 },
    { fecha: '2025-04-16', nombre: 'Oxitetraciclina Mk 200 X 50 ML', cantidad: 10, precioCompra: 21700, distribuidor: null, precioVenta: 28500 },
    { fecha: '2025-04-16', nombre: 'Dexapen 10 ml', cantidad: 4, precioCompra: 18200, distribuidor: null, precioVenta: 24000 },
    { fecha: '2025-04-16', nombre: 'trampa corriente grande', cantidad: 11, precioCompra: 3500, distribuidor: null, precioVenta: 6000 },
    { fecha: '2025-04-16', nombre: 'trampa madera grande', cantidad: 7, precioCompra: 8000, distribuidor: null, precioVenta: 10000 },
    { fecha: '2025-06-01', nombre: 'Aguja metalicas', cantidad: 36, precioCompra: 1092, distribuidor: null, precioVenta: 2000 },
    { fecha: '2025-06-01', nombre: 'iverhose jeringa', cantidad: 8, precioCompra: 17500, distribuidor: null, precioVenta: 25000 },
    { fecha: '2025-06-01', nombre: 'garrabaño X 33 ml', cantidad: 6, precioCompra: 11300, distribuidor: null, precioVenta: 13500 },
    { fecha: '2025-06-01', nombre: 'paravet sobre X 15 grs', cantidad: 62, precioCompra: 3200, distribuidor: null, precioVenta: 5500 },
    { fecha: '2025-06-01', nombre: 'jeringa plastica X 20 ml', cantidad: 2, precioCompra: 30252, distribuidor: null, precioVenta: 40000 },
    { fecha: '2025-06-01', nombre: 'hilo atafacil', cantidad: 11, precioCompra: 3500, distribuidor: null, precioVenta: 4500 },
    { fecha: '2025-06-01', nombre: 'hormitox hormigas', cantidad: 9, precioCompra: 13000, distribuidor: null, precioVenta: 17000 },
    { fecha: '2025-06-01', nombre: 'catabras', cantidad: 7, precioCompra: 10500, distribuidor: null, precioVenta: 14000 },
    { fecha: '2025-06-01', nombre: 'rollos de licra pequeña', cantidad: 8, precioCompra: 1000, distribuidor: null, precioVenta: 2000 },
    { fecha: '2025-06-01', nombre: 'fundas rabo de gallo', cantidad: 12, precioCompra: 27000, distribuidor: null, precioVenta: 30000 },
    { fecha: '2025-06-01', nombre: 'sicario liquido', cantidad: 13, precioCompra: 2500, distribuidor: null, precioVenta: 4000 },
    { fecha: '2025-06-01', nombre: 'guantes azul corriente tela', cantidad: 12, precioCompra: 2500, distribuidor: null, precioVenta: 4000 },
    { fecha: '2025-06-01', nombre: 'bolsa neftalina', cantidad: 9, precioCompra: 2800, distribuidor: null, precioVenta: 5000 },
    { fecha: '2025-06-01', nombre: 'jabon antipulgas cannamor', cantidad: 2, precioCompra: 11858, distribuidor: null, precioVenta: 13000 },
    { fecha: '2025-06-01', nombre: 'sal blanca 40 kg', cantidad: 11, precioCompra: 15500, distribuidor: null, precioVenta: 28000 },
    { fecha: '2025-06-01', nombre: 'sal blanca 50 kg', cantidad: 3, precioCompra: 18000, distribuidor: null, precioVenta: 31000 },
    { fecha: '2025-06-01', nombre: 'sal pigmentada X 50 kg', cantidad: 3, precioCompra: 18000, distribuidor: null, precioVenta: 32000 },
    { fecha: '2025-06-01', nombre: 'sal pigmentada roja x kilos', cantidad: 9, precioCompra: 2700, distribuidor: null, precioVenta: 4500 },
    { fecha: '2025-06-01', nombre: 'sal 30 kilos', cantidad: 10, precioCompra: 12000, distribuidor: null, precioVenta: 23000 },
    { fecha: '2025-06-01', nombre: 'Vacuna parvovirosis', cantidad: 30, precioCompra: 11000, distribuidor: null, precioVenta: 15500 },
    { fecha: '2025-06-01', nombre: 'vacuna triple', cantidad: 14, precioCompra: 15500, distribuidor: null, precioVenta: 25000 },
    { fecha: '2025-06-01', nombre: 'vacuna quintuple', cantidad: 8, precioCompra: 22500, distribuidor: null, precioVenta: 30000 },
    { fecha: '2025-06-01', nombre: 'Tripen 9 U:I', cantidad: 2, precioCompra: 38000, distribuidor: null, precioVenta: 42000 },
    { fecha: '2025-06-01', nombre: 'Triplen 6 U.I', cantidad: 2, precioCompra: 29000, distribuidor: null, precioVenta: 32000 },
    { fecha: '2025-06-01', nombre: 'tabla de raton verde', cantidad: 6, precioCompra: 2500, distribuidor: null, precioVenta: 4000 },
    { fecha: '2025-06-01', nombre: 'tabla raton amarilla', cantidad: 8, precioCompra: 3500, distribuidor: null, precioVenta: 5500 },
    { fecha: '2025-06-01', nombre: 'gel cucarachas', cantidad: 9, precioCompra: 4500, distribuidor: null, precioVenta: 7000 },
    { fecha: '2025-06-23', nombre: 'iventrina X 250 ml', cantidad: 15, precioCompra: 13100, distribuidor: null, precioVenta: 17000 },
    { fecha: '2025-06-23', nombre: 'Grapa larga', cantidad: 19, precioCompra: 11281, distribuidor: null, precioVenta: 13000 },
    { fecha: '2025-06-23', nombre: 'piperazina pastilla sobre', cantidad: 144, precioCompra: 1083, distribuidor: null, precioVenta: 1500 },
    { fecha: '2025-06-23', nombre: 'ankofen pastillas', cantidad: 20, precioCompra: 1900, distribuidor: null, precioVenta: 2500 },
    { fecha: '2025-06-23', nombre: 'anpromax sobre', cantidad: 24, precioCompra: 9800, distribuidor: null, precioVenta: 13000 },
    { fecha: '2025-06-23', nombre: 'navajas surtidas', cantidad: 10, precioCompra: 9500, distribuidor: null, precioVenta: 13000 },
    { fecha: '2025-06-23', nombre: 'italcan perros X kilos', cantidad: 30, precioCompra: 3666, distribuidor: null, precioVenta: 4500 },
    { fecha: '2025-06-23', nombre: 'lactato de ringer 1000 ml', cantidad: 3, precioCompra: 5900, distribuidor: null, precioVenta: 8000 },
    { fecha: '2025-06-23', nombre: 'cloruro de sodio 1000 ml', cantidad: 6, precioCompra: 5200, distribuidor: null, precioVenta: 7500 },
    { fecha: '2025-06-23', nombre: 'cloruro de sodio y lactato 500 ml', cantidad: 2, precioCompra: 3900, distribuidor: null, precioVenta: 5000 },
    { fecha: '2025-07-07', nombre: 'patacabra navaja', cantidad: 11, precioCompra: 2000, distribuidor: null, precioVenta: 3000 },
    { fecha: '2025-07-07', nombre: 'cipertop x 375 ml', cantidad: 6, precioCompra: 23100, distribuidor: null, precioVenta: 30000 },
    { fecha: '2025-07-07', nombre: 'navajas capar', cantidad: 2, precioCompra: 10000, distribuidor: null, precioVenta: 15000 },
    { fecha: '2025-07-07', nombre: 'romade cojin', cantidad: 146, precioCompra: 1900, distribuidor: null, precioVenta: 3500 },
    { fecha: '2025-07-07', nombre: 'calsyn oral', cantidad: 50, precioCompra: 5600, distribuidor: null, precioVenta: 7800 },
    { fecha: '2025-07-07', nombre: 'Eivem 200 X 250 ml', cantidad: 3, precioCompra: 77800, distribuidor: null, precioVenta: 85000 },
    { fecha: '2025-07-07', nombre: 'Meloxivem oral X 10 ml', cantidad: 8, precioCompra: 7000, distribuidor: null, precioVenta: 7500 },
    { fecha: '2025-07-07', nombre: 'Emivem 200 X 100', cantidad: 2, precioCompra: 35600, distribuidor: null, precioVenta: 44000 },
    { fecha: '2025-07-07', nombre: 'Purgacan perros 5 cm', cantidad: 9, precioCompra: 6400, distribuidor: null, precioVenta: 8000 },
    { fecha: '2025-08-10', nombre: 'Metsulfuron 100 grs', cantidad: 5, precioCompra: 12544, distribuidor: null, precioVenta: 16000 },
    { fecha: '2025-08-10', nombre: 'Parnerth 110 grs', cantidad: 5, precioCompra: 15500, distribuidor: null, precioVenta: 18000 },
    { fecha: '2025-08-10', nombre: 'Partner 22 grs', cantidad: 10, precioCompra: 5000, distribuidor: null, precioVenta: 7000 },
    { fecha: '2025-08-10', nombre: 'Emboscada x 15 grs', cantidad: 4, precioCompra: 4000, distribuidor: null, precioVenta: 6000 },
    { fecha: '2025-08-10', nombre: 'sobre pedegre', cantidad: 38, precioCompra: 2385, distribuidor: null, precioVenta: 3000 },
    { fecha: '2025-08-10', nombre: 'arena gatos', cantidad: 3, precioCompra: 15200, distribuidor: null, precioVenta: 17000 },
    { fecha: '2025-08-10', nombre: 'cojin shampu can amor', cantidad: 14, precioCompra: 3183, distribuidor: null, precioVenta: 5000 },
    { fecha: '2025-08-10', nombre: 'Alambre puas 12.5 X 400 mts vaquero', cantidad: 1, precioCompra: 362000, distribuidor: null, precioVenta: 398000 },
    { fecha: '2025-08-10', nombre: 'Alambre puas 14.5 X 350 mts', cantidad: 1, precioCompra: 228500, distribuidor: null, precioVenta: 298000 },
    { fecha: '2025-08-10', nombre: 'Alambre puas 14.5 X 500 mts', cantidad: 1, precioCompra: 322000, distribuidor: null, precioVenta: 370000 },
    { fecha: '2025-08-10', nombre: 'Alambre puas 12.5X 200 mts', cantidad: 1, precioCompra: 187000, distribuidor: null, precioVenta: 215000 },
    { fecha: '2025-08-10', nombre: 'chunky cachorro libra', cantidad: 10, precioCompra: 4775, distribuidor: null, precioVenta: 5300 },
    { fecha: '2025-08-10', nombre: 'chunky sobres', cantidad: 12, precioCompra: 2644, distribuidor: null, precioVenta: 3000 },
    { fecha: '2025-08-10', nombre: 'llaveros animales bogota', cantidad: 9, precioCompra: 10000, distribuidor: null, precioVenta: 12000 },
    { fecha: '2025-08-10', nombre: 'Estuche navaja de castrar', cantidad: 3, precioCompra: 10000, distribuidor: null, precioVenta: 13000 },
    { fecha: '2025-08-10', nombre: 'Estuche cuero celular grande', cantidad: 3, precioCompra: 12000, distribuidor: null, precioVenta: 18000 },
    { fecha: '2025-08-10', nombre: 'estuche cuero celular pequeño', cantidad: 1, precioCompra: 10000, distribuidor: null, precioVenta: 13000 },
    { fecha: '2025-08-10', nombre: 'estuche navaja normal', cantidad: 2, precioCompra: 12000, distribuidor: null, precioVenta: 14000 },
    { fecha: '2025-08-10', nombre: 'portacuchillos', cantidad: 3, precioCompra: 40000, distribuidor: null, precioVenta: 50000 },
    { fecha: '2025-08-10', nombre: 'llaveros pistola', cantidad: 6, precioCompra: 3000, distribuidor: null, precioVenta: 7000 },
    { fecha: '2025-08-10', nombre: 'galgocal tableta x 200 tableta', cantidad: 10, precioCompra: 2000, distribuidor: null, precioVenta: 4000 },
    { fecha: '2025-08-10', nombre: 'derrivon sobre', cantidad: 99, precioCompra: 2520, distribuidor: null, precioVenta: 5500 },
    { fecha: '2025-08-10', nombre: 'Ringo cachorro x kilo', cantidad: 30, precioCompra: 4966, distribuidor: null, precioVenta: 5500 },
    { fecha: '2025-08-10', nombre: 'cuerda matizada X 500 mts #6', cantidad: 450, precioCompra: 770, distribuidor: null, precioVenta: 1200 },
    { fecha: '2025-09-09', nombre: 'Azul de metileno sobre', cantidad: 32, precioCompra: 6700, distribuidor: null, precioVenta: 8000 },
    { fecha: '2025-09-09', nombre: 'Nexabet ungüento', cantidad: 6, precioCompra: 16000, distribuidor: null, precioVenta: 20000 },
    { fecha: '2025-09-09', nombre: 'curagan spray X 375 ml', cantidad: 9, precioCompra: 28166, distribuidor: null, precioVenta: 33500 },
    { fecha: '2025-09-09', nombre: 'vitamina K X 50 ml', cantidad: 9, precioCompra: 20000, distribuidor: null, precioVenta: 28000 },
    { fecha: '2025-09-09', nombre: 'vitamina K X 10 ml', cantidad: 10, precioCompra: 40400, distribuidor: null, precioVenta: 45000 },
    { fecha: '2025-09-09', nombre: 'garrabaño X 33 ml', cantidad: 14, precioCompra: 9542, distribuidor: null, precioVenta: 13500 },
    { fecha: '2025-09-09', nombre: 'profen 50 ml', cantidad: 4, precioCompra: 52371, distribuidor: null, precioVenta: 60500 },
    { fecha: '2025-09-09', nombre: 'profen 10 ml', cantidad: 8, precioCompra: 20000, distribuidor: null, precioVenta: 28000 },
    { fecha: '2025-09-09', nombre: 'chunky adulto libra', cantidad: 10, precioCompra: 3578, distribuidor: null, precioVenta: 4800 },
    { fecha: '2025-09-09', nombre: 'italcan perros kilo', cantidad: 30, precioCompra: 3666, distribuidor: null, precioVenta: 4800 },
    { fecha: '2025-09-28', nombre: 'quinocal tabletas', cantidad: 50, precioCompra: 310, distribuidor: null, precioVenta: 800 },
    { fecha: '2025-09-28', nombre: 'dectoplus 3.15% X 100 ml', cantidad: 2, precioCompra: 107900, distribuidor: null, precioVenta: 125000 },
    { fecha: '2025-09-28', nombre: 'Nex platino X 50 ml', cantidad: 1, precioCompra: 30400, distribuidor: null, precioVenta: 40000 },
    { fecha: '2025-09-28', nombre: 'dexapen 20 ml', cantidad: 2, precioCompra: 28500, distribuidor: null, precioVenta: 38000 },
    { fecha: '2025-09-28', nombre: 'trimediazina 50 ml', cantidad: 8, precioCompra: 37422, distribuidor: null, precioVenta: 42000 },
    { fecha: '2025-09-28', nombre: 'alvendavem 100', cantidad: 11, precioCompra: 16971, distribuidor: null, precioVenta: 23000 },
    { fecha: '2025-09-28', nombre: 'hemopar 30 ml', cantidad: 1, precioCompra: 22100, distribuidor: null, precioVenta: 29000 },
    { fecha: '2025-09-28', nombre: 'machetas solas', cantidad: 13, precioCompra: 22000, distribuidor: null, precioVenta: 25000 },
    { fecha: '2025-09-28', nombre: 'funda rabo de gallo angosta', cantidad: 10, precioCompra: 23000, distribuidor: null, precioVenta: 30000 },
    { fecha: '2025-09-28', nombre: 'funda rabo de gallo ancha', cantidad: 5, precioCompra: 30000, distribuidor: null, precioVenta: 35000 },
    { fecha: '2025-10-04', nombre: 'Depoprovera ampolla x cm', cantidad: 6, precioCompra: 8933, distribuidor: null, precioVenta: 18000 },
    { fecha: '2025-10-04', nombre: 'bolsas de café x 100', cantidad: 12, precioCompra: 2400, distribuidor: null, precioVenta: 2800 },
    { fecha: '2025-10-04', nombre: 'finpronil jeringa', cantidad: 12, precioCompra: 4000, distribuidor: null, precioVenta: 7000 },
    { fecha: '2025-10-04', nombre: 'fundas 4 puntas brillantes negras', cantidad: 3, precioCompra: 19500, distribuidor: null, precioVenta: 28000 },
    { fecha: '2025-10-04', nombre: 'macheta collis #20 verde', cantidad: 1, precioCompra: 15500, distribuidor: null, precioVenta: 18500 },
    { fecha: '2025-10-04', nombre: 'qdican gatos libra', cantidad: 23, precioCompra: 5000, distribuidor: null, precioVenta: 5800 },
    { fecha: '2025-10-04', nombre: 'cuelleros', cantidad: 17, precioCompra: 6000, distribuidor: null, precioVenta: 10000 },
    { fecha: '2025-10-04', nombre: 'Cutamycom crema x 35 grs', cantidad: 4, precioCompra: 21600, distribuidor: null, precioVenta: 28000 },
    { fecha: '2025-10-04', nombre: 'bebedero aves 2 litros', cantidad: 2, precioCompra: 12200, distribuidor: null, precioVenta: 15500 },
    { fecha: '2025-10-04', nombre: 'bebedero aves 8 litros', cantidad: 1, precioCompra: 20000, distribuidor: null, precioVenta: 26000 },
    { fecha: '2025-10-04', nombre: 'comedero aves 12 kg', cantidad: 1, precioCompra: 20400, distribuidor: null, precioVenta: 27000 },
    { fecha: '2025-10-25', nombre: 'PUNTILLAS 2 1/2 X 500 grs', cantidad: 12, precioCompra: 4580, distribuidor: null, precioVenta: 7000 },
    { fecha: '2025-10-25', nombre: 'Puntillas 3 X 9 X 500 grs', cantidad: 12, precioCompra: 4580, distribuidor: null, precioVenta: 7000 },
    { fecha: '2025-10-25', nombre: 'iventrina 250 ml', cantidad: 15, precioCompra: 12125, distribuidor: null, precioVenta: 18000 },
    { fecha: '2025-10-25', nombre: 'iventrina litro', cantidad: 2, precioCompra: 25705, distribuidor: null, precioVenta: 37000 },
    { fecha: '2025-10-25', nombre: 'plastico calibre 8 X 6 X70 mts', cantidad: 70, precioCompra: 8700, distribuidor: null, precioVenta: 10500 },
    { fecha: '2025-10-25', nombre: 'oxitetraciclina X 50 ml X 50', cantidad: 9, precioCompra: 10600, distribuidor: null, precioVenta: 14500 },
    { fecha: '2025-10-25', nombre: 'albentrex jeringa x 20 ml', cantidad: 12, precioCompra: 7200, distribuidor: null, precioVenta: 10500 },
    { fecha: '2025-10-25', nombre: 'Bebederos 5 litros', cantidad: 4, precioCompra: 14600, distribuidor: null, precioVenta: 18500 },
    { fecha: '2025-10-25', nombre: 'comederos 3 kg', cantidad: 5, precioCompra: 12200, distribuidor: null, precioVenta: 15800 },
    { fecha: '2025-10-25', nombre: 'comederos 7 kg', cantidad: 1, precioCompra: 16600, distribuidor: null, precioVenta: 22000 },
    { fecha: '2025-10-25', nombre: 'sinchas fique', cantidad: 6, precioCompra: 15000, distribuidor: null, precioVenta: 20000 },
    { fecha: '2025-10-25', nombre: 'mangas tela', cantidad: 12, precioCompra: 4000, distribuidor: null, precioVenta: 10000 },
    { fecha: '2025-10-25', nombre: 'canastos cafeteros medianos', cantidad: 1, precioCompra: 25000, distribuidor: null, precioVenta: 32000 },
    { fecha: '2025-10-25', nombre: 'canastos cafeteros grandes', cantidad: 8, precioCompra: 20000, distribuidor: null, precioVenta: 28000 },
    { fecha: '2025-11-06', nombre: 'glicocafe 4 litros', cantidad: 3, precioCompra: 70500, distribuidor: null, precioVenta: 77000 },
    { fecha: '2025-11-06', nombre: 'vacuna biobac 11 vias 20 DS (100 ML)', cantidad: 14, precioCompra: 31000, distribuidor: null, precioVenta: 40000 },
    { fecha: '2025-11-06', nombre: 'vacuna biobac 7 vias X 10 DS 50 ML', cantidad: 6, precioCompra: 8000, distribuidor: null, precioVenta: 12000 },
    { fecha: '2025-11-06', nombre: 'albendavem 25% X 500', cantidad: 6, precioCompra: 77100, distribuidor: null, precioVenta: 85000 },
    { fecha: '2025-11-06', nombre: 'oxitetraciclina 200 MK X 50 ml', cantidad: 10, precioCompra: 21700, distribuidor: null, precioVenta: 27000 },
    { fecha: '2025-11-06', nombre: 'complemild oral X 100 ml', cantidad: 7, precioCompra: 7100, distribuidor: null, precioVenta: 10000 },
    { fecha: '2025-11-06', nombre: 'amprodiar sobre', cantidad: 29, precioCompra: 9700, distribuidor: null, precioVenta: 13000 },
    { fecha: '2025-11-06', nombre: 'Quinocal tabletas', cantidad: 72, precioCompra: 716, distribuidor: null, precioVenta: 900 },
    { fecha: '2025-11-06', nombre: 'servimeg gold x 50 ml', cantidad: 3, precioCompra: 24600, distribuidor: null, precioVenta: 29000 },
    { fecha: '2025-11-06', nombre: 'trevesec 30 ml + compelnd 20 ml', cantidad: 1, precioCompra: 33600, distribuidor: null, precioVenta: 44000 },
    { fecha: '2025-11-06', nombre: 'trevesec 50 ml + compelnd 50 ml', cantidad: 1, precioCompra: 57300, distribuidor: null, precioVenta: 65000 },
    { fecha: '2025-11-06', nombre: 'vacuna ultrachoice x 10 DS', cantidad: 8, precioCompra: 15000, distribuidor: null, precioVenta: null },
    { fecha: '2025-11-19', nombre: 'vitazoo 500 ml', cantidad: 3, precioCompra: 18400, distribuidor: null, precioVenta: 24000 },
    { fecha: '2025-11-19', nombre: 'dextromin 500 ml', cantidad: 2, precioCompra: 17000, distribuidor: null, precioVenta: 23000 },
    { fecha: '2025-11-19', nombre: 'aguja metalica', cantidad: 48, precioCompra: 1300, distribuidor: null, precioVenta: 2000 },
    { fecha: '2025-11-19', nombre: 'jeringa plastica 20 ml', cantidad: 2, precioCompra: 30000, distribuidor: null, precioVenta: 38000 },
    { fecha: '2025-11-19', nombre: 'jeringa plastica 10 ml', cantidad: 1, precioCompra: 30000, distribuidor: null, precioVenta: 38000 },
    { fecha: '2025-11-19', nombre: 'Espiramicina promevet', cantidad: 6, precioCompra: 29500, distribuidor: null, precioVenta: 35500 },
    { fecha: '2025-11-19', nombre: 'diarrevet sobre', cantidad: 48, precioCompra: 3600, distribuidor: null, precioVenta: 5500 },
    { fecha: '2025-11-19', nombre: 'bolfo sobres X 20 grs', cantidad: 3, precioCompra: 5200, distribuidor: null, precioVenta: 7000 },
    { fecha: '2025-11-19', nombre: 'Damasgan 50 ml', cantidad: 1, precioCompra: 20000, distribuidor: null, precioVenta: 26000 },
    { fecha: '2025-11-19', nombre: 'tela verde x mts', cantidad: 80, precioCompra: 2000, distribuidor: null, precioVenta: 2500 },
    { fecha: '2025-11-19', nombre: 'forros celular cuero', cantidad: 7, precioCompra: 12000, distribuidor: null, precioVenta: null },
    { fecha: '2025-11-19', nombre: 'forros celular cuero pequeños', cantidad: 4, precioCompra: 7500, distribuidor: null, precioVenta: null },
    { fecha: '2025-11-19', nombre: 'forros celular deportivos', cantidad: 3, precioCompra: 12000, distribuidor: null, precioVenta: null },
    { fecha: '2025-11-19', nombre: 'forros de cierre', cantidad: 2, precioCompra: 10000, distribuidor: null, precioVenta: null },
    { fecha: '2025-11-19', nombre: 'collares perros peluches', cantidad: 5, precioCompra: 10000, distribuidor: null, precioVenta: null },
    { fecha: '2025-11-19', nombre: 'collares perros medianos completos', cantidad: 8, precioCompra: 12000, distribuidor: null, precioVenta: null },
    { fecha: '2025-11-19', nombre: 'cuellos con peluches flores', cantidad: 11, precioCompra: 5000, distribuidor: null, precioVenta: null },
    { fecha: '2025-11-19', nombre: 'cuellos 348', cantidad: 10, precioCompra: 3000, distribuidor: null, precioVenta: null },
    { fecha: '2025-11-19', nombre: 'cuellos medianos', cantidad: 10, precioCompra: 3500, distribuidor: null, precioVenta: null },
    { fecha: '2025-11-19', nombre: 'lorsban papeleta', cantidad: 17, precioCompra: 1000, distribuidor: null, precioVenta: 2000 },
    { fecha: '2025-11-19', nombre: 'guantes negros pepas', cantidad: 12, precioCompra: 1300, distribuidor: null, precioVenta: 2500 },
    { fecha: '2025-11-19', nombre: 'cinta de moscas', cantidad: 3, precioCompra: 1000, distribuidor: null, precioVenta: 1500 },
    { fecha: '2025-11-26', nombre: 'vacuna neumodiar', cantidad: 24, precioCompra: 5700, distribuidor: null, precioVenta: 9000 },
    { fecha: '2025-11-26', nombre: 'ivermectina 3.15% 100 ml', cantidad: 5, precioCompra: 31800, distribuidor: null, precioVenta: 41000 },
    { fecha: '2025-11-26', nombre: 'isovex hormiga', cantidad: 2, precioCompra: 19500, distribuidor: null, precioVenta: 25000 },
    { fecha: '2025-11-26', nombre: 'lactoremplazador libra', cantidad: 11, precioCompra: 10000, distribuidor: null, precioVenta: 13000 },
    { fecha: '2025-11-26', nombre: 'champus perros reempados 120 ml', cantidad: 12, precioCompra: 7000, distribuidor: null, precioVenta: 10000 },
    { fecha: '2025-11-26', nombre: 'champu perros reempados 60 ml', cantidad: 5, precioCompra: 5000, distribuidor: null, precioVenta: 7000 },
    { fecha: '2025-12-20', nombre: 'Impulsor 500 ml', cantidad: 2, precioCompra: 157000, distribuidor: null, precioVenta: 180000 },
    { fecha: '2025-12-20', nombre: 'oxitetraciclina MK X 500 ml', cantidad: 1, precioCompra: 45900, distribuidor: null, precioVenta: 58000 },
    { fecha: '2025-12-20', nombre: 'ivermen dorado 3.15% x 250 ml', cantidad: 10, precioCompra: 66400, distribuidor: null, precioVenta: 86500 },
    { fecha: '2025-12-20', nombre: 'ivermen dorado 3.15% X 500 ml', cantidad: 1, precioCompra: 121700, distribuidor: null, precioVenta: 158000 },
    { fecha: '2025-12-20', nombre: 'servimeg gold X 500 ml', cantidad: 3, precioCompra: 128200, distribuidor: null, precioVenta: 167000 },
    { fecha: '2025-12-20', nombre: 'depoprovera dosis', cantidad: 15, precioCompra: 9000, distribuidor: null, precioVenta: 18000 },
    { fecha: '2025-12-20', nombre: 'sales de hidratacion oral sobre', cantidad: 22, precioCompra: 1600, distribuidor: null, precioVenta: 3000 },
    { fecha: '2025-12-31', nombre: 'panzer litro', cantidad: 15, precioCompra: 19400, distribuidor: null, precioVenta: 24500 },
    { fecha: '2025-12-31', nombre: 'manzate x kg', cantidad: 12, precioCompra: 26500, distribuidor: null, precioVenta: 29500 },
    { fecha: '2025-12-31', nombre: 'pilarsato litro', cantidad: 12, precioCompra: 16600, distribuidor: null, precioVenta: 22000 },
    { fecha: '2025-12-31', nombre: 'glicocafe litro', cantidad: 15, precioCompra: 17000, distribuidor: null, precioVenta: 22000 },
    { fecha: '2025-12-31', nombre: 'alfombras', cantidad: 1, precioCompra: 25000, distribuidor: null, precioVenta: 35000 },
    { fecha: '2025-12-31', nombre: 'levanter levamiso cojin', cantidad: 102, precioCompra: 2700, distribuidor: null, precioVenta: 3800 },
    { fecha: '2025-12-31', nombre: 'oxitoxina 10 ml', cantidad: 8, precioCompra: 5600, distribuidor: null, precioVenta: 8500 },
    { fecha: '2025-12-31', nombre: 'fosfoland 50 ml', cantidad: 8, precioCompra: 30000, distribuidor: null, precioVenta: 36000 },
    { fecha: '2025-12-31', nombre: 'fosfoland 20 ml', cantidad: 5, precioCompra: 20000, distribuidor: null, precioVenta: 28000 },
    { fecha: '2025-12-31', nombre: 'enrofloxacina gotas 10 ml', cantidad: 25, precioCompra: 500, distribuidor: null, precioVenta: 8500 },
    { fecha: '2025-12-31', nombre: 'baticolas caballos', cantidad: 6, precioCompra: 25000, distribuidor: null, precioVenta: 28000 },
    { fecha: '2025-12-31', nombre: 'canapets pupy 2ml', cantidad: 12, precioCompra: 4500, distribuidor: null, precioVenta: 6500 },
    { fecha: '2025-12-31', nombre: 'canapets pupy 5ml', cantidad: 7, precioCompra: 5400, distribuidor: null, precioVenta: 7000 },
    { fecha: '2025-12-31', nombre: 'piperazina pastilla', cantidad: 242, precioCompra: 1083, distribuidor: null, precioVenta: 1500 },
    { fecha: '2025-12-31', nombre: 'cancun 300 ml', cantidad: 9, precioCompra: 8000, distribuidor: null, precioVenta: 13000 },
    { fecha: '2025-12-31', nombre: 'cancun 500 ml', cantidad: 8, precioCompra: 11000, distribuidor: null, precioVenta: null },
    { fecha: '2026-06-01', nombre: 'cipertop 375 ml', cantidad: 6, precioCompra: 18209, distribuidor: null, precioVenta: 30000 },
    { fecha: '2026-06-01', nombre: 'tusivet 120 ml', cantidad: 3, precioCompra: 13418, distribuidor: null, precioVenta: 18500 },
    { fecha: '2026-06-01', nombre: 'canatox 20 ml', cantidad: 3, precioCompra: 19507, distribuidor: null, precioVenta: 28000 },
    { fecha: '2026-06-01', nombre: 'talco can amor insecticida', cantidad: 2, precioCompra: 18542, distribuidor: null, precioVenta: 20500 },
    { fecha: '2026-06-01', nombre: 'jeringa plastica X 10 ml', cantidad: 2, precioCompra: 21320, distribuidor: null, precioVenta: 30000 },
    { fecha: '2026-06-01', nombre: 'ungüento 100 X 50 grs', cantidad: 11, precioCompra: 8908, distribuidor: null, precioVenta: 12500 },
    { fecha: '2026-06-01', nombre: 'dipromid 10 ml', cantidad: 3, precioCompra: 20484, distribuidor: null, precioVenta: 29000 },
    { fecha: '2026-06-01', nombre: 'compleland oral X 100 ml', cantidad: 7, precioCompra: 7977, distribuidor: null, precioVenta: 10500 },
    { fecha: '2026-06-01', nombre: 'collar pechera con bolso', cantidad: 3, precioCompra: 14500, distribuidor: null, precioVenta: 18000 },
    { fecha: '2026-06-01', nombre: 'collar pechera', cantidad: 3, precioCompra: 17000, distribuidor: null, precioVenta: 20000 },
    { fecha: '2026-06-01', nombre: 'cuellos medianos', cantidad: 2, precioCompra: 4000, distribuidor: null, precioVenta: 6000 },
    { fecha: '2026-06-01', nombre: 'collar BMR 5111', cantidad: 7, precioCompra: 7000, distribuidor: null, precioVenta: 10000 },
    { fecha: '2026-06-01', nombre: 'collar 5177 completo', cantidad: 6, precioCompra: 4000, distribuidor: null, precioVenta: 8000 },
    { fecha: '2026-06-01', nombre: 'collares conejo', cantidad: 6, precioCompra: 4000, distribuidor: null, precioVenta: 6000 },
    { fecha: '2026-06-01', nombre: 'cuellos riata grandes', cantidad: 3, precioCompra: 10000, distribuidor: null, precioVenta: 13000 },
    { fecha: '2026-06-01', nombre: 'cuellos riata gris', cantidad: 5, precioCompra: 6000, distribuidor: null, precioVenta: 8000 },
    { fecha: '2026-06-01', nombre: 'cuellos riata mediana', cantidad: 16, precioCompra: 4000, distribuidor: null, precioVenta: 5000 },
    { fecha: '2026-06-01', nombre: 'cuello riata militar', cantidad: 3, precioCompra: 8000, distribuidor: null, precioVenta: 10000 },
    { fecha: '2026-06-01', nombre: 'cuello conejo pequeño', cantidad: 7, precioCompra: 3000, distribuidor: null, precioVenta: 5000 },
    { fecha: '2026-06-01', nombre: 'pañoletas perros', cantidad: 4, precioCompra: 2500, distribuidor: null, precioVenta: 3500 },
    { fecha: '2026-06-01', nombre: 'cuellos delgados sonajero', cantidad: 50, precioCompra: 1500, distribuidor: null, precioVenta: 2500 },
    { fecha: '2026-06-01', nombre: 'bozal', cantidad: 2, precioCompra: 5000, distribuidor: null, precioVenta: 7000 },
    { fecha: '2026-06-01', nombre: 'lazos con argolla blancos x 25 mts y 20 mts', cantidad: 2, precioCompra: 60000, distribuidor: null, precioVenta: null },
    { fecha: '2026-06-01', nombre: 'maiz vermifugo', cantidad: 100, precioCompra: 430, distribuidor: null, precioVenta: 600 },
    { fecha: '2026-06-01', nombre: 'semiponchos', cantidad: 5, precioCompra: 18000, distribuidor: null, precioVenta: 22000 },
    { fecha: '2026-06-01', nombre: 'complebet 250 ml', cantidad: 3, precioCompra: 42500, distribuidor: null, precioVenta: 52000 },
    { fecha: '2026-06-01', nombre: 'alvendavem 500 ml', cantidad: 6, precioCompra: 39600, distribuidor: null, precioVenta: 85000 },
  ];

  console.log(`📦 Creando ${inventarioReal.length} productos...`);
  
  let productosCreados = 0;
  
  for (const item of inventarioReal) {
    // Saltar items sin datos relevantes
    if (!item.nombre || (item.cantidad === null && item.precioCompra === null && item.precioVenta === null)) {
      continue;
    }
    
    try {
      const categoriaId = getCatId(item.nombre);
      
      const producto = await prisma.producto.create({
        data: {
          nombre: item.nombre,
          categoriaId,
          stockMinimo: 5,
          unidadMedida: 'unidades',
          precioCompra: item.precioCompra || 0,
          precioVenta: item.precioVenta || 0,
        },
      });
      
      // Crear inventario actual
      await prisma.inventarioActual.create({
        data: {
          productoId: producto.id,
          cantidadActual: item.cantidad || 0,
        },
      });
      
      // Crear movimiento de compra inicial con la fecha proporcionada
      if (item.cantidad && item.cantidad > 0) {
        const fechaCompra = new Date(item.fecha);
        
        await prisma.movimientoInventario.create({
          data: {
            productoId: producto.id,
            tipoMovimiento: 'COMPRA',
            cantidad: item.cantidad,
            precioUnitario: item.precioCompra || 0,
            total: (item.cantidad * (item.precioCompra || 0)),
            distribuidorId: getDistId(item.distribuidor),
            fecha: fechaCompra,
            usuarioId: admin.id,
            notas: 'Stock inicial del inventario',
          },
        });
      }
      
      productosCreados++;
    } catch (error) {
      console.error(`Error creando producto ${item.nombre}:`, error);
    }
  }
  
  console.log(`✅ ${productosCreados} productos creados exitosamente`);
  
  console.log('\n✨ Seed completado exitosamente!');
  console.log('📋 Resumen:');
  console.log(`   - Categorías: ${categorias.length}`);
  console.log(`   - Distribuidores: ${distribuidores.length}`);
  console.log(`   - Productos: ${productosCreados}`);
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
