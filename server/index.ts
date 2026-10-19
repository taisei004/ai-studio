import {createServer} from 'node:http';
import {mkdirSync,existsSync,readFileSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {Store} from './store.ts';
mkdirSync('data',{recursive:true});const store=new Store(process.env.STUDIO_DB??'data/studio.sqlite');
const root=resolve('dist');const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'};
createServer(async(req,res)=>{
 try{
  const url=new URL(req.url??'/', 'http://localhost');
  if(url.pathname.startsWith('/api/')){
   res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
   if(req.method==='GET'&&url.pathname==='/api/state'){res.end(JSON.stringify(store.read()));return;}
   if(req.method==='POST'&&url.pathname==='/api/action'){
    const origin=req.headers.origin;if(origin&&!['http://127.0.0.1:5176','http://localhost:5176','http://127.0.0.1:4317','http://localhost:4317'].includes(origin)){res.writeHead(403);res.end(JSON.stringify({error:'許可されていない送信元'}));return;}
    if(!req.headers['content-type']?.startsWith('application/json'))throw Error('JSONが必要です');
    let body='';for await(const chunk of req){body+=chunk;if(body.length>100000)throw Error('データが大きすぎます');}
    const {action,...input}=JSON.parse(body);res.end(JSON.stringify(await store.action(action,input)));return;
   }res.writeHead(404);res.end(JSON.stringify({error:'見つかりません'}));return;
  }
  const path=resolve(root,'.'+decodeURIComponent(url.pathname));if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  const file=existsSync(path)&&extname(path)?path:resolve(root,'index.html');
  if(!existsSync(file)){res.writeHead(404);res.end('先に pnpm build を実行してください。開発中は http://127.0.0.1:5176 を開きます。');return;}
  res.setHeader('Content-Type',mime[extname(file)]??'application/octet-stream');res.end(readFileSync(file));
 }catch(error){res.writeHead(400,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:error instanceof Error?error.message:'操作に失敗しました'}));}
}).listen(4317,'127.0.0.1',()=>console.log('AI STUDIO API: http://127.0.0.1:4317'));
