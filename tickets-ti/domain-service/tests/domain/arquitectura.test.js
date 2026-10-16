// Guardia de la arquitectura hexagonal (CLAUDE.md, sección "Hexagonal"):
// domain/ y application/ (del núcleo y de cada módulo) no dependen de frameworks ni de infrastructure/,
// y ninguna de las dos lee el reloj del sistema (usan el puerto Clock).
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '../../src');
const FRAMEWORKS = [/^sequelize/, /^pg/, /^express/, /^socket\.io/, /^nodemailer/, /^axios/, /^node-cron/];

const CAPAS = [
  { nombre: 'domain', prohibidos: [...FRAMEWORKS, /application\//, /infrastructure\//], sinReloj: true },
  { nombre: 'application', prohibidos: [...FRAMEWORKS, /infrastructure\//], sinReloj: true },
  // Los controllers solo traducen HTTP → caso de uso: nada de Sequelize ni repositorios
  { nombre: 'infrastructure/http', prohibidos: [/^sequelize/, /^pg/, /persistencia\//, /directorio\//], sinReloj: false },
  // Hexagonal: las mismas reglas del núcleo dentro de su carpeta
  { nombre: 'modules/hexagonal_comentarios/domain', prohibidos: [...FRAMEWORKS, /application\//, /infrastructure\//, /adapters\//], sinReloj: true },
  { nombre: 'modules/hexagonal_comentarios/application', prohibidos: [...FRAMEWORKS, /infrastructure\//, /adapters\//], sinReloj: true },
  { nombre: 'modules/hexagonal_comentarios/adapters/http', prohibidos: [/^sequelize/, /^pg/, /persistencia\//], sinReloj: false },
  // Capas: cada capa solo conoce a la de abajo (presentation → business → data)
  { nombre: 'modules/capas_comentarios/presentation', prohibidos: [/^sequelize/, /^pg/, /data\//], sinReloj: false },
  { nombre: 'modules/capas_comentarios/business', prohibidos: [...FRAMEWORKS, /presentation\//, /infrastructure\//], sinReloj: true },
  { nombre: 'modules/capas_comentarios/data', prohibidos: [/^express/, /business\//, /presentation\//], sinReloj: false },
  // MVC: el modelo no conoce vistas ni controladores; la vista no consulta datos;
  // el controlador recibe los modelos ya construidos
  { nombre: 'modules/mvc_comentarios/models', prohibidos: [/^express/, /views\//, /controllers\//], sinReloj: true },
  { nombre: 'modules/mvc_comentarios/views', prohibidos: [...FRAMEWORKS, /models\//, /controllers\//], sinReloj: true },
  { nombre: 'modules/mvc_comentarios/controllers', prohibidos: [/^sequelize/, /^pg/, /models\//], sinReloj: false },
  // OOP: entidades e interfaces puras; el servicio solo conoce interfaces
  { nombre: 'modules/oop_comentarios/entidades', prohibidos: [...FRAMEWORKS, /interfaces\//, /servicios\//, /infraestructura\//], sinReloj: true },
  { nombre: 'modules/oop_comentarios/interfaces', prohibidos: [...FRAMEWORKS, /servicios\//, /infraestructura\//], sinReloj: true },
  { nombre: 'modules/oop_comentarios/servicios', prohibidos: [...FRAMEWORKS, /infraestructura\//], sinReloj: true },
];

const listarJs = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const ruta = path.join(dir, e.name);
  if (e.isDirectory()) return listarJs(ruta);
  return e.name.endsWith('.js') ? [ruta] : [];
});

const importsDe = (archivo) =>
  [...fs.readFileSync(archivo, 'utf8').matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);

describe.each(CAPAS)('Arquitectura de $nombre/', ({ nombre, prohibidos, sinReloj }) => {
  const dir = path.join(SRC, nombre);
  const archivos = listarJs(dir);

  it('debería tener archivos que revisar', () => {
    expect(archivos.length).toBeGreaterThan(0);
  });

  it.each(archivos.map((a) => [path.relative(dir, a), a]))(
    '%s no debería importar frameworks ni capas externas', (_nombre, archivo) => {
      const ilegales = importsDe(archivo).filter((imp) => prohibidos.some((p) => p.test(imp)));
      expect(ilegales).toEqual([]);
    });

  if (sinReloj) {
    it('no debería leer el reloj del sistema (usa el puerto Clock)', () => {
      const conReloj = archivos.filter((a) => /new Date\(\)|Date\.now\(\)/.test(fs.readFileSync(a, 'utf8')));
      expect(conReloj.map((a) => path.relative(dir, a))).toEqual([]);
    });
  }
});

// Los módulos de src/modules/ se enchufan sin acoplarse: el núcleo solo los
// conoce desde composicion.js (y por su index.js), y un módulo solo usa del
// núcleo su dominio, sus puertos/helpers de aplicación y utilidades HTTP.
describe('Aislamiento de src/modules/', () => {
  const MODULOS = path.join(SRC, 'modules');
  const nucleo = listarJs(SRC).filter((a) => !a.startsWith(MODULOS));
  const rel = (a) => path.relative(SRC, a).split(path.sep).join('/');

  it('el núcleo no debería importar módulos salvo composicion.js, y solo por su index', () => {
    const ilegales = nucleo.flatMap((a) => importsDe(a)
      .filter((imp) => /modules\//.test(imp))
      .filter((imp) => rel(a) !== 'composicion.js' || !/^\.\/modules\/[^/]+$/.test(imp))
      .map((imp) => `${rel(a)} → ${imp}`));
    expect(ilegales).toEqual([]);
  });

  it('un módulo no debería importar archivos de otro módulo', () => {
    const nombres = fs.readdirSync(MODULOS, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
    const ilegales = nombres.flatMap((propio) => listarJs(path.join(MODULOS, propio)).flatMap((a) => importsDe(a)
      .filter((imp) => nombres.some((otro) => otro !== propio && imp.includes(`/${otro}`)))
      .map((imp) => `${rel(a)} → ${imp}`)));
    expect(ilegales).toEqual([]);
  });

  it('un módulo no debería importar adaptadores de infraestructura del núcleo salvo los HTTP', () => {
    const ilegales = listarJs(MODULOS).flatMap((a) => importsDe(a)
      .filter((imp) => /infrastructure\//.test(imp) && !/infrastructure\/http\//.test(imp))
      .map((imp) => `${rel(a)} → ${imp}`));
    expect(ilegales).toEqual([]);
  });
});
