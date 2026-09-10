import { chromium } from 'file:///C:/Users/Yousef/AppData/Local/ms-playwright-go/1.57.0/package/index.mjs';
const browser = await chromium.launch({headless:true,channel:'chrome'});
try {
 const context = await browser.newContext();
 const page = await context.newPage();
 page.on('pageerror', e => console.log('PAGE_ERROR',e.message));
 page.on('response',async r=>{if(r.url().includes('/api/') && r.status()>=400) console.log('API_ERROR',r.url(),r.status(),(await r.text()).slice(0,250));});
 await page.goto('https://didabd.vercel.app/admin',{waitUntil:'domcontentloaded'});
 await page.locator('#save-config-btn').waitFor({timeout:45000});
 console.log('ADMIN',await page.locator('input[type=text]').evaluateAll(els=>els.map(e=>({placeholder:e.placeholder,value:e.value}))));
 const config = await (await context.request.get('https://didabd.vercel.app/api/config')).json();
 console.log('SERVER',JSON.stringify({version:config.config?.version,branding:config.config?.branding,callerImagePrefix:config.config?.callerImage?.slice(0,60)}));
 const upload=await context.request.post('https://didabd.vercel.app/api/media',{data:{kind:'image',dataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='}});
 console.log('UPLOAD',upload.status(),await upload.text());
 console.log('CACHE',await page.evaluate(async()=>({keys:await caches.keys(),controller:navigator.serviceWorker.controller?.scriptURL})));
} finally {await browser.close();}
