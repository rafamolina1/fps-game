import {cp,readFile,writeFile} from 'node:fs/promises';
await cp('public','dist',{recursive:true});
if(process.env.GAME_SERVER_URL){
 const url=new URL(process.env.GAME_SERVER_URL);
 if(url.protocol!=='wss:')throw Error('GAME_SERVER_URL precisa começar com wss://');
 const file='dist/index.html';
 await writeFile(file,(await readFile(file,'utf8')).replace('<script type="module"', '<script>window.GAME_SERVER='+JSON.stringify(url.href).replaceAll('<','\\u003c')+'</script><script type="module"'));
}
