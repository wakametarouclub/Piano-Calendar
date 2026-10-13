import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
class Element {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.dataset={};this.attrs={};this.style={setProperty:(k,v)=>this.style[k]=v};this.classList={add:()=>{}};this.value='';this.textContent='';}
 append(...children){this.children.push(...children)}
 replaceChildren(...children){this.children=children}
 setAttribute(k,v){this.attrs[k]=v}
 addEventListener(k,fn){this[k]=fn}
 querySelector(){return null}
 focus(){}
 showModal(){this.open=true}
 close(){this.open=false}
}
function boot(store,failColor=false){
 const ids={};const writes=[];
 const context=vm.createContext({document:{getElementById:id=>ids[id]??=new Element(),createElement:tag=>new Element(tag),body:new Element()},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{if(failColor&&k.includes('colors'))throw Error();store[k]=v;writes.push(k)}},matchMedia:()=>({matches:false,addEventListener(){}}),requestAnimationFrame:fn=>fn(),Date,Map,Set});
 vm.runInContext(code,context);return {ids,writes,run:s=>vm.runInContext(s,context)};
}
function choose(app,color){
 const buttons=app.ids.taskColors.children[1].children[1].children;
 buttons.find(b=>b.dataset.color===color).onclick();
 assert.equal(buttons.filter(b=>b.attrs['aria-pressed']==='true').length,1);
 assert.equal(buttons.find(b=>b.dataset.color===color).attrs['aria-pressed'],'true');
}
const original=JSON.stringify({initialized:true,records:{'2026-10-01':'・ハノン\n・ジャズフレーズ','2026-10-02':'・ハノン'}});
const store={'piano-practice-v1':original};
let app=boot(store);assert.equal(store['piano-practice-v1'],original);assert.equal(app.writes.length,0);
app.run("openEditor(new Date(2026,9,1,12),null)");
assert.equal(app.ids.taskColors.children.length,3);
choose(app,'#7356ad');
app.ids.form.onsubmit({preventDefault(){}});
assert.equal(JSON.parse(store['piano-practice-task-colors-v1'])['ハノン'],'#7356ad');
assert.equal(store['piano-practice-v1'],original);
assert.equal(app.run("contents(records['2026-10-02']).children[0].style['--task-color']"),'#7356ad');
app=boot(store);assert.equal(app.run("taskColors['ハノン']"),'#7356ad');assert.equal(store['piano-practice-v1'],original);
app.run("openEditor(new Date(2026,9,1,12),null)");
assert.equal(app.ids.taskColors.children[1].children[1].children.find(b=>b.dataset.color==='#7356ad').attrs['aria-pressed'],'true');
choose(app,'#267c72');app.ids.close.onclick();
assert.equal(JSON.parse(store['piano-practice-task-colors-v1'])['ハノン'],'#7356ad');
app.run("openEditor(new Date(2026,9,3,12),null)");app.ids.entry.value='新規タスク';app.ids.entry.oninput();
choose(app,'#c0494b');app.ids.form.onsubmit({preventDefault(){}});
assert.equal(JSON.parse(store['piano-practice-v1']).records['2026-10-03'],'・新規タスク');
assert.equal(JSON.parse(store['piano-practice-task-colors-v1'])['新規タスク'],'#c0494b');
app.run("openEditor(new Date(2026,9,3,12),null)");app.ids.remove.onclick();assert.ok(JSON.parse(store['piano-practice-v1']).records['2026-10-03']);app.ids.remove.onclick();assert.equal(JSON.parse(store['piano-practice-v1']).records['2026-10-03'],undefined);
app.run("view('month')");assert.equal(app.run('document.body.dataset.view'),'month');app.run("view('list')");assert.equal(app.run('document.body.dataset.view'),'list');
const invalid={'piano-practice-v1':original,'piano-practice-task-colors-v1':'broken'};app=boot(invalid);app.run("openEditor(new Date(2026,9,1,12),null)");choose(app,'#3a6ea8');app.ids.form.onsubmit({preventDefault(){}});assert.equal(invalid['piano-practice-task-colors-v1'],'broken');assert.equal(invalid['piano-practice-v1'],original);
const unformatted=JSON.stringify({initialized:true,records:{'2026-10-01':'  ハノン  \nジャズフレーズ'}});
const preserved={'piano-practice-v1':unformatted};app=boot(preserved);app.run("openEditor(new Date(2026,9,1,12),null)");choose(app,'#3a6ea8');app.ids.form.onsubmit({preventDefault(){}});assert.equal(preserved['piano-practice-v1'],unformatted);
console.log('PASS: existing records preserved; new/edit/cancel/delete; shared task colors; reload persistence; mobile view switch; invalid colors protected.');
