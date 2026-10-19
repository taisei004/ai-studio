import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../server/store.ts';
import {progress,agentStatus} from '../shared/domain.ts';
test('workflow requires prerequisites and approval; revisions preserve history',async()=>{
 const store=new Store(':memory:');try{const s=store.read();const first=s.tasks[0],second=s.tasks[1];
 await assert.rejects(()=>store.action('start',{id:second.id}),/前の工程/);
 let next=await store.action('start',{id:first.id});assert.equal(agentStatus(next.tasks.filter(t=>t.agentId===first.agentId)),'working');assert.equal(progress(next.tasks),0);
 next=await store.action('finish',{id:first.id});assert.equal(next.artifacts.length,1);assert.equal(progress(next.tasks),0);
 await assert.rejects(()=>store.action('finish',{id:first.id}));
 const approval=next.approvals[0];next=await store.action('hold',{id:approval.id});assert.equal(next.tasks[0].status,'review');
 await assert.rejects(()=>store.action('revise',{id:approval.id,comment:''}));
 next=await store.action('revise',{id:approval.id,comment:'尺を短く'});assert.equal(next.tasks[0].status,'working');
 next=await store.action('finish',{id:first.id});assert.equal(next.artifacts.length,2);
 next=await store.action('approve',{id:next.approvals[1].id});assert.equal(progress(next.tasks),14);
 await assert.rejects(()=>store.action('approve',{id:next.approvals[1].id}));
 next=await store.action('start',{id:second.id});assert.equal(next.tasks[1].status,'working');
 }finally{store.close();}
});
test('SQLite persists edits and deleting projects cascades related data',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'ai-studio-test-'));const path=join(dir,'test.sqlite');let store=new Store(path);
 try{let s=await store.action('createProject',{name:'永続化テスト',description:'概要',deadline:'2026-10-31'});const p=s.projects.at(-1)!;const task=s.tasks.find(t=>t.projectId===p.id)!;
 await store.action('editProject',{id:p.id,name:'変更済み',description:'更新',deadline:''});
 await store.action('editAgent',{id:s.agents[0].id,name:'監督',model:'future-model',instructions:'テスト'});
 await store.action('start',{id:task.id});await store.action('fail',{id:task.id});await store.action('start',{id:task.id});await store.action('message',{id:task.id,message:'指示'});await store.action('finish',{id:task.id});
 store.close();store=new Store(path);s=store.read();assert.equal(s.projects.at(-1)?.name,'変更済み');assert.equal(s.agents[0].name,'監督');assert.equal(s.tasks.find(t=>t.id===task.id)?.status,'review');
 s=await store.action('deleteProject',{id:p.id});assert.ok(!s.tasks.some(t=>t.projectId===p.id));assert.ok(!s.artifacts.some(a=>a.taskId===task.id));assert.ok(!s.logs.some(l=>l.taskId===task.id));assert.ok(!s.approvals.some(a=>a.taskId===task.id));
 await assert.rejects(()=>store.action('createProject',{name:'   '}));
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
