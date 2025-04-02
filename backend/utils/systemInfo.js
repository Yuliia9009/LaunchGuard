const os = require('os');

// 📌 Функция для получения информации о системе
const getSystemInfo = () => {
    const cpuInfo = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const uptime = os.uptime();
    const platform = os.platform();
    const networkInfo = os.networkInterfaces();

    return {
        osInfo: {
            platform,
            cpu: cpuInfo.map(cpu => ({
                model: cpu.model,
                speed: cpu.speed,
                cores: cpu.times
            })),
            memory: totalMemory,
            freeMemory,
            uptime,
        },
        networkInfo
    };
};

module.exports = { getSystemInfo };