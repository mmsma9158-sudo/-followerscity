// FOLLOWERS CITY server: accounts, join requests, owner approval, invite code. No dependencies (Node 18+).
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000,DIR=process.env.DATA_DIR||__dirname,FILE=path.join(DIR,'data.json');
const OU=(process.env.OWNER_USER||'mjq18_').toLowerCase(),OP=process.env.OWNER_PASS||'RB8YFWNY';
if(!process.env.OWNER_PASS)console.warn('WARNING: set OWNER_PASS env var to your own owner password.');
let D={users:{},tok:{},inv:null};
try{D=JSON.parse(fs.readFileSync(FILE,'utf8'))}catch(e){}
const hp=(p,s)=>crypto.scryptSync(p,s,32).toString('hex');
const mk=p=>{const s=crypto.randomBytes(16).toString('hex');return{s,h:hp(p,s)}};
const ck=(p,x)=>{const a=Buffer.from(hp(p,x.s),'hex'),b=Buffer.from(x.h,'hex');return a.length==b.length&&crypto.timingSafeEqual(a,b)};
if(!D.inv)D.inv=mk('mjq67#');
D.users[OU]=Object.assign({n:OU,role:'owner',st:'ok'},mk(OP));
const save=()=>{fs.mkdirSync(DIR,{recursive:true});fs.writeFileSync(FILE,JSON.stringify(D))};save();
const RL={},lim=(ip,k)=>{const t=Date.now(),a=(RL[ip+k]=(RL[ip+k]||[]).filter(x=>t-x<60000));a.push(t);return a.length>10};
const names=()=>Object.values(D.users).filter(x=>x.st=='ok'&&x.role!='owner').map(x=>x.n);
const who=t=>{const k=D.tok[t];if(!k||k.exp<Date.now())return null;const u=D.users[k.u];return u&&u.st=='ok'?u:null};
const API={
ping:()=>({ok:true,server:true}),
members:()=>{const n=names();return{ok:true,n,count:n.length}},
apply:(b,ip)=>{if(lim(ip,'a'))return{ok:false,m:'محاولات كثيرة، انتظر دقيقة'};const u=String(b.u||'').toLowerCase();
if(!/^[a-z0-9._]{3,30}$/.test(u))return{ok:false,m:'اسم الحساب غير صالح'};if(String(b.p||'').length<6)return{ok:false,m:'كلمة المرور 6 أحرف على الأقل'};
if(!ck(String(b.inv||'').trim(),D.inv))return{ok:false,m:'كود الدعوة غير صحيح'};
if(u==OU||(D.users[u]&&D.users[u].st!='no'))return{ok:false,m:'هذا الحساب موجود مسبقًا'};
D.users[u]=Object.assign({n:u,role:'player',st:'wait',ts:Date.now()},mk(String(b.p)));save();return{ok:true,m:'تم إرسال طلبك. بانتظار موافقة المالك.'}},
login:(b,ip)=>{if(lim(ip,'l'))return{ok:false,m:'محاولات كثيرة، انتظر دقيقة'};const u=String(b.u||'').toLowerCase(),x=D.users[u];
if(!x||!ck(String(b.p||''),x))return{ok:false,m:'اسم الحساب أو كلمة المرور غير صحيحة'};
if(x.st=='wait')return{ok:false,m:'طلبك قيد المراجعة'};if(x.st!='ok')return{ok:false,m:'تم رفض طلبك أو إيقاف حسابك'};
const t=crypto.randomBytes(32).toString('hex');D.tok[t]={u,exp:Date.now()+30*864e5};save();return{ok:true,t,role:x.role}},
whoami:b=>{const x=who(b.t);return x?{ok:true,u:x.n,role:x.role}:{ok:false}},
reqs:b=>{const x=who(b.t);if(!x||x.role!='owner')return{ok:false,m:'غير مسموح'};return{ok:true,w:Object.values(D.users).filter(y=>y.st=='wait').map(y=>y.n),a:names()}},
decide:b=>{const x=who(b.t);if(!x||x.role!='owner')return{ok:false,m:'غير مسموح'};const y=D.users[String(b.u||'')];if(!y||y.role=='owner')return{ok:false,m:'غير موجود'};y.st=b.yes?'ok':'no';
if(!b.yes)for(const t in D.tok)if(D.tok[t].u==y.n)delete D.tok[t];save();return{ok:true}},
setinv:b=>{const x=who(b.t);if(!x||x.role!='owner')return{ok:false,m:'غير مسموح'};const c=String(b.c||'').trim();if(c.length<4)return{ok:false,m:'الكود قصير'};D.inv=mk(c);save();return{ok:true}}
};
http.createServer((q,r)=>{const H={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
if(q.method=='POST'&&q.url.startsWith('/api/')){let s='';q.on('data',c=>{s+=c;if(s.length>1e4)q.destroy()});q.on('end',()=>{let b={};try{b=JSON.parse(s||'{}')}catch(e){}
const f=API[q.url.slice(5).split('?')[0]],ip=String(q.headers['x-forwarded-for']||q.socket.remoteAddress).split(',')[0].trim();
let out={ok:false};try{if(f)out=f(b,ip)}catch(e){out={ok:false,m:'خطأ'}}
r.writeHead(200,Object.assign({'Content-Type':'application/json'},H));r.end(JSON.stringify(out))});return}
if(q.method=='GET'&&(q.url=='/'||q.url.startsWith('/?')||q.url=='/index.html')){r.writeHead(200,Object.assign({'Content-Type':'text/html; charset=utf-8'},H));fs.createReadStream(path.join(__dirname,'index.html')).pipe(r);return}
r.writeHead(404,H);r.end('Not found')}).listen(PORT,()=>console.log('FOLLOWERS CITY on port '+PORT));
