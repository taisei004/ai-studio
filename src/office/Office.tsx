import {useEffect,useRef,useState} from 'react';
import {Application,Graphics} from 'pixi.js';
import type {Agent,Task} from '../../shared/domain.ts';
import {agentStatus,statusLabels} from '../../shared/domain.ts';
const positions=[[146,132],[425,132],[700,132],[146,350],[425,350],[700,350]];
function drawOffice(g:Graphics){
 const rect=(x:number,y:number,w:number,h:number,c:number)=>g.rect(x,y,w,h).fill(c);
 const plant=(x:number,y:number)=>{rect(x+7,y+26,22,18,0x997052);rect(x+3,y+23,30,6,0xc69b70);rect(x+15,y,6,28,0x527f58);rect(x,y+7,18,14,0x6b985f);rect(x+19,y+2,17,14,0x83ab70);rect(x+6,y-5,14,16,0x6b985f);};
 const desk=(x:number,y:number,c:number)=>{rect(x+4,y+40,142,10,0xb68c62);rect(x,y,144,43,0xdbb98d);rect(x,y,144,5,0xf1d5ac);rect(x+8,y+43,8,17,0xa47b55);rect(x+128,y+43,8,17,0xa47b55);rect(x+47,y-28,47,31,0x344d48);rect(x+51,y-24,39,23,0x99b7a3);rect(x+55,y-20,21,3,c);rect(x+55,y-13,29,3,0xdce8d9);rect(x+67,y+3,6,8,0x40564d);rect(x+52,y+15,39,9,0xe7dfc6);rect(x+112,y+10,12,14,0xf9f1da);rect(x+121,y+13,5,7,0xf9f1da);rect(x+13,y+8,20,25,0xf9eed5);rect(x+17,y+14,12,3,c);};
 rect(0,0,900,550,0xf1e8cf);rect(12,12,876,526,0xd8b98c);
 for(let row=0;row<18;row++)for(let col=0;col<16;col++){const x=12+col*58+(row%2?-29:0);rect(x,12+row*30,57,29,(row+col)%3===0?0xdfc69f:0xe4cda9);}
 rect(0,0,900,43,0x8ea789);rect(0,40,900,8,0x6e8b71);rect(0,48,900,9,0xf8eed2);
 for(const x of [85,362,639]){rect(x,5,154,36,0xf5edd7);rect(x+5,9,144,28,0xbed9d0);rect(x+77,9,4,28,0xf8eed9);rect(x+5,22,144,3,0xf8eed9);}
 rect(0,57,13,493,0x8da184);rect(887,57,13,493,0x8da184);rect(0,535,900,15,0x81977c);
 // Two workspace rows, divided by a clear central corridor.
 for(const [i,[x,y]] of positions.entries()){
  const palette=[0xa28bc3,0x77a88c,0xd9ad65,0xd58b83,0x7cabc0,0xa8b16c];
  rect(x-105,y-61,217,161,0xc2ae8b);rect(x-101,y-57,209,153,0xefe3c5);
  desk(x-71,y-32,palette[i]);
  rect(x-17,y+44,35,29,0x6d8773);rect(x-13,y+48,27,21,0x97ac8e);
  if(i<3){rect(x-112,y+111,224,9,0xad9270);rect(x-112,y+104,224,8,0xf7eccf);}
 }
 plant(29,68);plant(833,68);plant(30,277);plant(833,277);
 // Shared lounge at the bottom.
 rect(280,464,310,57,0x9dab8c);rect(286,470,298,45,0xc8cda7);
 rect(311,466,75,27,0x638575);rect(307,461,83,13,0x7b9a80);rect(311,490,10,13,0x526c5e);rect(376,490,10,13,0x526c5e);
 rect(410,473,79,29,0xc69e70);rect(417,478,65,18,0xe3c295);rect(444,478,12,9,0xf7edd5);
 rect(517,466,45,28,0x9b8269);rect(520,460,39,9,0xbca17c);
 plant(246,469);plant(599,469);
 rect(40,476,134,33,0xb88d63);rect(45,481,124,22,0xdfc49a);rect(67,462,34,20,0x6b7f69);rect(72,466,24,10,0xaec0a2);
 // Books and stationery.
 rect(744,471,91,40,0xa8815f);for(let i=0;i<8;i++)rect(751+i*10,478,7,25,[0x89a391,0xc68d79,0xf0d6a1,0x9b9ab6][i%4]);
}
export function Office({agents,tasks,selected,onSelect}:{agents:Agent[];tasks:Task[];selected:string;onSelect:(id:string)=>void}){
 const host=useRef<HTMLDivElement>(null);const [error,setError]=useState(false);
 useEffect(()=>{let disposed=false;let ready=false;const app=new Application();
  (async()=>{try{await app.init({width:900,height:550,backgroundAlpha:0,antialias:false,resolution:1,preference:'webgl'});ready=true;if(disposed){app.destroy(true);return;}host.current?.appendChild(app.canvas);const g=new Graphics();drawOffice(g);app.stage.addChild(g);}catch{setError(true);}})();
  return()=>{disposed=true;if(ready)app.destroy(true);};
 },[]);
 return <div className="office-world"><div ref={host} className="office-canvas"/>{error&&<div className="canvas-fallback">オフィス描画を利用できません。社員ボタンから操作できます。</div>}
  {agents.map((a,i)=>{const status=agentStatus(tasks.filter(t=>t.agentId===a.id));return <button key={a.id} aria-label={`${a.name}を選択`} className={`employee ${selected===a.id?'selected':''} ${status}`} style={{left:`${positions[i][0]/9}%`,top:`${(positions[i][1]+18)/5.5}%`,'--shirt':a.color} as React.CSSProperties} onClick={()=>onSelect(a.id)}><span className="speech">{status==='working'?'• • •':status==='review'?'確認お願いします':status==='done'?'できました！':status==='error'?'!':'…'}</span><span className={`sprite person-${i}`}><i className="hair"/><i className="face"/><i className="body"/><i className="legs"/></span><span className="employee-name">{a.name}<small><b className={`dot ${status}`}/>{statusLabels[status]}</small></span></button>;})}
  <span className="room-label r1">PLANNING</span><span className="room-label r2">RESEARCH</span><span className="room-label r3">WRITING</span><span className="room-label r4">DESIGN</span><span className="room-label r5">MATERIALS</span><span className="room-label r6">REVIEW</span><span className="lounge-label">☕ CREATIVE BREAK</span>
 </div>;
}
