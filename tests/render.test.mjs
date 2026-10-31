import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {render} from '../scripts/render_cards.mjs';

const enabled=process.env.RUN_RENDER_TESTS==='1';
test('真实浏览器：尺寸、混排、密集引文、溢出拒绝和输出隔离', {skip:!enabled},async()=>{
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'gzh-tietu-test-'));
  const source='测试用自编引文；非法律规范';
  const c={layout:'qa',title:'长标题也必须保留必要的适用条件\n并在手机宽度下清晰展示',source,changes:'原样保留',blocks:[{label:'自编条款 · 逐字核对用',quote:true,text:'只有在材料完整且适用条件已核对时，才进入结论整理。\n先记录原文位置，再区分直接摘录与编辑解读；如果内容超过版面容量，应当拆卡，并保留影响判断的前提与例外。'},{label:'中德文混排',text:'Voraussetzungen der juristischen Argumentation：原题保留半角标点，中文说明另列。'}]};
  const d={title:'测试',caption:'配文',status:'ready',adaptation:'渲染回归',cards:[c]};
  const input=path.join(temp,'cards.json');await fs.writeFile(input,JSON.stringify(d));
  const out=path.join(temp,'good');const result=await render(input,out);
  assert.equal(result.status,'passed');
  const png=await fs.readFile(path.join(out,'01.png'));
  assert.equal(png.readUInt32BE(16),1080);assert.equal(png.readUInt32BE(20),1440);
  const html=await fs.readFile(path.join(out,'preview.html'),'utf8');
  assert.ok(html.includes(c.blocks[0].text));
  for(const f of ['contact-sheet.png','mobile-preview.png','cards.json','copy.md','adaptation.md','check-report.json'])assert.ok((await fs.stat(path.join(out,f))).size>0);
  await assert.rejects(render(input,out),/必须为空/);
  c.blocks[0].text='这是一段故意超过画布容量的密集引文。'.repeat(120);
  await fs.writeFile(input,JSON.stringify(d));const bad=path.join(temp,'overflow');
  await assert.rejects(render(input,bad),/溢出/);
  assert.equal(JSON.parse(await fs.readFile(path.join(bad,'check-report.json'))).status,'failed');
  assert.ok(!(await fs.readdir(bad)).some(f=>f.endsWith('.png')));
  console.log('浏览器检查临时产物：'+temp);
});
