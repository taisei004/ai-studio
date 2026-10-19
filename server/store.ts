import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import type {State,Task,Status,Agent,Project} from '../shared/domain.ts';
import {prerequisitesMet} from '../shared/domain.ts';
import {MockRunner,type AgentRunner} from './agents/runner.ts';
const roles=[['Producer','制作進行','企画設計・タスク整理','#b490d2'],['Researcher','企画リサーチ','情報収集・企画案','#77ad93'],['Writer','台本制作','構成・掛け合い','#e1b36f'],['Designer','サムネ構成','配色・ビジュアル設計','#db8c85'],['Material Artist','配信素材','素材リスト・演出案','#7eacc3'],['Reviewer','品質管理','整合性・最終確認','#adb875']];
const workflow=[['企画リサーチ',1],['企画承認',0],['台本制作',2],['台本確認',5],['サムネ構成',3],['素材案作成',4],['最終レビュー',5]] as const;
export class Store {
 db:DatabaseSync;runner:AgentRunner;
 constructor(path:string,runner:AgentRunner=new MockRunner()){
  this.db=new DatabaseSync(path);this.runner=runner;
  this.db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS studio (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL)');
  if(!this.db.prepare('SELECT id FROM studio').get()){
   const state:State={agents:roles.map(([name,role,specialty,color],i)=>({id:`agent-${i}`,name,role,specialty,color,model:'mock',instructions:''})),projects:[],tasks:[],approvals:[],artifacts:[],logs:[]};
   this.createProject(state,{name:'パレプロEX 番組制作',description:'個性を届ける、次の配信をつくろう。企画から素材・最終チェックまで、6人のチームで。',deadline:''});this.save(state);
  }
 }
 read():State{return JSON.parse((this.db.prepare('SELECT payload FROM studio WHERE id=1').get() as {payload:string}).payload);}
 save(state:State){this.db.prepare('INSERT INTO studio(id,payload) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(JSON.stringify(state));}
 log(state:State,taskId:string,message:string){state.logs.push({id:randomUUID(),taskId,message,createdAt:new Date().toISOString()});}
 createProject(state:State,input:Partial<Project>){
  if(!input.name?.trim()||input.name.length>120)throw Error('案件名を1〜120文字で入力してください');
  const project={id:randomUUID(),name:input.name.trim(),description:input.description??'',deadline:input.deadline??''};state.projects.push(project);
  state.tasks.push(...workflow.map(([title,i],order)=>({id:randomUUID(),projectId:project.id,agentId:`agent-${i}`,title,status:'idle' as Status,order})));return project;
 }
 async action(action:string,input:Record<string,unknown>):Promise<State>{
  const s=this.read();const id=String(input.id??'');const task=s.tasks.find(t=>t.id===id);
  switch(action){
   case 'createProject':this.createProject(s,input as Partial<Project>);break;
   case 'editProject':{const p=s.projects.find(p=>p.id===id);if(!p)throw Error('案件がありません');if(typeof input.name!=='string'||!input.name.trim()||input.name.length>120)throw Error('案件名が不正です');Object.assign(p,{name:input.name.trim(),description:String(input.description??''),deadline:String(input.deadline??'')});break;}
   case 'deleteProject':{const ids=new Set(s.tasks.filter(t=>t.projectId===id).map(t=>t.id));s.projects=s.projects.filter(p=>p.id!==id);s.tasks=s.tasks.filter(t=>!ids.has(t.id));s.approvals=s.approvals.filter(a=>!ids.has(a.taskId));s.artifacts=s.artifacts.filter(a=>!ids.has(a.taskId));s.logs=s.logs.filter(a=>!ids.has(a.taskId));break;}
   case 'editAgent':{const a=s.agents.find(a=>a.id===id);if(!a)throw Error('社員がいません');for(const key of ['name','role','specialty','model','instructions'] as (keyof Agent)[]){if(typeof input[key]==='string')a[key]=String(input[key]).slice(0,4000);}if(!a.name.trim())throw Error('名前を入力してください');break;}
   case 'start':{if(!task)throw Error('タスクがありません');if(!['idle','error'].includes(task.status))throw Error('開始できない状態です');if(!prerequisitesMet(task,s.tasks))throw Error('前の工程を完了・承認してください');task.status='working';this.log(s,id,'モック作業を開始。成果物を作成ボタンで次へ進みます。');break;}
   case 'finish':{if(!task||task.status!=='working')throw Error('作業中のタスクを選んでください');const output=await this.runner.run(task);task.status='review';s.artifacts.push({id:randomUUID(),taskId:id,...output,createdAt:new Date().toISOString()});s.approvals.push({id:randomUUID(),taskId:id,status:'pending',comment:''});this.log(s,id,'モック成果物を作成し、承認を依頼しました。');break;}
   case 'fail':{if(!task||task.status!=='working')throw Error('作業中のタスクを選んでください');task.status='error';this.log(s,id,'モックエラー。開始ボタンで再試行できます。');break;}
   case 'approve':case 'revise':case 'hold':{const a=s.approvals.find(a=>a.id===id);if(!a||!['pending','held'].includes(a.status))throw Error('承認待ちではありません');const t=s.tasks.find(t=>t.id===a.taskId)!;
    if(action==='revise'&&!String(input.comment??'').trim())throw Error('修正内容を入力してください');
    a.status=action==='approve'?'approved':action==='revise'?'revision':'held';a.comment=String(input.comment??'');t.status=action==='approve'?'done':action==='revise'?'working':'review';this.log(s,t.id,`${action==='approve'?'承認しました':action==='revise'?'修正を依頼しました':'保留しました'}${a.comment?'：'+a.comment:''}`);break;}
   case 'message':{if(!task)throw Error('タスクがありません');const message=String(input.message??'').trim();if(!message)throw Error('指示を入力してください');this.log(s,id,`ユーザーからの指示：${message}`);break;}
   default:throw Error('不明な操作です');
  }this.save(s);return s;
 }
 close(){this.db.close();}
}
