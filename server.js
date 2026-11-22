require('dotenv').config();
const express=require('express'),multer=require('multer'),path=require('path');
const app=express(),up=multer({storage:multer.memoryStorage(),limits:{fileSize:20*1024*1024}});
const KEY=process.env.GEMINI_API_KEY,MODEL=process.env.GEMINI_MODEL||'gemini-flash-latest';
app.use(express.json({limit:'12mb'}));
['index.html','manifest.json','sw.js','icon-192.png','icon-512.png','maskable-512.png'].forEach(f=>app.get(f=='index.html'?['/','/index.html']:'/'+f,(q,r)=>r.sendFile(path.join(__dirname,f))));
// per-IP rate limit (replace with login/credits when you add payments)
const hits=new Map();app.use('/api',(req,res,next)=>{const k=req.ip,n=Date.now(),a=(hits.get(k)||[]).filter(t=>n-t<60000);a.push(n);hits.set(k,a);a.length>20?res.status(429).json({error:'Too many requests, wait a minute.'}):next()});
const needKey=res=>KEY?false:(res.status(501).json({error:'GEMINI_API_KEY is not set on the server (.env).'}),true);
async function gemini(parts,system){
 const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':KEY},
  body:JSON.stringify({...(system?{systemInstruction:{parts:[{text:system}]}}:{}),contents:[{role:'user',parts}],generationConfig:{responseMimeType:'application/json',temperature:1}})});
 const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error?.message||'Gemini error '+r.status);
 const t=j.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'';
 try{return JSON.parse(t.replace(/^```json|```$/g,'').trim())}catch(e){throw new Error('AI returned an unreadable answer, try again.')}}
app.get('/api/status',(q,s)=>s.json({transcribe:!!KEY,analyze:!!KEY,image:true,removebg:true}));

app.post('/api/transcribe',up.single('audio'),async(req,res)=>{
 if(needKey(res))return;if(!req.file)return res.status(400).json({error:'No audio uploaded.'});
 const L={en:'English',hi:'Hindi in Devanagari script',hinglish:'Hinglish: Hindi spoken, written in Roman/English letters (e.g. "Aaj hum ek mast video dekhenge")'}[req.body.lang]||'the language spoken (detect it; write Hindi in Devanagari)';
 try{const j=await gemini([{inline_data:{mime_type:'audio/wav',data:req.file.buffer.toString('base64')}},{text:`Transcribe this audio into subtitle segments of at most 8 words / 3 seconds each. Write the text in ${L}. Timestamps in seconds from audio start, accurate and in order. Return ONLY JSON: {"language":"detected language name","segments":[{"start":0.0,"end":2.5,"text":"..."}]}`}]);
  res.json({language:j.language,segments:(j.segments||[]).map(s=>({s:+s.start||0,e:+s.end||0,t:String(s.text||'').trim()})).filter(s=>s.t&&s.e>s.s)});
 }catch(e){res.status(502).json({error:e.message})}});

app.post('/api/analyze',async(req,res)=>{
 if(needKey(res))return;const{brief,style,variation,styles,photo}=req.body;if(!brief)return res.status(400).json({error:'Describe your video.'});
 try{const sys=`You are a top YouTube thumbnail designer. Return ONLY JSON: {"topic":str,"subject":str,"moment":str,"emotion":str,"headline":str (max 4 punchy words, same language as the idea, Hinglish ok),"style":one of ${styles.join('|')},"layout":"left"|"right"|"center","colors":[hex,hex] dark gradient,"accent":hex,"props":[up to 3 emoji],"arrow":bool,"composition":str,"bgPrompt":str (English prompt for a cinematic background image with NO text and NO people, matching the topic)}. Style preference: ${style}. Variation #${variation}: make it creatively different.`;
  const parts=[{text:'Video idea: '+brief}];if(photo){const m=photo.match(/^data:(.+?);base64,(.+)$/);if(m)parts.push({inline_data:{mime_type:m[1],data:m[2]}})}
  res.json(await gemini(parts,sys));
 }catch(e){res.status(502).json({error:e.message})}});

// free image generation via Pollinations (no key). Fetched server-side so the canvas isn't tainted.
app.post('/api/image',async(req,res)=>{
 if(!req.body.prompt)return res.status(400).json({error:'Prompt missing.'});
 try{const u='https://image.pollinations.ai/prompt/'+encodeURIComponent(req.body.prompt+', cinematic lighting, high detail, no text')+'?width=1280&height=720&nologo=true&model=flux&seed='+Math.floor(Math.random()*1e6);
  const r=await fetch(u),ct=r.headers.get('content-type')||'';if(!r.ok||!ct.startsWith('image/'))throw new Error('Image service busy (free limit: 1 image per 15s). Try again shortly.');
  res.json({image:`data:${ct};base64,`+Buffer.from(await r.arrayBuffer()).toString('base64')});
 }catch(e){res.status(502).json({error:e.message})}});
app.listen(process.env.PORT||3000,()=>console.log('Creator Studio AI running on :'+(process.env.PORT||3000)));
