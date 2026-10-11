const V='cesar-v32';
const CORE=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
/* solo se gestiona lo propio (misma web): la API de GitHub y demás pasan directas, sin caché.
   Red primero; si la red tarda más de 4 s al abrir la app, se sirve la copia guardada y la nueva se guarda para la próxima. */
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  let u; try{ u=new URL(e.request.url); }catch(err){ return; }
  if(u.origin!==self.location.origin)return;
  const nav=e.request.mode==='navigate';
  e.respondWith((async()=>{
    const cache=await caches.open(V);
    const net=fetch(e.request).then(r=>{ if(r&&r.ok){ const cp=r.clone(); e.waitUntil(cache.put(e.request,cp).catch(()=>{})); } return r; });
    try{
      return nav ? await Promise.race([net, new Promise((_,rej)=>setTimeout(()=>rej(new Error('lento')),4000))]) : await net;
    }catch(err){
      const hit=(await cache.match(e.request))||(nav?await cache.match('./index.html'):undefined);
      if(hit){ if(nav) e.waitUntil(net.catch(()=>{})); return hit; }
      return net;
    }
  })());
});
/* ✉ avisos de Hermes (push) */
self.addEventListener('push',e=>{
  let d={}; try{ d=e.data?e.data.json():{}; }catch(err){ d={title:'César el filósofo',body:e.data?e.data.text():''}; }
  const title=d.title||'César el filósofo';
  e.waitUntil(self.registration.showNotification(title,{
    body:d.body||'', tag:d.tag||'hermes', renotify:!!d.renotify, icon:'icon-192.png', badge:'icon-192.png',
    data:{url:d.url||'./'}, lang:'es'
  }));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=(e.notification.data&&e.notification.data.url)||'./';
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{
    for(const c of cs){ if('focus' in c){ try{ c.postMessage({lechuza:url}); }catch(err){} return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
/* el navegador renovó la suscripción: que la app la vuelva a guardar en cuanto se abra */
self.addEventListener('pushsubscriptionchange',e=>{
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>cs.forEach(c=>{ try{ c.postMessage({lzchange:true}); }catch(err){} })));
});
