const express = require('express');
const cors = require('cors');
const { startBlocking } = require('./utils/fetchBlacklist');
const { main } = require('./utils/getInstalledPrograms');
const { getSystemInfo } = require('./utils/systemInfo');
const { jwtDecode } = require('jwt-decode');

const app = express();
const port = 3001;

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

let JWT_TOKEN = '';  

// 📌 Маршрут для сохранения токена из React-приложения
app.post('/save-token', (req, res) => {
  const token = req.body.token;

  if (!token) {
    console.log('❌ Токен не передан или пустой.');
    return res.status(400).send('Токен не передан или пустой');
  }

  console.log('📢 Токен, переданный клиентом через `axios`:', token);  // <-- Добавлено для проверки

  JWT_TOKEN = token; 
  console.log('📢 Токен сохранён на Node.js сервере:', JWT_TOKEN);
  res.sendStatus(200);
});

// 📌 Middleware для проверки токена и его срока действия
const verifyToken = (req, res, next) => {
  if (!JWT_TOKEN) {
    return res.status(401).send('Не авторизован');
  }

  try {
    console.log('jwtDecode:', jwtDecode);
    console.log('📢 Токен, переданный для декодирования:', token);
    const decoded = jwtDecode(JWT_TOKEN);
    const currentTime = Math.floor(Date.now() / 1000); // текущее время в секундах
    if (decoded.exp && decoded.exp < currentTime) {
      console.warn('[⚠️ TokenChecker] Токен истек, выполняем logout');
      return res.status(401).send('Токен истек');
    }

    req.userId = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']
              || decoded['userId'] 
              || decoded['nameid']; 

    if (!req.userId) {
      return res.status(401).send('userId не найден в токене');
    }

    console.log('Токен успешно проверен, userId:', req.userId);
    next();
  } catch (error) {
    console.error('Ошибка при декодировании токена:', error.message);
    return res.status(401).send('Невалидный токен');
  }
};

// 📌 Маршрут для получения информации о системе
app.get('/system-info', (req, res) => {
  try {
      const systemInfo = getSystemInfo();
      res.json(systemInfo);
  } catch (error) {
      res.status(500).send('Ошибка при получении информации о системе.');
  }
});

// ✅ Используем middleware ТОЛЬКО для защищённых маршрутов
app.use('/protected', verifyToken);  

// 📌 Маршрут для запуска блокировки (внутри защищённого маршрута)
app.post('/protected/start-blocking', (req, res) => {
  try {
    startBlocking(() => JWT_TOKEN);  
    res.send('✅ Блокировка успешно запущена.');
  } catch (error) {
    res.status(500).send('❌ Ошибка при запуске блокировки.');
  }
});

// 📌 Маршрут для запуска сбора программ (внутри защищённого маршрута)
app.post('/protected/start-main', async (req, res) => {
  try {
    await main();
    res.send('✅ Данные о программах успешно отправлены на сервер.');
  } catch (error) {
    res.status(500).send('❌ Ошибка при отправке данных о программах.');
  }
});

// ✅ Запуск блокировки программ из черного списка
app.use(verifyToken); // Добавляем middleware для проверки токена и извлечения userId
startBlocking(() => JWT_TOKEN);  

// 📢 Запуск функции сбора и отправки программ
main().then(() => {
  console.log('Данные о программах успешно отправлены на сервер.');
}).catch(err => {
  console.error('Ошибка при отправке данных о программах:', err);
});

// 📢 Запуск сервера
app.listen(port, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${port}`);
});


// const express = require('express');
// const cors = require('cors');
// const { startBlocking } = require('./utils/fetchBlacklist');
// const { main } = require('./utils/getInstalledPrograms');
// const jwtDecode = require('jwt-decode'); 

// const app = express();
// const port = 3001;

// app.use(cors({
//   origin: ['http://localhost:3000', 'http://localhost:3001'],
//   methods: ['GET', 'POST'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
// }));

// app.use(express.json());

// let JWT_TOKEN = '';  

// // 📌 Маршрут для сохранения токена из React-приложения
// app.post('/save-token', (req, res) => {
//   const token = req.body.token;
//   if (!token) {
//     return res.status(400).send('Токен не передан');
//   }

//   JWT_TOKEN = token; 
//   console.log('📢 Токен сохранён на Node.js сервере:', JWT_TOKEN);
//   res.sendStatus(200);
// });

// // 📌 Middleware для проверки токена и его срока действия
// const verifyToken = (req, res, next) => {
//   if (!JWT_TOKEN) {
//     return res.status(401).send('Не авторизован');
//   }

//   try {
//     // Проверяем, истек ли токен
//     const decoded = jwtDecode(JWT_TOKEN);
//     const currentTime = Math.floor(Date.now() / 1000); // текущее время в секундах
//     if (decoded.exp && decoded.exp < currentTime) {
//       console.warn('[⚠️ TokenChecker] Токен истек, выполняем logout');
//       return res.status(401).send('Токен истек');
//     }

//     // Добавляем userId в объект запроса, чтобы он был доступен в других маршрутах
//     req.userId = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
//     console.log('Токен успешно проверен, userId:', req.userId);
//   } catch (error) {
//     console.error('Ошибка при декодировании токена:', error.message);
//     return res.status(401).send('Невалидный токен');
//   }

//   next();
// };

// // ✅ Запуск блокировки программ из черного списка
// app.use(verifyToken); // Добавляем middleware для проверки токена и извлечения userId
// startBlocking(() => JWT_TOKEN);  

// // 📢 Запуск функции сбора и отправки программ
// main().then(() => {
//   console.log('Данные о программах успешно отправлены на сервер.');
// }).catch(err => {
//   console.error('Ошибка при отправке данных о программах:', err);
// });

// app.listen(port, () => {
//   console.log(`🚀 Сервер запущен на http://localhost:${port}`);
// });