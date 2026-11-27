(()=>{
const Z=window.ZE,$=id=>document.getElementById(id);if(!Z)return;
const st=document.createElement('style');st.textContent=`.ccb{background:#232327;border:0;color:#fff;border-radius:12px;padding:10px 14px;font:inherit;font-weight:600;cursor:pointer}.ccb.p{background:#fff;color:#000}.ccc{display:flex;gap:12px;background:#141418;border:1px solid #26262e;border-radius:16px;padding:10px;margin-bottom:10px;align-items:center}.ccc img{width:92px;height:62px;object-fit:cover;border-radius:10px;background:#000}.ccc .m{flex:1;min-width:0}.ccc .m b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ccc .m span{color:#8b8b98;font-size:12px}.cca{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}.cca button{background:#232327;border:0;color:#ddd;border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer}.cct{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#111;color:#fff;border:1px solid #444;border-radius:12px;padding:10px 16px;z-index:200;max-width:86%;text-align:center}`;document.head.appendChild(st);
const toast=(m,bad)=>{const d=document.createElement('div');d.className='cct';d.style.borderColor=bad?'#e44':'#3be8ff';d.textContent=m;document.body.appendChild(d);setTimeout(()=>d.remove(),3500)};
/* ---- format: .mxl ---- */
const SALT='CS-MXL-1';function sig(x){let h=2166136261;const q=x+SALT;for(let i=0;i<q.length;i++){h^=q.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return h.toString(36)}
const b64=s=>btoa(unescape(encodeURIComponent(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''),ub64=s=>decodeURIComponent(escape(atob(s.replace(/-/g,'+').replace(/_/g,'/'))));
function pack(look){const body=JSON.stringify(look);return 'MXL1\n'+b64(JSON.stringify({fmt:'MXL',v:1,body,sig:sig(body)}))}
function unpack(txt){try{txt=String(txt).trim();if(!txt.startsWith('MXL1\n')&&!txt.startsWith('MXL1'))return null;const o=JSON.parse(ub64(txt.replace(/^MXL1\s*/,'')));if(o.fmt!='MXL'||o.v!=1||typeof o.body!='string'||o.sig!==sig(o.body))return null;const l=JSON.parse(o.body);return l&&Array.isArray(l.cuts)?l:null}catch(e){return null}}
const deny=()=>{toast('Access denied: this is not a valid CC file (wrong format or edited).',1)};
function lookOf(name){const P=Z.P,dur=Z.V.duration||1;return{name,dur,total:Z.total(),cuts:P.clips.filter(c=>!c.still).map(c=>({...JSON.parse(JSON.stringify(c)),a:c.s/dur,b:c.e/dur})),fxs:JSON.parse(JSON.stringify(P.fxs)),texts:JSON.parse(JSON.stringify(P.texts)),bg:P.bg,ar:P.ar}}
function applyLook(l){const P=Z.P,dur=Z.V.duration;Z.snap();const keep=['adj','filt','mb','mask','crop','op','tr','ain','aout','acb','kf','vol','smooth','pitch'];
 if(P.clips.length==1&&!P.clips[0].still&&l.cuts.length>1){P.clips=l.cuts.map(k=>{const c=Z.newClip(k.a*dur,k.b*dur);Object.keys(k).forEach(x=>{if(!['a','b','s','e','still'].includes(x))c[x]=k[x]});return c})}
 else{const k=l.cuts[0]||{};P.clips.forEach(c=>keep.forEach(x=>{if(k[x]!==undefined)c[x]=JSON.parse(JSON.stringify(k[x]))}))}
 const f=Z.total()/(l.total||1);P.fxs=(l.fxs||[]).map(x=>({...x,s:x.s*f,d:x.d*f}));P.texts=(l.texts||[]).map(x=>({...x,s:x.s*f,d:x.d*f}));if(l.bg)P.bg=l.bg;if(l.ar!==undefined)P.ar=l.ar;Z.ratio();toast('CC applied: '+(l.name||'CC'))}
/* ---- library (IndexedDB) ---- */
const DB=()=>new Promise((ok,no)=>{const r=indexedDB.open('zcc',1);r.onupgradeneeded=()=>r.result.createObjectStore('p',{keyPath:'id'});r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
const dbp=async(m,...a)=>{const db=await DB();return new Promise((ok,no)=>{const rq=db.transaction('p',m=='put'||m=='delete'?'readwrite':'readonly').objectStore('p')[m](...a);rq.onsuccess=()=>ok(rq.result);rq.onerror=()=>no(rq.error)})};
let curId=null;
async function saveProj(name){const rec={id:curId||Date.now(),name:name||'CC',date:Date.now(),proj:JSON.stringify(Z.P),thumb:Z.thumb(),video:Z.file&&Z.file.size<=150e6?Z.file:null,dur:Z.V.duration};curId=rec.id;await dbp('put',rec);return rec}
Z.moveCC=async()=>{if(!Z.P)return;const nm=prompt('Name for this CC project','CC '+new Date().toLocaleDateString());if(nm===null)return;try{await saveProj(nm||'CC');Z.close();window.go&&go('cc');render();toast('Moved to CC')}catch(e){toast('Could not save: '+e.message,1)}};
/* ---- editor top bar in CC mode ---- */
Z.onOpen=()=>{const top=$('ztop');top.querySelectorAll('.zcc').forEach(x=>x.remove());const cc=Z.cc;$('zq').style.display=cc?'none':'';$('zexp').style.display=cc?'none':'';if(!cc){curId=null;return}
 const mk=(t,fn,cls)=>{const b=document.createElement('button');b.className='zq zcc '+(cls||'');b.textContent=t;b.onclick=fn;top.appendChild(b)};
 mk('Import CC',()=>importPick());mk('Copy CC',copyCC);mk('Export CC',exportCC,'zex')};
async function nameOf(){const r=curId?await dbp('get',curId):null;return r?r.name:'CC '+new Date().toLocaleDateString()}
async function copyCC(){const n=await nameOf(),link=location.origin+location.pathname+'#cc='+pack(lookOf(n)).slice(5);try{await saveProj(n)}catch(e){}try{await navigator.clipboard.writeText(link);toast('CC link copied')}catch(e){prompt('Copy this CC link',link)}}
async function exportCC(){const n=await nameOf();try{await saveProj(n)}catch(e){}const blob=new Blob([pack(lookOf(n))],{type:'text/plain'});window.save?window.save(n.replace(/[^\w-]+/g,'_')+'.mxl',blob):0;toast('CC exported (.mxl)')}
function importPick(){const i=document.createElement('input');i.type='file';i.accept='.mxl,text/plain';i.onchange=async()=>{const f=i.files[0];if(!f)return;if(!/\.mxl$/i.test(f.name))return deny();got(unpack(await f.text()))};i.click();}
function importLink(){const t=prompt('Paste the CC link');if(!t)return;const m=t.match(/#cc=(.+)$/);got(m?unpack('MXL1\n'+m[1]):null)}
let pending=null;
function got(l){if(!l)return deny();if(Z.isOpen()){applyLook(l)}else{pending=l;window.go&&go('cc');render();toast('CC "'+l.name+'" received. Choose a sample video to apply it.')}}
/* ---- CC view ---- */
async function render(){const v=$('ccv');if(!v)return;let list=[];try{list=(await dbp('getAll')).sort((a,b)=>b.date-a.date)}catch(e){}
 v.innerHTML=`<div class="hero" style="min-height:110px"><h1 style="font-size:22px">Make your CC</h1><p>Build a look, share it as a link or a .mxl file, and import looks from others.</p></div>${pending?`<div class="note">CC "${pending.name}" is waiting. Choose a sample video below to apply it.</div>`:''}
 <div class="row" style="margin:10px 0"><label class="ccb p" style="margin:0">New CC<input type="file" id="ccnew" accept="video/*" hidden></label><button class="ccb" id="ccimp">Import CC (.mxl)</button><button class="ccb" id="ccpaste">Paste CC link</button></div>
 <h3>My CC projects (${list.length})</h3>${list.length?'':'<div class="card" style="color:var(--mu)">Nothing here yet. Open New project, edit a video, then tap "Move in CC" in the bottom toolbar.</div>'}<div id="ccl"></div>`;
 $('ccnew').onchange=e=>{const f=e.target.files[0];if(!f)return;const l=pending;pending=null;curId=null;Z.load(f,{cc:true,done:()=>{if(l)applyLook(l)}})};
 $('ccimp').onclick=importPick;$('ccpaste').onclick=importLink;
 const box=$('ccl');list.forEach(r=>{const d=document.createElement('div');d.className='ccc';d.innerHTML=`<img src="${r.thumb||''}"><div class="m"><b></b><span>${new Date(r.date).toLocaleString()}${r.video?'':' - no video saved'}</span><div class="cca"><button data-a="open">Open</button><button data-a="link">Copy link</button><button data-a="exp">Export</button><button data-a="ren">Rename</button><button data-a="del">Delete</button></div></div>`;d.querySelector('b').textContent=r.name;
  d.querySelector('.cca').onclick=async e=>{const a=e.target.dataset.a;if(!a)return;const P0=JSON.parse(r.proj),tmpLook=()=>{const keep=Z.P;return null};
   if(a=='del'){if(confirm('Delete "'+r.name+'"?')){await dbp('delete',r.id);render()}}
   else if(a=='ren'){const n=prompt('Rename',r.name);if(n){r.name=n;await dbp('put',r);render()}}
   else if(a=='open'){if(r.video){curId=r.id;Z.load(r.video,{P:P0,cc:true})}else{const i=document.createElement('input');i.type='file';i.accept='video/*';i.onchange=()=>{curId=r.id;Z.load(i.files[0],{P:P0,cc:true})};i.click()}}
   else{const lk={name:r.name,dur:r.dur||1,total:P0.clips.reduce((s,c)=>s+(c.still||(c.e-c.s)/(c.speed||1)),0),cuts:P0.clips.filter(c=>!c.still).map(c=>({...c,a:c.s/(r.dur||1),b:c.e/(r.dur||1)})),fxs:P0.fxs||[],texts:P0.texts||[],bg:P0.bg,ar:P0.ar};
    if(a=='link'){const link=location.origin+location.pathname+'#cc='+pack(lk).slice(5);try{await navigator.clipboard.writeText(link);toast('CC link copied')}catch(x){prompt('Copy this CC link',link)}}
    else{window.save&&window.save(r.name.replace(/[^\w-]+/g,'_')+'.mxl',new Blob([pack(lk)],{type:'text/plain'}))}}};box.appendChild(d)})}
/* ---- starter looks ---- */
const PK=[['Ultra Clean',{adj:{sh:1.6,co:106,sa:106},f:'Crisp',fx:[['Sharpen Edges',.5]]}],['Smooth Glow',{adj:{br:102,sa:108,bl:.3},f:'Glow',fx:[['Glow',.5]]}],['Cinema Teal',{adj:{co:112},f:'Film Teal',fx:[['Cinematic Bars',.6],['Vignette',.4]]}],['Vivid Pop',{adj:{sa:120,co:108},f:'Vivid',fx:[['Glow',.3]]}],['Moody Film',{adj:{co:114,br:96},f:'Moody',fx:[['Film Look',.5],['Vignette',.5]]}],['HDR Look',{adj:{co:118,sa:116,sh:1.2},f:'HD Upscale',fx:[]}],['Warm Sunset',{adj:{sa:112},f:'Sunset',fx:[['Light Leak',.35]]}],['Clean Mono',{adj:{co:110},f:'Black White',fx:[['Vignette',.4]]}]];
Z.packs=()=>{const b=Z.sheet('CC Looks','');b.innerHTML='';b.append(Z.cardGrid(PK.map(p=>({n:p[0],p:p[1]})),()=>false,it=>{Z.snap();const P=Z.P,p=it.p;P.clips.forEach(c=>{Object.assign(c.adj,{br:100,co:100,sa:100,hu:0,bl:0,sh:0,vi:0},p.adj);const f=Z.FLT.find(x=>x.n==p.f);if(f)c.filt={n:f.n,a:1}});P.fxs=P.fxs.filter(x=>!x.pk);p.fx.forEach(([n,a])=>{const e=Z.E.find(x=>x.n==n);if(e)P.fxs.push({id:e.id,s:0,d:Z.total(),a,sp:1,pk:1})})}));const m=document.createElement('div');m.className='zmsg';m.textContent='Starter looks set contrast, color, sharpening and effects for the whole video. They do not add real detail like AI upscalers.';b.append(m)};
/* ---- hash import ---- */
function hash(){const m=location.hash.match(/^#cc=(.+)$/);if(m){const l=unpack('MXL1\n'+m[1]);history.replaceState(null,'',location.pathname);got(l)}}
render();window.addEventListener('hashchange',hash);setTimeout(hash,400);
const o=window.go;if(o)window.go=function(v){o(v);if(v=='cc')render()};
})();