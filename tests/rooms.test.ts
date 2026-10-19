import {test} from 'node:test';
import assert from 'node:assert/strict';
import {locationFor,type Task,type RoomId} from '../shared/studio.ts';
test('all six specializations move to the correct room for actual task state',()=>{
 const locations:Record<string,RoomId>={producer:'meeting',researcher:'research',writer:'computer',designer:'design',engineer:'computer',reviewer:'review'};
 for(const [agentId,room] of Object.entries(locations)){
  const task:Task={id:agentId,projectId:'p',agentId,title:'work',status:'idle',order:0,runId:null,revision:''};
  assert.equal(locationFor(agentId,[task]),'lounge');assert.equal(locationFor(agentId,[{...task,status:'working'}]),room);assert.equal(locationFor(agentId,[{...task,status:'review'}]),'meeting');assert.equal(locationFor(agentId,[{...task,status:'error'}]),'review');assert.equal(locationFor(agentId,[{...task,status:'done'}]),'lounge');
 }
});
