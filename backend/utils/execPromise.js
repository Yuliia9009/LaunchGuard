const { exec } = require('child_process');
const fs = require('fs');

function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      }
      resolve(stdout);
    });
  });
}

// Функция для записи в лог
const logBlockedProcess = (programName) => {
  const logMessage = `Заблокированная попытка запуска: ${programName} в ${new Date().toISOString()}\n`;
  fs.appendFile('blocked_processes.log', logMessage, (err) => {
    if (err) {
      console.error('Ошибка при записи лога:', err);
    }
  });
};

// Функция для блокировки процесса
const blockProcess = (programName) => {
  exec(`osascript -e 'tell app "System Events" to display dialog "Попытка запуска ${programName}. Программа будет закрыта!" buttons {"OK"} default button "OK"'`);

  logBlockedProcess(programName);

  exec(`pkill -f "${programName}"`, (err, stdout, stderr) => {
    if (err) {
      console.error(`Ошибка при попытке завершения процесса ${programName}: ${stderr}`);
      return;
    }
    console.log(`Программа ${programName} была закрыта.`);
  });
};

module.exports = { execPromise, blockProcess };