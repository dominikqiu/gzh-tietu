import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';

export const layouts = ['cover','qa','compare','case','checklist','digest','summary'];
export function validate(data) {
  const errors=[];
  const str=(v,p)=>{if(typeof v!=='string'||!v.trim())errors.push(`${p}: 必须为非空文本`);};
  if(!data||typeof data!=='object'||Array.isArray(data))return ['根节点必须为对象'];
  for(const k of ['title','caption','adaptation'])str(data[k],k);
  if(!['ready','draft'].includes(data.status))errors.push('status: 必须为 ready 或 draft');
  if(data.titleCandidates!==undefined&&(!Array.isArray(data.titleCandidates)||data.titleCandidates.some(x=>typeof x!=='string')))errors.push('titleCandidates: 必须为文本数组');
  if(!Array.isArray(data.cards)||data.cards.length<1||data.cards.length>20)return [...errors,'cards: 必须有 1—20 张'];
  data.cards.forEach((c,i)=>{
    const p=`cards[${i}]`;
    if(!c||typeof c!=='object'){errors.push(`${p}: 必须为对象`);return;}
    for(const k of ['title','source','changes'])str(c[k],`${p}.${k}`);
    if(!layouts.includes(c.layout))errors.push(`${p}.layout: 不支持`);
    for(const k of ['lead','kicker'])if(c[k]!==undefined&&typeof c[k]!=='string')errors.push(`${p}.${k}: 必须为文本`);
    const blocks=c.blocks??[];
    if(!Array.isArray(blocks)||blocks.length>5){errors.push(`${p}.blocks: 必须为至多 5 项的数组`);return;}
    if(c.layout==='compare'&&blocks.length!==2)errors.push(`${p}: compare 必须有两块`);
    blocks.forEach((b,j)=>{
      const bp=`${p}.blocks[${j}]`;
      if(!b||typeof b!=='object'){errors.push(`${bp}: 必须为对象`);return;}
      str(b.label,`${bp}.label`);
      if(b.text!==undefined)str(b.text,`${bp}.text`);
      if(b.items!==undefined&&(!Array.isArray(b.items)||b.items.length<1||b.items.length>6||b.items.some(x=>typeof x!=='string'||!x.trim())))errors.push(`${bp}.items: 必须有 1—6 项非空文本`);
      if(b.text===undefined&&b.items===undefined)errors.push(`${bp}: text 或 items 至少一个`);
      if(b.quote!==undefined&&typeof b.quote!=='boolean')errors.push(`${bp}.quote: 必须为布尔值`);
    });
  });
  return errors;
}
export function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));}
export function cardHtml(c,i,n,status){
  const e=escapeHtml;
  return `<section class="card ${e(c.layout)}" data-card="${i+1}"><header class="masthead"><span>${e(c.kicker||'橄榄手记')}</span><span>${status==='draft'?'<b class="draft">待核实草稿</b>':''} ${String(i+1).padStart(2,'0')} / ${String(n).padStart(2,'0')}</span></header><main class="content"><div class="eyebrow">${({cover:'问题与线索',qa:'问题解答',compare:'规则对比',case:'案例启示',checklist:'操作清单',digest:'学术导读',summary:'要点收束'})[c.layout]}</div><h1>${e(c.title)}</h1><div class="accent"></div>${c.lead?`<p class="lead">${e(c.lead)}</p>`:''}<div class="blocks">${(c.blocks||[]).map(b=>`<section class="block${b.quote?' quote':''}"><div class="label">${e(b.label)}</div>${b.text?`<p class="text">${e(b.text)}</p>`:''}${b.items?`<ul>${b.items.map(t=>`<li>${e(t)}</li>`).join('')}</ul>`:''}</section>`).join('')}</div></main><footer class="footer">${e(c.source)}</footer></section>`;
}
function documentHtml(title,css,body){return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title><style>${css}</style></head><body>${body}</body></html>`;}
async function playwright(){
  if(process.env.PLAYWRIGHT_MODULE)return import(pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE)).href);
  try{return await import('playwright');}catch{throw Error('未找到 Playwright。请运行 npm ci；或设置 PLAYWRIGHT_MODULE 指向可用 index.mjs。');}
}
export async function render(input,out) {
  const data=JSON.parse(await fs.readFile(input,'utf8'));
  const errors=validate(data);
  if(errors.length)throw Error(errors.join('\n'));
  await fs.mkdir(out,{recursive:true});
  if((await fs.readdir(out)).length)throw Error('输出目录必须为空，请指定新的 --out 目录。');
  const css=await fs.readFile(new URL('../assets/olive.css',import.meta.url),'utf8');
  const htmls=data.cards.map((c,i)=>cardHtml(c,i,data.cards.length,data.status));
  const report={status:'checking',dimensions:{width:1080,height:1440},cards:[],errors:[],warnings:[],visualReview:'pending',sourceReview:'pending'};
  if(data.status==='draft')report.warnings.push('草稿含待核实内容，不能当作已核实成品。');
  const {chromium}=await playwright();
  const options={headless:true};
  if(process.env.BROWSER_EXECUTABLE)options.executablePath=process.env.BROWSER_EXECUTABLE;
  else if(process.env.BROWSER_CHANNEL)options.channel=process.env.BROWSER_CHANNEL;
  let browser;
  try {browser=await chromium.launch(options);}catch(e){
    report.status='failed';report.errors.push('浏览器启动失败：'+e.message);
    await fs.writeFile(path.join(out,'check-report.json'),JSON.stringify(report,null,2)+'\n');
    throw Error(`浏览器启动失败。运行 npx playwright install chromium，或配置 BROWSER_CHANNEL / BROWSER_EXECUTABLE。\n${e.message}`);
  }
  try {
    const context=await browser.newContext({viewport:{width:1080,height:1440},deviceScaleFactor:1,javaScriptEnabled:false});
    await context.route('**/*',r=>r.abort());
    const page=await context.newPage();
    const inspect=async(html)=>{
      await page.setContent(documentHtml(data.title,css,html));
      await page.evaluate(()=>document.fonts.ready);
      return page.locator('.card').evaluate(card=>{
        const content=card.querySelector('.content'), footer=card.querySelector('.footer');
        const cr=card.getBoundingClientRect(),ct=content.getBoundingClientRect(),fr=footer.getBoundingClientRect();
        const issues=[];
        for(const el of card.querySelectorAll('h1,.lead,.text,li,.label,.eyebrow')){
          const r=el.getBoundingClientRect();
          if(r.bottom>fr.top-16||r.left<cr.left+79||r.right>cr.right-79)issues.push(el.textContent.slice(0,60));
        }
        if(content.scrollHeight>content.clientHeight+2)issues.push('内容高度超过可用区域');
        if(fr.bottom>cr.bottom-79||fr.top<ct.top)issues.push('出处栏超出画布');
        return {overflow:[...new Set(issues)],fontsLoaded:document.fonts.status==='loaded',font:getComputedStyle(card).fontFamily};
      });
    };
    for(let i=0;i<htmls.length;i++){
      const check=await inspect(htmls[i]);
      report.cards.push({index:i+1,...check});
      if(check.overflow.length)report.errors.push(`第 ${i+1} 张溢出：${check.overflow.join('；')}`);
      if(!check.fontsLoaded)report.errors.push(`第 ${i+1} 张字体未就绪`);
    }
    if(report.errors.length){report.status='failed';throw Error(report.errors.join('\n'));}
    for(let i=0;i<htmls.length;i++){
      await inspect(htmls[i]);
      await page.locator('.card').screenshot({path:path.join(out,`${String(i+1).padStart(2,'0')}.png`),animations:'disabled'});
    }
    const gallery=`<div class="gallery">${htmls.map(h=>`<div class="tile">${h}</div>`).join('')}</div>`;
    await page.setViewportSize({width:940,height:800});
    await page.setContent(documentHtml(data.title,css,gallery));
    await page.evaluate(async()=>{await document.fonts.ready;window.scrollTo(0,0);});
    await page.screenshot({path:path.join(out,'contact-sheet.png'),fullPage:true});
    await fs.writeFile(path.join(out,'preview.html'),documentHtml(data.title,css,gallery));
    const mobile=`<div class="mobile-gallery">${htmls.map(h=>`<div class="mobile-tile">${h}</div>`).join('')}</div>`;
    await page.setViewportSize({width:408,height:800});
    await page.setContent(documentHtml(data.title,css,mobile));
    await page.evaluate(async()=>{await document.fonts.ready;window.scrollTo(0,0);});
    await page.screenshot({path:path.join(out,'mobile-preview.png'),fullPage:true});
    await fs.writeFile(path.join(out,'cards.json'),JSON.stringify(data,null,2)+'\n');
    await fs.writeFile(path.join(out,'copy.md'),`# ${data.title}\n\n${data.caption}\n\n## 标题候选\n\n${(data.titleCandidates||[]).map(t=>`- ${t}`).join('\n')}\n`);
    await fs.writeFile(path.join(out,'adaptation.md'),`# 改编记录\n\n${data.adaptation}\n\n${data.cards.map((c,i)=>`## ${i+1}. ${c.title}\n\n来源：${c.source}\n\n处理：${c.changes}\n`).join('\n')}`);
    report.status='passed';
    await context.close();
  } catch(e){report.status='failed';if(!report.errors.length)report.errors.push(e.message);throw e;}
  finally{await fs.writeFile(path.join(out,'check-report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
  return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  if(args.length!==3||args[1]!=='--out'){console.error('Usage: node scripts/render_cards.mjs <cards.json> --out <empty-directory>');process.exitCode=1;}
  else try{const r=await render(path.resolve(args[0]),path.resolve(args[2]));console.log(`已导出 ${r.cards.length} 张，自动排版检查通过；请人工复核图片与来源。`);}catch(e){console.error(e.message);process.exitCode=1;}
}
