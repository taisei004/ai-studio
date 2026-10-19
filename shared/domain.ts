export type Status='idle'|'working'|'review'|'done'|'error';
export const statusLabels:Record<Status,string>={idle:'待機中',working:'作業中',review:'承認待ち',done:'完了',error:'エラー'};
export interface Agent {id:string;name:string;role:string;specialty:string;model:string;instructions:string;color:string}
export interface Project {id:string;name:string;description:string;deadline:string}
export interface Task {id:string;projectId:string;agentId:string;title:string;status:Status;order:number}
export interface Approval {id:string;taskId:string;status:'pending'|'approved'|'revision'|'held';comment:string}
export interface Artifact {id:string;taskId:string;title:string;content:string;createdAt:string}
export interface Log {id:string;taskId:string;message:string;createdAt:string}
export interface State {agents:Agent[];projects:Project[];tasks:Task[];approvals:Approval[];artifacts:Artifact[];logs:Log[]}
export function progress(tasks:Task[]){return tasks.length?Math.round(tasks.filter(t=>t.status==='done').length/tasks.length*100):0;}
export function agentStatus(tasks:Task[]):Status {return (['error','review','working'] as Status[]).find(s=>tasks.some(t=>t.status===s))??(tasks.length&&tasks.every(t=>t.status==='done')?'done':'idle');}
export function prerequisitesMet(task:Task,tasks:Task[]){return tasks.filter(t=>t.projectId===task.projectId&&t.order<task.order).every(t=>t.status==='done');}
