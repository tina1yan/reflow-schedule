const fs=require('node:fs');const path=require('node:path');
let html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
for(const name of ['engine.js','workflow.js','app.js'])html=html.replace(`<script src="${name}"></script>`,()=>'<script>\n'+fs.readFileSync(path.join(__dirname,name),'utf8')+'\n</script>');
html=html.replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+fs.readFileSync(path.join(__dirname,'style.css'),'utf8')+'</style>');
fs.writeFileSync(path.join(__dirname,'Reflow.html'),html);
console.log('Created portable Reflow.html');
