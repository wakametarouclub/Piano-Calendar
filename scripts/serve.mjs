import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';

const file=new URL('../index.html',import.meta.url);
createServer(async(req,res)=>{
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
 if(!['/','/index.html'].includes(new URL(req.url,'http://localhost').pathname)){res.writeHead(404);res.end();return;}
 try{
  const html=await readFile(file);
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  res.end(req.method==='HEAD'?undefined:html);
 }catch{res.writeHead(500);res.end('Unable to load index.html');}
}).listen(8080,'127.0.0.1',()=>console.log('Piano calendar: http://127.0.0.1:8080'));
