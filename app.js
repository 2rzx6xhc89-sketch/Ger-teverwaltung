(function(){
'use strict';

/* ================= Helfer ================= */
const $=(s,r)=>(r||document).querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const isoOf=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const today=()=>isoOf(new Date());
const utc=s=>{const p=s.split('-').map(Number);return Date.UTC(p[0],p[1]-1,p[2]);};
const diffDays=(a,b)=>Math.round((utc(b)-utc(a))/864e5);
const addDays=(s,n)=>{const t=new Date(utc(s)+n*864e5);return t.getUTCFullYear()+'-'+pad(t.getUTCMonth()+1)+'-'+pad(t.getUTCDate());};
const addMonths=(s,n)=>{const p=s.split('-').map(Number);const t=new Date(Date.UTC(p[0],p[1]-1+n,1));const last=new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth()+1,0)).getUTCDate();return t.getUTCFullYear()+'-'+pad(t.getUTCMonth()+1)+'-'+pad(Math.min(p[2],last));};
const isDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'');
const fmt=s=>isDate(s)?s.split('-').reverse().join('.'):'–';
const MONTHS=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const WD=['Mo','Di','Mi','Do','Fr','Sa','So'];
const uid=()=>Math.random().toString(36).slice(2,9);
const clone=o=>JSON.parse(JSON.stringify(o));
const cmp=(a,b)=>String(a).localeCompare(String(b),'de',{numeric:true});

/* ================= Konstanten ================= */
const KAT={'Gerät':'G','Maschine':'M','Fahrzeug':'F'};
const STATUS={ok:'Einsatzbereit',wartung:'In Wartung',defekt:'Defekt',aus:'Ausgemustert'};
const SEV={gering:'Gering',mittel:'Mittel',kritisch:'Kritisch'};
const RST={offen:'Offen',bearbeitung:'In Bearbeitung',erledigt:'Erledigt'};
const DEFAULT_ARTEN=[
  {name:'Hauptuntersuchung (HU)',monate:24},
  {name:'UVV-Prüfung Fahrzeug',monate:12},
  {name:'Sicherheitsprüfung Maschine (UVV)',monate:12},
  {name:'DGUV V3 Elektroprüfung',monate:12},
  {name:'Wartung nach Herstellervorgabe',monate:12},
  {name:'Ölwechsel',monate:12},
  {name:'Prüfung Anschlagmittel',monate:12},
  {name:'Feuerlöscher-Prüfung',monate:24},
  {name:'Verbandskasten kontrollieren',monate:12},
  {name:'Motorsäge Wartung',monate:6}
];
const DEFAULT_SETTINGS={firma:'Böger Galabau',vorlauf:30,empfaenger:[],baseUrl:'',fristenarten:DEFAULT_ARTEN};
const ICONS={
  start:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  inventar:'<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
  scan:'<path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3"/><path d="M7 12h10"/>',
  kalender:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  meldungen:'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
  mehr:'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  lager:'<path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  etiketten:'<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><path d="M14 14h2v2h-2zM18 14h2M14 18h2v2M20 18v2"/>',
  einstellungen:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  back:'<path d="M15 5l-7 7 7 7"/>',
  prev:'<path d="M15 5l-7 7 7 7"/>',
  next:'<path d="M9 5l7 7-7 7"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>'
};
const ic=(n,c)=>'<svg class="ic'+(c?' '+c:'')+'" viewBox="0 0 24 24" aria-hidden="true">'+ICONS[n]+'</svg>';

/* ================= Zustand ================= */
const S={
  mode:'loading',            // loading | nodb | ready
  view:'start', detail:null,
  devices:[],places:[],reports:[],settings:clone(DEFAULT_SETTINGS),
  names:{},meId:null,canWrite:true,
  q:'',fKat:'',fStatus:'',fPlace:'',
  cal:{y:new Date().getFullYear(),m:new Date().getMonth()},calSel:null,calMode:'monat',frFilter:'alle',
  repFilter:'aktiv',
  lq:'',labelSel:new Set(),labelFmt:'a4-70x37',labelFrame:false,
  scanMsg:null,
  _fr:null
};
let db=null,user=null,dlCap=null,pendingHash=null,firstLoad={g:false,l:false,m:false,s:false};

/* ================= Abgeleitete Daten ================= */
const devById=id=>S.devices.find(d=>d.id===id);
const placeName=id=>{const p=S.places.find(x=>x.id===id);return p?p.name:'Ohne Lagerplatz';};
function myName(){try{return localStorage.getItem('galabau.name')||'';}catch(_){return '';}}
const nameOf=id=>!id?'Unbekannt':String(id);
function fristState(f){const d=diffDays(today(),f.faellig);return{days:d,state:d<0?'over':(d<=S.settings.vorlauf?'soon':'ok')};}
function allFristen(){
  const out=[];
  for(const dev of S.devices){
    if(dev.status==='aus')continue;
    for(const f of (dev.fristen||[])){
      if(!isDate(f.faellig))continue;
      const st=fristState(f);
      out.push({dev:dev,f:f,days:st.days,state:st.state});
    }
  }
  out.sort((a,b)=>a.f.faellig<b.f.faellig?-1:a.f.faellig>b.f.faellig?1:cmp(a.dev.inv,b.dev.inv));
  return out;
}
const FR=()=>S._fr||(S._fr=allFristen());
function nextFrist(dev){
  let best=null;
  for(const f of (dev.fristen||[])){if(isDate(f.faellig)&&(!best||f.faellig<best.faellig))best=f;}
  return best;
}
function baseUrlEff(){
  const b=String(S.settings.baseUrl||'').trim();
  if(b)return b.replace(/#.*$/,'');
  return /^https?:/.test(location.protocol)?(location.origin+location.pathname):'';
}
function qrText(dev){
  const base=baseUrlEff();
  return base?base+'#'+dev.inv:dev.inv;
}
function nextNumber(prefix){
  let max=0;
  for(const d of S.devices){const m=String(d.inv||d.id).match(/^([A-Z]+)-(\d+)$/);if(m&&m[1]===prefix)max=Math.max(max,Number(m[2]));}
  return max+1;
}
function toDoc(dev){const o=clone(dev);delete o.id;return o;}

/* ================= Kleine Bausteine ================= */
const pill=(cls,text)=>'<span class="pill '+cls+'">'+esc(text)+'</span>';
const statusPill=s=>pill('st-'+s,STATUS[s]||s);
const daysText=d=>d<0?(-d)+(d===-1?' Tag':' Tage')+' überfällig':d===0?'heute fällig':d===1?'morgen fällig':'in '+d+' Tagen';
const fristPill=st=>pill('fr-'+st.state,daysText(st.days));
const sevPill=s=>pill('sv-'+s,SEV[s]||s);
const repPill=s=>pill('rs-'+s,RST[s]||s);
const exTag=o=>o&&o.beispiel?' <span class="tag">Beispiel</span>':'';
function emptyState(title,text,btns){return '<div class="empty"><h3>'+esc(title)+'</h3><p>'+esc(text)+'</p>'+(btns||'')+'</div>';}
function options(list,val,blank){
  let h=blank!=null?'<option value="">'+esc(blank)+'</option>':'';
  for(const o of list){h+='<option value="'+esc(o[0])+'"'+(String(o[0])===String(val)?' selected':'')+'>'+esc(o[1])+'</option>';}
  return h;
}
const katOpts=()=>Object.keys(KAT).map(k=>[k,k]);
const statusOpts=()=>Object.keys(STATUS).map(k=>[k,STATUS[k]]);
const placeOpts=()=>S.places.slice().sort((a,b)=>cmp(a.name,b.name)).map(p=>[p.id,p.name]);

let toastT=null;
function toast(msg,kind){
  const t=$('#toast');t.textContent=msg;t.className='toast'+(kind==='err'?' err':'');t.hidden=false;
  clearTimeout(toastT);toastT=setTimeout(()=>{t.hidden=true;t.textContent='';},kind==='err'?6000:3200);
}
function errText(e){
  const c=e&&e.code;
  if(c==='quota_exceeded')return 'Der Speicher dieser Datenbank ist voll. Bitte Einträge löschen.';
  if(c==='invalid_argument')return 'Speichern nicht erlaubt. Dafür braucht es die Rolle „Mitwirkender“ oder höher.';
  if(c==='resource_exhausted')return 'Zu viele Anfragen. Bitte einen Moment warten und erneut versuchen.';
  if(c==='revoked')return 'Der Zugriff wurde entzogen. Bitte die Seite neu laden.';
  if(c==='declined')return 'Abgebrochen.';
  return (e&&e.message)||'Das hat nicht geklappt.';
}
function needWrite(){if(S.canWrite===false){toast('Dafür fehlen die Bearbeitungsrechte (Rolle „Mitwirkender“).','err');return false;}return true;}
async function run(fn,okMsg){
  try{await fn();if(okMsg)toast(okMsg);return true;}catch(e){console.error(e);toast(errText(e),'err');return false;}
}

/* ================= QR-Code ================= */
const qrCache=new Map();
function qrMatrix(text){
  if(typeof qrcode==='undefined')return null;
  if(qrCache.has(text))return qrCache.get(text);
  const q=qrcode(0,'M');q.addData(text);q.make();
  const n=q.getModuleCount(),rows=[];
  for(let r=0;r<n;r++){const row=[];for(let c=0;c<n;c++)row.push(q.isDark(r,c));rows.push(row);}
  qrCache.set(text,rows);return rows;
}
function qrSvg(text,px){
  const m=qrMatrix(text);
  if(!m)return '<div class="muted">QR-Bibliothek nicht geladen.</div>';
  const n=m.length,qz=2;let d='';
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(m[r][c])d+='M'+(c+qz)+' '+(r+qz)+'h1v1h-1z';
  const s=n+qz*2;
  return '<svg viewBox="0 0 '+s+' '+s+'" width="'+px+'" height="'+px+'" shape-rendering="crispEdges" role="img" aria-label="QR-Code"><rect width="'+s+'" height="'+s+'" fill="#fff"/><path d="'+d+'" fill="#000"/></svg>';
}

/* ================= Berichte / CSV ================= */
function csvCell(v){v=String(v==null?'':v);return /[;"\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}
function csv(rows){return '﻿'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n');}
function reportParts(){
  const fr=FR(),over=fr.filter(x=>x.state==='over'),soon=fr.filter(x=>x.state==='soon');
  const line=x=>'- '+x.dev.inv+' '+x.dev.name+' ('+x.f.art+') – fällig '+fmt(x.f.faellig)+' ('+daysText(x.days)+')';
  let body='Fristenübersicht Geräteverwaltung, Stand '+fmt(today())+'\n\n';
  body+='Überfällig ('+over.length+'):\n'+(over.length?over.map(line).join('\n'):'- keine')+'\n\n';
  body+='Fällig in den nächsten '+S.settings.vorlauf+' Tagen ('+soon.length+'):\n'+(soon.length?soon.map(line).join('\n'):'- keine')+'\n';
  const open=S.reports.filter(r=>r.status!=='erledigt');
  body+='\nOffene Schadensmeldungen ('+open.length+'):\n'+(open.length?open.map(r=>{const d=devById(r.geraetId);return '- '+(d?d.inv+' '+d.name:r.geraetId)+': '+r.titel+' ('+SEV[r.schwere]+', '+RST[r.status]+')';}).join('\n'):'- keine')+'\n';
  const subject='Fristen: '+over.length+' überfällig, '+soon.length+' bald fällig ('+fmt(today())+')';
  return{subject:subject,body:body};
}
async function saveFile(filename,data){
  try{
    let blob=data;
    if(!(data instanceof Blob)){
      const isCsv=/\.csv$/i.test(filename);
      blob=new Blob([isCsv?'\ufeff'+data:data],{type:isCsv?'text/csv;charset=utf-8':'application/octet-stream'});
    }
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=filename;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    toast('Datei gespeichert: '+filename);return true;
  }catch(e){toast(errText(e),'err');return false;}
}

/* ================= PDF-Etiketten ================= */
const FORMATS={
  'a4-70x37':{name:'A4-Bogen, 3 × 8 Etiketten à 70 × 37 mm',w:70,h:37,cols:3,rows:8,ox:0,oy:0,sheet:true},
  'a4-105x57':{name:'A4-Bogen, 2 × 5 Etiketten à 105 × 57 mm',w:105,h:57,cols:2,rows:5,ox:0,oy:6,sheet:true},
  'roll-62x29':{name:'Etikettendrucker, 62 × 29 mm (ein Etikett pro Seite)',w:62,h:29,cols:1,rows:1,ox:0,oy:0,sheet:false},
  'roll-50x30':{name:'Etikettendrucker, 50 × 30 mm (ein Etikett pro Seite)',w:50,h:30,cols:1,rows:1,ox:0,oy:0,sheet:false}
};
function labelPages(fmtKey,n){const f=FORMATS[fmtKey];return f.sheet?Math.max(1,Math.ceil(n/(f.cols*f.rows))):n;}
function drawLabel(doc,dev,x,y,w,h,frame){
  const m=qrMatrix(qrText(dev));if(!m)return;
  const pd=Math.min(3,h*0.085),qs=Math.min(h-2*pd,w*0.46),n=m.length,mod=qs/n;
  if(frame){doc.setDrawColor(185,185,185);doc.setLineWidth(0.1);doc.rect(x,y,w,h);}
  doc.setFillColor(0,0,0);
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(m[r][c])doc.rect(x+pd+c*mod,y+(h-qs)/2+r*mod,mod+0.04,mod+0.04,'F');
  const tx=x+pd+qs+Math.max(2,pd*0.9),tw=x+w-pd-tx;
  doc.setTextColor(0,0,0);doc.setFont('helvetica','bold');
  let fs=15;doc.setFontSize(fs);
  while(doc.getTextWidth(dev.inv)>tw&&fs>8){fs-=0.5;doc.setFontSize(fs);}
  let ty=y+pd+1;
  doc.text(dev.inv,tx,ty,{baseline:'top'});ty+=fs*0.3528*1.25+0.8;
  doc.setFont('helvetica','normal');
  const nfs=h>=34?9:7.5;doc.setFontSize(nfs);
  const maxLines=h>=34?3:2;
  let lines=doc.splitTextToSize(dev.name,tw);
  if(lines.length>maxLines){lines=lines.slice(0,maxLines);lines[maxLines-1]=lines[maxLines-1].replace(/.{0,2}$/,'…');}
  doc.text(lines,tx,ty,{baseline:'top'});ty+=lines.length*nfs*0.3528*1.2+0.8;
  doc.setFontSize(6.5);doc.setTextColor(95,95,95);
  const pl=placeName(dev.standort);
  const sub=doc.splitTextToSize((dev.kategorie||'')+(dev.standort?' · '+pl:''),tw);
  doc.text(sub.slice(0,1),tx,ty,{baseline:'top'});
  doc.setFontSize(6);doc.text(String(S.settings.firma||'').slice(0,40),tx,y+h-pd,{baseline:'bottom'});
}
function buildPdf(devs,fmtKey,frame){
  const lib=window.jspdf&&window.jspdf.jsPDF;
  if(!lib)throw new Error('Die PDF-Bibliothek konnte nicht geladen werden.');
  const f=FORMATS[fmtKey],land=f.w>f.h;
  const doc=new lib({orientation:f.sheet?'p':(land?'l':'p'),unit:'mm',format:f.sheet?[210,297]:[f.w,f.h]});
  const per=f.cols*f.rows;
  devs.forEach((dev,i)=>{
    if(f.sheet){
      const slot=i%per;
      if(i>0&&slot===0)doc.addPage([210,297],'p');
      drawLabel(doc,dev,f.ox+(slot%f.cols)*f.w,f.oy+Math.floor(slot/f.cols)*f.h,f.w,f.h,frame);
    }else{
      if(i>0)doc.addPage([f.w,f.h],land?'l':'p');
      drawLabel(doc,dev,0,0,f.w,f.h,false);
    }
  });
  return doc.output('blob');
}

/* ================= Foto & Scan ================= */
function loadBitmap(file){
  if(window.createImageBitmap)return createImageBitmap(file);
  return new Promise((res,rej)=>{const u=URL.createObjectURL(file),i=new Image();i.onload=()=>{res(i);};i.onerror=rej;i.src=u;});
}
async function photoToDataUrl(file){
  const bmp=await loadBitmap(file);
  for(const [max,q] of [[900,0.7],[700,0.55],[520,0.45]]){
    const k=Math.min(1,max/Math.max(bmp.width,bmp.height));
    const c=document.createElement('canvas');c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);
    c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);
    const url=c.toDataURL('image/jpeg',q);
    if(url.length<190000)return url;
  }
  throw new Error('Das Foto ist zu groß.');
}
async function decodeQrFromFile(file){
  if(typeof jsQR==='undefined')throw new Error('Der QR-Leser konnte nicht geladen werden.');
  const bmp=await loadBitmap(file);
  for(const max of [1400,900,600]){
    const k=Math.min(1,max/Math.max(bmp.width,bmp.height));
    const c=document.createElement('canvas');c.width=Math.max(1,Math.round(bmp.width*k));c.height=Math.max(1,Math.round(bmp.height*k));
    const ctx=c.getContext('2d');ctx.drawImage(bmp,0,0,c.width,c.height);
    const img=ctx.getImageData(0,0,c.width,c.height);
    const code=jsQR(img.data,c.width,c.height,{inversionAttempts:'attemptBoth'});
    if(code&&code.data)return code.data;
  }
  return null;
}
function invFromScan(text){
  let t=String(text||'').trim();
  const h=t.lastIndexOf('#');
  if(h>=0)t=t.slice(h+1);
  t=t.trim().toUpperCase();
  const m=t.match(/[A-Z]+-\d+/);
  return m?m[0]:null;
}

/* ================= Navigation ================= */
const NAV=[['start','Übersicht'],['inventar','Inventar'],['kalender','Kalender'],['meldungen','Meldungen'],['lager','Lagerplätze'],['etiketten','QR-Etiketten'],['scan','Scannen'],['einstellungen','Einstellungen']];
const activeNav=()=>S.view==='detail'?'inventar':S.view;
const overCount=()=>FR().filter(x=>x.state==='over').length;
const openRepCount=()=>S.reports.filter(r=>r.status!=='erledigt').length;
function navBadge(id){
  if(S.mode!=='ready')return '';
  if(id==='kalender'&&overCount())return '<span class="badge red">'+overCount()+'</span>';
  if(id==='meldungen'&&openRepCount())return '<span class="badge">'+openRepCount()+'</span>';
  return '';
}
function navHtml(){
  const a=activeNav();
  return NAV.map(n=>'<button type="button" data-act="nav" data-v="'+n[0]+'"'+(a===n[0]?' aria-current="page"':'')+'>'+esc(n[1])+navBadge(n[0])+'</button>').join('');
}
function tabHtml(){
  const a=activeNav(),moreActive=['lager','etiketten','einstellungen','mehr'].indexOf(a)>=0;
  const items=[['start','Start','start'],['inventar','Inventar','inventar'],['scan','Scannen','scan'],['kalender','Fristen','kalender'],['meldungen','Schäden','meldungen'],['mehr','Mehr','mehr']];
  return items.map(it=>{
    const id=it[0],cur=id==='mehr'?moreActive:a===id;
    const inner=id==='scan'?'<span class="disc">'+ic('scan')+'</span>':ic(it[2]);
    return '<button type="button"'+(id==='scan'?' class="scan"':'')+' data-act="nav" data-v="'+id+'"'+(cur?' aria-current="page"':'')+'>'+inner+'<span>'+esc(it[1])+'</span>'+navBadge(id)+'</button>';
  }).join('');
}

/* ================= Wiederverwendete Zeilen ================= */
function fristRow(x,acts){
  const d=x.dev;
  return '<div class="row fr">'
    +'<div class="s num">'+fmt(x.f.faellig)+'</div>'
    +'<div>'+fristPill(x)+'</div>'
    +'<div class="main"><a class="t" href="#'+esc(d.inv)+'" data-act="open" data-id="'+esc(d.id)+'">'+esc(d.inv)+' · '+esc(d.name)+'</a><div class="s">'+esc(x.f.art)+' · '+esc(placeName(d.standort))+'</div></div>'
    +(acts&&S.canWrite?'<div class="acts"><button type="button" class="btn sm" data-act="doneFrist" data-id="'+esc(d.id)+'" data-fid="'+esc(x.f.id)+'">'+ic('check','sm')+' Erledigt</button></div>':'<div></div>')
    +'</div>';
}
const sevRank={kritisch:3,mittel:2,gering:1};
function repSort(a,b){return (sevRank[b.schwere]||0)-(sevRank[a.schwere]||0)||(b.zeit||0)-(a.zeit||0);}
function repRow(r){
  const d=devById(r.geraetId);
  return '<button type="button" class="row rep" data-act="openReport" data-id="'+esc(r.id)+'">'
    +'<div><div class="t">'+esc(r.titel)+'</div><div class="s">'+esc(d?d.inv+' · '+d.name:r.geraetId)+' · '+fmt(r.datum)+' · '+esc(r.beispiel?'Beispiel':nameOf(r.melderId))+'</div></div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">'+sevPill(r.schwere)+repPill(r.status)+'</div></button>';
}

/* ================= Ansichten ================= */
function vLoading(){return '<div class="spin">Daten werden geladen …</div>';}
function vNoDb(){
  return '<div class="note bad"><div><strong>Der lokale Speicher ist nicht verfügbar.</strong><br>Bitte die App nicht im privaten Modus öffnen und Website-Daten im Browser zulassen.'+(S.err?'<br>'+esc(S.err):'')+'</div></div>';
}

function vStart(){
  const fr=FR(),over=fr.filter(x=>x.state==='over'),soon=fr.filter(x=>x.state==='soon');
  const open=S.reports.filter(r=>r.status!=='erledigt');
  const active=S.devices.filter(d=>d.status!=='aus').length,defect=S.devices.filter(d=>d.status==='defekt').length;
  const hasEx=S.devices.some(d=>d.beispiel);
  let h='<div class="band"><h1>Übersicht</h1><span class="sp"></span>'
    +(S.canWrite?'<button class="btn white" type="button" data-act="newReport">Schaden melden</button>':'')
    +'<button class="btn white" type="button" data-act="nav" data-v="scan">Gerät scannen</button>'
    +'<p class="sub">'+esc(S.settings.firma)+' · Stand '+fmt(today())+'</p></div>';
  if(hasEx)h+='<div class="note"><div>Die mit „Beispiel“ gekennzeichneten Einträge sind Musterdaten zum Ausprobieren. Unter <button class="btn link" type="button" data-act="nav" data-v="einstellungen">Einstellungen</button> lassen sie sich mit einem Klick entfernen.</div></div>';
  if(S.canWrite===false)h+='<div class="note warn"><div>Sie haben nur Leserechte. Zum Eintragen und Melden bitte um die Rolle „Mitwirkender“ bitten.</div></div>';
  if(!S.devices.length){
    return h+'<div class="card">'+emptyState('Noch keine Geräte erfasst','Legen Sie das erste Gerät, die erste Maschine oder das erste Fahrzeug an. Danach lassen sich Fristen, Lagerplätze und QR-Etiketten pflegen.',S.canWrite?'<button class="btn primary" type="button" data-act="newDevice">'+ic('plus','sm')+' Erstes Gerät anlegen</button> <button class="btn" type="button" data-act="loadExamples">Beispieldaten laden</button>':'')+'</div>';
  }
  h+='<div class="tiles">'
    +'<button type="button" class="tile over'+(over.length?' hot':'')+'" data-act="frNav" data-f="over"><span class="n">'+over.length+'</span><span class="l">Fristen überfällig</span></button>'
    +'<button type="button" class="tile soon'+(soon.length?' hot':'')+'" data-act="frNav" data-f="soon"><span class="n">'+soon.length+'</span><span class="l">fällig in '+S.settings.vorlauf+' Tagen</span></button>'
    +'<button type="button" class="tile" data-act="nav" data-v="meldungen"><span class="n">'+open.length+'</span><span class="l">offene Schadensmeldungen</span></button>'
    +'<button type="button" class="tile" data-act="nav" data-v="inventar"><span class="n">'+active+'</span><span class="l">aktive Geräte'+(defect?', davon '+defect+' defekt':'')+'</span></button>'
    +'</div>';
  h+='<div class="grid2"><section class="card"><div class="hd"><h2>Nächste Fristen</h2><span class="sp"></span><button class="btn sm" type="button" data-act="frNav" data-f="alle">Alle ansehen</button></div>'
    +(fr.length?fr.slice(0,8).map(x=>fristRow(x,true)).join(''):emptyState('Keine Fristen hinterlegt','Fristen werden am Gerät angelegt, zum Beispiel HU, UVV oder Wartung.'))
    +'</section>'
    +'<section class="card"><div class="hd"><h2>Offene Schadensmeldungen</h2><span class="sp"></span><button class="btn sm" type="button" data-act="nav" data-v="meldungen">Alle</button></div>'
    +(open.length?open.slice().sort(repSort).slice(0,5).map(repRow).join(''):emptyState('Keine offenen Meldungen','Es liegt aktuell kein gemeldeter Schaden vor.'))
    +'</section></div>';
  return h;
}

function filteredDevices(){
  const q=S.q.trim().toLowerCase();
  return S.devices.filter(d=>{
    if(S.fKat&&d.kategorie!==S.fKat)return false;
    if(S.fStatus&&d.status!==S.fStatus)return false;
    if(S.fPlace==='_none'){if(d.standort)return false;}else if(S.fPlace&&d.standort!==S.fPlace)return false;
    if(!q)return true;
    return [d.inv,d.name,d.typ,d.hersteller,d.modell,d.seriennr,d.kennzeichen,d.notiz,placeName(d.standort)].join(' ').toLowerCase().indexOf(q)>=0;
  }).sort((a,b)=>cmp(a.inv,b.inv));
}
function nextCell(d){
  if(d.status==='aus')return '<span class="muted">–</span>';
  const f=nextFrist(d);if(!f)return '<span class="muted">keine Frist</span>';
  const st=fristState(f);
  return '<div>'+fristPill(st)+'</div><div class="s">'+esc(f.art)+' · '+fmt(f.faellig)+'</div>';
}
function invListHtml(){
  const list=filteredDevices();
  let h='';
  if(!S.devices.length)return h+'<div class="card">'+emptyState('Noch keine Geräte erfasst','Legen Sie das erste Gerät an.',S.canWrite?'<button class="btn primary" type="button" data-act="newDevice">'+ic('plus','sm')+' Neues Gerät</button>':'')+'</div>';
  if(!list.length)return h+'<div class="card">'+emptyState('Nichts gefunden','Zu dieser Suche und diesen Filtern gibt es kein Gerät.','<button class="btn" type="button" data-act="resetFilter">Filter zurücksetzen</button>')+'</div>';
  h+='<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nr.</th><th>Bezeichnung</th><th>Kategorie</th><th>Lagerplatz</th><th>Status</th><th>Nächste Frist</th></tr></thead><tbody>';
  for(const d of list){
    h+='<tr tabindex="0" data-act="open" data-id="'+esc(d.id)+'"><td class="inv">'+esc(d.inv)+'</td>'
      +'<td><div class="t" style="font-weight:600;color:var(--fg-strong)">'+esc(d.name)+exTag(d)+'</div><div class="s muted" style="font-size:13px">'+esc([d.typ,d.hersteller,d.modell,d.kennzeichen].filter(Boolean).join(' · '))+'</div></td>'
      +'<td>'+esc(d.kategorie||'')+'</td><td>'+esc(placeName(d.standort))+'</td><td>'+statusPill(d.status)+'</td><td>'+nextCell(d)+'</td></tr>';
  }
  h+='</tbody></table></div><div class="cards">';
  for(const d of list){
    h+='<button type="button" class="dcard" data-act="open" data-id="'+esc(d.id)+'"><div class="top2"><span class="inv">'+esc(d.inv)+'</span>'+statusPill(d.status)+'</div>'
      +'<div class="t" style="font-weight:600;color:var(--fg-strong)">'+esc(d.name)+exTag(d)+'</div>'
      +'<div class="meta"><span>'+esc(d.kategorie||'')+'</span><span>'+esc(placeName(d.standort))+'</span></div>'
      +'<div>'+nextCell(d)+'</div></button>';
  }
  h+='</div></div><p class="muted" style="margin-top:10px;font-size:13px">'+list.length+' von '+S.devices.length+' Einträgen</p>';
  return h;
}
function vInventar(){
  let h='<div class="page-head"><h1>Inventar</h1><span class="sp"></span>'
    +'<button class="btn" type="button" data-act="exportInv">CSV exportieren</button>'
    +(S.canWrite?'<button class="btn primary" type="button" data-act="newDevice">'+ic('plus','sm')+' Neues Gerät</button>':'')+'</div>';
  h+='<div class="toolbar">'
    +'<div class="field"><label class="sr" for="q">Suchen</label><input id="q" type="search" placeholder="Suchen: Nummer, Name, Hersteller, Kennzeichen …" value="'+esc(S.q)+'" data-bind="q" autocomplete="off"></div>'
    +'<div class="field"><label class="sr" for="fKat">Kategorie</label><select id="fKat" data-bind="fKat">'+options(katOpts(),S.fKat,'Alle Kategorien')+'</select></div>'
    +'<div class="field"><label class="sr" for="fStatus">Status</label><select id="fStatus" data-bind="fStatus">'+options(statusOpts(),S.fStatus,'Jeder Status')+'</select></div>'
    +'<div class="field"><label class="sr" for="fPlace">Lagerplatz</label><select id="fPlace" data-bind="fPlace">'+options(placeOpts().concat([['_none','Ohne Lagerplatz']]),S.fPlace,'Alle Lagerplätze')+'</select></div>'
    +'</div>';
  h+='<div id="invList">'+invListHtml()+'</div>';
  return h;
}

function vDetail(){
  const d=devById(S.detail);
  if(!d)return '<div class="card">'+emptyState('Gerät nicht gefunden','Das Gerät wurde gelöscht oder die Nummer stimmt nicht.','<button class="btn" type="button" data-act="nav" data-v="inventar">Zum Inventar</button>')+'</div>';
  const w=S.canWrite;
  const reps=S.reports.filter(r=>r.geraetId===d.id).sort(repSort);
  const fr=(d.fristen||[]).filter(f=>isDate(f.faellig)).sort((a,b)=>a.faellig<b.faellig?-1:1);
  let h='<button type="button" class="btn link back" data-act="nav" data-v="inventar">'+ic('back','sm')+' Zurück zum Inventar</button>';
  h+='<div class="page-head"><div><div class="inv-big">'+esc(d.inv)+'</div><h1 style="margin-top:4px">'+esc(d.name)+exTag(d)+'</h1></div><span class="sp"></span>'+statusPill(d.status)
    +(w?'<button class="btn primary" type="button" data-act="newReport" data-id="'+esc(d.id)+'">Schaden melden</button><button class="btn" type="button" data-act="editDevice" data-id="'+esc(d.id)+'">'+ic('edit','sm')+' Bearbeiten</button>':'')+'</div>';
  h+='<div class="grid2"><div class="stack">';
  h+='<section class="card"><div class="hd"><h2>Stammdaten</h2></div><div class="bd"><dl class="dl">'
    +'<dt>Kategorie</dt><dd>'+esc(d.kategorie||'–')+'</dd>'
    +'<dt>Art</dt><dd>'+esc(d.typ||'–')+'</dd>'
    +'<dt>Hersteller</dt><dd>'+esc([d.hersteller,d.modell].filter(Boolean).join(' ')||'–')+'</dd>'
    +'<dt>Seriennummer</dt><dd>'+esc(d.seriennr||'–')+'</dd>'
    +'<dt>Baujahr</dt><dd>'+esc(d.baujahr||'–')+'</dd>'
    +(d.kategorie==='Fahrzeug'||d.kennzeichen?'<dt>Kennzeichen</dt><dd>'+esc(d.kennzeichen||'–')+'</dd>':'')
    +'<dt>Notiz</dt><dd>'+esc(d.notiz||'–')+'</dd></dl></div></section>';
  h+='<section class="card"><div class="hd"><h2>Standort und Status</h2></div><div class="bd form-grid two">'
    +'<div class="field"><label for="dPlace">Lagerplatz</label><select id="dPlace" data-change="setPlace" data-id="'+esc(d.id)+'"'+(w?'':' disabled')+'>'+options(placeOpts(),d.standort||'','Ohne Lagerplatz')+'</select></div>'
    +'<div class="field"><label for="dStatus">Status</label><select id="dStatus" data-change="setStatus" data-id="'+esc(d.id)+'"'+(w?'':' disabled')+'>'+options(statusOpts(),d.status)+'</select></div>'
    +'</div></section>';
  h+='<section class="card"><div class="hd"><h2>Schadensmeldungen</h2><span class="sp"></span>'+(w?'<button class="btn sm" type="button" data-act="newReport" data-id="'+esc(d.id)+'">'+ic('plus','sm')+' Melden</button>':'')+'</div>'
    +(reps.length?reps.map(repRow).join(''):'<div class="empty" style="padding:22px">Keine Meldungen zu diesem Gerät.</div>')+'</section>';
  h+='</div><div class="stack">';
  h+='<section class="card"><div class="hd"><h2>QR-Etikett</h2></div><div class="bd qrbox">'+qrSvg(qrText(d),150)
    +'<div class="stack" style="gap:10px"><div><div class="inv-big" style="font-size:20px">'+esc(d.inv)+'</div><div class="s muted">Scan öffnet dieses Gerät.</div></div>'
    +'<button class="btn" type="button" data-act="labelFor" data-id="'+esc(d.id)+'">Etikett drucken</button></div></div></section>';
  h+='<section class="card"><div class="hd"><h2>Fristen und Prüfungen</h2><span class="sp"></span>'+(w?'<button class="btn sm" type="button" data-act="addFrist" data-id="'+esc(d.id)+'">'+ic('plus','sm')+' Frist</button>':'')+'</div>';
  if(!fr.length)h+='<div class="empty" style="padding:22px">Noch keine Frist hinterlegt.</div>';
  for(const f of fr){
    const st=fristState(f);
    h+='<div class="row fr" style="grid-template-columns:minmax(0,1fr) auto"><div><div class="t">'+esc(f.art)+'</div><div class="s">fällig '+fmt(f.faellig)+' · '+(f.intervall>0?'alle '+f.intervall+' Monate':'einmalig')+(f.letzte?' · zuletzt '+fmt(f.letzte):'')+'</div></div><div>'+fristPill(st)+'</div>'
      +(w?'<div class="acts"><button type="button" class="btn sm" data-act="doneFrist" data-id="'+esc(d.id)+'" data-fid="'+esc(f.id)+'">'+ic('check','sm')+' Erledigt</button><button type="button" class="btn sm" data-act="editFrist" data-id="'+esc(d.id)+'" data-fid="'+esc(f.id)+'">Bearbeiten</button></div>':'')+'</div>';
  }
  h+='</section>';
  const vl=(d.verlauf||[]).slice(0,12);
  h+='<section class="card"><div class="hd"><h2>Verlauf</h2></div>'+(vl.length?'<ul class="hist">'+vl.map(v=>'<li><span class="num muted">'+fmt(v.d)+'</span><span>'+esc(v.t)+(v.u?' <span class="muted">· '+esc(nameOf(v.u))+'</span>':'')+'</span></li>').join('')+'</ul>':'<div class="empty" style="padding:22px">Noch keine Einträge.</div>')+'</section>';
  h+='</div></div>';
  return h;
}

function vKalender(){
  const fr=FR(),w=S.canWrite;
  let h='<div class="page-head"><h1>Fristenkalender</h1><span class="sp"></span><div class="seg" role="group" aria-label="Darstellung">'
    +'<button type="button" data-act="calMode" data-m="monat" aria-pressed="'+(S.calMode==='monat')+'">Monat</button>'
    +'<button type="button" data-act="calMode" data-m="liste" aria-pressed="'+(S.calMode==='liste')+'">Liste</button></div></div>';
  if(!fr.length)return h+'<div class="card">'+emptyState('Keine Termine','Sobald am Gerät Fristen hinterlegt sind, erscheinen sie hier.')+'</div>';
  if(S.calMode==='liste'){
    const F=[['alle','Alle'],['over','Überfällig'],['soon','Bald fällig'],['ok','Später']];
    h+='<div class="chips" style="margin-bottom:14px">'+F.map(f=>'<button type="button" class="chip" data-act="frNav" data-f="'+f[0]+'" aria-pressed="'+(S.frFilter===f[0])+'">'+f[1]+'</button>').join('')+'</div>';
    const list=fr.filter(x=>S.frFilter==='alle'||x.state===S.frFilter);
    h+='<div class="card">'+(list.length?list.map(x=>fristRow(x,true)).join(''):emptyState('Nichts in dieser Auswahl','Hier gibt es aktuell keine Fristen.'))+'</div>';
    return h;
  }
  const y=S.cal.y,m=S.cal.m,first=new Date(y,m,1),off=(first.getDay()+6)%7,dim=new Date(y,m+1,0).getDate();
  const cells=Math.ceil((off+dim)/7)*7,by={};
  fr.forEach(x=>{(by[x.f.faellig]=by[x.f.faellig]||[]).push(x);});
  const t=today();
  h+='<div class="cal-head"><button type="button" class="btn sm" data-act="calNav" data-d="-1" aria-label="Vorheriger Monat">'+ic('prev','sm')+'</button><h2>'+MONTHS[m]+' '+y+'</h2>'
    +'<button type="button" class="btn sm" data-act="calNav" data-d="1" aria-label="Nächster Monat">'+ic('next','sm')+'</button><span class="sp"></span><button type="button" class="btn sm" data-act="calToday">Heute</button></div>';
  h+='<div class="cal">'+WD.map(x=>'<div class="wd">'+x+'</div>').join('');
  for(let i=0;i<cells;i++){
    const dt=new Date(y,m,1-off+i),iso=isoOf(dt),ev=by[iso]||[];
    h+='<button type="button" class="day'+(dt.getMonth()===m?'':' out')+(iso===t?' today':'')+(S.calSel===iso?' sel':'')+'" data-act="calDay" data-d="'+iso+'" aria-label="'+dt.getDate()+'. '+MONTHS[dt.getMonth()]+(ev.length?', '+ev.length+(ev.length===1?' Termin':' Termine'):'')+'">'
      +'<span class="dn">'+dt.getDate()+'</span><span class="evs">'
      +ev.slice(0,3).map(x=>'<span class="ev '+x.state+'"><span class="dot"></span><span class="tx">'+esc(x.dev.inv)+' '+esc(x.f.art)+'</span></span>').join('')
      +(ev.length>3?'<span class="more">+'+(ev.length-3)+'</span>':'')+'</span></button>';
  }
  h+='</div>';
  let list,title;
  if(S.calSel){list=fr.filter(x=>x.f.faellig===S.calSel);title='Termine am '+fmt(S.calSel);}
  else{const pre=y+'-'+pad(m+1);list=fr.filter(x=>x.f.faellig.slice(0,7)===pre);title='Termine im '+MONTHS[m]+' '+y;}
  h+='<section class="card" style="margin-top:16px"><div class="hd"><h2>'+esc(title)+'</h2><span class="sp"></span>'+(S.calSel?'<button type="button" class="btn sm" data-act="calDay" data-d="">Ganzer Monat</button>':'')+'</div>'
    +(list.length?list.map(x=>fristRow(x,true)).join(''):'<div class="empty" style="padding:24px">Keine Termine in diesem Zeitraum.</div>')+'</section>';
  return h;
}

function vMeldungen(){
  const F=[['aktiv','Aktiv'],['offen','Offen'],['bearbeitung','In Bearbeitung'],['erledigt','Erledigt'],['alle','Alle']];
  const list=S.reports.filter(r=>S.repFilter==='alle'||(S.repFilter==='aktiv'?r.status!=='erledigt':r.status===S.repFilter)).sort(repSort);
  let h='<div class="page-head"><h1>Schadensmeldungen</h1><span class="sp"></span>'+(S.canWrite?'<button class="btn primary" type="button" data-act="newReport">'+ic('plus','sm')+' Schaden melden</button>':'')+'</div>';
  h+='<div class="chips" style="margin-bottom:14px">'+F.map(f=>'<button type="button" class="chip" data-act="repFilter" data-f="'+f[0]+'" aria-pressed="'+(S.repFilter===f[0])+'">'+f[1]+'</button>').join('')+'</div>';
  h+='<div class="card">'+(list.length?list.map(repRow).join(''):emptyState('Keine Meldungen in dieser Auswahl','Ein Schaden lässt sich direkt am Gerät oder hier melden.',S.canWrite?'<button class="btn primary" type="button" data-act="newReport">Schaden melden</button>':''))+'</div>';
  return h;
}

function vLager(){
  const cnt=id=>S.devices.filter(d=>(d.standort||'')===id).length;
  let h='<div class="page-head"><h1>Lagerplätze</h1><span class="sp"></span>'+(S.canWrite?'<button class="btn primary" type="button" data-act="newPlace">'+ic('plus','sm')+' Neuer Lagerplatz</button>':'')+'</div>';
  const places=S.places.slice().sort((a,b)=>cmp(a.name,b.name));
  let rows='';
  for(const p of places){
    rows+='<div class="row two"><div><div class="t">'+esc(p.name)+exTag(p)+'</div><div class="s">'+esc(p.beschreibung||'')+(p.beschreibung?' · ':'')+cnt(p.id)+(cnt(p.id)===1?' Gerät':' Geräte')+'</div></div><div class="acts">'
      +'<button type="button" class="btn sm" data-act="showPlace" data-id="'+esc(p.id)+'">Geräte anzeigen</button>'
      +(S.canWrite?'<button type="button" class="btn sm" data-act="editPlace" data-id="'+esc(p.id)+'">Bearbeiten</button>':'')+'</div></div>';
  }
  const none=cnt('');
  if(none)rows+='<div class="row two"><div><div class="t">Ohne Lagerplatz</div><div class="s">'+none+(none===1?' Gerät':' Geräte')+' noch keinem Platz zugeordnet</div></div><div class="acts"><button type="button" class="btn sm" data-act="showPlace" data-id="_none">Geräte anzeigen</button></div></div>';
  h+='<div class="card">'+(rows||emptyState('Noch keine Lagerplätze','Legen Sie Plätze wie Halle, Werkstatt, Container oder Fahrzeughalle an und ordnen Sie Geräte zu.',S.canWrite?'<button class="btn primary" type="button" data-act="newPlace">Lagerplatz anlegen</button>':''))+'</div>';
  return h;
}

function labelList(){
  const q=S.lq.trim().toLowerCase();
  return S.devices.filter(d=>!q||[d.inv,d.name,d.typ,d.kennzeichen,placeName(d.standort)].join(' ').toLowerCase().indexOf(q)>=0).sort((a,b)=>cmp(a.inv,b.inv));
}
function pickHtml(){
  const list=labelList();
  return list.length?list.map(d=>'<label><input type="checkbox" data-lsel="'+esc(d.id)+'"'+(S.labelSel.has(d.id)?' checked':'')+'><span><strong>'+esc(d.inv)+'</strong> · '+esc(d.name)+'<br><span class="muted" style="font-size:13px">'+esc(placeName(d.standort))+'</span></span></label>').join(''):'<div class="empty" style="padding:20px">Keine Geräte.</div>';
}
function vEtiketten(){
  const sel=S.devices.filter(d=>S.labelSel.has(d.id)).sort((a,b)=>cmp(a.inv,b.inv));
  const f=FORMATS[S.labelFmt];
  let h='<div class="page-head"><h1>QR-Etiketten</h1><p class="sub">Auswählen, Format wählen, als PDF speichern und auf Etikettenbogen oder Etikettendrucker ausgeben.</p></div>';
  if(!baseUrlEff())h+='<div class="note warn"><div>Es ist noch keine Seitenadresse hinterlegt. Die QR-Codes enthalten dann nur die Nummer und öffnen mit der Handy-Kamera kein Gerät. Die Adresse steht unter <button class="btn link" type="button" data-act="nav" data-v="einstellungen">Einstellungen</button>.</div></div>';
  h+='<div class="grid2 even"><section class="card"><div class="hd"><h2>1 · Geräte auswählen</h2><span class="sp"></span><button type="button" class="btn sm" data-act="labelAll">Alle angezeigten</button><button type="button" class="btn sm" data-act="labelNone">Keine</button></div>'
    +'<div class="bd stack" style="gap:12px"><div class="field"><label class="sr" for="lq">Geräte suchen</label><input id="lq" type="search" placeholder="Suchen …" value="'+esc(S.lq)+'" data-bind="lq" autocomplete="off"></div>'
    +'<div class="pick" id="pickList">'+pickHtml()+'</div></div></section>';
  h+='<section class="card"><div class="hd"><h2>2 · Format und PDF</h2></div><div class="bd stack">'
    +'<div class="field"><label for="labelFmt">Etikettenformat</label><select id="labelFmt" data-bind="labelFmt">'+options(Object.keys(FORMATS).map(k=>[k,FORMATS[k].name]),S.labelFmt)+'</select></div>'
    +(f.sheet?'<label class="check"><input type="checkbox" id="labelFrame" data-bindc="labelFrame"'+(S.labelFrame?' checked':'')+'> Schnittrahmen zeichnen (für Ausdruck auf Normalpapier)</label>':'')
    +'<p class="muted">'+sel.length+(sel.length===1?' Etikett':' Etiketten')+' ausgewählt'+(sel.length?' · '+labelPages(S.labelFmt,sel.length)+(labelPages(S.labelFmt,sel.length)===1?' Seite':' Seiten'):'')+'</p>'
    +'<button type="button" class="btn primary" data-act="makePdf"'+(sel.length?'':' disabled')+'>PDF mit Etiketten speichern</button>'
    +'<p class="muted" style="font-size:13px">Die Seite kann nicht selbst drucken. Das gespeicherte PDF in Originalgröße öffnen und drucken, ohne „An Seite anpassen“.</p></div></section></div>';
  if(sel.length){
    h+='<section class="card" style="margin-top:16px"><div class="hd"><h2>Vorschau</h2></div><div class="bd lab-grid">'
      +sel.slice(0,8).map(d=>'<div class="lab">'+qrSvg(qrText(d),100)+'<div class="lt"><b>'+esc(d.inv)+'</b>'+esc(d.name)+'<div class="g">'+esc(d.kategorie||'')+(d.standort?' · '+esc(placeName(d.standort)):'')+'</div></div></div>').join('')
      +'</div>'+(sel.length>8?'<div class="bd muted" style="padding-top:0">… und '+(sel.length-8)+' weitere im PDF</div>':'')+'</section>';
  }
  return h;
}

function vScan(){
  let h='<div class="page-head"><h1>Gerät scannen</h1></div><div class="grid2 even"><section class="card"><div class="hd"><h2>Schnell: Kamera-App</h2></div><div class="bd stack"><p>Die normale Kamera-App des Handys auf den QR-Code am Gerät richten und den Link antippen. Das Gerät öffnet sich direkt, dort lässt sich ein Schaden melden oder eine Prüfung abhaken.</p></div></section>'
    +'<section class="card"><div class="hd"><h2>QR-Code fotografieren</h2></div><div class="bd stack">'
    +'<p>Alternativ hier ein Foto des Etiketts aufnehmen. Der Code wird ausgelesen und das Gerät geöffnet.</p>'
    +'<label class="btn primary" for="scanFile" style="cursor:pointer">'+ic('scan','sm')+' Foto aufnehmen oder wählen</label>'
    +'<input class="sr" type="file" id="scanFile" accept="image/*" capture="environment">'
    +(S.scanMsg?'<div class="note '+(S.scanMsg.err?'bad':'')+'" style="margin:0"><div>'+esc(S.scanMsg.text)+'</div></div>':'')
    +'</div></section></div>'
    +'<section class="card" style="margin-top:16px"><div class="hd"><h2>Nummer eingeben</h2></div><div class="bd"><form id="manualForm" class="form-grid two" style="align-items:end"><div class="field"><label for="manualInv">Inventarnummer</label><input id="manualInv" type="text" placeholder="z. B. M-0001" autocomplete="off" autocapitalize="characters"></div><div><button class="btn primary" type="submit">Gerät öffnen</button></div></form></div></section>';
  return h;
}

function vEinstellungen(){
  const s=S.settings,rp=reportParts(),hasEx=S.devices.some(d=>d.beispiel||false)||S.places.some(p=>p.beispiel)||S.reports.some(r=>r.beispiel);
  const arten=(s.fristenarten||[]).map(a=>a.name+' | '+a.monate).join('\n');
  let h='<div class="page-head"><h1>Einstellungen</h1></div><div class="stack">';
  h+='<section class="card"><div class="hd"><h2>Betrieb und Erinnerungen</h2></div><div class="bd"><form id="setForm" class="form-grid two">'
    +'<div class="field"><label for="s_firma">Firmenname (auf Etiketten und Berichten)</label><input id="s_firma" type="text" value="'+esc(s.firma)+'"></div>'
    +'<div class="field"><label for="s_vorlauf">Vorwarnzeit in Tagen</label><input id="s_vorlauf" type="number" min="1" max="365" value="'+esc(s.vorlauf)+'"><span class="hint">Fristen innerhalb dieser Zeit gelten als „bald fällig“.</span></div>'
    +'<div class="field full"><label for="s_base">Adresse dieser Seite (für QR-Codes)</label><input id="s_base" type="url" value="'+esc(s.baseUrl)+'" placeholder="'+esc(baseUrlEff()||'https://…')+'"><span class="hint">Leer lassen = Adresse, unter der die App gerade geöffnet ist. Der QR-Code enthält diese Adresse plus die Gerätenummer. Bei geänderter Adresse müssen Etiketten neu gedruckt werden.</span></div>'
    +'<div class="field full"><label for="s_name">Ihr Name auf diesem Gerät (für Verlauf und Schadensmeldungen)</label><input id="s_name" type="text" value="'+esc(myName())+'" placeholder="z. B. Max Mustermann" autocomplete="name"></div>'
    +'<div class="field full"><label for="s_empf">E-Mail-Empfänger für den Fristenbericht (eine Adresse pro Zeile)</label><textarea id="s_empf" style="min-height:70px" placeholder="werkstatt@beispiel.de">'+esc((s.empfaenger||[]).join('\n'))+'</textarea></div>'
    +'<div class="field full"><label for="s_arten">Fristenarten mit Standardintervall (Name | Monate)</label><textarea id="s_arten" style="min-height:150px">'+esc(arten)+'</textarea><span class="hint">Die Intervalle sind Vorschläge. Maßgeblich sind Herstellerangaben, UVV und DGUV-Vorgaben für das jeweilige Gerät.</span></div>'
    +'<div class="full"><button class="btn primary" type="submit"'+(S.canWrite?'':' disabled')+'>Einstellungen speichern</button></div></form></div></section>';
  h+='<section class="card"><div class="hd"><h2>Fristenbericht per E-Mail</h2></div><div class="bd stack">'
    +'<div class="note warn" style="margin:0"><div>Diese Seite verschickt selbst keine E-Mails. Der Bericht unten ist fertig formuliert und lässt sich kopieren oder im Mail-Programm öffnen. Überfällige Fristen zeigt außerdem das rote Zeichen im Menü.</div></div>'
    +'<div class="field"><label for="mailText">Betreff und Text</label><textarea id="mailText" class="mono" readonly>Betreff: '+esc(rp.subject)+'\n\n'+esc(rp.body)+'</textarea></div>'
    +(s.empfaenger&&s.empfaenger.length?'<p class="muted">Empfänger: <span style="user-select:all">'+esc(s.empfaenger.join(', '))+'</span></p>':'<p class="muted">Noch kein Empfänger eingetragen.</p>')
    +'<div class="chips"><button type="button" class="btn" data-act="copyReport">Bericht kopieren</button>'
    +'<a class="btn" target="_blank" rel="noopener" href="mailto:'+esc((s.empfaenger||[]).join(','))+'?subject='+encodeURIComponent(rp.subject)+'&amp;body='+encodeURIComponent(rp.body.slice(0,1400))+'">Im Mail-Programm öffnen</a></div>'
    +'<p class="muted" style="font-size:13px">Der Mail-Link funktioniert nicht auf jedem Gerät. Kopieren geht immer.</p></div></section>';
  h+='<section class="card"><div class="hd"><h2>Daten</h2></div><div class="bd stack"><div class="chips"><button type="button" class="btn" data-act="exportInv">Inventar als CSV</button><button type="button" class="btn" data-act="exportFr">Fristen als CSV</button></div>'
    +(hasEx&&S.canWrite?'<div><button type="button" class="btn danger" data-act="delExamples">Beispieldaten löschen</button><p class="muted" style="font-size:13px;margin-top:6px">Entfernt nur die mit „Beispiel“ gekennzeichneten Geräte, Lagerplätze und Meldungen.</p></div>':'')
    +'</div></section>';
  h+='<section class="card"><div class="hd"><h2>Sicherung und Abgleich</h2></div><div class="bd stack">'
    +'<p class="muted" style="margin:0">Alle Daten liegen nur im Browser dieses Geräts. Um dieselben Daten auf einem anderen Gerät zu nutzen oder zu sichern, exportieren Sie hier eine Sicherungsdatei und importieren Sie sie dort.</p>'
    +'<div class="chips"><button type="button" class="btn primary" data-act="exportJson">Sicherung speichern (JSON)</button><button type="button" class="btn" data-act="importJson">Sicherung einlesen …</button>'
    +(hasEx?'':'<button type="button" class="btn" data-act="loadExamples">Beispieldaten laden</button>')+'</div>'
    +'<input type="file" id="importFile" accept="application/json,.json" hidden>'
    +'<p class="muted" style="font-size:13px;margin:0">Browserdaten können gelöscht werden (Verlauf leeren, Speicherplatz knapp). Bitte regelmäßig eine Sicherung speichern.</p></div></section>';
  h+='</div>';
  return h;
}

function vMehr(){
  const it=[['lager','lager','Lagerplätze','Plätze verwalten, Geräte zuordnen'],['etiketten','etiketten','QR-Etiketten','Etiketten als PDF erzeugen'],['einstellungen','einstellungen','Einstellungen','Vorwarnzeit, Fristenarten, Bericht']];
  return '<div class="page-head"><h1>Mehr</h1></div><div class="link-cards">'+it.map(x=>'<button type="button" data-act="nav" data-v="'+x[0]+'">'+ic(x[1])+'<span><b>'+x[2]+'</b><span class="s">'+x[3]+'</span></span></button>').join('')+'</div>';
}

const VIEWS={start:vStart,inventar:vInventar,detail:vDetail,kalender:vKalender,meldungen:vMeldungen,lager:vLager,etiketten:vEtiketten,scan:vScan,einstellungen:vEinstellungen,mehr:vMehr};

function render(){
  S._fr=null;
  const act=document.activeElement,view=$('#view');
  const keep=act&&act.id&&view.contains(act)&&act.selectionStart!=null?{id:act.id,s:act.selectionStart,e:act.selectionEnd}:null;
  $('#hdrNav').innerHTML=navHtml();$('#tabbar').innerHTML=tabHtml();
  let html;
  if(S.mode==='loading')html=vLoading();
  else if(S.mode==='nodb')html=vNoDb();
  else{try{html=VIEWS[S.view]();}catch(e){console.error(e);html='<div class="note bad"><div>Diese Ansicht konnte nicht aufgebaut werden: '+esc(e.message)+'</div></div>';}}
  view.innerHTML=html;
  if(keep){const n=document.getElementById(keep.id);if(n){n.focus();try{n.setSelectionRange(keep.s,keep.e);}catch(_){}}}
}
function go(v,detail){
  S.view=v;S.detail=detail||null;
  window.scrollTo(0,0);render();
}

/* ================= Dialoge ================= */
let lastFocus=null;
function closeModal(){
  const m=$('#modal');if(!m.innerHTML)return;
  m.innerHTML='';
  if(lastFocus&&lastFocus.focus){try{lastFocus.focus();}catch(_){}}
  lastFocus=null;
}
function openModal(o){
  if(!$('#modal').innerHTML)lastFocus=document.activeElement;
  const m=$('#modal');
  m.innerHTML='<div class="scrim" data-act="closeModal"></div><form class="sheet'+(o.wide?' wide':'')+'" id="mform" role="dialog" aria-modal="true" aria-labelledby="mtitle" novalidate>'
    +'<div class="sh"><h2 id="mtitle">'+esc(o.title)+'</h2><button type="button" class="btn sm" data-act="closeModal" aria-label="Schließen">'+ic('x','sm')+'</button></div>'
    +'<div class="sb">'+o.body+'</div>'
    +'<div class="sf">'+(o.extra||'')+'<span class="sp"></span><button type="button" class="btn" data-act="closeModal">'+esc(o.cancelLabel||'Abbrechen')+'</button>'
    +(o.submit===null?'':'<button type="submit" class="btn primary" id="mSubmit">'+esc(o.submit||'Speichern')+'</button>')+'</div></form>';
  const form=$('#mform');
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(o.submit===null)return;
    if(!form.checkValidity()){form.reportValidity();return;}
    const btn=$('#mSubmit');if(btn)btn.disabled=true;
    let ok=true;
    try{ok=await o.onSubmit(new FormData(form),form);}catch(err){console.error(err);toast(errText(err),'err');ok=false;}
    if(ok===false){const b=$('#mSubmit');if(b)b.disabled=false;return;}
    closeModal();
  });
  if(o.onInput)form.addEventListener('input',e=>o.onInput(form,e));
  if(o.noFocus!==true){const f=form.querySelector('input:not([type=hidden]):not([type=file]),select,textarea');if(f)f.focus();}
  return form;
}
const gv=(fd,k)=>String(fd.get(k)==null?'':fd.get(k)).trim();
function inp(label,name,val,extra,cls,type){
  return '<div class="field'+(cls?' '+cls:'')+'"><label for="f_'+name+'">'+esc(label)+'</label><input id="f_'+name+'" name="'+name+'" type="'+(type||'text')+'" value="'+esc(val==null?'':val)+'" '+(extra||'')+'></div>';
}
function arm(t,label){
  if(!t.dataset.armed){t.dataset.armed='1';t.classList.add('armed');t.textContent=label||'Wirklich löschen?';return false;}
  return true;
}

/* ---- Gerät ---- */
function deviceForm(ex){
  const d=ex||{kategorie:'Gerät',status:'ok'};
  const body='<div class="form-grid two">'
    +inp('Bezeichnung *','name',d.name,'required placeholder="z. B. Motorsäge Stihl MS 261"','full')
    +'<div class="field"><label for="f_kategorie">Kategorie</label><select id="f_kategorie" name="kategorie"'+(ex?' disabled':'')+'>'+options(katOpts(),d.kategorie)+'</select>'+(ex?'<span class="hint">Teil der Inventarnummer, daher nicht änderbar.</span>':'')+'</div>'
    +inp('Art','typ',d.typ,'placeholder="z. B. Rasenmäher, Bagger, Transporter"')
    +inp('Hersteller','hersteller',d.hersteller)
    +inp('Modell','modell',d.modell)
    +inp('Seriennummer','seriennr',d.seriennr)
    +inp('Baujahr','baujahr',d.baujahr,'min="1950" max="'+(new Date().getFullYear()+1)+'" inputmode="numeric"',null,'number')
    +inp('Kennzeichen (Fahrzeuge)','kennzeichen',d.kennzeichen,'autocapitalize="characters"')
    +'<div class="field"><label for="f_standort">Lagerplatz</label><select id="f_standort" name="standort">'+options(placeOpts(),d.standort||'','Ohne Lagerplatz')+'</select></div>'
    +'<div class="field"><label for="f_status">Status</label><select id="f_status" name="status">'+options(statusOpts(),d.status)+'</select></div>'
    +'<div class="field full"><label for="f_notiz">Notiz</label><textarea id="f_notiz" name="notiz">'+esc(d.notiz||'')+'</textarea></div></div>';
  openModal({title:ex?ex.inv+' bearbeiten':'Neues Gerät',body:body,wide:true,
    extra:ex?'<button type="button" class="btn danger" data-act="delDevice" data-id="'+esc(ex.id)+'">Löschen</button>':'',
    onSubmit:async fd=>{
      if(!needWrite())return false;
      const kat=ex?ex.kategorie:gv(fd,'kategorie');
      const dev=ex?clone(ex):{kategorie:kat,fristen:[],verlauf:[],created:Date.now()};
      dev.name=gv(fd,'name');dev.typ=gv(fd,'typ');dev.hersteller=gv(fd,'hersteller');dev.modell=gv(fd,'modell');
      dev.seriennr=gv(fd,'seriennr');dev.baujahr=gv(fd,'baujahr');dev.kennzeichen=gv(fd,'kennzeichen');
      dev.standort=gv(fd,'standort');dev.notiz=gv(fd,'notiz');
      const st=gv(fd,'status');
      if(ex){
        if(ex.status!==st)dev.verlauf=logEntry(ex,'Status: '+STATUS[ex.status]+' → '+STATUS[st]);
        if((ex.standort||'')!==dev.standort)dev.verlauf=logEntry({verlauf:dev.verlauf},'Lagerplatz: '+placeName(ex.standort)+' → '+placeName(dev.standort));
        dev.status=st;
        await db.doc('geraete/'+ex.id).set(toDoc(dev));
        toast('Gerät gespeichert.');
      }else{
        dev.status=st;dev.verlauf=logEntry(dev,'Angelegt');
        const prefix=KAT[kat];let n=nextNumber(prefix),done=null;
        for(let t=0;t<6&&!done;t++){
          const inv=prefix+'-'+String(n).padStart(4,'0'),ref=db.doc('geraete/'+inv);
          const snap=await ref.get();
          if(!snap.exists){dev.inv=inv;await ref.set(toDoc(dev));done=inv;}else n++;
        }
        if(!done)throw new Error('Keine freie Inventarnummer gefunden.');
        toast('Angelegt als '+done+'.');
        setTimeout(()=>go('detail',done),0);
      }
    }});
}
function logEntry(dev,text){return [{d:today(),t:text,u:S.meId||null}].concat(dev.verlauf||[]).slice(0,40);}
const patchDev=(id,fields)=>db.doc('geraete/'+id).update(fields);

/* ---- Fristen ---- */
function fristForm(dev,ex){
  const f=ex||{art:'',intervall:12,letzte:'',faellig:'',notiz:''};
  let edited=!!ex;
  const dl='<datalist id="artenList">'+(S.settings.fristenarten||[]).map(a=>'<option value="'+esc(a.name)+'"></option>').join('')+'</datalist>';
  const body=dl+'<div class="form-grid two">'
    +'<div class="field full"><label for="f_art">Art der Frist *</label><input id="f_art" name="art" type="text" list="artenList" required value="'+esc(f.art)+'" placeholder="z. B. Hauptuntersuchung (HU)" autocomplete="off"></div>'
    +inp('Intervall in Monaten','intervall',f.intervall,'min="0" max="240" inputmode="numeric"',null,'number')
    +inp('Zuletzt erledigt am','letzte',f.letzte,'',null,'date')
    +inp('Fällig am *','faellig',f.faellig,'required',null,'date')
    +inp('Notiz','notiz',f.notiz,'',null)
    +'<p class="hint full muted">0 Monate bedeutet einmalige Frist. Die Fälligkeit rechnet sich aus letzter Erledigung und Intervall, solange sie nicht von Hand geändert wurde.</p></div>';
  openModal({title:(ex?'Frist bearbeiten':'Neue Frist')+' · '+dev.inv,body:body,
    extra:ex?'<button type="button" class="btn danger" data-act="delFrist" data-id="'+esc(dev.id)+'" data-fid="'+esc(ex.id)+'">Löschen</button>':'',
    onInput:(form,e)=>{
      const n=e.target.name,F=form.elements;
      if(n==='faellig'){edited=true;return;}
      if(n==='art'){
        const a=(S.settings.fristenarten||[]).find(x=>x.name===F.art.value);
        if(a&&!ex){F.intervall.value=a.monate;if(!edited&&!F.letzte.value&&a.monate>0)F.faellig.value=addMonths(today(),a.monate);}
      }
      if((n==='art'||n==='intervall'||n==='letzte')&&!edited){
        const iv=parseInt(F.intervall.value,10);
        if(isDate(F.letzte.value)&&iv>0)F.faellig.value=addMonths(F.letzte.value,iv);
      }
    },
    onSubmit:async fd=>{
      if(!needWrite())return false;
      const fristen=clone(dev.fristen||[]);
      const nf={id:ex?ex.id:uid(),art:gv(fd,'art'),intervall:Math.max(0,parseInt(gv(fd,'intervall'),10)||0),letzte:gv(fd,'letzte'),faellig:gv(fd,'faellig'),notiz:gv(fd,'notiz')};
      if(!isDate(nf.faellig))throw new Error('Bitte ein gültiges Fälligkeitsdatum eingeben.');
      const i=fristen.findIndex(x=>x.id===nf.id);
      if(i>=0)fristen[i]=nf;else fristen.push(nf);
      await patchDev(dev.id,{fristen:fristen,verlauf:logEntry(dev,(ex?'Frist geändert: ':'Frist angelegt: ')+nf.art+' (fällig '+fmt(nf.faellig)+')')});
      toast('Frist gespeichert.');
    }});
}
function doneForm(dev,f){
  const iv=Number(f.intervall)||0;
  const body='<p><strong>'+esc(dev.inv+' · '+dev.name)+'</strong><br>'+esc(f.art)+', fällig '+fmt(f.faellig)+'</p><div class="form-grid">'
    +inp('Erledigt am','datum',today(),'required',null,'date')
    +inp('Notiz (z. B. Prüfer, Werkstatt, Protokollnummer)','notiz','','',null)
    +'</div><p class="muted" id="doneHint"></p>';
  const hint=form=>{const d=form.elements.datum.value;$('#doneHint').textContent=iv>0&&isDate(d)?'Neue Fälligkeit: '+fmt(addMonths(d,iv))+' (alle '+iv+' Monate).':(iv>0?'':'Einmalige Frist: sie wird nach dem Abhaken entfernt.');};
  const form=openModal({title:'Frist erledigt',body:body,submit:'Als erledigt eintragen',onInput:hint,
    onSubmit:async fd=>{
      if(!needWrite())return false;
      const datum=gv(fd,'datum'),note=gv(fd,'notiz');
      if(!isDate(datum))throw new Error('Bitte ein gültiges Datum eingeben.');
      let fristen=clone(dev.fristen||[]);
      const i=fristen.findIndex(x=>x.id===f.id);
      if(i<0)throw new Error('Die Frist wurde inzwischen geändert.');
      let txt='Erledigt: '+f.art+' am '+fmt(datum)+(note?' – '+note:'');
      if(iv>0){fristen[i].letzte=datum;fristen[i].faellig=addMonths(datum,iv);txt+=' · nächste Fälligkeit '+fmt(fristen[i].faellig);}
      else fristen.splice(i,1);
      await patchDev(dev.id,{fristen:fristen,verlauf:logEntry(dev,txt)});
      toast('Frist eingetragen.');
    }});
  hint(form);
}

/* ---- Schadensmeldung ---- */
function reportForm(devId){
  if(!S.devices.length){toast('Bitte zuerst ein Gerät anlegen.','err');return;}
  const list=S.devices.filter(d=>d.status!=='aus').sort((a,b)=>cmp(a.inv,b.inv));
  const body='<div class="form-grid">'
    +'<div class="field"><label for="f_geraet">Gerät *</label><select id="f_geraet" name="geraet" required>'+options(list.map(d=>[d.id,d.inv+' · '+d.name]),devId||'', 'Gerät wählen …')+'</select></div>'
    +inp('Was ist passiert? *','titel','','required placeholder="z. B. Hydraulikschlauch undicht"')
    +'<div class="field"><label for="f_text">Beschreibung</label><textarea id="f_text" name="text" placeholder="Wo, wann, was genau? Wurde jemand verletzt?"></textarea></div>'
    +'<div class="field"><label for="f_schwere">Schwere</label><select id="f_schwere" name="schwere">'+options(Object.keys(SEV).map(k=>[k,SEV[k]]),'mittel')+'</select></div>'
    +'<div class="field"><label for="f_foto">Foto (optional)</label><input id="f_foto" name="foto" type="file" accept="image/*" capture="environment"></div>'
    +'<label class="check"><input type="checkbox" name="defekt" id="f_defekt"> Gerät als „Defekt“ markieren</label></div>';
  openModal({title:'Schaden melden',body:body,submit:'Meldung absenden',
    onInput:(form,e)=>{if(e.target.name==='schwere')form.elements.defekt.checked=e.target.value==='kritisch';},
    onSubmit:async fd=>{
      if(!needWrite())return false;
      const dev=devById(gv(fd,'geraet'));
      if(!dev)throw new Error('Bitte ein Gerät wählen.');
      let photo=null;const file=fd.get('foto');
      if(file&&file.size)photo=await photoToDataUrl(file);
      const ref=db.collection('meldungen').doc();
      const rep={geraetId:dev.id,titel:gv(fd,'titel'),text:gv(fd,'text'),schwere:gv(fd,'schwere')||'mittel',status:'offen',melderId:S.meId||null,datum:today(),zeit:Date.now(),foto:!!photo};
      await ref.set(rep);
      if(photo)await db.doc('fotos/'+ref.id).set({data:photo});
      const upd={verlauf:logEntry(dev,'Schaden gemeldet: '+rep.titel+' ('+SEV[rep.schwere]+')')};
      if(fd.get('defekt')&&dev.status!=='defekt'){upd.status='defekt';upd.verlauf=logEntry({verlauf:upd.verlauf},'Status: '+STATUS[dev.status]+' → '+STATUS.defekt);}
      await patchDev(dev.id,upd);
      toast('Meldung gespeichert.');
    }});
}
function reportView(r){
  const d=devById(r.geraetId),w=S.canWrite;
  const body='<div style="display:flex;gap:8px;flex-wrap:wrap">'+sevPill(r.schwere)+repPill(r.status)+'</div>'
    +'<dl class="dl"><dt>Gerät</dt><dd>'+(d?'<a href="#'+esc(d.inv)+'" data-act="open" data-id="'+esc(d.id)+'">'+esc(d.inv+' · '+d.name)+'</a>':esc(r.geraetId))+'</dd>'
    +'<dt>Gemeldet</dt><dd>'+fmt(r.datum)+' · '+esc(r.beispiel?'Beispiel':nameOf(r.melderId))+'</dd>'
    +'<dt>Beschreibung</dt><dd>'+(r.text?esc(r.text).replace(/\n/g,'<br>'):'–')+'</dd>'
    +(r.status==='erledigt'?'<dt>Erledigt</dt><dd>'+fmt(r.erledigtAm)+(r.loesung?' · '+esc(r.loesung):'')+'</dd>':'')+'</dl>'
    +(r.foto?'<div id="repPhoto" class="muted">Foto wird geladen …</div>':'');
  let extra='';
  if(w){
    if(r.status==='offen')extra+='<button type="button" class="btn" data-act="repStatus" data-id="'+esc(r.id)+'" data-s="bearbeitung">In Bearbeitung</button>';
    if(r.status!=='erledigt')extra+='<button type="button" class="btn" data-act="repDone" data-id="'+esc(r.id)+'">Erledigt …</button>';
    else extra+='<button type="button" class="btn" data-act="repStatus" data-id="'+esc(r.id)+'" data-s="offen">Wieder öffnen</button>';
    extra+='<button type="button" class="btn danger" data-act="delReport" data-id="'+esc(r.id)+'">Löschen</button>';
  }
  openModal({title:r.titel,body:body,submit:null,cancelLabel:'Schließen',extra:extra,noFocus:true});
  if(r.foto){
    db.doc('fotos/'+r.id).get().then(s=>{
      const box=$('#repPhoto');if(!box)return;
      if(s.exists&&s.data().data){box.className='';box.innerHTML='<img class="photo" alt="Foto zur Schadensmeldung" src="'+esc(s.data().data)+'">';}
      else box.textContent='Kein Foto gefunden.';
    }).catch(()=>{const box=$('#repPhoto');if(box)box.textContent='Foto konnte nicht geladen werden.';});
  }
}
function repDoneForm(r){
  const d=devById(r.geraetId),offer=d&&(d.status==='defekt'||d.status==='wartung');
  const body='<div class="form-grid"><div class="field"><label for="f_loesung">Was wurde gemacht?</label><textarea id="f_loesung" name="loesung" placeholder="z. B. Schlauch getauscht, Dichtheit geprüft"></textarea></div>'
    +(offer?'<label class="check"><input type="checkbox" name="ok" checked> Gerät wieder als „Einsatzbereit“ markieren</label>':'')+'</div>';
  openModal({title:'Meldung abschließen',body:body,submit:'Als erledigt eintragen',
    onSubmit:async fd=>{
      if(!needWrite())return false;
      await db.doc('meldungen/'+r.id).update({status:'erledigt',erledigtAm:today(),loesung:gv(fd,'loesung')});
      if(offer&&fd.get('ok'))await patchDev(d.id,{status:'ok',verlauf:logEntry(d,'Status: '+STATUS[d.status]+' → '+STATUS.ok+' (Meldung erledigt)')});
      toast('Meldung abgeschlossen.');
    }});
}

/* ---- Lagerplatz ---- */
function placeForm(ex){
  const p=ex||{};
  const n=ex?S.devices.filter(d=>d.standort===ex.id).length:0;
  openModal({title:ex?'Lagerplatz bearbeiten':'Neuer Lagerplatz',
    body:'<div class="form-grid">'+inp('Name *','name',p.name,'required placeholder="z. B. Halle 1, Regal A"')+inp('Beschreibung','beschreibung',p.beschreibung,'placeholder="z. B. Kleingeräte und Akkus"')+'</div>',
    extra:ex?'<button type="button" class="btn danger" data-act="delPlace" data-id="'+esc(ex.id)+'"'+(n?' disabled title="Erst die '+n+' Geräte umlagern"':'')+'>Löschen</button>':'',
    onSubmit:async fd=>{
      if(!needWrite())return false;
      const data=Object.assign({},ex?toDoc(ex):{},{name:gv(fd,'name'),beschreibung:gv(fd,'beschreibung')});
      const ref=ex?db.doc('lager/'+ex.id):db.collection('lager').doc();
      await ref.set(data);toast('Lagerplatz gespeichert.');
    }});
}

/* ================= Aktionen ================= */
const ACT={
  closeModal:()=>closeModal(),
  nav:ds=>{if(ds.v==='scan')S.scanMsg=null;go(ds.v);},
  open:ds=>{closeModal();go('detail',ds.id);},
  resetFilter:()=>{S.q='';S.fKat='';S.fStatus='';S.fPlace='';render();},
  frNav:ds=>{S.frFilter=ds.f;S.calMode='liste';go('kalender');},
  calMode:ds=>{S.calMode=ds.m;render();},
  calNav:ds=>{let m=S.cal.m+Number(ds.d),y=S.cal.y;if(m<0){m=11;y--;}if(m>11){m=0;y++;}S.cal={y:y,m:m};S.calSel=null;render();},
  calToday:()=>{const n=new Date();S.cal={y:n.getFullYear(),m:n.getMonth()};S.calSel=today();render();},
  calDay:ds=>{S.calSel=(ds.d&&S.calSel!==ds.d)?ds.d:null;if(ds.d){const p=ds.d.split('-');if(Number(p[1])-1!==S.cal.m)S.cal={y:Number(p[0]),m:Number(p[1])-1};}render();},
  repFilter:ds=>{S.repFilter=ds.f;render();},
  newDevice:()=>{if(needWrite())deviceForm(null);},
  editDevice:ds=>{if(needWrite()){const d=devById(ds.id);if(d)deviceForm(d);}},
  delDevice:async(ds,t)=>{
    if(!needWrite()||!arm(t))return;
    const d=devById(ds.id);if(!d)return;
    const ok=await run(async()=>{
      for(const r of S.reports.filter(x=>x.geraetId===d.id)){await db.doc('meldungen/'+r.id).delete();if(r.foto)await db.doc('fotos/'+r.id).delete();}
      await db.doc('geraete/'+d.id).delete();
    },'Gerät gelöscht.');
    if(ok){closeModal();go('inventar');}
  },
  addFrist:ds=>{if(needWrite()){const d=devById(ds.id);if(d)fristForm(d,null);}},
  editFrist:ds=>{if(needWrite()){const d=devById(ds.id),f=d&&(d.fristen||[]).find(x=>x.id===ds.fid);if(f)fristForm(d,f);}},
  doneFrist:ds=>{if(needWrite()){const d=devById(ds.id),f=d&&(d.fristen||[]).find(x=>x.id===ds.fid);if(f)doneForm(d,f);}},
  delFrist:async(ds,t)=>{
    if(!needWrite()||!arm(t))return;
    const d=devById(ds.id);if(!d)return;
    const f=(d.fristen||[]).find(x=>x.id===ds.fid);
    const ok=await run(()=>patchDev(d.id,{fristen:(d.fristen||[]).filter(x=>x.id!==ds.fid),verlauf:logEntry(d,'Frist gelöscht: '+(f?f.art:''))}),'Frist gelöscht.');
    if(ok)closeModal();
  },
  newReport:ds=>{if(needWrite())reportForm(ds&&ds.id);},
  openReport:ds=>{const r=S.reports.find(x=>x.id===ds.id);if(r)reportView(r);},
  repStatus:async ds=>{
    if(!needWrite())return;
    const ok=await run(()=>db.doc('meldungen/'+ds.id).update({status:ds.s,erledigtAm:ds.s==='erledigt'?today():''}),'Status geändert.');
    if(ok)closeModal();
  },
  repDone:ds=>{const r=S.reports.find(x=>x.id===ds.id);if(r&&needWrite())repDoneForm(r);},
  delReport:async(ds,t)=>{
    if(!needWrite()||!arm(t))return;
    const r=S.reports.find(x=>x.id===ds.id);
    const ok=await run(async()=>{await db.doc('meldungen/'+ds.id).delete();if(r&&r.foto)await db.doc('fotos/'+ds.id).delete();},'Meldung gelöscht.');
    if(ok)closeModal();
  },
  newPlace:()=>{if(needWrite())placeForm(null);},
  editPlace:ds=>{if(needWrite()){const p=S.places.find(x=>x.id===ds.id);if(p)placeForm(p);}},
  delPlace:async(ds,t)=>{
    if(!needWrite()||!arm(t))return;
    const ok=await run(()=>db.doc('lager/'+ds.id).delete(),'Lagerplatz gelöscht.');
    if(ok)closeModal();
  },
  showPlace:ds=>{S.q='';S.fKat='';S.fStatus='';S.fPlace=ds.id;go('inventar');},
  labelFor:ds=>{S.labelSel=new Set([ds.id]);S.lq='';go('etiketten');},
  labelAll:()=>{const q=S.lq.trim().toLowerCase();S.devices.filter(d=>!q||[d.inv,d.name,d.typ,d.kennzeichen,placeName(d.standort)].join(' ').toLowerCase().indexOf(q)>=0).forEach(d=>S.labelSel.add(d.id));render();},
  labelNone:()=>{S.labelSel=new Set();render();},
  makePdf:async()=>{
    const sel=S.devices.filter(d=>S.labelSel.has(d.id)).sort((a,b)=>cmp(a.inv,b.inv));
    if(!sel.length)return;
    let blob;
    try{blob=buildPdf(sel,S.labelFmt,S.labelFrame);}catch(e){console.error(e);toast(e.message||'PDF konnte nicht erstellt werden.','err');return;}
    await saveFile('QR-Etiketten.pdf',blob);
  },
  exportInv:async()=>{
    const rows=[['Nr','Bezeichnung','Kategorie','Art','Hersteller','Modell','Seriennummer','Baujahr','Kennzeichen','Lagerplatz','Status','Nächste Frist am','Nächste Frist']];
    S.devices.slice().sort((a,b)=>cmp(a.inv,b.inv)).forEach(d=>{const f=nextFrist(d);rows.push([d.inv,d.name,d.kategorie,d.typ,d.hersteller,d.modell,d.seriennr,d.baujahr,d.kennzeichen,placeName(d.standort),STATUS[d.status]||d.status,f?fmt(f.faellig):'',f?f.art:'']);});
    await saveFile('Inventar.csv',csv(rows));
  },
  exportFr:async()=>{
    const rows=[['Nr','Bezeichnung','Frist','Fällig am','Intervall (Monate)','Zuletzt erledigt','Stand']];
    FR().forEach(x=>rows.push([x.dev.inv,x.dev.name,x.f.art,fmt(x.f.faellig),x.f.intervall||0,fmt(x.f.letzte),daysText(x.days)]));
    await saveFile('Fristen.csv',csv(rows));
  },
  copyReport:async()=>{
    const ta=$('#mailText');if(!ta)return;
    try{await navigator.clipboard.writeText(ta.value);toast('Bericht kopiert.');}
    catch(_){ta.focus();ta.select();toast('Text markiert. Mit Strg+C oder „Kopieren“ übernehmen.');}
  },
  exportJson:async()=>{
    const obj=await LocalDB.exportAll();
    await saveFile('Geraeteverwaltung-Sicherung-'+today()+'.json',new Blob([JSON.stringify(obj)],{type:'application/json'}));
  },
  importJson:()=>{const f=$('#importFile');if(f)f.click();},
  loadExamples:async()=>{
    await run(()=>LocalDB.setMany(window.SEED_DOCS||{}),'Beispieldaten geladen. Sie sind mit „Beispiel“ gekennzeichnet.');
  },
  delExamples:async(ds,t)=>{
    if(!needWrite()||!arm(t,'Wirklich alle Beispiele löschen?'))return;
    await run(async()=>{
      for(const r of S.reports.filter(x=>x.beispiel)){await db.doc('meldungen/'+r.id).delete();if(r.foto)await db.doc('fotos/'+r.id).delete();}
      for(const d of S.devices.filter(x=>x.beispiel))await db.doc('geraete/'+d.id).delete();
      for(const p of S.places.filter(x=>x.beispiel))await db.doc('lager/'+p.id).delete();
    },'Beispieldaten gelöscht.');
  }
};
const CHG={
  setPlace:async(el)=>{
    if(!needWrite()){render();return;}
    const d=devById(el.dataset.id);if(!d)return;
    const v=el.value;if((d.standort||'')===v)return;
    await run(()=>patchDev(d.id,{standort:v,verlauf:logEntry(d,'Lagerplatz: '+placeName(d.standort)+' → '+placeName(v))}),'Lagerplatz geändert.');
  },
  setStatus:async(el)=>{
    if(!needWrite()){render();return;}
    const d=devById(el.dataset.id);if(!d)return;
    const v=el.value;if(d.status===v)return;
    await run(()=>patchDev(d.id,{status:v,verlauf:logEntry(d,'Status: '+STATUS[d.status]+' → '+STATUS[v])}),'Status geändert.');
  }
};

/* ================= Ereignisse ================= */
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-act]');
  if(!t||t.disabled)return;
  const fn=ACT[t.dataset.act];if(!fn)return;
  if(t.tagName==='A')e.preventDefault();
  Promise.resolve(fn(t.dataset,t,e)).catch(err=>{console.error(err);toast(errText(err),'err');});
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape')closeModal();
  if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('tr[data-act]')){e.preventDefault();e.target.click();}
});
function bindValue(e){
  const t=e.target;
  if(t.dataset&&t.dataset.bind){
    if(S[t.dataset.bind]===t.value)return;
    S[t.dataset.bind]=t.value;
    if(t.dataset.bind==='q'&&S.view==='inventar'&&$('#invList')){$('#invList').innerHTML=invListHtml();return;}
    if(t.dataset.bind==='lq'&&S.view==='etiketten'&&$('#pickList')){$('#pickList').innerHTML=pickHtml();return;}
    render();
  }
}
document.addEventListener('input',bindValue);
document.addEventListener('change',e=>{
  const t=e.target;
  bindValue(e);
  if(t.dataset&&t.dataset.bindc){S[t.dataset.bindc]=t.checked;render();}
  if(t.dataset&&t.dataset.lsel){if(t.checked)S.labelSel.add(t.dataset.lsel);else S.labelSel.delete(t.dataset.lsel);render();}
  if(t.dataset&&t.dataset.change&&CHG[t.dataset.change])Promise.resolve(CHG[t.dataset.change](t)).catch(err=>toast(errText(err),'err'));
  if(t.id==='scanFile'&&t.files&&t.files[0])handleScan(t.files[0]);
  if(t.id==='importFile'&&t.files&&t.files[0])handleImport(t.files[0]);
});
document.addEventListener('submit',e=>{
  const f=e.target;
  if(f.id==='manualForm'){e.preventDefault();openByInv($('#manualInv').value);}
  if(f.id==='setForm'){e.preventDefault();saveSettings();}
});

async function handleImport(file){
  let obj;
  try{obj=JSON.parse(await file.text());}catch(_){toast('Die Datei konnte nicht gelesen werden.','err');return;}
  if(!obj||obj.format!=='galabau-geraete'){toast('Das ist keine Sicherungsdatei dieser App.','err');return;}
  const n=Object.keys(obj.docs||{}).length;
  openModal({title:'Sicherung einlesen',submit:'Einlesen',body:'<p>Die Datei enthält <strong>'+n+'</strong> Einträge (gespeichert am '+esc(String(obj.exportiert||'').slice(0,10))+').</p>'
    +'<div class="field"><label for="imMode">Wie einlesen?</label><select id="imMode" name="mode"><option value="merge">Zusammenführen (gleiche Nummern werden überschrieben)</option><option value="replace">Alles auf diesem Gerät ersetzen</option></select></div>',
    onSubmit:async fd=>{
      const replace=fd.get('mode')==='replace';
      const c=await LocalDB.importAll(obj,replace);
      toast(c+' Einträge eingelesen.');
    }});
}
async function handleScan(file){
  S.scanMsg={text:'Code wird gesucht …'};render();
  try{
    const text=await decodeQrFromFile(file);
    if(!text){S.scanMsg={err:true,text:'Kein QR-Code erkannt. Bitte näher, gerade und ohne Spiegelung fotografieren.'};render();return;}
    const inv=invFromScan(text),dev=inv&&devById(inv);
    if(dev){S.scanMsg=null;go('detail',dev.id);}
    else{S.scanMsg={err:true,text:'Der Code „'+String(text).slice(0,60)+'“ gehört zu keinem Gerät in dieser Datenbank.'};render();}
  }catch(err){console.error(err);S.scanMsg={err:true,text:err.message||'Das Foto konnte nicht gelesen werden.'};render();}
}
function openByInv(text){
  const inv=invFromScan(text),dev=inv&&devById(inv);
  if(dev){S.scanMsg=null;go('detail',dev.id);}
  else{S.scanMsg={err:true,text:'Kein Gerät mit dieser Nummer gefunden.'};render();}
}
async function saveSettings(){
  if(!needWrite())return;
  const val=id=>$('#'+id).value;
  const empf=val('s_empf').split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean);
  const bad=empf.find(x=>!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x));
  if(bad){toast('Die Adresse „'+bad+'“ ist keine gültige E-Mail-Adresse.','err');return;}
  const arten=val('s_arten').split('\n').map(l=>l.split('|')).map(p=>({name:(p[0]||'').trim(),monate:Math.max(0,parseInt(p[1],10)||0)})).filter(a=>a.name);
  try{localStorage.setItem('galabau.name',val('s_name').trim());}catch(_){}
  S.meId=myName()||'Mitarbeiter';
  const next={firma:val('s_firma').trim()||DEFAULT_SETTINGS.firma,vorlauf:Math.min(365,Math.max(1,parseInt(val('s_vorlauf'),10)||30)),baseUrl:val('s_base').trim(),empfaenger:empf,fristenarten:arten};
  await run(()=>db.doc('einstellungen/main').set(next),'Einstellungen gespeichert.');
}

/* ================= Daten laden ================= */
function applyHash(){
  const h=String(location.hash||'').replace(/^#/,'');
  if(!h)return;
  if(VIEWS[h]&&h!=='detail'){go(h);return;}
  const inv=invFromScan(h);
  if(!inv)return;
  if(S.mode!=='ready'){pendingHash=inv;return;}
  if(devById(inv))go('detail',inv);else{toast('Gerät '+inv+' wurde nicht gefunden.','err');}
}
window.addEventListener('hashchange',applyHash);

const nameAsked=new Set();
async function resolveNames(){
  if(!user)return;
  const ids=new Set();
  S.reports.forEach(r=>{if(r.melderId)ids.add(r.melderId);});
  S.devices.forEach(d=>(d.verlauf||[]).forEach(v=>{if(v.u)ids.add(v.u);}));
  const need=Array.from(ids).filter(i=>!(i in S.names)&&!nameAsked.has(i));
  if(!need.length)return;
  need.forEach(i=>nameAsked.add(i));
  try{const ps=await user.profiles(need);need.forEach(i=>{S.names[i]=(ps[i]&&ps[i].name)||'';});render();}catch(_){}
}
function loaded(k){
  firstLoad[k]=true;
  if(S.mode!=='ready'&&firstLoad.g&&firstLoad.l&&firstLoad.m&&firstLoad.s){
    S.mode='ready';
    if(pendingHash){const inv=pendingHash;pendingHash=null;if(devById(inv)){S.view='detail';S.detail=inv;}else toast('Gerät '+inv+' wurde nicht gefunden.','err');}
    else applyHash();
  }
  render();resolveNames();
}
function subscribe(){
  const bad=k=>e=>{console.error(e);toast(errText(e),'err');loaded(k);};
  db.collection('geraete').onSnapshot(s=>{S.devices=s.docs.map(x=>Object.assign({id:x.id},x.data()));loaded('g');},bad('g'));
  db.collection('lager').onSnapshot(s=>{S.places=s.docs.map(x=>Object.assign({id:x.id},x.data()));loaded('l');},bad('l'));
  db.collection('meldungen').onSnapshot(s=>{S.reports=s.docs.map(x=>Object.assign({id:x.id},x.data()));loaded('m');},bad('m'));
  db.doc('einstellungen/main').onSnapshot(s=>{S.settings=Object.assign(clone(DEFAULT_SETTINGS),s.exists?s.data():{});if(!Array.isArray(S.settings.fristenarten)||!S.settings.fristenarten.length)S.settings.fristenarten=DEFAULT_ARTEN;if(!Array.isArray(S.settings.empfaenger))S.settings.empfaenger=[];loaded('s');},bad('s'));
}
async function boot(){
  render();
  db=window.LocalDB;
  S.meId=myName()||'Mitarbeiter';S.canWrite=true;
  try{await db.init();}catch(e){S.mode='nodb';S.err=errText(e);render();return;}
  subscribe();
}
boot();
})();
