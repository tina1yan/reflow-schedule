const fs = require('node:fs');
const path = require('node:path');
const types = {html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'application/javascript; charset=utf-8',xml:'application/xml; charset=utf-8',txt:'text/plain; charset=utf-8'};
const names = ['index.html','style.css','engine.js','workflow.js','app.js','robots.txt','sitemap.xml','404.html'];
const assets = Object.fromEntries(names.map(name => ['/'+name, {body:fs.readFileSync(path.join(__dirname,name),'utf8'),type:types[name.split('.').pop()]}]));
const source = `const assets=${JSON.stringify(assets)};
export default {async fetch(request){
 const url=new URL(request.url); let key=url.pathname==='/'?'/index.html':url.pathname;
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
 const found=Object.hasOwn(assets,key); const asset=found?assets[key]:assets['/404.html'];
 return new Response(request.method==='HEAD'?null:asset.body,{status:found?200:404,headers:{'Content-Type':asset.type,'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Cache-Control':'public, max-age=300','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'"}});
}};`;
fs.writeFileSync(path.join(__dirname,'_worker.js'),source);
console.log('Built Pages worker with '+names.length+' public assets.');
