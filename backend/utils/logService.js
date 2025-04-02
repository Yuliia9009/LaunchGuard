const axios = require('axios');
const { decodeToken, isTokenExpired } = require('./tokenUtils'); 
console.log('Проверка доступности isTokenExpired:', isTokenExpired);

const API_URL = 'http://localhost:5285/api/log';  

// 📌 Логирование заблокированного процесса на сервер
const logBlockedProcessToServer = async (programName, token) => {  
    try {
        // Проверка токена на истечение
        if (isTokenExpired(token)) {
            console.log('❌ Токен истек, запись на сервер не производится.');
            return;
        }

        // Декодирование токена
        const userId = decodeToken(token); 

        if (!userId) {
            console.error('❌ Не удалось извлечь userId из токена.');
            return;
        }

        // Формируем лог для отправки
        const logEntry = {
            ProgramName: programName,
            AttemptTime: new Date().toISOString(),
            UserId: userId
        };

        console.log('📢 Отправка данных на сервер:', logEntry);

        // Отправка POST запроса на ASP.NET Core сервер
        const response = await axios.post(API_URL, logEntry, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 201) {
            console.log('✅ Лог успешно добавлен на сервер.');
        } else {
            console.log(`⚠️ Запрос выполнен, но статус ответа: ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Ошибка при отправке лога на сервер:', error.message);
    }
};

module.exports = { logBlockedProcessToServer };