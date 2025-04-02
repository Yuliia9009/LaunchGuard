const { jwtDecode } = require('jwt-decode');

// 📌 Декодируем токен и ищем userId
const decodeToken = (token) => {
  try {
    console.log('jwtDecode:', jwtDecode);
    console.log('📢 Токен, переданный для декодирования:', token);
    const decodedToken = jwtDecode(token);  
    console.log('Декодированный токен:', decodedToken);

    // Попробуем найти userId через несколько возможных путей
    const userId = decodedToken['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']
                || decodedToken['nameid']  // Стандартный клейм ASP.NET Core
                || decodedToken['UserId']  // Если ты добавляешь кастомный клейм
                || decodedToken['sub'];    // Стандартный JWT клейм

    if (!userId) {
      throw new Error('userId не найден в токене');
    }
    
    return userId;
  } catch (error) {
    console.error('Ошибка при декодировании токена:', error.message);
    throw new Error('Невалидный токен');
  }
};

// Проверка истечения срока действия токена
// 
const isTokenExpired = (token) => {
  try {
      console.log('📢 Токен перед декодированием:', token);

      if (!token || typeof token !== 'string') {
          throw new Error('Неверный формат токена. Ожидается строка.');
      }

      if (token.split('.').length !== 3) {
          throw new Error('Токен должен содержать три части, разделённые точками.');
      }

      const decoded = jwtDecode(token);
      console.log('✅ Декодированный токен:', decoded);

      const expirationDate = decoded.exp * 1000; 
      const currentDate = Date.now();
      
      if (currentDate > expirationDate) {
          console.log('❌ Токен истек');
          return true;
      }
      console.log('✅ Токен действителен');
      return false;
  } catch (error) {
      console.error('❌ Ошибка при проверке истечения токена:', error.message);
      return true;
  }
};  

module.exports = { decodeToken, isTokenExpired };

// const axios = require('axios');
// const jwtDecode = require('jwt-decode');  

// // Функция для проверки токена и извлечения userId
// const decodeToken = (token) => {
//   try {
//     const decodedToken = jwtDecode(token);  
//     console.log('Декодированный токен:', decodedToken);
//     const userId = decodedToken['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']; 
//     return userId;
//   } catch (error) {
//     console.error('Ошибка при декодировании токена:', error.message);
//     throw new Error('Невалидный токен');
//   }
// };

// // Проверка истечения срока действия токена
// const isTokenExpired = (token) => {
//     const decoded = jwtDecode(token);  
//     const expirationDate = decoded.exp * 1000; 
//     const currentDate = Date.now();
    
//     if (currentDate > expirationDate) {
//       console.log('Токен истек');
//       return true;
//     }
//     console.log('Токен действителен');
//     return false;
//   };  

// module.exports = { decodeToken, isTokenExpired };