const psList = require('ps-list').default;

(async () => {
    const processes = await psList();
    console.log('✅ Процессы получены:', processes);
})();