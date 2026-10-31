import test from 'node:test';
import assert from 'node:assert/strict';
import {validate,cardHtml} from '../scripts/render_cards.mjs';
const sample=()=>({title:'问题',caption:'配文',adaptation:'材料整理',status:'ready',cards:[{layout:'qa',title:'标题',source:'材料第1节',changes:'提炼',blocks:[{label:'解读',text:'正文'}]}]});
test('拒绝无法形成完整图卡的输入',()=>{
  const d=sample();assert.deepEqual(validate(d),[]);
  d.cards[0].source='';assert.match(validate(d).join(' '),/source/);
  d.cards[0].layout='compare';assert.match(validate(d).join(' '),/两块/);
});
test('用户文本不能变成 HTML 或脚本',()=>{
  const d=sample();d.cards[0].title='<img src=x onerror=alert(1)>';
  const html=cardHtml(d.cards[0],0,1,'ready');
  assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img'));
});
test('草稿明确标识，定稿无草稿标识',()=>{
  const c=sample().cards[0];assert.ok(cardHtml(c,0,1,'draft').includes('待核实草稿'));
  assert.ok(!cardHtml(c,0,1,'ready').includes('待核实草稿'));
});
