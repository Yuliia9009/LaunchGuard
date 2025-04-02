const { exec } = require('child_process');
const axios = require('axios');
const path = require('path');
const fs = require('fs');  

// Утилита для выполнения команды в терминале
function execPromise(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (err, stdout, stderr) => {
            if (err) {
                reject(stderr || err);
            }
            resolve(stdout);
        });
    });
}

// Извлечение значения из вывода команды mdls
function extractValue(mdlsOutput) {
    if (!mdlsOutput) return 'N/A';
    const parts = mdlsOutput.split('=');
    return parts[1]?.trim().replace(/"/g, '') || 'N/A';
}

// Проверка наличия файла
function checkFileExists(filePath) {
    return new Promise((resolve) => {
        fs.access(filePath, fs.constants.F_OK, (err) => {
            resolve(!err);
        });
    });
}

// Получение списка установленных приложений на ПК
async function getInstalledPrograms() {
    const stdout = await execPromise('mdfind "kMDItemContentType == \'com.apple.application-bundle\'" -onlyin /Applications');
    const userAppStdout = await execPromise('mdfind "kMDItemContentType == \'com.apple.application-bundle\'" -onlyin ~/Applications');
    
    const appPaths = stdout.split('\n').concat(userAppStdout.split('\n')).filter(p => p.endsWith('.app')).slice(0, 500);
    
    const detailedPrograms = await Promise.all(appPaths.map(async (appPath) => {
        const nameCmd = `mdls -name kMDItemDisplayName "${appPath}"`;
        const versionCmd = `mdls -name kMDItemVersion "${appPath}"`;
        const bundleCmd = `defaults read "${path.join(appPath, 'Contents/Info')}" CFBundleIdentifier`;

        let name = 'N/A';
        let version = '0'; 
        let bundleId = 'N/A';

        const plistFilePath = path.join(appPath, 'Contents/Info.plist');
        const fileExists = await checkFileExists(plistFilePath);

        if (!fileExists) {
            console.error(`⚠️ Файл Info.plist не найден для приложения: ${appPath}`);
            return {
                ProgramName: name,
                Version: version,
                BundleId: bundleId,
                ProgramPath: appPath,
                InstalledAt: new Date().toISOString()
            };
        }

        try {
            const nameResult = await execPromise(nameCmd);
            name = extractValue(nameResult);
        } catch (error) {
            console.error(`Не удалось получить имя программы для ${appPath}: ${error.message}`);
        }

        try {
            const versionResult = await execPromise(versionCmd);
            version = extractValue(versionResult);
        } catch (error) {
            console.error(`Не удалось получить версию программы для ${appPath}: ${error.message}`);
        }

        try {
            const bundleResult = await execPromise(bundleCmd);
            bundleId = bundleResult?.trim() || 'N/A';
        } catch (error) {
            console.error(`Не удалось получить CFBundleIdentifier для ${appPath}: ${error.message}`);
        }

        return {
            ProgramName: name,
            Version: version,
            BundleId: bundleId,
            ProgramPath: appPath,
            InstalledAt: new Date().toISOString()
        };
    }));

    return detailedPrograms.filter(program => program.ProgramName !== 'N/A');
}

// 📌 Отправка данных на сервер
async function sendProgramsToServer(programs, token) {
    try {
        const response = await axios.post('http://localhost:5285/api/installedprograms/save', programs, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('Программы успешно сохранены на сервере:', response.data);
    } catch (error) {
        console.error('Ошибка при отправке данных на сервер:', error.message);
    }
}

// 📌 Основная функция для сбора и отправки данных
async function main(token) { // <-- Добавляем token как аргумент
    try {
        const programs = await getInstalledPrograms();
        if (programs.length > 0) {
            console.log(`Найдено ${programs.length} установленных программ.`);
            await sendProgramsToServer(programs, token);  // <-- Передаем токен
        } else {
            console.log('Программы не найдены.');
        }
    } catch (error) {
        console.error('Ошибка при получении или отправке программ:', error.message);
    }
}

// Экспортируем функцию для использования в других файлах
module.exports = {
    main,
    getInstalledPrograms,
    sendProgramsToServer
};


// const { exec } = require('child_process');
// const axios = require('axios');
// const path = require('path');
// const fs = require('fs');  

// // Утилита для выполнения команды в терминале
// function execPromise(cmd) {
//     return new Promise((resolve, reject) => {
//         exec(cmd, (err, stdout, stderr) => {
//             if (err) {
//                 reject(stderr || err);
//             }
//             resolve(stdout);
//         });
//     });
// }

// // Извлечение значения из вывода команды mdls
// function extractValue(mdlsOutput) {
//     if (!mdlsOutput) return 'N/A';
//     const parts = mdlsOutput.split('=');
//     return parts[1]?.trim().replace(/"/g, '') || 'N/A';
// }

// // Проверка наличия файла
// function checkFileExists(filePath) {
//     return new Promise((resolve) => {
//         fs.access(filePath, fs.constants.F_OK, (err) => {
//             resolve(!err);
//         });
//     });
// }

// // Получение списка установленных приложений на ПК
// async function getInstalledPrograms() {
//     const stdout = await execPromise('mdfind "kMDItemContentType == \'com.apple.application-bundle\'" -onlyin /Applications');
//     const userAppStdout = await execPromise('mdfind "kMDItemContentType == \'com.apple.application-bundle\'" -onlyin ~/Applications');
    
//     const appPaths = stdout.split('\n').concat(userAppStdout.split('\n')).filter(p => p.endsWith('.app')).slice(0, 500);
    
//     // Собираем данные о каждой программе
//     const detailedPrograms = await Promise.all(appPaths.map(async (appPath) => {
//         const nameCmd = `mdls -name kMDItemDisplayName "${appPath}"`;
//         const versionCmd = `mdls -name kMDItemVersion "${appPath}"`;
//         const bundleCmd = `defaults read "${path.join(appPath, 'Contents/Info')}" CFBundleIdentifier`;

//         let name = 'N/A';
//         let version = '0'; 
//         let bundleId = 'N/A';

//         // Проверяем наличие файла Info.plist перед выполнением команды
//         const plistFilePath = path.join(appPath, 'Contents/Info.plist');
//         const fileExists = await checkFileExists(plistFilePath);

//         if (!fileExists) {
//             console.error(`⚠️ Файл Info.plist не найден для приложения: ${appPath}`);
//             return {
//                 ProgramName: name,
//                 Version: version,
//                 BundleId: bundleId,
//                 ProgramPath: appPath,
//                 InstalledAt: new Date().toISOString()
//             };
//         }

//         // Получаем имя программы
//         try {
//             const nameResult = await execPromise(nameCmd);
//             name = extractValue(nameResult);
//         } catch (error) {
//             console.error(`Не удалось получить имя программы для ${appPath}: ${error.message}`);
//         }

//         // Получаем версию программы
//         try {
//             const versionResult = await execPromise(versionCmd);
//             version = extractValue(versionResult);
//         } catch (error) {
//             console.error(`Не удалось получить версию программы для ${appPath}: ${error.message}`);
//         }

//         // Попробуем получить CFBundleIdentifier
//         try {
//             const bundleResult = await execPromise(bundleCmd);
//             bundleId = bundleResult?.trim() || 'N/A';
//         } catch (error) {
//             console.error(`Не удалось получить CFBundleIdentifier для ${appPath}: ${error.message}`);
//         }

//         // Возвращаем объект с данными о программе
//         return {
//             ProgramName: name,
//             Version: version,
//             BundleId: bundleId,
//             ProgramPath: appPath,
//             InstalledAt: new Date().toISOString()
//         };
//     }));

//     // Фильтруем приложения, где не удалось получить имя
//     return detailedPrograms.filter(program => program.ProgramName !== 'N/A');
// }

// // Отправка данных на сервер
// async function sendProgramsToServer(programs) {
//     try {
//         const response = await axios.post('http://localhost:5285/api/installedprograms/save', programs, {
//             headers: {
//                 'Content-Type': 'application/json',
//             }
//         });
//         console.log('Программы успешно сохранены на сервере:', response.data);
//     } catch (error) {
//         console.error('Ошибка при отправке данных на сервер:', error);
//     }
// }

// // Основная функция для сбора и отправки данных
// async function main() {
//     try {
//         const programs = await getInstalledPrograms();
//         if (programs.length > 0) {
//             console.log(`Найдено ${programs.length} установленных программ.`);
//             await sendProgramsToServer(programs);
//         } else {
//             console.log('Программы не найдены.');
//         }
//     } catch (error) {
//         console.error('Ошибка при получении или отправке программ:', error);
//     }
// }

// // Экспортируем функцию для использования в других файлах
// module.exports = {
//     main,
//     getInstalledPrograms,
//     sendProgramsToServer
// };