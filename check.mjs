// 実ユーザーのブラウザを触らず、模擬画面と保存領域で確認する。
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const backup = await readFile(new URL('tools/backup-records.js', root), 'utf8');
const restore = await readFile(new URL('tools/restore-records.js', root), 'utf8');
for (const code of [script, backup, restore]) new vm.Script(code);
class Element {
  constructor() {
    this.children = []; this.events = {}; this.dataset = {};
    this.classList = { add() {} }; this.files = [];
    this.style = {}; this.value = ''; this.textContent = '';
  }
  append(...children) { this.children.push(...children); }
  replaceChildren() { this.children = []; }
  setAttribute() {}
  addEventListener(name, fn) { this.events[name] = fn; }
  querySelector() { return null; }
  click() {}
  remove() {}
  focus() {}
  showModal() {}
  close() {}
}
function environment({raw = null, fail = false} = {}) {
  const elements = new Map(); const created = []; const alerts = [];
  const body = new Element(); body.dataset.view = 'list';
  const store = new Map(); if (raw !== null) store.set('piano-practice-v1', raw);
  store.set('unrelated-key', 'keep');
  const sandbox = {
    document: {
      body,
      getElementById(id) { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); },
      createElement() { const element = new Element(); created.push(element); return element; }
    },
    matchMedia: () => ({matches:false, addEventListener() {}}),
    localStorage: {
      getItem(k) { if(fail) throw Error('blocked'); return store.get(k) ?? null; },
      setItem(k,v) { if(fail) throw Error('blocked'); store.set(k,v); }
    },
    Blob, URL: {createObjectURL(blob) { sandbox.lastBlob = blob; return 'blob:test'; }, revokeObjectURL() {}},
    alert: text => alerts.push(text), confirm: () => true,
    location: {reload() { sandbox.reloaded = true; }},
    setTimeout() {}, console, requestAnimationFrame: fn => fn(), window: {}
  };
  return {context: vm.createContext(sandbox), store, elements, created, alerts};
}
const app = environment(); vm.runInContext(script, app.context);
const expected = ['01-01','01-12','02-11','02-23','03-20','04-29','05-03','05-04','05-05','05-06','07-20','08-11','09-21','09-22','09-23','10-12','11-03','11-23'].map(s => '2026-'+s);
const h = year => vm.runInContext(`holidays(${year})`, app.context);
assert.deepEqual([...h(2026).keys()].sort(), expected);
assert.equal(h(2026).get('2026-10-12'), 'スポーツの日');
assert.equal(h(2026).get('2026-09-22'), '国民の休日');
for(const date of ['04-30','05-01','05-02','05-06','10-22']) assert.ok(h(2019).has('2019-'+date));
for(const [year,yes,no] of [[2020,['07-23','07-24','08-10'],['07-20','08-11','10-12']],[2021,['07-22','07-23','08-08','08-09'],['07-19','08-11','10-11']]]) {
  for(const date of yes) assert.ok(h(year).has(year+'-'+date));
  for(const date of no) assert.ok(!h(year).has(year+'-'+date));
}
assert.equal(Object.keys(JSON.parse(app.store.get('piano-practice-v1')).records).length, 2);
const empty = JSON.stringify({initialized:true,records:{}});
const restart = environment({raw:empty}); vm.runInContext(script, restart.context);
assert.equal(vm.runInContext('Object.keys(records).length',restart.context),0);
vm.runInContext("records['2026-10-13']='・確認';persist();",restart.context);
const again = environment({raw:restart.store.get('piano-practice-v1')}); vm.runInContext(script,again.context);
assert.equal(vm.runInContext("records['2026-10-13']",again.context),'・確認');
vm.runInContext('records={};persist();',again.context);
const deleted = environment({raw:again.store.get('piano-practice-v1')}); vm.runInContext(script,deleted.context);
assert.equal(vm.runInContext('Object.keys(records).length',deleted.context),0);
const blocked = environment({fail:true}); vm.runInContext(script,blocked.context);
vm.runInContext("records['2026-10-13']='・メモリ内';persist();",blocked.context);
assert.ok(blocked.elements.get('notice').textContent);
vm.runInContext(backup,blocked.context);
assert.equal(JSON.parse(await blocked.context.lastBlob.text()).records['2026-10-13'],'・メモリ内');
assert.equal(app.store.get('unrelated-key'),'keep');
const data = {initialized:true,records:{'2026-10-13':'・復元\n・長い文章の確認'}};
for(const [label,raw,confirm,fail,success] of [
 ['normal',JSON.stringify(data),true,false,true],
 ['empty',empty,true,false,true],
 ['cancel',JSON.stringify(data),false,false,false],
 ['invalid-date',JSON.stringify({initialized:true,records:{'2026-02-30':'x'}}),true,false,false],
 ['invalid-shape','{"records":{}}',true,false,false],
 ['blocked',JSON.stringify(data),true,true,false]
]) {
 const env=environment({raw:empty,fail}); env.context.confirm=()=>confirm;
 vm.runInContext(restore,env.context);
 const input=env.created.at(-1); input.files=[{text:async()=>raw}];
 await input.events.change();
 assert.equal(!!env.context.reloaded,success,label);
 if(success) assert.deepEqual(JSON.parse(env.store.get('piano-practice-v1')),JSON.parse(raw));
 else assert.equal(env.store.get('piano-practice-v1'),empty,label);
 assert.equal(env.store.get('unrelated-key'),'keep',label);
}
console.log('PASS: 構文・2026年全18日・特例・初回/削除/再起動・保存不可・バックアップ/復元/空データ/キャンセル/異常データ');
