const axios = require('axios');
const fs = require('fs').promises;
const {agent, checkProxy} = require('./proxy');
const {generateToken} = require('./decode');
const {
    sleep,
    generateCardCode,
    generateRandomIP,
    generateRandomUserName,
    generateRandomDOB,
    generateRandomPhone,
    generateRandomGender,
    generateRandomAddress,
    delayRandom
} = require('./handlers');
const {sendTelegramMessage} = require('./telegram');
const keep_alive = require('./keep_alive.js');

async function readCodesFromFile() {
    try {
        const data = await fs.readFile('data.txt', 'utf-8');
        return data.split('\n').map(code => code.trim()).filter(code => code);
    } catch (error) {
        console.error('Lỗi khi đọc file:', error);
        return [];
    }
}

async function submitData(reties = 4) {
    const address = await generateRandomAddress();
    const content = await generateCardCode();
    const dob = await generateRandomDOB();
    const gender = await generateRandomGender();
    const ipClient = await generateRandomIP();
    const userName = await generateRandomUserName();
    const channelId = 1;
    const phone = await generateRandomPhone();
    let data = {
        phone,
        content,
        userName,
        dob,
        address,
        gender,
        ipClient,
        channelId
    };
    const token = await generateToken(data);
    data = {...data, token};
    if (reties < 0) {
        return null
    }
    if (reties === 4) {
        await delayRandom(3,10)
    } else {
        await delayRandom(3,10)
    }
    try {
        const response = await axios.post('https://khuyenmai.mihaohao.vn/v1/prize-codes/submit-info', data, {
            headers: {
                'Host': 'khuyenmai.mihaohao.vn',
                'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
                'accept': 'application/json; charset=utf-8',
                'Content-Type': 'application/json',
                'sec-ch-ua-mobile': '?1',
                'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
                'sec-ch-ua-platform': 'Android',
                'origin': 'https://khuyenmai.mihaohao.vn',
                'sec-fetch-site': 'same-origin',
                'sec-fetch-mode': 'cors',
                'sec-fetch-dest': 'empty',
                'referer': 'https://khuyenmai.mihaohao.vn/trang-chu',
                'accept-encoding': 'gzip, deflate, br, zstd',
                'accept-language': 'vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
            },
            httpAgent: agent,
            httpsAgent: agent,
        });
        const status = response.data.Status;
        if ((status !== 4) && (status !== -4) && (status !== 3)) {
            const code = response.data.Message;
            await sendTelegramMessage(code);
        }
        console.log("Kết quả trả về:", response.data.Message);
    } catch (error) {
        if (error.response && (error.response.data.statusCode === 403 || error.response.data.statusCode === 400)) {
            console.log("Lỗi:", error.response.data.statusCode);
            return await submitData(reties - 1)
        }
        console.log("Lỗi:", error);
    }
}

async function runMultipleRequests(requests) {
    const promises = [];
    for (let i = 0; i < requests; i++) {
        promises.push(submitData());
    }
    await Promise.all(promises);
    console.log(`Đã hoàn tất ${requests} luồng, nghỉ 1 tí đã...`);
    await delayRandom(7, 15)
}

async function checkProxyAndRun() {
    while (true) {
        const isProxyWorking = await checkProxy();
        if (isProxyWorking) {
            await runMultipleRequests( 25);
        } else {
            console.error("Proxy không hoạt động. Dừng lại.");
        }
    }
}

// async function runBatch(codesBatch) {
//     const promises = codesBatch.map(code => submitData(code));
//     await Promise.all(promises);
//     console.log(`Đã hoàn tất ${codesBatch.length} mã, nghỉ ${codesBatch.length} giây...`);
//     await sleep(codesBatch.length * 1000);
// }
// async function checkProxyAndRunCode() {
//     const codes = await readCodesFromFile();
//     if (codes.length === 0) {
//         console.error("Không có mã hợp lệ trong file.");
//         return;
//     }
//
//     while (true) {
//         const isProxyWorking = await checkProxy();
//         if (isProxyWorking) {
//             for (let i = 0; i < codes.length; i += 20) {
//                 const batch = codes.slice(i, i + 20);
//                 await runBatch(batch);
//             }
//         } else {
//             console.error("Proxy không hoạt động. Dừng lại.");
//             break;
//         }
//     }
// }


checkProxyAndRun();
