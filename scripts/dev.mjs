import { spawn } from 'node:child_process';
const children=[spawn(process.execPath,['--experimental-strip-types','server/index.ts'],{stdio:'inherit'}),spawn(process.execPath,['node_modules/vite/bin/vite.js'],{stdio:'inherit'})];
let exiting=false;
function stop(code=0){if(exiting)return;exiting=true;for(const child of children)child.kill();process.exit(code);}
for(const child of children)child.on('exit',code=>stop(code??0));
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
