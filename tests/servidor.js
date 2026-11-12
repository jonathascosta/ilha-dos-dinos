const http=require('http'),fs=require('fs'),path=require('path');
const root=process.argv[2], port=+process.argv[3]||8123;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'};
http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=path.join(root,p);
fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end('nf');return;}r.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});r.end(d);});}).listen(port,()=>console.log('up'));
