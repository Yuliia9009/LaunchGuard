const axios = require('axios');
const psList = require('ps-list').default;
const { exec } = require('child_process');
const { decodeToken, isTokenExpired } = require('./tokenUtils'); 
const { logBlockedProcessToServer } = require('./logService');  // Импортируем функцию логирования на сервер

const API_URL = 'http://localhost:5285/api/blacklist';

// 📌 Функция завершения процесса по PID
const killProcess = (pid) => {
    const command = process.platform === 'win32' ? `taskkill /F /PID ${pid}` : `kill -9 ${pid}`;

    console.log(`📢 Выполняется команда для завершения процесса: ${command}`);
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Ошибка при завершении процесса ${pid}: ${error.message}`);
            console.error(`ℹ️ Детали ошибки: ${stderr}`);
            return;
        }
        console.log(`✅ Процесс с PID ${pid} успешно завершён.`);
    });
};

// 📌 Получение черного списка
const fetchBlacklist = async () => {
    try {
        const response = await axios.get(API_URL, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log('✅ Черный список успешно получен.');
        return response.data; 
    } catch (error) {
        console.error('❌ Ошибка при получении черного списка:', error.message);
        return [];
    }
};

// 📌 Основная функция блокировки
const startBlocking = (getToken) => {
    console.log('📢 Запущена функция блокировки процессов.');

    setInterval(async () => {
        const token = getToken();  

        const blacklist = await fetchBlacklist(); 

        if (blacklist.length === 0) {
            console.log('❌ Черный список пуст. Проверка пропущена.');
            return;
        }

        try {
            const processes = await psList();
            console.log('📢 Проверка процессов...');

            const blockedProcesses = processes.filter(process =>
                blacklist.some(item => process.name.toLowerCase().includes(item.programName.toLowerCase()))
            );

            blockedProcesses.forEach(process => {
                console.log(`⚠️ Заблокирован процесс: ${process.name} (PID: ${process.pid})`);
                killProcess(process.pid);  

                // ✅ Только логирование на сервер, без логирования в файл
                logBlockedProcessToServer(process.name, token);  
            });
        } catch (error) {
            console.error('❌ Ошибка при получении списка процессов:', error.message);
        }
    }, 2000); 
};

module.exports = { startBlocking };

// const axios = require('axios');
// const psList = require('ps-list').default;
// const { exec } = require('child_process');
// const fs = require('fs');
// const { decodeToken, isTokenExpired } = require('./tokenUtils'); 

// const API_URL = 'http://localhost:5285/api/blacklist';

// // 📌 Функция завершения процесса по PID
// const killProcess = (pid) => {
//     const command = process.platform === 'win32' ? `taskkill /F /PID ${pid}` : `kill -9 ${pid}`;

//     exec(command, (error, stdout, stderr) => {
//         if (error) {
//             console.error(`❌ Ошибка при завершении процесса ${pid}: ${error.message}`);
//             return;
//         }
//         console.log(`✅ Процесс с PID ${pid} успешно завершён.`);
//     });
// };

// // 📌 Получение черного списка без токена
// const fetchBlacklist = async () => {
//     try {
//         const response = await axios.get(API_URL, {
//             headers: {
//                 'Content-Type': 'application/json'
//             }
//         });
//         console.log('✅ Черный список успешно получен.');
//         return response.data; 
//     } catch (error) {
//         console.error('❌ Ошибка при получении черного списка:', error.message);
//         return [];
//     }
// };

// // 📌 Логирование заблокированного процесса в файл
// const logBlockedProcessToFile = (programName, pid, token) => {
//     try {
//         // Проверяем, истек ли токен
//         if (isTokenExpired(token)) {
//             console.log('❌ Токен истек, запись в лог не производится.');
//             return;
//         }

//         // Декодируем токен, чтобы извлечь userId
//         const userId = decodeToken(token);  

//         const logMessage = `Заблокированная попытка запуска: ${programName}, PID: ${pid}, Пользователь: ${userId}, Время: ${new Date().toISOString()}\n`;

//         // Добавляем запись в лог файл
//         fs.appendFile('blocked_processes.log', logMessage, (err) => {
//             if (err) {
//                 console.error('Ошибка при записи лога в файл:', err);
//             } else {
//                 console.log('✅ Запись лога успешно добавлена в файл.');
//             }
//         });
//     } catch (error) {
//         console.error('Ошибка при декодировании токена или записи лога:', error.message);
//     }
// };

// // 📌 Логирование заблокированного процесса на сервер
// const logBlockedProcessToServer = async (programName, token) => {  
//     try {
//         // Проверяем, истек ли токен
//         if (isTokenExpired(token)) {
//             console.log('❌ Токен истек, запись на сервер не производится.');
//             return;
//         }

//         // Декодируем токен, чтобы извлечь userId
//         const userId = decodeToken(token); 

//         const logEntry = {
//             ProgramName: programName,
//             AttemptTime: new Date().toISOString(),
//             UserId: userId, 
//         };

//         console.log('📢 Отправка данных на сервер:', logEntry);

//         // Отправляем POST запрос на сервер для записи в базу данных
//         const response = await axios.post('http://localhost:5285/api/logs', logEntry, {
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json',
//             },
//         });

//         if (response.status === 201) {
//             console.log('✅ Запись лога успешно добавлена в серверную БД.');
//         } else {
//             console.log(`⚠️ Запись лога не была успешно создана. Статус: ${response.status}`);
//         }
//     } catch (error) {
//         console.error('❌ Ошибка при записи заблокированного процесса на сервер:', error.message);
//     }
// };

// // 📌 Основная функция блокировки
// const startBlocking = (getToken) => {
//     console.log('📢 Запущена функция блокировки процессов.');

//     setInterval(async () => {
//         const token = getToken();  

//         const blacklist = await fetchBlacklist(); 

//         if (blacklist.length === 0) {
//             console.log('❌ Черный список пуст. Проверка пропущена.');
//             return;
//         }

//         try {
//             const processes = await psList();
//             console.log('📢 Проверка процессов...');

//             const blockedProcesses = processes.filter(process =>
//                 blacklist.some(item => process.name.toLowerCase().includes(item.programName.toLowerCase()))
//             );

//             blockedProcesses.forEach(process => {
//                 console.log(`⚠️ Заблокирован процесс: ${process.name} (PID: ${process.pid})`);
//                 killProcess(process.pid);  

//                 // Логируем заблокированный процесс как на сервере, так и в файл
//                 logBlockedProcessToFile(process.name, process.pid, token); 
//                 logBlockedProcessToServer(process.name, token);  
//             });
//         } catch (error) {
//             console.error('❌ Ошибка при получении списка процессов:', error.message);
//         }
//     }, 2000); 
// };

// module.exports = { startBlocking };