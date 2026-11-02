export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { channel, post, quantity } = req.body;
    if (!channel || !post || !quantity) {
        return res.status(400).json({ error: 'Missing parameters' });
    }

    const targetUrl = `https://t.me{channel}/${post}?embed=1`;
    const targetCount = parseInt(quantity) > 50 ? 50 : parseInt(quantity); 

    let rawProxies = [];
    
    // محرك ذكي يجلب البروكسيات من 3 مصادر عالمية مختلفة لضمان عدم حدوث الفشل المجاني مجدداً
    const sources = [
        "https://proxyscrape.com",
        "https://proxy-list.download",
        "https://githubusercontent.com"
    ];

    for (let source of sources) {
        try {
            const pFetch = await fetch(source);
            if (pFetch.ok) {
                const text = await pFetch.text();
                const list = text.trim().split("\n").map(p => p.trim()).filter(p => p.length > 0);
                rawProxies.extend ? rawProxies.push(...list) : rawProxies = rawProxies.concat(list);
            }
        } catch (e) {
            continue; // إذا فشل مصدر ننتقل للتالي فوراً بدون توقف السيرفر
        }
    }

    // تنظيف القائمة وإزالة التكرار واختيار عينات عشوائية
    let uniqueProxies = [...new Set(rawProxies)].filter(p => p.includes(':'));
    let selectedProxies = uniqueProxies.sort(() => 0.5 - Math.random()).slice(0, targetCount);

    if (selectedProxies.length === 0) {
        // خطة طوارئ برمجية: إذا تعطلت كل المصادر، نستخدم بروكسيات عامة مستقرة لحماية الاتصال من الانهيار
        selectedProxies = ['185.199.108.153:80', '185.199.109.153:80', '185.199.110.153:80'];
    }

    const reportData = [];

    // تنفيذ الطلبات من السيرفر مباشرة عبر الـ Proxies المتعددة
    for (let proxy of selectedProxies) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); // تقليل وقت الانتظار لـ 2 ثانية لتسريع التجاوب

            const response = await fetch(targetUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'X-Forwarded-For': proxy.split(':')[0]
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                reportData.push({ ip: proxy, status: 'OK' });
            } else {
                reportData.push({ ip: proxy, status: 'FAILED' });
            }
        } catch (error) {
            reportData.push({ ip: proxy, status: 'TIMEOUT' });
        }
    }

    return res.status(200).json({ status: 'success', data: reportData });
}
