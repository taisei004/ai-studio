import type {Task,Artifact} from '../../shared/domain.ts';
export interface AgentRunner {run(task:Task):Promise<Pick<Artifact,'title'|'content'>>}
/** Explicit user-triggered mock. Never calls a model or shell. */
export class MockRunner implements AgentRunner {
 async run(task:Task){return {title:`${task.title} / モック成果物`,content:`# ${task.title}\n\nこれは動作確認用のサンプルです。AIが生成した成果ではありません。\n\n## 提案\n参加者の個性が伝わるトークと、視聴者参加型のクイズを組み合わせた番組構成。\n\n## 構成\n1. オープニング・近況トーク（5分）\n2. メンバー対抗クイズ（20分）\n3. 視聴者投票・振り返り（10分）\n4. お知らせ・エンディング（5分）\n\n## 確認してほしいこと\n出演メンバー、配信時間、使用素材の権利、企画の実施可否を確認してください。`};}
}
