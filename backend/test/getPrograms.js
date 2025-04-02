const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Утилита для promisified exec
function execPromise(cmd) {
  return new Promise((resolve) => {
    exec(cmd, (err, stdout) => {
      if (err) return resolve(null);
      resolve(stdout);
    });
  });
}

// Извлечение значения из вывода mdls
function extractValue(mdlsOutput) {
  if (!mdlsOutput) return 'N/A';
  const parts = mdlsOutput.split('=');
  return parts[1]?.trim().replace(/"/g, '') || 'N/A';
}

// Получение размера папки приложения
function getFolderSize(appPath) {
  return new Promise((resolve) => {
    exec(`du -sh "${appPath}"`, (err, stdout) => {
      if (err) return resolve('N/A');
      const size = stdout.split('\t')[0];
      resolve(size);
    });
  });
}

// Проверка подписи
function checkCodeSignature(appPath) {
  return new Promise((resolve) => {
    exec(`codesign -dv "${appPath}" 2>&1`, (err, stdout) => {
      if (err || !stdout.includes('Authority=')) return resolve('❌ Нет');
      resolve('✅ Да');
    });
  });
}

// Получение информации о приложении
async function getAppDetails(appPath) {
  const nameCmd = `mdls -name kMDItemDisplayName "${appPath}"`;
  const versionCmd = `mdls -name kMDItemVersion "${appPath}"`;
  const bundleCmd = `defaults read "${path.join(appPath, 'Contents/Info')}" CFBundleIdentifier`;
  const lastUsedCmd = `mdls -name kMDItemLastUsedDate "${appPath}"`;
  const categoryCmd = `mdls -name kMDItemAppCategory "${appPath}"`;

  const [name, version, bundleId, lastUsed, category, signed, size] = await Promise.all([
    execPromise(nameCmd),
    execPromise(versionCmd),
    execPromise(bundleCmd),
    execPromise(lastUsedCmd),
    execPromise(categoryCmd),
    checkCodeSignature(appPath),
    getFolderSize(appPath),
  ]);

  console.log(`📦 ${extractValue(name)}`);
  console.log(`   🔢 Версия: ${extractValue(version)}`);
  console.log(`   🆔 Bundle ID: ${bundleId?.trim() || 'N/A'}`);
  console.log(`   📁 Путь: ${appPath}`);
  console.log(`   📅 Последнее использование: ${extractValue(lastUsed)}`);
  console.log(`   🧩 Категория: ${extractValue(category)}`);
  console.log(`   🖊️ Подписано: ${signed}`);
  console.log(`   💾 Размер: ${size}`);
  console.log('--------------------------------------------------------');
}

// Получение всех приложений на Mac
exec('mdfind "kMDItemContentType == \'com.apple.application-bundle\'"', async (error, stdout) => {
  if (error) {
    console.error(`Ошибка при выполнении команды: ${error}`);
    return;
  }

  const appPaths = stdout.split('\n').filter(p => p.endsWith('.app')).slice(0, 30); // можно убрать slice

  console.log(`🔍 Найдено приложений: ${appPaths.length}\n`);
  for (const appPath of appPaths) {
    await getAppDetails(appPath);
  }
});
  