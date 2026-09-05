import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, collection, onSnapshot, setDoc, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const FB = { apiKey:"AIzaSyBM6Ohu0xd39ihz0--nhekwuKSoUvcMWGs", authDomain:"tmg-landscape.firebaseapp.com", projectId:"tmg-landscape", storageBucket:"tmg-landscape.firebasestorage.app", messagingSenderId:"51507827374", appId:"1:51507827374:web:31bdb51948527b7535d33f" };
const app = initializeApp(FB);
const db = getFirestore(app);
const COL = 'companies';
const SCORE_COLS = ['Market Traction','Product Differentiation','Capital Efficiency','Clinical Validation','AI Actionability','Regulatory Complexity','Personalization Depth','Data Moat','Scalability'];

let allData=[], filteredData=[], curView='targets', curSection='dashboard';
let sortCol='', sortDir=1, curPrompt='newsletter', curVis='valuechain', cmpPrompt='compare', numCmpSlots=3;
let charts={}, visCharts={}, claudePromptType='overview', claudePayload='';

const exp = {setView,showSection,openAddModal,closeAddModal,saveCompany,openSettings,closeSettings,saveSettings,applyFilters,srt,openPanel,closePanel,editCompany,deleteCompany,addLink,delLink,saveNotes,renderCompare,addCmpSlot,selPrompt,selCmpPrompt,generateAI,generateCmpAI,copyAI,copyCmpAI,saveKey,updateKeyLabel,setVis,exportCSV,importFromSheet,dlVis,dlChart,updateMatrix,updateBubble,updateRadar,renderVis,scrapeAndFill,extractPedigree,openClaudeModal,closeClaudeModal,setClaude,copyForClaude,openClaude,loadData};
Object.entries(exp).forEach(([k,v])=>window[k]=v);

onSnapshot(collection(db,COL),(snap)=>{
  allData=snap.docs.map(d=>({...d.data(),_id:d.id}));
  document.getElementById('loadingMsg').style.display='none';
  document.getElementById('syncDot').className='sync-dot live';
  document.getElementById('lastUpd').textContent='Live - '+new Date().toLocaleTimeString();
  applyView(); if(curSection)showSection(curSection,true); populateCmpSelects();
},(err)=>{document.getElementById('loadingMsg').textContent='Firebase failed. Go to Firebase Console - Firestore - Rules - set allow read,write: if true';console.error(err);});

function loadData(){document.getElementById('lastUpd').textContent='Refreshed '+new Date().toLocaleTimeString();}

function init(){
  const load=(id,key)=>{const v=localStorage.getItem(key);if(v&&document.getElementById(id))document.getElementById(id).value=v;};
  load('s_geminiKey','tmg_geminiKey');load('s_claudeKey','tmg_claudeKey');load('s_workspaceId','tmg_workspaceId');
  const p=localStorage.getItem('tmg_provider')||'gemini';
  ['aiProvider','s_provider'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=p;});
  updateKeyLabel();
}
init();

function setView(v,btn){
  curView=v;
  if(btn){const tog=btn.closest('.view-toggle');if(tog)tog.querySelectorAll('.vt-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');}
  applyView();
}
function applyView(){
  const base=curView==='targets'?allData.filter(r=>r['Company Type']==='Startup'):allData;
  filteredData=base; renderStats(base); renderCharts(base); applyFilters();
  if(curSection==='visuals')renderVis();
}
function showSection(id){
  curSection=id;
  document.querySelectorAll('.section-wrap').forEach(s=>s.classList.remove('active'));
  document.getElementById('sec-'+id)?.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  const map={dashboard:0,companies:1,compare:2,visuals:3};
  document.querySelectorAll('.nav-btn')[map[id]]?.classList.add('active');
  if(id==='visuals')renderVis();
  if(id==='compare')renderCompare();
}

function renderStats(data){
  const s=data.filter(r=>r['Company Type']==='Startup').length;
  const p=data.filter(r=>r['TMG Interest Level']==='Priority').length;
  const hiPed=data.filter(r=>['Repeat Founder','Ex-FAANG','PhD-Researcher'].includes(r['Founder Pedigree'])).length;
  const patent=data.filter(r=>['Applied','Granted'].includes(r['IP / Patent Status'])).length;
  const inc=data.filter(r=>['Incumbent','Acquirer'].includes(r['Company Type'])).length;
  document.getElementById('statsRow').innerHTML=`
    <div class="stat-card"><div class="stat-val">${s}</div><div class="stat-lbl">Startups tracked</div></div>
    <div class="stat-card s2"><div class="stat-val">${p}</div><div class="stat-lbl">Priority targets</div></div>
    <div class="stat-card s3"><div class="stat-val">${hiPed}</div><div class="stat-lbl">High-pedigree teams</div></div>
    <div class="stat-card s4"><div class="stat-val">${patent}</div><div class="stat-lbl">IP / Patents</div></div>
    <div class="stat-card s5"><div class="stat-val">${inc}</div><div class="stat-lbl">Incumbents & acquirers</div></div>`;
}

function cnt(data,key){return data.reduce((a,r)=>{const v=r[key]||'Unknown';a[v]=(a[v]||0)+1;return a;},{});}
function renderCharts(data){
  Object.values(charts).forEach(c=>c.destroy());charts={};
  const ORG='#e07535',NAV='#162535',GRN='#2a7f5f',RSE='#b85050',PUR='#6a3fa0';
  const PAL=[ORG,NAV,GRN,RSE,PUR,'#c9a84c','#3a8fa0','#7a5f30','#2a5f8f','#a05030'];
  const sc=cnt(data,'Sub-category');
  charts.cPie=new Chart(document.getElementById('cPie'),{type:'doughnut',data:{labels:Object.keys(sc),datasets:[{data:Object.values(sc),backgroundColor:PAL,borderWidth:2,borderColor:'#fff'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{font:{size:9},boxWidth:9,padding:7}}}}});
  const stgOrder=['Pre-seed','Seed','Series A','Series B','Public'];
  const stgCnt=cnt(data,'Stage');const sl=stgOrder.filter(s=>stgCnt[s]);
  charts.cFunding=new Chart(document.getElementById('cFunding'),{type:'bar',data:{labels:sl,datasets:[{data:sl.map(s=>stgCnt[s]||0),backgroundColor:[ORG,NAV,GRN,RSE,PUR],borderRadius:5,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false}},y:{grid:{color:'#eef2f6'},ticks:{stepSize:1}}}}});
  const hc=cnt(data,'Healthspan Target');
  charts.cHealth=new Chart(document.getElementById('cHealth'),{type:'bar',data:{labels:Object.keys(hc),datasets:[{data:Object.values(hc),backgroundColor:GRN,borderRadius:5,borderSkipped:false}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:'#eef2f6'},ticks:{stepSize:1}},y:{grid:{display:false},ticks:{font:{size:9}}}}}});
  const cmap={'Precision Nutrition':ORG+'bb','Intelligent Health':NAV+'bb','Food & Medicine':GRN+'bb'};
  const grp={};
  data.filter(r=>r['Market Traction']&&r['Product Differentiation']).forEach(r=>{const a=r['TMG Focus Area']||'Other';if(!grp[a])grp[a]=[];grp[a].push({x:+r['Market Traction'],y:+r['Product Differentiation'],label:r['Company Name']});});
  charts.cScatter=new Chart(document.getElementById('cScatter'),{type:'scatter',data:{datasets:Object.entries(grp).map(([a,p])=>({label:a,data:p,backgroundColor:cmap[a]||'#888bb',pointRadius:7,pointHoverRadius:9}))},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:9},boxWidth:7}},tooltip:{callbacks:{label:c=>`${c.raw.label} (${c.raw.x},${c.raw.y})`}}},scales:{x:{min:0,max:6,title:{display:true,text:'Market Traction',font:{size:9}},grid:{color:'#eef2f6'}},y:{min:0,max:6,title:{display:true,text:'Product Diff.',font:{size:9}},grid:{color:'#eef2f6'}}}}});
}
function dlChart(id){const c=charts[id];if(!c)return;const a=document.createElement('a');a.download=id+'_TMG.png';a.href=c.toBase64Image('image/png',1);a.click();}

function applyFilters(){
  const q=(document.getElementById('srch')||{value:''}).value.toLowerCase();
  const ff=(document.getElementById('fFocus')||{value:''}).value;
  const fs=(document.getElementById('fStage')||{value:''}).value;
  const fi=(document.getElementById('fInterest')||{value:''}).value;
  const ft=(document.getElementById('fType')||{value:''}).value;
  const fp=(document.getElementById('fPedigree')||{value:''}).value;
  const base=curView==='targets'?allData.filter(r=>r['Company Type']==='Startup'):allData;
  filteredData=base.filter(r=>{
    if(q&&!Object.values(r).join(' ').toLowerCase().includes(q))return false;
    if(ff&&r['TMG Focus Area']!==ff)return false;
    if(fs&&r['Stage']!==fs)return false;
    if(fi&&r['TMG Interest Level']!==fi)return false;
    if(ft&&r['Company Type']!==ft)return false;
    if(fp&&r['Founder Pedigree']!==fp)return false;
    return true;
  });
  const fc=document.getElementById('fCount');if(fc)fc.textContent=filteredData.length+' companies';
  renderTable();
}
function srt(col){if(sortCol===col)sortDir*=-1;else{sortCol=col;sortDir=1;}filteredData.sort((a,b)=>(a[col]||'').toString().localeCompare((b[col]||'').toString(),undefined,{numeric:true})*sortDir);renderTable();}
function fBadge(a){return a==='Precision Nutrition'?'b-pn':a==='Intelligent Health'?'b-ih':'b-fm';}
function tBadge(t){return t==='Startup'?'b-startup':t==='Incumbent'?'b-incumbent':'b-acquirer';}
function iBadge(l){return l==='Priority'?'b-priority':l==='Interested'?'b-interested':'b-watch';}
function sbar(v){const n=parseFloat(v)||0,p=(n/5)*100;return `<div class="sbar"><div class="strack"><div class="sfill" style="width:${p}%"></div></div><span class="snum">${v||'-'}</span></div>`;}

function renderTable(){
  const tb=document.getElementById('tBody');if(!tb)return;
  if(!filteredData.length){tb.innerHTML='<tr><td colspan="13" style="text-align:center;padding:28px;color:var(--ink-muted)">No companies match filters</td></tr>';return;}
  tb.innerHTML=filteredData.map(r=>`
    <tr onclick="openPanel('${(r['Company Name']||'').replace(/'/g,"\\'")}')">
      <td><div class="co-name">${r['Company Name']||''}</div><div class="co-sub">${r['One-liner']||''}</div></td>
      <td><span class="badge ${fBadge(r['TMG Focus Area'])}">${r['TMG Focus Area']||'-'}</span></td>
      <td style="font-size:10px">${r['Stage']||'-'}</td>
      <td style="font-size:10px">${r['Funding Raised']||'-'}</td>
      <td style="font-size:10px">${r['Geography']||'-'}</td>
      <td><span class="badge ${tBadge(r['Company Type'])}">${r['Company Type']||'-'}</span></td>
      <td>${r['Founder Pedigree']?`<span class="badge b-pedigree">${r['Founder Pedigree']}</span>`:'—'}</td>
      <td style="font-size:10px">${r['IP / Patent Status']||'-'}</td>
      <td style="font-size:10px">${r['Last Funded Date']||'-'}</td>
      <td style="font-size:10px">${r['Estimated Runway (months)']?r['Estimated Runway (months)']+'mo':'-'}</td>
      <td>${sbar(r['Market Traction'])}</td>
      <td>${sbar(r['Data Moat'])}</td>
      <td><span class="badge ${iBadge(r['TMG Interest Level'])}">${r['TMG Interest Level']||'-'}</span></td>
    </tr>`).join('');
}

function openPanel(name){
  const r=allData.find(c=>c['Company Name']===name);if(!r)return;
  const notes=JSON.parse(localStorage.getItem('tmg_notes')||'{}');
  const cn=notes[name]||{text:'',links:[]};
  const linksHtml=cn.links.length?`<ul class="links-list">${cn.links.map((l,i)=>`<li><a href="${l.url}" target="_blank">${l.label||l.url}</a><button class="link-del" onclick="delLink('${name}',${i})">x</button></li>`).join('')}</ul>`:'<p style="font-size:10px;color:var(--ink-muted);margin-bottom:6px">No links yet.</p>';
  const fld=(label,val,full)=>val?`<div class="dp-field${full?' full':''}"><label>${label}</label><span>${val}</span></div>`:'';
  const sc=(label,val)=>`<div class="dp-score-item"><div class="dp-score-val">${val||'-'}</div><div class="dp-score-lbl">${label}</div></div>`;
  document.getElementById('dpContent').innerHTML=`
    <div class="dp-header">
      <button class="dp-close" onclick="closePanel()">X</button>
      <div class="dp-co-name">${r['Company Name']}</div>
      <div class="dp-badges">
        <span class="badge ${fBadge(r['TMG Focus Area'])}">${r['TMG Focus Area']||''}</span>
        <span class="badge ${tBadge(r['Company Type'])}">${r['Company Type']||''}</span>
        <span class="badge ${iBadge(r['TMG Interest Level'])}">${r['TMG Interest Level']||''}</span>
        ${r['Founder Pedigree']?`<span class="badge b-pedigree">${r['Founder Pedigree']}</span>`:''}
      </div>
      ${r['Website']?`<a class="dp-website" href="${r['Website']}" target="_blank">Link: ${r['Website']}</a>`:''}
      <div class="dp-actions"><button class="dp-btn edit" onclick="editCompany('${name}')">Edit</button><button class="dp-btn del" onclick="deleteCompany('${name}')">Delete</button></div>
    </div>
    <div class="dp-body">
      <div class="dp-section"><div class="dp-section-title">Overview</div>
        ${fld('One-liner',r['One-liner'],true)}
        <div class="dp-grid">${fld('Sub-category',r['Sub-category'])}${fld('Healthspan Target',r['Healthspan Target'])}${fld('Geography',r['Geography'])}${fld('Stage',r['Stage'])}</div>
      </div>
      <div class="dp-section"><div class="dp-section-title">Financials and Team</div>
        <div class="dp-grid">${fld('Funding Raised',r['Funding Raised'])}${fld('Last Funded',r['Last Funded Date'])}${fld('Runway',r['Estimated Runway (months)']?r['Estimated Runway (months)']+'months':'')}${fld('Business Model',r['Business Model'])}${fld('Pricing Model',r['Pricing Model']||'-')}${fld('Key Investors',r['Key Investors'])}${fld('No. of Founders',r['Number of Founders'])}${fld('Founder Pedigree',r['Founder Pedigree'])}</div>
      </div>
      <div class="dp-section"><div class="dp-section-title">Technology and Moat</div>
        <div class="dp-grid">${fld('Ecosystem Position',r['Ecosystem Position'])}${fld('IP / Patent Status',r['IP / Patent Status'])}${fld('Key Technology',r['Key Technology'],true)}${fld('Core Moat',r['Core Moat']||'Not assessed',true)}</div>
      </div>
      <div class="dp-section"><div class="dp-section-title">Market and Competition</div>
        <div class="dp-grid">${fld('Target Customer',r['Target Customer']||'Not assessed',true)}${fld('Key Competitors',r['Key Competitors']||'Not assessed',true)}${fld('Execution Risk',r['Execution Risk']||'Not assessed',true)}</div>
      </div>
      <div class="dp-section"><div class="dp-section-title">Original Scores</div>
        <div class="dp-scores">${sc('Market Traction',r['Market Traction'])}${sc('Product Diff.',r['Product Differentiation'])}${sc('Capital Efficiency',r['Capital Efficiency'])}</div>
      </div>
      <div class="dp-section"><div class="dp-section-title">Extended Scores</div>
        <div class="dp-scores">${sc('Clinical Valid.',r['Clinical Validation'])}${sc('AI Actionability',r['AI Actionability'])}${sc('Regulatory Cplx.',r['Regulatory Complexity'])}</div>
        <div class="dp-scores" style="margin-top:7px">${sc('Personalization',r['Personalization Depth'])}${sc('Data Moat',r['Data Moat'])}${sc('Scalability',r['Scalability'])}</div>
      </div>
      <div class="dp-section"><div class="dp-section-title">Notes and Links</div>
        ${linksHtml}
        <div class="link-add-row"><input id="newLinkLabel" type="text" placeholder="Label"><input id="newLinkUrl" type="text" placeholder="https://..."><button class="btn-add-link" onclick="addLink('${name}')">Add</button></div>
        <textarea class="notes-area" id="notesArea" placeholder="Meeting notes..." style="margin-top:8px">${cn.text}</textarea>
        <button class="save-notes-btn" onclick="saveNotes('${name}')">Save Notes</button>
      </div>
    </div>`;
  document.getElementById('overlay').classList.add('open');
  document.getElementById('detailPanel').classList.add('open');
}
function closePanel(){document.getElementById('overlay').classList.remove('open');document.getElementById('detailPanel').classList.remove('open');}
function addLink(name){const label=document.getElementById('newLinkLabel').value.trim();const url=document.getElementById('newLinkUrl').value.trim();if(!url)return;const notes=JSON.parse(localStorage.getItem('tmg_notes')||'{}');if(!notes[name])notes[name]={text:'',links:[]};notes[name].links.push({label:label||url,url});localStorage.setItem('tmg_notes',JSON.stringify(notes));openPanel(name);}
function delLink(name,idx){const notes=JSON.parse(localStorage.getItem('tmg_notes')||'{}');if(notes[name])notes[name].links.splice(idx,1);localStorage.setItem('tmg_notes',JSON.stringify(notes));openPanel(name);}
function saveNotes(name){const text=document.getElementById('notesArea').value;const notes=JSON.parse(localStorage.getItem('tmg_notes')||'{}');if(!notes[name])notes[name]={text:'',links:[]};notes[name].text=text;localStorage.setItem('tmg_notes',JSON.stringify(notes));const btn=event.target;btn.textContent='Saved';setTimeout(()=>btn.textContent='Save Notes',1500);}

function safeId(name){return (name||'unknown').replace(/[^a-zA-Z0-9]/g,'_');}
async function saveCompany(){
  const name=document.getElementById('f_name').value.trim();if(!name){alert('Company name is required');return;}
  const docId=document.getElementById('f_docId').value||safeId(name);
  const today=new Date().toLocaleDateString('en-GB').replace(/\//g,'.');
  const get=id=>{const el=document.getElementById(id);return el?el.value.trim():'';}
  const row={'Company Name':name,'One-liner':get('f_oneliner'),'TMG Focus Area':get('f_focus'),'Sub-category':get('f_sub'),'Healthspan Target':get('f_health'),'Ecosystem Position':get('f_eco'),'Business Model':get('f_biz'),'Company Type':get('f_type'),'Geography':get('f_geo'),'Stage':get('f_stage'),'Funding Raised':get('f_funding'),'Last Funded Date':get('f_lastfunded'),'Estimated Runway (months)':get('f_runway'),'Number of Founders':get('f_founders'),'Founder Pedigree':get('f_pedigree'),'Key Investors':get('f_investors'),'Key Technology':get('f_tech'),'IP / Patent Status':get('f_ip'),'Pricing Model':get('f_pricing'),'Target Customer':get('f_customer'),'Core Moat':get('f_moat'),'Key Competitors':get('f_competitors'),'Execution Risk':get('f_risk'),'Website':get('f_website'),'Market Traction':get('f_traction'),'Product Differentiation':get('f_diff'),'Capital Efficiency':get('f_capeff'),'Clinical Validation':get('f_cv'),'AI Actionability':get('f_ai'),'Regulatory Complexity':get('f_reg'),'Personalization Depth':get('f_pers'),'Data Moat':get('f_dm'),'Scalability':get('f_sc'),'TMG Interest Level':get('f_interest'),'Last Updated':today,'_source':'platform'};
  try{await setDoc(doc(db,COL,docId),row);closeAddModal();}catch(e){alert('Save failed: '+e.message);}
}
async function deleteCompany(name){
  const r=allData.find(c=>c['Company Name']===name);if(!r)return;
  if(!confirm('Delete '+name+'? This cannot be undone.'))return;
  try{if(r._id)await deleteDoc(doc(db,COL,r._id));closePanel();}catch(e){alert('Delete failed: '+e.message);}
}
function editCompany(name){
  const r=allData.find(c=>c['Company Name']===name);if(!r)return;
  document.getElementById('modalTitle').textContent='Edit Company';
  document.getElementById('f_docId').value=r._id||safeId(name);
  const s=(id,val)=>{const el=document.getElementById(id);if(el)el.value=val||'';};
  s('f_name',r['Company Name']);s('f_oneliner',r['One-liner']);s('f_focus',r['TMG Focus Area']);s('f_sub',r['Sub-category']);s('f_health',r['Healthspan Target']);s('f_eco',r['Ecosystem Position']);s('f_biz',r['Business Model']);s('f_type',r['Company Type']);s('f_geo',r['Geography']);s('f_stage',r['Stage']);s('f_funding',r['Funding Raised']);s('f_lastfunded',r['Last Funded Date']);s('f_runway',r['Estimated Runway (months)']);s('f_founders',r['Number of Founders']);s('f_pedigree',r['Founder Pedigree']);s('f_investors',r['Key Investors']);s('f_tech',r['Key Technology']);s('f_ip',r['IP / Patent Status']);s('f_pricing',r['Pricing Model']);s('f_customer',r['Target Customer']);s('f_moat',r['Core Moat']);s('f_competitors',r['Key Competitors']);s('f_risk',r['Execution Risk']);s('f_website',r['Website']);s('f_traction',r['Market Traction']);s('f_diff',r['Product Differentiation']);s('f_capeff',r['Capital Efficiency']);s('f_cv',r['Clinical Validation']);s('f_ai',r['AI Actionability']);s('f_reg',r['Regulatory Complexity']);s('f_pers',r['Personalization Depth']);s('f_dm',r['Data Moat']);s('f_sc',r['Scalability']);s('f_interest',r['TMG Interest Level']);
  closePanel();document.getElementById('addModal').classList.add('open');
}
function openAddModal(){
  document.getElementById('modalTitle').textContent='Add Company';
  document.getElementById('f_docId').value='';
  document.getElementById('scrapeUrl').value='';document.getElementById('scrapeStatus').textContent='Paste a URL above and let AI auto-populate the form below.';document.getElementById('linkedinBio').value='';
  ['f_name','f_oneliner','f_sub','f_geo','f_funding','f_lastfunded','f_runway','f_founders','f_investors','f_tech','f_pricing','f_customer','f_moat','f_competitors','f_risk','f_website'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['f_focus','f_health','f_eco','f_biz','f_type','f_stage','f_pedigree','f_ip','f_traction','f_diff','f_capeff','f_cv','f_ai','f_reg','f_pers','f_dm','f_sc','f_interest'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('addModal').classList.add('open');
}
function closeAddModal(){document.getElementById('addModal').classList.remove('open');}

async function scrapeAndFill(){
  const url=document.getElementById('scrapeUrl').value.trim();if(!url){alert('Please paste a URL first');return;}
  const btn=document.getElementById('btnScrape');const status=document.getElementById('scrapeStatus');
  btn.disabled=true;btn.textContent='Scraping...';status.textContent='Fetching page content...';
  const proxies=[u=>`https://corsproxy.io/?${encodeURIComponent(u)}`,u=>`https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`];
  let pageText='';
  for(const px of proxies){
    try{
      const r=await fetch(px(url),{signal:AbortSignal.timeout(8000)});if(!r.ok)continue;
      const html=await r.text();const div=document.createElement('div');div.innerHTML=html;
      pageText=(div.innerText||div.textContent||'').replace(/\s+/g,' ').trim().slice(0,4000);
      if(pageText.length>100)break;
    }catch(e){continue;}
  }
  if(!pageText||pageText.length<50){btn.disabled=false;btn.textContent='AI Scrape and Fill';status.textContent='Could not fetch page. Try pasting the company description manually.';return;}
  status.textContent='AI extracting company info...';
  const prompt=`You are a VC analyst. Extract structured company info from this website text and return ONLY a JSON object with these exact keys (use empty string if unknown): Company_Name, One_liner, TMG_Focus_Area (one of: Precision Nutrition/Intelligent Health/Food and Medicine), Sub_category, Healthspan_Target (one of: Metabolic Control/Gut Health/Cardiovascular Health/Neurological Health/Inflammation/Musculoskeletal/Multiple), Ecosystem_Position (one of: Ingredient / Science/Platform/Brand/Distribution / Channel), Business_Model (B2C/B2B/B2B2C/Marketplace/SaaS), Company_Type (Startup/Incumbent/Acquirer), Geography, Stage (Pre-seed/Seed/Series A/Series B/Public), Funding_Raised, Last_Funded_Date, Number_of_Founders, Founder_Pedigree (Repeat Founder/Ex-FAANG/PhD-Researcher/First-time/Mixed), Key_Investors, Key_Technology, IP_Patent_Status (None/Applied/Granted/Trade Secret), Pricing_Model, Target_Customer, Core_Moat, Key_Competitors, Execution_Risk.\n\nWebsite text:\n${pageText}\n\nReturn ONLY the JSON object, no markdown, no explanation.`;
  const result=await callAI(prompt);
  try{
    const data=JSON.parse(result.replace(/```json|```/g,'').trim());
    const map={Company_Name:'f_name',One_liner:'f_oneliner',Sub_category:'f_sub',Geography:'f_geo',Stage:'f_stage',Funding_Raised:'f_funding',Last_Funded_Date:'f_lastfunded',Number_of_Founders:'f_founders',Key_Investors:'f_investors',Key_Technology:'f_tech',Pricing_Model:'f_pricing',Target_Customer:'f_customer',Core_Moat:'f_moat',Key_Competitors:'f_competitors',Execution_Risk:'f_risk'};
    const selMap={TMG_Focus_Area:'f_focus',Healthspan_Target:'f_health',Ecosystem_Position:'f_eco',Business_Model:'f_biz',Company_Type:'f_type',Founder_Pedigree:'f_pedigree',IP_Patent_Status:'f_ip'};
    Object.entries(map).forEach(([k,id])=>{const el=document.getElementById(id);if(el&&data[k])el.value=data[k];});
    Object.entries(selMap).forEach(([k,id])=>{const el=document.getElementById(id);if(el&&data[k])el.value=data[k];});
    const web=document.getElementById('f_website');if(web&&!web.value)web.value=url;
    status.textContent='AI filled the form! Review and adjust before saving.';
  }catch(e){status.textContent='AI returned data but could not parse it. Raw: '+result.slice(0,100);}
  btn.disabled=false;btn.textContent='AI Scrape and Fill';
}
async function extractPedigree(){
  const bio=document.getElementById('linkedinBio').value.trim();if(!bio){alert('Paste a LinkedIn bio first');return;}
  const prompt=`Based on this LinkedIn bio, classify the founder pedigree as exactly one of: "Repeat Founder", "Ex-FAANG", "PhD-Researcher", "First-time", "Mixed". Return ONLY the classification.\n\nBio:\n${bio}`;
  const result=await callAI(prompt);
  const clean=result.trim().replace(/['"]/g,'');
  const el=document.getElementById('f_pedigree');
  const opts=['Repeat Founder','Ex-FAANG','PhD-Researcher','First-time','Mixed'];
  if(el&&opts.includes(clean)){el.value=clean;alert('Pedigree set to: '+clean);}
  else alert('Result: '+clean+' - please select manually.');
}

async function importFromSheet(){
  const csvUrl=localStorage.getItem('tmg_csvUrl')||'https://docs.google.com/spreadsheets/d/e/2PACX-1vR8LViFyryNqnjbQxgOO3SKHjHWAzY-2-S5mERrp7xABQc8_y2iw4mK2DV6PX5HsCN6Yj1wL6HtMOiY/pub?output=csv';
  const btn=event.target;btn.textContent='Syncing...';btn.disabled=true;
  const proxies=[u=>u,u=>`https://corsproxy.io/?${encodeURIComponent(u)}`,u=>`https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`];
  let rows=null;
  for(const px of proxies){try{const r=await fetch(px(csvUrl+'&t='+Date.now()));if(!r.ok)continue;const t=await r.text();if(!t.includes('Company Name'))continue;rows=parseCSV(t);if(rows.length)break;}catch(e){continue;}}
  if(!rows||!rows.length){btn.textContent='Sync from Sheet';btn.disabled=false;alert('Could not fetch sheet. Check Settings - CSV URL.');return;}
  let count=0;
  for(const row of rows){
    const name=row['Company Name'];if(!name)continue;
    row['_source']='sheet';row['Last Updated']=row['Last Updated']||new Date().toLocaleDateString('en-GB').replace(/\//g,'.');
    try{await setDoc(doc(db,COL,safeId(name)),row);count++;}catch(e){console.error('Sync error',name,e);}
  }
  btn.textContent='Sync from Sheet';btn.disabled=false;
  alert('Synced '+count+' companies to Firebase. All teammates see updates immediately!');
}
function parseCSV(txt){const lines=txt.trim().split('\n');const hdrs=splitLine(lines[0]);return lines.slice(1).map(l=>{const v=splitLine(l),obj={};hdrs.forEach((h,i)=>obj[h.trim()]=(v[i]||'').trim());return obj;}).filter(r=>r['Company Name']);}
function splitLine(line){const v=[];let cur='',inQ=false;for(let i=0;i<line.length;i++){if(line[i]==='"')inQ=!inQ;else if(line[i]===','&&!inQ){v.push(cur);cur='';}else cur+=line[i];}v.push(cur);return v;}

function exportCSV(){
  if(!allData.length){alert('No data to export');return;}
  const cols=Object.keys(allData[0]).filter(k=>!k.startsWith('_'));
  const NL=String.fromCharCode(10);const q='"';
  const rows=allData.map(r=>cols.map(c=>{const v=(r[c]||'').toString();return v.includes(',')||v.includes(q)?(q+v.replace(/"/g,q+q)+q):v;}).join(','));
  const csv=[cols.join(',')].concat(rows).join(NL);
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download='TMG_Landscape_'+new Date().toISOString().slice(0,10)+'.csv';a.click();
}

function populateCmpSelects(){
  const opts=allData.map(r=>`<option value="${r['Company Name']}">${r['Company Name']}</option>`).join('');
  for(let i=0;i<numCmpSlots;i++){const el=document.getElementById('cmp_'+i);if(!el)continue;const cur=el.value;el.innerHTML=`<option value="">Select...</option>${opts}`;if(cur)el.value=cur;}
  renderCompare();
}
function addCmpSlot(){
  if(numCmpSlots>=10){alert('Max 10');return;}
  const cont=document.getElementById('cmpSelectors');
  const sel=document.createElement('select');sel.className='cmp-select';sel.id='cmp_'+numCmpSlots;sel.onchange=renderCompare;
  sel.innerHTML=`<option value="">Select...</option>`+allData.map(r=>`<option value="${r['Company Name']}">${r['Company Name']}</option>`).join('');
  const rm=document.createElement('button');rm.className='cmp-remove-btn';rm.textContent='X';rm.onclick=()=>{sel.remove();rm.remove();renderCompare();};
  cont.insertBefore(sel,cont.lastElementChild);cont.insertBefore(rm,cont.lastElementChild);numCmpSlots++;
}
function renderCompare(){
  const ids=new Set();document.querySelectorAll('#cmpSelectors .cmp-select').forEach(el=>{if(el.value)ids.add(el.value);});
  const companies=[...ids].map(n=>allData.find(r=>r['Company Name']===n)).filter(Boolean);
  const out=document.getElementById('cmpOutput');if(!out)return;
  if(!companies.length){out.innerHTML='<div class="cmp-empty">Select companies above to compare</div>';document.getElementById('cmpAiSection').style.display='none';return;}
  const rows=[['Focus Area','TMG Focus Area'],['Sub-category','Sub-category'],['Healthspan Target','Healthspan Target'],['Ecosystem','Ecosystem Position'],['Business Model','Business Model'],['Type','Company Type'],['Geography','Geography'],['Stage','Stage'],['Funding','Funding Raised'],['Last Funded','Last Funded Date'],['Runway (mo)','Estimated Runway (months)'],['Founders','Number of Founders'],['Pedigree','Founder Pedigree'],['Investors','Key Investors'],['Technology','Key Technology'],['IP Status','IP / Patent Status'],['Pricing','Pricing Model'],['Target Customer','Target Customer'],['Core Moat','Core Moat'],['Key Competitors','Key Competitors'],['Exec Risk','Execution Risk'],['Market Traction','Market Traction'],['Product Diff.','Product Differentiation'],['Capital Eff.','Capital Efficiency'],['Clinical Valid.','Clinical Validation'],['AI Actionability','AI Actionability'],['Regulatory Cplx.','Regulatory Complexity'],['Personalization','Personalization Depth'],['Data Moat','Data Moat'],['Scalability','Scalability'],['Interest','TMG Interest Level']];
  const scoreKeys=['Market Traction','Product Differentiation','Capital Efficiency','Clinical Validation','AI Actionability','Regulatory Complexity','Personalization Depth','Data Moat','Scalability'];
  out.innerHTML=`<div class="cmp-table-wrap"><table class="cmp-table"><thead><tr><th style="width:130px">Attribute</th>${companies.map(c=>`<th class="co-th">${c['Company Name']}</th>`).join('')}</tr></thead><tbody>${rows.map(([label,key])=>{const vals=companies.map(c=>c[key]||'-');const isS=scoreKeys.includes(key);const nums=vals.map(v=>parseFloat(v)||0);const max=isS?Math.max(...nums):null;const min=isS?Math.min(...nums):null;return`<tr><td class="attr">${label}</td>${vals.map((v,i)=>{let cls='';if(isS&&companies.length>1){if(nums[i]===max&&max>0)cls='cmp-best';else if(nums[i]===min&&min>0&&max!==min)cls='cmp-worst';}return`<td class="val ${cls}">${v}</td>`;}).join('')}</tr>`;}).join('')}</tbody></table></div>`;
  document.getElementById('cmpAiSection').style.display='block';window._cmpCompanies=companies;
}
function selCmpPrompt(btn,type){document.querySelectorAll('#cmpAiSection .ai-opt').forEach(b=>b.classList.remove('active'));btn.classList.add('active');cmpPrompt=type;}
async function generateCmpAI(){
  const companies=window._cmpCompanies||[];if(!companies.length){alert('Select companies first');return;}
  const summary=companies.map(r=>`${r['Company Name']}: ${r['One-liner']} | Stage:${r['Stage']} | Pedigree:${r['Founder Pedigree']} | Traction:${r['Market Traction']}/5 | DataMoat:${r['Data Moat']}/5 | IP:${r['IP / Patent Status']}`).join('\n');
  const prompts={compare:`Compare these companies: technology, market position, moat, execution risk.\n${summary}`,winner:`If TMG could back only one, which and why? Consider pedigree, moat, healthspan thesis.\n${summary}`,gaps:`What market gaps do these companies leave uncovered?\n${summary}`,invest:`Investment memo: which to prioritise, monitor, or pass on.\n${summary}`};
  const out=document.getElementById('cmpAiOutput');out.textContent='Analysing...';out.className='ai-output idle';
  out.textContent=await callAI(prompts[cmpPrompt]);out.className='ai-output';
}
function copyCmpAI(){navigator.clipboard.writeText(document.getElementById('cmpAiOutput').textContent).then(()=>{const b=event.target;b.textContent='Copied!';setTimeout(()=>b.textContent='Copy',1500);});}

function setVis(type,btn){curVis=type;document.querySelectorAll('.vis-btn').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');renderVis();}
function renderVis(){
  const data=curView==='targets'?allData.filter(r=>r['Company Type']==='Startup'):allData;
  const vc=document.getElementById('visContent');if(!vc)return;
  Object.values(visCharts).forEach(c=>{try{c.destroy();}catch(e){}});visCharts={};
  const renders={valuechain:renderValueChain,tile:renderTile,classic:renderClassic,matrix2x2:renderMatrix,heatmap:renderHeatmap,bubble:renderBubble,ecosystem:renderEcosystem,radar:renderRadar,whitespace:renderWhitespace,funding:renderFunding,geomap:renderGeoMap,architecture:renderArchitecture};
  if(renders[curVis])renders[curVis](data,vc);
}

function renderValueChain(data,vc){
  const cols=['Ingredient / Science','Platform','Brand','Distribution / Channel'];
  const cls=['vc-orange','vc-navy','vc-green','vc-rose'];
  const colData={};cols.forEach(c=>colData[c]=[]);
  data.forEach(r=>{const p=r['Ecosystem Position'];if(p&&colData[p])colData[p].push(r);});
  vc.innerHTML=`<div class="vis-card"><div class="vis-card-hdr"><span class="vis-card-title">Value Chain Map</span><div style="display:flex;gap:7px;align-items:center"><select id="vcStyle" onchange="renderVis()" style="padding:4px 8px;border:1px solid var(--border);border-radius:5px;font-size:10px;font-family:inherit;outline:none"><option value="column">Column view</option><option value="flow">Flow with arrows</option></select><button class="btn-dl-vis" onclick="dlVis('vc-inner')">Download PNG</button></div></div><div class="vis-card-desc">Companies positioned by role in the healthspan value chain.</div><div id="vc-inner" style="background:var(--white);padding:14px;border-radius:7px"><div id="vc-render"></div></div></div>`;
  setTimeout(()=>{
    const style=document.getElementById('vcStyle')?.value||'column';const t=document.getElementById('vc-render');
    if(style==='flow'){t.innerHTML=`<div style="display:flex;align-items:stretch;overflow-x:auto">${cols.map((c,i)=>`${i>0?'<div style="display:flex;align-items:center;padding:0 6px;color:var(--ink-muted);font-size:18px">-&gt;</div>':''}<div style="flex:1;min-width:130px"><div style="background:var(--navy);color:var(--white);padding:8px;font-size:9px;font-weight:600;text-transform:uppercase;text-align:center">${c}</div><div style="padding:9px;background:var(--orange-pale);border:2px solid var(--orange);border-top:none;min-height:140px">${(colData[c]||[]).map(r=>`<div class="vc-chip ${cls[i]}" onclick="showSection('companies');openPanel('${r['Company Name'].replace(/'/g,"\\'")}')">${r['Company Name']}</div>`).join('')||'<div style="font-size:10px;color:var(--ink-muted);text-align:center;padding:8px">-</div>'}</div></div>`).join('')}</div>`;}
    else{t.innerHTML=`<div style="display:grid;grid-template-columns:repeat(${cols.length},1fr)">${cols.map(c=>`<div style="background:var(--navy);color:var(--white);padding:8px;font-size:9px;font-weight:600;text-transform:uppercase;text-align:center;border-right:1px solid #2a4560">${c}</div>`).join('')}${cols.map((c,i)=>`<div style="padding:9px;border-right:1px solid var(--border);min-height:140px">${(colData[c]||[]).map(r=>`<div class="vc-chip ${cls[i]}" onclick="showSection('companies');openPanel('${r['Company Name'].replace(/'/g,"\\'")}')">${r['Company Name']}</div>`).join('')||'<div style="font-size:10px;color:var(--ink-muted);text-align:center;padding:8px">-</div>'}</div>`).join('')}</div>`;}
  },50);
}

function renderTile(data,vc){
  const areas=['Precision Nutrition','Intelligent Health','Food & Medicine'];
  const aClass=['pn','ih','fm'];const aColors={'pn':'#e07535','ih':'#162535','fm':'#b85050'};
  vc.innerHTML=`<div class="vis-card"><div class="vis-card-hdr"><span class="vis-card-title">Tile Landscape</span><button class="btn-dl-vis" onclick="dlVis('tile-inner')">Download PNG</button></div><div class="vis-card-desc">Companies as tiles. Click any tile to view company details.</div><div id="tile-inner" style="background:var(--white);padding:14px;border-radius:7px">${areas.map((area,i)=>{const companies=data.filter(r=>r['TMG Focus Area']===area);return`<div style="margin-bottom:18px"><div style="background:${i===0?'#fce0cc':i===1?'#ddeaf4':'var(--rose-light)'};color:${aColors[aClass[i]]};font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;padding:5px 10px;border-radius:5px;margin-bottom:8px">${area} - ${companies.length}</div><div class="tile-wrap">${companies.map(r=>`<div class="tile ${aClass[i]}" onclick="showSection('companies');openPanel('${r['Company Name'].replace(/'/g,"\\'")}')" title="${r['One-liner']||''}"><div class="tile-init" style="background:${aColors[aClass[i]]}">${(r['Company Name']||'?')[0].toUpperCase()}</div><div class="tile-name">${r['Company Name']}</div></div>`).join('')}</div></div>`;}).join('')}</div></div>`;
}

function renderClassic(data,vc){
  const stages=['Pre-seed','Seed','Series A','Series B'];
  const areas=['Precision Nutrition','Intelligent Health','Food & Medicine'];
  const colors={'Precision Nutrition':'#e07535','Intelligent Health':'#162535','Food & Medicine':'#b85050'};
  vc.innerHTML=`<div class="vis-card"><div class="vis-card-hdr"><span class="vis-card-title">Classic VC Landscape Grid</span><button class="btn-dl-vis" onclick="dlVis('classic-inner')">Download PNG</button></div><div class="vis-card-desc">Companies organized by stage (columns) and focus area (rows) - classic VC landscape format.</div><div id="classic-inner" style="background:var(--white);padding:16px;border-radius:7px;overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead><tr><th style="background:var(--navy);color:var(--white);padding:8px;font-size:10px;width:130px;text-align:left">Focus Area</th>${stages.map(s=>`<th style="background:var(--navy2);color:var(--white);padding:8px;font-size:10px;text-align:center;border-left:1px solid #2a4560">${s}</th>`).join('')}</tr></thead><tbody>${areas.map(area=>`<tr style="border-bottom:1px solid var(--border)"><td style="padding:10px;font-size:11px;font-weight:600;color:${colors[area]};background:#f9f9f9">${area}</td>${stages.map(stage=>{const comps=data.filter(r=>r['TMG Focus Area']===area&&r['Stage']===stage);return`<td style="padding:8px;vertical-align:top;border-left:1px solid var(--border)"><div style="display:flex;flex-wrap:wrap;gap:6px">${comps.map(r=>`<div onclick="showSection('companies');openPanel('${r['Company Name'].replace(/'/g,"\\'")}');" style="cursor:pointer;background:${colors[area]};color:white;border-radius:6px;padding:5px 8px;font-size:9px;font-weight:600;text-align:center">${r['Company Name']}</div>`).join('')}${!comps.length?'<span style="font-size:10px;color:#ccc">-</span>':''}</div></td>`;}).join('')}</tr>`).join('')}</tbody></table></div></div>`;
}

let matChart=null;
function renderMatrix(data,vc){
  vc.innerHTML=`<div class="vis-card"><div class="vis-card-hdr"><span class="vis-card-title">2x2 Matrix</span><button class="btn-dl-vis" onclick="dlMatrixChart()">Download PNG</button></div><div class="vis-card-desc">Plot any two scored dimensions. Best = top-right quadrant.</div><div class="vis-controls"><label>X:</label><select id="mx_x" onchange="updateMatrix()">${SCORE_COLS.map(c=>`<option value="${c}">${c}</option>`).join('')}</select><label>Y:</label><select id="mx_y" onchange="updateMatrix()">${SCORE_COLS.map((c,i)=>`<option value="${c}" ${i===1?'selected':''}>${c}</option>`).join('')}</select><label>X Label:</label><input type="text" id="mx_cx" placeholder="Custom X label" oninput="updateMatrix()" style="width:140px"><label>Y Label:</label><input type="text" id="mx_cy" placeholder="Custom Y label" oninput="updateMatrix()" style="width:140px"></div><div class="vis-render" style="padding:0;background:var(--white)"><div style="position:relative;height:340px;padding:14px"><canvas id="matrixChart"></canvas></div></div></div>`;
  updateMatrix(data);
}
function updateMatrix(data){
  if(!data)data=curView==='targets'?allData.filter(r=>r['Company Type']==='Startup'):allData;
  const xKey=document.getElementById('mx_x')?.value||'Market Traction';
  const yKey=document.getElementById('mx_y')?.value||'Product Differentiation';
  const xl=document.getElementById('mx_cx')?.value||xKey;
  const yl=document.getElementById('mx_cy')?.value||yKey;
  const cmap={'Precision Nutrition':'#e07535bb','Intelligent Health':'#162535bb','Food & Medicine':'#2a7f5fbb'};
  const grp={};
  data.filter(r=>r[xKey]&&r[yKey]).forEach(r=>{const a=r['TMG Focus Area']||'Other';if(!grp[a])grp[a]=[];grp[a].push({x:+r[xKey],y:+r[yKey],label:r['Company Name']});});
  if(matChart){try{matChart.destroy();}catch(e){}matChart=null;}
  const ctx=document.getElementById('matrixChart');if(!ctx)return;
  matChart=new Chart(ctx,{type:'scatter',data:{datasets:Object.entries(grp).map(([a,pts])=>({label:a,data:pts,backgroundColor:cmap[a]||'#888bb',pointRadius:9,pointHoverRadius:11}))},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:9},boxWidth:7}},tooltip:{callbacks:{label:c=>`${c.raw.label} (${c.raw.x},${c.raw.y})`}}},scales:{x:{min:0,max:6,title:{display:true,text:xl,font:{size:9}},grid:{color:'#eef2f6'}},y:{min:0,max:6,title:{display:true,text:yl,font:{size:9}},grid:{color:'#eef2f6'}}}}});
  visCharts.matrix=matChart;
}
function dlMatrixChart(){if(matChart){const a=document.createElement('a');a.download='TMG_Matrix.png';a.href=matChart.toBase64Image('image/png',1);a.click();}}

function renderHeatmap(data,vc){
  const areas=['Precision Nutrition','Intelligent Health','Food & Medicine'];
  const targets=['Metabolic Control','Gut Health','Cardiovascular Health','Neurological Health','Inflammation','Musculoskeletal'];
  const matrix={};areas.forEach(a=>{matrix[a]={};targets.forEach(t=>matrix[a][t]=0);});
  data.filter(r=>r['Healthspan Target']!=='Multiple').forEach(r=>{if(matrix[r['TMG Focus Area']]&&r['Healthspan Target'])matrix[r['TMG Focus Area']][r['Healthspan Target']]++;});
  function hm(n){return n===0?'hm-0':n===1?'hm-1':n===2?'hm-2':n===3?'hm-3':'hm-4';}
  vc.innerHTML=`<div class="vis-card"><div class="vis-card-hdr"><span class="vis-card-title">Heatmap</span><button class="btn-dl-vis" onclick="dlVis('hm-inner')">Download PNG</button></div><div class="vis-card-desc">Company density by Focus Area x Healthspan Target. White = potential white space.</div><div id="hm-inner" style="background:var(--white);padding:14px;border-radius:7px;overflow-x:auto"><table class="heatmap-table"><thead><tr><th class="row-hdr">Focus Area</th>${targets.map(t=>`<th>${t}</th>`).join('')}</tr></thead><tbody>${areas.map(a=>`<tr><td style="font-weight:600;font-size:10px;background:var(--slate);padding:8px 10px;white-space:nowrap">${a}</td>${targets.map(t=>`<td class="${hm(matrix[a][t]||0)}">${matrix[a][t]||0}</td>`).join('')}</tr>`).join('')}</tbody></table><div style="display:flex;align-items:center;gap:7px;margin-top:10px;font-size:9px;color:var(--ink-muted)">Density: <span class="hm-0" style="padding:2px 6px;border-radius:3px">0</span><span class="hm-1" style="padding:2px 6px;border-radius:3px">1</span><span class="hm-2" style="padding:2px 6px;border-radius:3px">2</span><span class="hm-3" style="padding:2px 6px;border-radius:3px;color:#fff">3</span><span class="hm-4" style="padding:2px 6px;border-radius:3px;color:#fff">4+</span><span style="margin-left:8px;font-style:italic">0 = white space opportunity</span></div></div></div>`;
}

let bubbleChart=null;
function renderBubble(data,vc){
  vc.innerHTML=`<div class="vis-card"><div class="vis-card-hdr"><span class="vis-card-title">Bubble Chart</span><button class="btn-dl-vis" onclick="dlBubbleChart()">Download PNG</button></div><div class="vis-card-desc">Choose any 3 scored dimensions for X, Y, and bubble size.</div><div class="vis-controls"><label>X:</label><select id="bx" onchange="updateBubble()">${SCORE_COLS.map(c=>`<option value="${c}">${c}</option>`).join('')}</select><label>Y:</label><select id="by" onchange="updateBubble()">${SCORE_COLS.map((c,i)=>`<option value="${c}" ${i===1?'selected':''}>${c}</option>`).join('')}</select><label>Size:</label><select id="bsize" onchange="updateBubble()">${SCORE_COLS.map((c,i)=>`<option value="${c}" ${i===2?'selected':''}>${c}</option>`).join('')}</select></div><div class="vis-render" style="padding:0"><div style="position:relative;height:340px;padding:14px"><canvas id="bubbleChartVis"></canvas></div></div></div>`;
  updateBubble(data);
}
function updateBubble(data){
  if(!data)data=curView==='targets'?allData.filter(r=>r['Company Type']==='Startup'):allData;
  const xk=document.getElementById('bx')?.value||'Market Traction';
  const yk=document.getElementById('by')?.value||'Product Differentiation';
  const sk=document.getElementById('bsize')?.value||'Capital Efficiency';
  const cmap={'Precision Nutrition':'#e07535bb','Intelligent Health':'#162535bb','Food & Medicine':'#2a7f5fbb'};
  const grp={};
  data.filter(r=>r[xk]&&r[yk]).forEach(r=>{const a=r['TMG Focus Area']||'Other';if(!grp[a])grp[a]=[];grp[a].push({x:+r[xk],y:+r[yk],r:Math.max(6,(+r[sk]||2)*5),label:r['Company Name']});});
  if(bubbleChart){try{bubbleChart.destroy();}catch(e){}bubbleChart=null;}
  const ctx=document.getElementById('bubbleChartVis');if(!ctx)return;
  bubbleChart=new Chart(ctx,{type:'bubble',data:{datasets:Object.entries(grp).map(([a,pts])=>({label:a,data:pts,backgroundColor:cmap[a]||'#888bb',borderColor:'transparent'}))},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:9},boxWidth:7}},tooltip:{callbacks:{label:c=>`${c.raw.label}`}}},scales:{x:{min:0,max:6,title:{display:true,text:xk,font:{size:9}},grid:{color:'#eef2f6'}},y:{min:0,max:6,title:{display:true,text:yk,font:{size:9}},grid:{color:'#eef2f6'}}}}});
  visCharts.bubble=bubbleChart;
}
function dlBubbleChart(){if(bubbleChart){const a=document.createElement('a');a.download='TMG_Bubble.png';a.href=bubbleChart.toBase64Image('image/png',1);a.click();}}

function renderEcosystem(data,vc){
  vc.innerHTML=`<div class="vis-card"><div class="vis-card-hdr"><span class="vis-card-title">Ecosystem Map</span></div><div class="vis-card-desc">Force-directed network: companies, investors, and healthspan targets as interconnected nodes.</div><div id="eco-svg-wrap" style="background:var(--white);border-radius:7px;border:1px solid var(--border)"></div></div>`;
  setTimeout(()=>{
    const W=900,H=500;
    const nodes=[],links=[];
    const aColor={'Precision Nutrition':'#e07535','Intelligent Health':'#162535','Food & Medicine':'#b85050'};
    const investorSet=new Set();const healthSet=new Set();
    data.forEach(r=>{nodes.push({id:r['Company Name'],type:'company',color:aColor[r['TMG Focus Area']]||'#888'});if(r['Healthspan Target']&&r['Healthspan Target']!=='Multiple')healthSet.add(r['Healthspan Target']);if(r['Key Investors']){r['Key Investors'].split(/[,\/]/).slice(0,2).forEach(inv=>{const i=inv.trim();if(i&&i.length>2)investorSet.add(i);});}});
    healthSet.forEach(h=>nodes.push({id:h,type:'health',color:'#2a7f5f'}));
    investorSet.forEach(inv=>nodes.push({id:inv,type:'investor',color:'#c9a84c'}));
    data.forEach(r=>{if(r['Healthspan Target']&&r['Healthspan Target']!=='Multiple'&&healthSet.has(r['Healthspan Target']))links.push({source:r['Company Name'],target:r['Healthspan Target']});if(r['Key Investors']){r['Key Investors'].split(/[,\/]/).slice(0,2).forEach(inv=>{const i=inv.trim();if(investorSet.has(i))links.push({source:r['Company Name'],target:i});});}});
    const svg=d3.select('#eco-svg-wrap').append('svg').attr('viewBox',`0 0 ${W} ${H}`).attr('style','width:100%;height:auto');
    const sim=d3.forceSimulation(nodes).force('link',d3.forceLink(links).id(d=>d.id).distance(80)).force('charge',d3.forceManyBody().strength(-120)).force('center',d3.forceCenter(W/2,H/2)).force('collision',d3.forceCollide(32));
    const link=svg.append('g').selectAll('line').data(links).join('line').attr('stroke','#dde4ec').attr('stroke-width',1);
    const node=svg.append('g').selectAll('g').data(nodes).join('g').call(d3.drag().on('start',(e,d)=>{if(!e.active)sim.alphaTarget(.3).restart();d.fx=d.x;d.fy=d.y;}).on('drag',(e,d)=>{d.fx=e.x;d.fy=e.y;}).on('end',(e,d)=>{if(!e.active)sim.alphaTarget(0);d.fx=null;d.fy=null;}));
    node.append('circle').attr('r',d=>d.type==='company'?16:d.type==='investor'?12:14).attr('fill',d=>d.color).attr('opacity',.85);
    node.append('text').attr('text-anchor','middle').attr('dy',d=>d.type==='company'?26:22).attr('font-size',d=>d.type==='company'?9:8).attr('fill','#4a6070').text(d=>{const n=d.id||'';return n.length>14?n.slice(0,12)+'...':n;});
    node.append('title').text(d=>d.id);
    sim.on('tick',()=>{link.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y).attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);node.attr('transform',d=>`translate(${Math.max(20,Math.min(W-20,d.x))},${Math.max(20,Math.min(H-20,d.y))})`);});
    const leg=svg.append('g').attr('transform',`translate(14,${H-70})`);
    [{label:'Company',color:'#e07535'},{label:'Investor',color:'#c9a84c'},{label:'Healthspan Target',color:'#2a7f5f'}].forEach(({label,color},i)=>{leg.append('circle').attr('cx',0).attr('cy',i*20).attr('r',7).attr('fill',color).attr('opacity',.85);leg.append('text').attr('x',14).attr('y',i*20+4).attr('font-size',9).attr('fill','#4a6070').text(label);});
  },100);
}

let radarChart=null;
function renderRadar(data,vc){
  const opts=data.map(r=>`<option value="${r['Company Name']}">${r['Company Name']}</option>`).join('');
  vc.innerHTML=`<div class="vis-card"><div class="vis-card-hdr"><span class="vis-card-title">Radar Chart</span><button class="btn-dl-vis" onclick="dlRadarChart()">Download PNG</button></div><div class="vis-card-desc">Compare up to 4 companies across 6 strategic dimensions.</div><div class="vis-controls">${[0,1,2,3].map(i=>`<select id="rad_${i}" onchange="updateRadar()"><option value="">Company ${i+1}...</option>${opts}</select>`).join('')}</div><div class="vis-render" style="padding:0"><div style="position:relative;height:320px;padding:14px"><canvas id="radarChart"></canvas></div></div></div>`;
}
function updateRadar(){
  const dims=['Market Traction','Product Differentiation','Clinical Validation','AI Actionability','Data Moat','Scalability'];
  const colors=['#e07535','#162535','#2a7f5f','#b85050'];
  const sel=[0,1,2,3].map(i=>document.getElementById('rad_'+i)?.value).filter(Boolean);
  const companies=sel.map(n=>allData.find(r=>r['Company Name']===n)).filter(Boolean);
  if(!companies.length)return;
  if(radarChart){try{radarChart.destroy();}catch(e){}radarChart=null;}
  const ctx=document.getElementById('radarChart');if(!ctx)return;
  radarChart=new Chart(ctx,{type:'radar',data:{labels:dims,datasets:companies.map((c,i)=>({label:c['Company Name'],data:dims.map(d=>+c[d]||0),borderColor:colors[i],backgroundColor:colors[i]+'22',pointBackgroundColor:colors[i],borderWidth:2}))},options:{responsive:true,maintainAspectRatio:false,scales:{r:{min:0,max:5,ticks:{stepSize:1,font:{size:8}},pointLabels:{font:{size:9}}}},plugins:{legend:{position:'bottom',labels:{font:{size:9},boxWidth:7}}}}});
  visCharts.radar=radarChart;
}
function dlRadarChart(){if(radarChart){const a=document.createElement('a');a.download='TMG_Radar.png';a.href=radarChart.toBase64Image('image/png',1);a.click();}}

function renderWhitespace(data,vc){
  const targets=['Metabolic Control','Gut Health','Cardiovascular Health','Neurological Health','Inflammation','Musculoskeletal'];
  const ecos=['Ingredient / Science','Platform','Brand','Distribution / Channel'];
  vc.innerHTML=`<div class="vis-card"><div class="vis-card-hdr"><span class="vis-card-title">White Space Matrix</span><button class="btn-dl-vis" onclick="dlVis('ws-inner')">Download PNG</button></div><div class="vis-card-desc">Healthspan Target x Ecosystem Position. Empty = investment opportunity.</div><div id="ws-inner" style="background:var(--white);padding:14px;border-radius:7px;overflow-x:auto"><table class="wspace-table"><thead><tr><th class="row-hdr">Healthspan Target</th>${ecos.map(e=>`<th>${e}</th>`).join('')}</tr></thead><tbody>${targets.map(t=>`<tr><td style="font-weight:600;font-size:10px;padding:7px 9px;background:var(--slate)">${t}</td>${ecos.map(e=>{const comps=data.filter(r=>r['Healthspan Target']===t&&r['Ecosystem Position']===e);return comps.length?`<td class="ws-filled">${comps.map(r=>`<div style="font-size:9px">${r['Company Name']}</div>`).join('')}</td>`:`<td class="ws-empty">white space</td>`;}).join('')}</tr>`).join('')}</tbody></table></div></div>`;
}

function renderFunding(data,vc){
  const stageOrder={'Pre-seed':1,'Seed':2,'Series A':3,'Series B':4,'Public':5};
  const sorted=[...data].filter(r=>stageOrder[r['Stage']]).sort((a,b)=>stageOrder[a['Stage']]-stageOrder[b['Stage']]);
  const colors={'Precision Nutrition':'#e07535','Intelligent Health':'#162535','Food & Medicine':'#b85050'};
  vc.innerHTML=`<div class="vis-card"><div class="vis-card-hdr"><span class="vis-card-title">Funding Timeline</span><button class="btn-dl-vis" onclick="dlVis('ft-inner')">Download PNG</button></div><div class="vis-card-desc">Companies arranged by funding stage from earliest to most mature.</div><div id="ft-inner" style="background:var(--white);padding:14px;border-radius:7px">${['Pre-seed','Seed','Series A','Series B','Public'].map(stage=>{const comps=sorted.filter(r=>r['Stage']===stage);if(!comps.length)return'';return`<div style="margin-bottom:18px"><div style="font-size:9px;font-weight:600;color:var(--ink-muted);letter-spacing:.05em;text-transform:uppercase;margin-bottom:7px;display:flex;align-items:center;gap:7px"><div style="height:1px;flex:1;background:var(--border)"></div>${stage}<div style="height:1px;flex:1;background:var(--border)"></div></div><div style="display:flex;flex-wrap:wrap;gap:7px;justify-content:center">${comps.map(r=>`<div onclick="showSection('companies');openPanel('${r['Company Name'].replace(/'/g,"\\'")}');" style="cursor:pointer;background:${colors[r['TMG Focus Area']]||'#888'};color:white;padding:6px 11px;border-radius:7px;font-size:10px;font-weight:500;min-width:90px;text-align:center"><div>${r['Company Name']}</div><div style="font-size:8px;opacity:.75">${r['Funding Raised']||'Undisclosed'}</div>${r['Last Funded Date']?`<div style="font-size:8px;opacity:.6">${r['Last Funded Date']}</div>`:''}</div>`).join('')}</div></div>`;}).join('')}</div></div>`;
}

function renderGeoMap(data,vc){
  const geoCoords={'US':{x:200,y:180},'USA':{x:200,y:180},'UK':{x:430,y:120},'United Kingdom':{x:430,y:120},'France':{x:445,y:135},'Ireland':{x:420,y:118},'Israel':{x:500,y:165},'Switzerland':{x:452,y:130},'Sweden':{x:465,y:100},'Singapore':{x:635,y:230},'Germany':{x:455,y:118},'Canada':{x:185,y:130}};
  const W=820,H=380;
  const companies=data.filter(r=>r['Geography']&&geoCoords[r['Geography'].trim()]);
  vc.innerHTML=`<div class="vis-card"><div class="vis-card-hdr"><span class="vis-card-title">Geographic Map</span><button class="btn-dl-vis" onclick="dlVis('geo-inner')">Download PNG</button></div><div class="vis-card-desc">Company HQs plotted geographically. Bubble size = number of companies.</div><div id="geo-inner" style="background:#eef6ff;border-radius:7px;overflow:hidden"><svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto"><rect width="${W}" height="${H}" fill="#ddeeff"/><ellipse cx="200" cy="175" rx="140" ry="100" fill="#c8dfc8" opacity=".7"/><ellipse cx="230" cy="290" rx="70" ry="80" fill="#c8dfc8" opacity=".7"/><ellipse cx="450" cy="125" rx="55" ry="45" fill="#c8dfc8" opacity=".7"/><ellipse cx="460" cy="230" rx="60" ry="80" fill="#c8dfc8" opacity=".7"/><ellipse cx="600" cy="155" rx="130" ry="90" fill="#c8dfc8" opacity=".7"/><ellipse cx="680" cy="290" rx="50" ry="35" fill="#c8dfc8" opacity=".7"/>${Object.entries(geoCoords).map(([geo,pos])=>{const comps=companies.filter(r=>r['Geography']?.trim()===geo);if(!comps.length)return'';const r=Math.max(14,comps.length*10);const focus=comps[0]['TMG Focus Area'];const color=focus==='Precision Nutrition'?'#e07535':focus==='Intelligent Health'?'#162535':'#b85050';return`<circle cx="${pos.x}" cy="${pos.y}" r="${r}" fill="${color}" opacity=".75"/><text x="${pos.x}" y="${pos.y+3}" text-anchor="middle" font-size="9" fill="white" font-weight="600">${comps.length}</text><title>${geo}: ${comps.map(c=>c['Company Name']).join(', ')}</title>`;}).join('')}<rect x="14" y="${H-55}" width="200" height="50" fill="white" opacity=".8" rx="5"/><circle cx="28" cy="${H-40}" r="7" fill="#e07535" opacity=".85"/><text x="40" y="${H-36}" font-size="9" fill="#4a6070">Precision Nutrition</text><circle cx="28" cy="${H-22}" r="7" fill="#162535" opacity=".85"/><text x="40" y="${H-18}" font-size="9" fill="#4a6070">Intelligent Health</text><circle cx="120" cy="${H-40}" r="7" fill="#b85050" opacity=".85"/><text x="132" y="${H-36}" font-size="9" fill="#4a6070">Food and Medicine</text></svg></div></div>`;
}

function renderArchitecture(data,vc){
  vc.innerHTML=`<div class="vis-card"><div class="vis-card-hdr"><span class="vis-card-title">Platform Architecture</span><button class="btn-dl-vis" onclick="dlVis('arch-inner')">Download PNG</button></div><div class="vis-card-desc">How data flows from web sources through the platform to deliver investment intelligence.</div><div id="arch-inner" style="background:var(--white);padding:20px;border-radius:7px"><svg viewBox="0 0 900 320" style="width:100%;height:auto"><defs><marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#e07535"/></marker></defs><text x="450" y="22" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#7a9ab0" font-weight="600">DATA SOURCES</text><rect x="40" y="30" width="140" height="52" rx="7" fill="#162535"/><text x="110" y="50" text-anchor="middle" font-family="sans-serif" font-size="10" fill="white" font-weight="500">Startup Website</text><text x="110" y="63" text-anchor="middle" font-family="sans-serif" font-size="8" fill="#7a9ab0">URL Scraper</text><text x="110" y="75" text-anchor="middle" font-family="sans-serif" font-size="8" fill="#e07535">AI fills form</text><rect x="260" y="30" width="140" height="52" rx="7" fill="#162535"/><text x="330" y="50" text-anchor="middle" font-family="sans-serif" font-size="10" fill="white" font-weight="500">LinkedIn Bio</text><text x="330" y="63" text-anchor="middle" font-family="sans-serif" font-size="8" fill="#7a9ab0">AI Extracts</text><text x="330" y="75" text-anchor="middle" font-family="sans-serif" font-size="8" fill="#e07535">Founder Pedigree</text><rect x="480" y="30" width="140" height="52" rx="7" fill="#162535"/><text x="550" y="50" text-anchor="middle" font-family="sans-serif" font-size="10" fill="white" font-weight="500">Google Sheet</text><text x="550" y="63" text-anchor="middle" font-family="sans-serif" font-size="8" fill="#7a9ab0">CSV Sync</text><text x="550" y="75" text-anchor="middle" font-family="sans-serif" font-size="8" fill="#e07535">Manual entry</text><line x1="110" y1="82" x2="110" y2="115" stroke="#e07535" stroke-width="1.5"/><line x1="330" y1="82" x2="330" y2="115" stroke="#e07535" stroke-width="1.5"/><line x1="550" y1="82" x2="550" y2="115" stroke="#e07535" stroke-width="1.5"/><line x1="110" y1="115" x2="550" y2="115" stroke="#e07535" stroke-width="1.5"/><line x1="330" y1="115" x2="330" y2="128" stroke="#e07535" stroke-width="1.5" marker-end="url(#arr)"/><rect x="200" y="128" width="260" height="48" rx="8" fill="#ff8000" opacity=".9"/><text x="330" y="149" text-anchor="middle" font-family="sans-serif" font-size="13" fill="white">Firebase Firestore</text><text x="330" y="165" text-anchor="middle" font-family="sans-serif" font-size="9" fill="rgba(255,255,255,.8)">Real-time - Shared across all 5 teammates</text><line x1="230" y1="176" x2="140" y2="210" stroke="#dde4ec" stroke-width="1.2"/><line x1="280" y1="176" x2="320" y2="210" stroke="#dde4ec" stroke-width="1.2"/><line x1="380" y1="176" x2="500" y2="210" stroke="#dde4ec" stroke-width="1.2"/><line x1="430" y1="176" x2="680" y2="210" stroke="#dde4ec" stroke-width="1.2"/><rect x="70" y="210" width="140" height="48" rx="7" fill="#162535"/><text x="140" y="231" text-anchor="middle" font-family="sans-serif" font-size="9" fill="white" font-weight="600">Dashboard Charts</text><text x="140" y="245" text-anchor="middle" font-family="sans-serif" font-size="8" fill="rgba(255,255,255,.7)">12 Visual types</text><rect x="250" y="210" width="140" height="48" rx="7" fill="#7a3fd0"/><text x="320" y="231" text-anchor="middle" font-family="sans-serif" font-size="9" fill="white" font-weight="600">AI Analysis</text><text x="320" y="245" text-anchor="middle" font-family="sans-serif" font-size="8" fill="rgba(255,255,255,.7)">Claude / Gemini</text><rect x="430" y="210" width="140" height="48" rx="7" fill="#2a7f5f"/><text x="500" y="231" text-anchor="middle" font-family="sans-serif" font-size="9" fill="white" font-weight="600">CSV Export</text><text x="500" y="245" text-anchor="middle" font-family="sans-serif" font-size="8" fill="rgba(255,255,255,.7)">Google Sheets backup</text><rect x="610" y="210" width="140" height="48" rx="7" fill="#e07535"/><text x="680" y="231" text-anchor="middle" font-family="sans-serif" font-size="9" fill="white" font-weight="600">Newsletter PNGs</text><text x="680" y="245" text-anchor="middle" font-family="sans-serif" font-size="8" fill="rgba(255,255,255,.7)">Visuals tab</text><rect x="210" y="268" width="220" height="34" rx="6" fill="#f0e8fe" stroke="#7a3fd0" stroke-width="1.5"/><text x="320" y="283" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#5a1a9a" font-weight="600">Send to Claude connector</text><text x="320" y="296" text-anchor="middle" font-family="sans-serif" font-size="8" fill="#7a3fd0">Query your landscape from Claude chat</text><line x1="320" y1="258" x2="320" y2="268" stroke="#7a3fd0" stroke-width="1.2"/></svg></div></div>`;
}

function dlVis(innerId){
  const el=document.getElementById(innerId);if(!el)return;
  const go=()=>window.html2canvas(el,{scale:2,backgroundColor:'#ffffff',useCORS:true}).then(canvas=>{const a=document.createElement('a');a.download='TMG_Visual.png';a.href=canvas.toDataURL('image/png');a.click();});
  if(window.html2canvas){go();}else{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';s.onload=go;document.head.appendChild(s);}
}

function openClaudeModal(){
  const data=curView==='targets'?allData.filter(r=>r['Company Type']==='Startup'):allData;
  setClaude(document.querySelector('.claude-prompt-btn'),'overview',data);
  document.getElementById('claudeModal').classList.add('open');
}
function closeClaudeModal(){document.getElementById('claudeModal').classList.remove('open');}
function setClaude(btn,type,data){
  claudePromptType=type;
  if(btn){document.querySelectorAll('.claude-prompt-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');}
  const d=data||(curView==='targets'?allData.filter(r=>r['Company Type']==='Startup'):allData);
  const table=d.map(r=>`- ${r['Company Name']} (${r['TMG Focus Area']}, ${r['Stage']}) - ${r['One-liner']}\n  Scores: Traction ${r['Market Traction']}/5 | Data Moat ${r['Data Moat']}/5 | Diff ${r['Product Differentiation']}/5 | Pedigree: ${r['Founder Pedigree']||'Unknown'} | IP: ${r['IP / Patent Status']||'Unknown'} | Last funded: ${r['Last Funded Date']||'Unknown'} | Runway: ${r['Estimated Runway (months)']||'?'}mo`).join('\n');
  const prompts={overview:`I am an analyst at The March Group (TMG), a VC fund focused on the Consumer Healthspan Economy. Here is our current investment landscape:\n\n${table}\n\nPlease give me a strategic overview - key themes, strongest companies, and top observations.`,priority:`I am an analyst at The March Group. Based on this landscape data, which 3 companies should we call first and why? Consider founder pedigree, IP status, runway, and scores.\n\n${table}`,runway:`Based on this landscape, which companies are most likely approaching their next fundraise? Flag anyone with low runway or last funded over 18 months ago.\n\n${table}`,whitespace:`Based on this landscape, what are the most compelling white space opportunities - areas with few or no companies - that TMG should explore?\n\n${table}`,newsletter:`Write a 200-word newsletter paragraph about the Consumer Healthspan Economy based on this landscape data. Reference specific companies and trends.\n\n${table}`};
  claudePayload=prompts[type]||prompts.overview;
  document.getElementById('claudeDataBox').textContent=claudePayload;
}
function copyForClaude(){
  navigator.clipboard.writeText(claudePayload).then(()=>{const b=event.target;b.textContent='Copied!';setTimeout(()=>b.textContent='Copy to Clipboard',1500);});
}
function openClaude(){navigator.clipboard.writeText(claudePayload).catch(()=>{});window.open('https://claude.ai/new','_blank');}

function updateKeyLabel(){
  const p=document.getElementById('aiProvider')?.value||'gemini';
  const lbl=document.getElementById('aiKeyLbl');if(lbl)lbl.textContent=p==='gemini'?'Gemini API Key:':'Anthropic API Key:';
  const inp=document.getElementById('apiKeyInput');
  if(inp){inp.placeholder=p==='gemini'?'AIza...':'sk-ant-...';inp.value=localStorage.getItem(p==='gemini'?'tmg_geminiKey':'tmg_claudeKey')||'';}
}
function saveKey(){const p=document.getElementById('aiProvider')?.value||'gemini';const k=document.getElementById('apiKeyInput').value.trim();if(k){localStorage.setItem(p==='gemini'?'tmg_geminiKey':'tmg_claudeKey',k);alert('API key saved!');}}
function selPrompt(btn,type){document.querySelectorAll('.ai-panel .ai-opt').forEach(b=>b.classList.remove('active'));btn.classList.add('active');curPrompt=type;}

async function callAI(prompt){
  const provider=document.getElementById('aiProvider')?.value||localStorage.getItem('tmg_provider')||'gemini';
  if(provider==='gemini'){
    const key=localStorage.getItem('tmg_geminiKey')||document.getElementById('apiKeyInput')?.value.trim();
    if(!key)return'Please add your Gemini API key in Settings. Get a free key at aistudio.google.com/app/apikey';
    try{const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})});const data=await res.json();if(data.error)throw new Error(data.error.message);return data.candidates?.[0]?.content?.parts?.[0]?.text||'No response.';}catch(e){return'Gemini error: '+e.message;}
  }else{
    const key=localStorage.getItem('tmg_claudeKey')||document.getElementById('apiKeyInput')?.value.trim();
    if(!key)return'Please add your Claude API key in Settings.';
    const w=localStorage.getItem('tmg_workspaceId');
    const headers={'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'};
    if(w)headers['anthropic-workspace-id']=w;
    try{const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers,body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:1000,messages:[{role:'user',content:prompt}]})});const data=await res.json();if(data.error)throw new Error(data.error.message);return data.content?.[0]?.text||'No response.';}catch(e){return'Claude error: '+e.message;}
  }
}

function buildPrompt(type){
  const data=curView==='targets'?allData.filter(r=>r['Company Type']==='Startup'):allData;
  const summary=data.map(r=>`${r['Company Name']} (${r['TMG Focus Area']}, ${r['Stage']}, Pedigree:${r['Founder Pedigree']||'?'}, IP:${r['IP / Patent Status']||'?'}, Runway:${r['Estimated Runway (months)']||'?'}mo, Traction:${r['Market Traction']}/5, DataMoat:${r['Data Moat']}/5): ${r['One-liner']}`).join('\n');
  const p={newsletter:`You are a senior analyst at The March Group. Write a 180-word investor newsletter paragraph covering key trends in Precision Nutrition, Intelligent Health, and Food and Medicine. Reference specific companies.\n\n${summary}`,whitespace:`Identify 3 specific white spaces in this landscape. For each: name the gap, explain why it exists, describe a winning company.\n\n${summary}`,priority:`Write a 200-word investment memo with TMG top 3 priority targets. For each: strategic fit, key differentiator, main risk.\n\n${summary}`,thesis:`Assess how this landscape validates TMG shifts: (1) Calories to Health Outcomes, (2) Brands to Platforms, (3) Reactive to Preventative. 180 words.\n\n${summary}`,diligence:`Identify top competitive dynamics, platform risks, and biggest execution risks. 200 words.\n\n${summary}`,runway:`Which companies are most likely to need their next round in the next 6-12 months based on last funded dates and runway? Flag them for TMG to proactively engage.\n\n${summary}`};
  return p[type]||p.newsletter;
}
async function generateAI(){
  const btn=document.getElementById('btnGen');const out=document.getElementById('aiOutput');
  btn.disabled=true;btn.textContent='Generating...';out.textContent='Analysing...';out.className='ai-output idle';
  out.textContent=await callAI(buildPrompt(curPrompt));out.className='ai-output';
  btn.disabled=false;btn.textContent='Generate';
}
function copyAI(){navigator.clipboard.writeText(document.getElementById('aiOutput').textContent).then(()=>{const b=event.target;b.textContent='Copied!';setTimeout(()=>b.textContent='Copy',1500);});}

function openSettings(){
  const load=(id,key)=>{const v=localStorage.getItem(key);const el=document.getElementById(id);if(el&&v)el.value=v;};
  load('s_geminiKey','tmg_geminiKey');load('s_claudeKey','tmg_claudeKey');load('s_workspaceId','tmg_workspaceId');
  const p=localStorage.getItem('tmg_provider')||'gemini';const el=document.getElementById('s_provider');if(el)el.value=p;
  document.getElementById('settingsModal').classList.add('open');
}
function closeSettings(){document.getElementById('settingsModal').classList.remove('open');}
function saveSettings(){
  const save=(id,key)=>{const el=document.getElementById(id);if(el&&el.value.trim())localStorage.setItem(key,el.value.trim());};
  save('s_geminiKey','tmg_geminiKey');save('s_claudeKey','tmg_claudeKey');save('s_workspaceId','tmg_workspaceId');
  const p=document.getElementById('s_provider')?.value||'gemini';localStorage.setItem('tmg_provider',p);
  const ai=document.getElementById('aiProvider');if(ai)ai.value=p;updateKeyLabel();
  const u=document.getElementById('s_csvUrl')?.value;if(u)localStorage.setItem('tmg_csvUrl',u);
  closeSettings();alert('Settings saved!');
}
