const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const sourceApiDir = path.join(projectRoot, 'api');
const sourceBridgeFile = path.join(projectRoot, 'api.php');
const distDir = path.join(projectRoot, 'dist');
const targetApiDir = path.join(distDir, 'api');
const staleTargetFile = path.join(distDir, 'api.php');

if (!fs.existsSync(sourceApiDir)) {
  console.error('No se encontro la carpeta api en la raiz del proyecto.');
  process.exit(1);
}

if (!fs.existsSync(distDir)) {
  console.error('No se encontro la carpeta dist. Ejecuta primero la build de Vite.');
  process.exit(1);
}

if (fs.existsSync(targetApiDir)) {
  fs.rmSync(targetApiDir, { recursive: true, force: true });
}

fs.cpSync(sourceApiDir, targetApiDir, { recursive: true });

if (fs.existsSync(staleTargetFile)) {
  fs.rmSync(staleTargetFile, { force: true });
}

if (fs.existsSync(sourceBridgeFile)) {
  fs.copyFileSync(sourceBridgeFile, path.join(distDir, 'api.php'));
}

console.log('Carpeta api copiada a dist/api y bridge api.php actualizado.');
