import React,{useEffect,useMemo,useRef,useState}from'react';import{saveAll,load,login,setToken,getToken,imageUrl,deleteBorder,changePassword,DEFAULT_CONFIG}from'./api';import type{Border,Rice,Slider,Config}from'./types';import{Download,LogIn,LogOut,Plus,RefreshCw,Settings,Trash2,Edit3,FileText,Image as ImageIcon,ShieldCheck,X,ChevronLeft,ChevronRight}from'lucide-react';import html2canvas from'html2canvas';import jsPDF from'jspdf';
const taka=(n:number)=>`৳ ${Number(n||0).toLocaleString('bn-BD',{maximumFractionDigits:2})}`;const num=(n:number)=>Number(n||0).toLocaleString('bn-BD',{maximumFractionDigits:2});
const calc=(meal:number,rate:number,extra:number,misc:number,deposit:number)=>{const mc=+(meal*rate).toFixed(2),tc=+(mc+extra+misc).toFixed(2);return{mealCost:mc,totalCost:tc,managerReceives:tc>deposit?+(tc-deposit).toFixed(2):0,borderReceives:deposit>=tc?+(deposit-tc).toFixed(2):0}};
function Modal({children,onClose,title}:{children:React.ReactNode;onClose:()=>void;title:string}){return <div className="overlay"><div className="modal"><div className="modalHead"><b>{title}</b><button onClick={onClose}><X/></button></div>{children}</div></div>}
export function App(){const[config,setConfig]=useState<Config>(DEFAULT_CONFIG),[borders,setBorders]=useState<Border[]>([]),[rice,setRice]=useState<Rice[]>([]),[slides,setSlides]=useState<Slider[]>([]),[loading,setLoading]=useState(true),[syncing,setSyncing]=useState(false),[admin,setAdmin]=useState(!!getToken()),[loginOpen,setLoginOpen]=useState(false),[settingsOpen,setSettingsOpen]=useState(false),[edit,setEdit]=useState<Border|null>(null),[addOpen,setAddOpen]=useState(false),[toast,setToast]=useState(''),[slide,setSlide]=useState(0),[search,setSearch]=useState('');const pdfRef=useRef<HTMLDivElement>(null);const [form,setForm]=useState<any>({name:'',mealCount:0,mealRate:0,extraCost:0,miscCost:0,totalDeposit:0});
 const notify=(m:string)=>{setToast(m);setTimeout(()=>setToast(''),3500)};
 const hydrate=async()=>{try{setSyncing(true);const r=await load(config);setConfig(c=>({...c,...r.data.config,appScriptUrl:(r.data.config?.appScriptUrl||c.appScriptUrl||DEFAULT_CONFIG.appScriptUrl).trim()}));setBorders(r.data.borders);setRice(r.data.rice);setSlides(r.data.sliderImages);notify('Google Sheets থেকে তথ্য সফলভাবে লোড হয়েছে।')}catch(e:any){notify(e.message||'সিঙ্ক ব্যর্থ হয়েছে।')}finally{setLoading(false);setSyncing(false)}};
 useEffect(()=>{hydrate()},[]);useEffect(()=>{if(slides.length<2)return;const t=setInterval(()=>setSlide(s=>(s+1)%slides.length),3000);return()=>clearInterval(t)},[slides.length]);
 const summary=useMemo(()=>{const s=borders.reduce((a,b)=>{a.meals+=b.mealCount;a.mealCost+=b.mealCost;a.extra+=b.extraCost;a.misc+=b.miscCost;a.cost+=b.totalCost;a.deposit+=b.totalDeposit;a.manager+=b.managerReceives;a.border+=b.borderReceives;return a},{meals:0,mealCost:0,extra:0,misc:0,cost:0,deposit:0,manager:0,border:0});const r=rice.reduce((a,x)=>{a.meal+=x.consumedPot;a.extra+=x.extraPot;a.total+=x.totalCostPot;a.deposit+=x.depositPot;a.manager+=x.managerReceivesPot;a.border+=x.borderReceivesPot;return a},{meal:0,extra:0,total:0,deposit:0,manager:0,border:0});return{...s,...r}},[borders,rice]);
 const filtered=borders.filter(b=>b.name.toLowerCase().includes(search.toLowerCase()));
 const persist=async(nb=borders,nr=rice,ns=slides,nc=config)=>{try{setSyncing(true);await saveAll(nc,nb,nr,ns);notify('Google Sheets-এ তথ্য সফলভাবে সংরক্ষিত হয়েছে।')}catch(e:any){notify(e.message||'সংরক্ষণ ব্যর্থ হয়েছে।')}finally{setSyncing(false)}};
 const openAdd=()=>{setForm({name:'',mealCount:0,mealRate:config.defaultMealRate||0,extraCost:0,miscCost:0,totalDeposit:0});setAddOpen(true)};
 const submitAdd=async()=>{if(!form.name.trim())return notify('বর্ডারের নাম দিন।');const c=calc(+form.mealCount,+form.mealRate,+form.extraCost,+form.miscCost,+form.totalDeposit);const b:Border={id:'border-'+Date.now(),name:form.name.trim(),mealCount:+form.mealCount,mealRate:+form.mealRate,...c,extraCost:+form.extraCost,miscCost:+form.miscCost,totalDeposit:+form.totalDeposit};const nb=[b,...borders];setBorders(nb);setAddOpen(false);await persist(nb,rice,slides)};
 const submitEdit=async()=>{if(!edit)return;const c=calc(edit.mealCount,edit.mealRate,edit.extraCost,edit.miscCost,edit.totalDeposit);const nb=borders.map(b=>b.id===edit.id?{...edit,...c}:b);setBorders(nb);setEdit(null);await persist(nb,rice,slides)};
 const remove=async(id:string)=>{if(!confirm('এই বর্ডারের সম্পূর্ণ হিসাব মুছে ফেলবেন?'))return;const nb=borders.filter(b=>b.id!==id);setBorders(nb);try{await deleteBorder(config,id);notify('তথ্য মুছে ফেলা হয়েছে।')}catch(e:any){notify(e.message||'ডিলিট ব্যর্থ')} };
 const downloadCard=async(b:Border)=>{
  const el=document.createElement('div');
  el.className='printCard';
  const logo=imageUrl(config.hostelLogoUrl);
  const logoHtml=logo?`<img class="cardLogo" src="${logo}" alt="${config.hostelName}"/>`:'';
  el.innerHTML=`
    <div class="cardBox">
      <div class="cardHeader">
        ${logoHtml}
        <div class="cardHeaderInfo">
          <h2 class="cardHostelName">${config.hostelName}</h2>
          <p class="cardHostelAddress">${config.hostelAddress||''}</p>
        </div>
        <div class="cardBadge">মাসিক হিসাব ভাউচার</div>
      </div>

      <div class="cardMemberSection">
        <div class="memberInfo">
          <span class="mLabel">বর্ডারের নাম:</span>
          <span class="mValue">${b.name}</span>
        </div>
        <div class="memberDate">
          <span class="mLabel">তারিখ:</span>
          <span class="mValue">${new Date().toLocaleDateString('bn-BD')}</span>
        </div>
      </div>

      <table class="cardTable">
        <thead>
          <tr>
            <th>বিবরণ</th>
            <th>পরিমাণ / রেট</th>
            <th class="textRight">টাকা</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>মিল খরচ</td>
            <td>${num(b.mealCount)} মিল × ${taka(b.mealRate)}</td>
            <td class="textRight fontBold">${taka(b.mealCost)}</td>
          </tr>
          <tr>
            <td>অতিরিক্ত খরচ</td>
            <td>বিশেষ মিল / বাজার</td>
            <td class="textRight">${taka(b.extraCost)}</td>
          </tr>
          <tr>
            <td>বিবিধ খরচ</td>
            <td>ইউটিলিটি / অন্যান্য</td>
            <td class="textRight">${taka(b.miscCost)}</td>
          </tr>
          <tr class="rowTotalCost">
            <td colspan="2"><b>মোট খরচ (মিল + অতিরিক্ত + বিবিধ)</b></td>
            <td class="textRight fontBold">${taka(b.totalCost)}</td>
          </tr>
          <tr class="rowDeposit">
            <td colspan="2"><b>মোট জমা প্রদান</b></td>
            <td class="textRight fontBold">${taka(b.totalDeposit)}</td>
          </tr>
        </tbody>
      </table>

      <div class="cardBalanceGrid">
        <div class="balanceBox ${b.managerReceives > 0 ? 'highlightDebt' : ''}">
          <span class="bLabel">ম্যানেজার পাবে (বকেয়া)</span>
          <span class="bVal managerColor">${b.managerReceives > 0 ? taka(b.managerReceives) : '৳ ০.০০'}</span>
        </div>
        <div class="balanceBox ${b.borderReceives > 0 ? 'highlightCredit' : ''}">
          <span class="bLabel">বর্ডার ফেরত পাবে (উদ্বৃত্ত)</span>
          <span class="bVal borderColor">${b.borderReceives > 0 ? taka(b.borderReceives) : '৳ ০.০০'}</span>
        </div>
      </div>

      <div class="cardSignatures">
        <div class="signBlock">
          <div class="signLine"></div>
          <span>বর্ডারের স্বাক্ষর</span>
        </div>
        <div class="signBlock">
          <div class="signLine"></div>
          <span>ম্যানেজারের স্বাক্ষর</span>
        </div>
      </div>

      <div class="cardFooter">
        <span>সফটওয়্যার ডেভেলপমেন্ট: <b>${config.developer || 'Ariful Islam'}</b></span>
        <span>•</span>
        <span>আদর্শ আল মাস ছাত্রাবাস অটোমেশন সিস্টেম</span>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  const c=await html2canvas(el,{scale:2.5,useCORS:true,backgroundColor:'#ffffff'});
  const a=document.createElement('a');
  a.download=`${b.name}-হিসাব-কার্ড.png`;
  a.href=c.toDataURL('image/png');
  a.click();
  el.remove();
 };
 const downloadPdf=async()=>{if(!pdfRef.current)return;const c=await html2canvas(pdfRef.current,{scale:1.5,useCORS:true});const pdf=new jsPDF('l','mm','a4');const w=280,h=c.height*w/c.width;pdf.addImage(c.toDataURL('image/jpeg',.9),'JPEG',5,5,w,Math.min(h,190));pdf.save('আদর্শ-আল-মাস-সম্পূর্ণ-হিসাব.pdf')};
 if(loading)return <div className="loading">লোড হচ্ছে…</div>;
 return <div className="app"><header><div className="brand">{imageUrl(config.hostelLogoUrl)?<img src={imageUrl(config.hostelLogoUrl)} alt={config.hostelName} onError={e=>(e.currentTarget.style.display='none')}/>:null}<div><h1>{config.hostelName}</h1><p>{config.hostelAddress}</p></div></div><div className="headActions">{admin&&<button className="btn" onClick={openAdd}><Plus/>নতুন সদস্য</button>}<button className="iconBtn" onClick={hydrate} disabled={syncing} title="সিঙ্ক"><RefreshCw className={syncing?'spin':''}/></button>{admin?<><button className="iconBtn" onClick={()=>setSettingsOpen(true)} title="Admin settings"><Settings/></button><button className="btn danger" onClick={()=>{setToken('');setAdmin(false);notify('Admin logout হয়েছে')}}><LogOut/>Logout</button></>:<button className="btn" onClick={()=>setLoginOpen(true)}><LogIn/>Admin Login</button>}</div></header>
 <main><section className="hero"><div className="slider">{slides.length?(imageUrl(slides[slide]?.url)||imageUrl(config.hostelLogoUrl)?<><img src={imageUrl(slides[slide]?.url)||imageUrl(config.hostelLogoUrl)} alt={slides[slide]?.title||config.hostelName} onError={e=>e.currentTarget.style.display='none'}/><div className="caption"><b>{slides[slide]?.title||'আদর্শ আল মাস ছাত্রাবাস'}</b></div><button className="prev" onClick={()=>setSlide((slide-1+slides.length)%slides.length)}><ChevronLeft/></button><button className="next" onClick={()=>setSlide((slide+1)%slides.length)}><ChevronRight/></button><div className="dots">{slides.map((_,i)=><i key={`dot-${i}`} className={i===slide?'active':''}/>)}</div></>:<div className="emptySlide"><ImageIcon/><span>{slides[slide]?.title||'কোনো ছবি পাওয়া যায়নি'}</span></div>):<div className="emptySlide"><ImageIcon/><span>Google Sheets-এর ওয়েবসাইট confi. শীটে sliderImages যোগ করুন</span></div>}</div></section>
 <section className="summaryGrid">{[['মোট বর্ডার',num(borders.length)],['মোট মিল',num(summary.meals)],['ম্যানেজার এর মোট আয় (মোট জমা)',taka(summary.deposit)],['মোট ব্যয় (মোট খরচ)',taka(summary.cost)],['ম্যানেজার পাবে',taka(summary.manager)],['বর্ডারকে ফেরত',taka(summary.border)],['মিল খরচ',taka(summary.mealCost)],['চালের মোট খরচ',num(summary.total)+' পট']].map(x=><div className="card" key={x[0]}><span>{x[0]}</span><strong>{x[1]}</strong></div>)}</section>
 <section className="section" id="money"><div className="sectionHead"><div><h2>মিলের টাকা হিসাব</h2><p>মিল খরচ = মিল সংখ্যা × মিল রেট; মোট খরচ = মিল খরচ + অতিরিক্ত + বিবিধ</p></div><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="বর্ডারের নাম খুঁজুন…"/></div><div className="tableWrap"><table><thead><tr>{['ক্রো. নং','বর্ডারের নাম','মিল সংখ্যা','মিল রেট','মিল খরচ','অতিরিক্ত','বিবিধ','মোট খরচ','মোট জমা','ম্যানেজার পাবে','বর্ডার পাবে',...(admin?['অ্যাকশন']:[])].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{filtered.map((b,i)=><tr key={b.id}><td>{num(i+1)}</td><td className="name">{b.name}</td><td>{num(b.mealCount)}</td><td>{taka(b.mealRate)}</td><td>{taka(b.mealCost)}</td><td>{taka(b.extraCost)}</td><td>{taka(b.miscCost)}</td><td><b>{taka(b.totalCost)}</b></td><td>{taka(b.totalDeposit)}</td><td className="manager">{b.managerReceives?taka(b.managerReceives):'—'}</td><td className="border">{b.borderReceives?taka(b.borderReceives):'—'}</td>{admin&&<td><button className="mini" onClick={()=>setEdit({...b})}><Edit3/></button><button className="mini red" onClick={()=>remove(b.id)}><Trash2/></button></td>}</tr>)}</tbody></table></div></section>
 <section className="section"><div className="sectionHead"><div><h2>মিলের চালের হিসাব <small>(একক: পট)</small></h2><p>মোট খরচ = মিল খরচ + অতিরিক্ত</p></div>{admin&&<button className="btn light" onClick={()=>setRice([...rice,{id:'rice-'+Date.now(),borderName:'নতুন বর্ডার',consumedPot:0,extraPot:0,totalCostPot:0,depositPot:0,managerReceivesPot:0,borderReceivesPot:0}])}>সম্পাদনা শুরু</button>}</div><div className="tableWrap"><table><thead><tr>{['ক্রো. নং','বর্ডারের নাম','মিল খরচ','অতিরিক্ত','মোট খরচ','মোট জমা','ম্যানেজার পাবে','বর্ডার পাবে',...(admin?['অ্যাকশন']:[])].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rice.map((r,i)=><tr key={r.id}><td>{num(i+1)}</td><td className="name">{r.borderName}</td><td>{num(r.consumedPot)} পট</td><td>{num(r.extraPot)} পট</td><td><b>{num(r.totalCostPot)} পট</b></td><td>{num(r.depositPot)} পট</td><td className="manager">{r.managerReceivesPot?num(r.managerReceivesPot)+' পট':'—'}</td><td className="border">{r.borderReceivesPot?num(r.borderReceivesPot)+' পট':'—'}</td>{admin&&<td><button className="mini" onClick={()=>{const n=prompt('বর্ডারের নাম',r.borderName);if(n===null)return;const meal=Number(prompt('মিল খরচ (পট)',r.consumedPot));const ex=Number(prompt('অতিরিক্ত (পট)',r.extraPot));const dep=Number(prompt('মোট জমা (পট)',r.depositPot));const total=Math.max(0,meal)+Math.max(0,ex);const nr={...r,borderName:n,consumedPot:Math.max(0,meal),extraPot:Math.max(0,ex),totalCostPot:total,depositPot:Math.max(0,dep),managerReceivesPot:total>dep?total-dep:0,borderReceivesPot:dep>=total?dep-total:0};const nrice=rice.map(x=>x.id===r.id?nr:x);setRice(nrice);persist(borders,nrice,slides)}}><Edit3/></button><button className="mini red" onClick={()=>{if(confirm('চালের হিসাব মুছে ফেলবেন?')){const nr=rice.filter(x=>x.id!==r.id);setRice(nr);persist(borders,nr,slides)}}}><Trash2/></button></td>}</tr>)}</tbody></table></div></section>
 <section className="downloads"><button className="btn" onClick={downloadPdf}><FileText/>সম্পূর্ণ হিসাব PDF</button>{borders.map(b=><button key={b.id} className="btn light" onClick={()=>downloadCard(b)}><Download/>{b.name} কার্ড</button>)}</section>
 <footer>Developed by <a href={config.developerFbUrl||'https://www.facebook.com/mdarifulislam15'} target="_blank" rel="noreferrer">{config.developer}</a></footer>
 </main>
 <div ref={pdfRef} className="pdfSource">{imageUrl(config.hostelLogoUrl)?<img src={imageUrl(config.hostelLogoUrl)} alt={config.hostelName}/>:null}<h2>{config.hostelName}</h2><p>{config.hostelAddress}</p><h3>মিলের টাকা হিসাব</h3><table><thead><tr>{['বর্ডার','মিল','রেট','মিল খরচ','অতিরিক্ত','বিবিধ','মোট খরচ','জমা','ম্যানেজার পাবে','বর্ডার পাবে'].map((x, idx)=><th key={`pdf-th-${idx}`}>{x}</th>)}</tr></thead><tbody>{borders.map(b=><tr key={`pdf-tr-${b.id}`}><td>{b.name}</td><td>{b.mealCount}</td><td>{b.mealRate}</td><td>{b.mealCost}</td><td>{b.extraCost}</td><td>{b.miscCost}</td><td>{b.totalCost}</td><td>{b.totalDeposit}</td><td>{b.managerReceives}</td><td>{b.borderReceives}</td></tr>)}</tbody></table></div>
 {toast&&<div className="toast">{toast}</div>}
 {loginOpen&&<Login config={config} onClose={()=>setLoginOpen(false)} onSuccess={()=>{setAdmin(true);setLoginOpen(false);notify('Admin login সফল হয়েছে')}}/>}
 {addOpen&&<BorderForm title="নতুন সদস্য যুক্ত করুন" form={form} setForm={setForm} onClose={()=>setAddOpen(false)} onSave={submitAdd}/>} {edit&&<BorderForm title="বর্ডারের তথ্য সম্পাদনা" form={edit} setForm={setEdit} onClose={()=>setEdit(null)} onSave={submitEdit}/>} {settingsOpen&&<SettingsModal config={config} setConfig={setConfig} slides={slides} setSlides={setSlides} onClose={()=>setSettingsOpen(false)} onSave={async()=>{await persist(borders,rice,slides,config);setSettingsOpen(false)}}/>}
 </div>}
function Login({config,onClose,onSuccess}:{config:Config;onClose:()=>void;onSuccess:()=>void}){const[p,setP]=useState('');const[err,setErr]=useState('');const handleLogin=async(e?:React.FormEvent)=>{if(e)e.preventDefault();if(!p.trim()){setErr('পাসওয়ার্ড লিখুন');return;}try{const r=await login(config,p);setToken(r.token);onSuccess()}catch(e:any){setErr(e.message||'ভুল পাসওয়ার্ড')}};return <Modal title="Admin Login" onClose={onClose}><form className="form" onSubmit={handleLogin}><label>পাসওয়ার্ড<input type="password" value={p} onChange={e=>{setP(e.target.value);setErr('')}} placeholder="পাসওয়ার্ড লিখুন (যেমন: 180665)" autoFocus/></label>{err&&<div className="error">{err}</div>}<button type="submit" className="btn full"><ShieldCheck/>Login</button></form></Modal>}
function BorderForm({title,form,setForm,onClose,onSave}:{title:string;form:any;setForm:any;onClose:()=>void;onSave:()=>void}){return <Modal title={title} onClose={onClose}><div className="form grid2">{[['name','বর্ডারের নাম','text'],['mealCount','মিল সংখ্যা','number'],['mealRate','মিল রেট','number'],['extraCost','অতিরিক্ত','number'],['miscCost','বিবিধ','number'],['totalDeposit','মোট জমা','number']].map(([k,l,t])=><label key={k}>{l}<input type={t} value={form[k]??''} onChange={e=>setForm({...form,[k]:t==='number'?Number(e.target.value):e.target.value})}/></label>)}<div className="previewCalc"><b>মিল খরচ:</b> {taka(calc(+form.mealCount,+form.mealRate,+form.extraCost,+form.miscCost,+form.totalDeposit).mealCost)}<br/><b>মোট খরচ:</b> {taka(calc(+form.mealCount,+form.mealRate,+form.extraCost,+form.miscCost,+form.totalDeposit).totalCost)}</div><button className="btn full" onClick={onSave}>সংরক্ষণ করুন</button></div></Modal>}
function SettingsModal({config,setConfig,slides,setSlides,onClose,onSave}:{config:Config;setConfig:any;slides:Slider[];setSlides:any;onClose:()=>void;onSave:()=>void}){const[newPass,setNewPass]=useState('');return <Modal title="Admin Dashboard — Settings & Configuration" onClose={onClose}><div className="form"><label>মেসের নাম<input value={config.hostelName} onChange={e=>setConfig({...config,hostelName:e.target.value})}/></label><label>ঠিকানা<input value={config.hostelAddress} onChange={e=>setConfig({...config,hostelAddress:e.target.value})}/></label><label>Apps Script URL<input value={config.appScriptUrl} onChange={e=>setConfig({...config,appScriptUrl:e.target.value})}/></label><label>ডিফল্ট মিল রেট<input type="number" value={config.defaultMealRate} onChange={e=>setConfig({...config,defaultMealRate:Number(e.target.value)})}/></label><label>লোগো URL<input value={config.hostelLogoUrl} onChange={e=>setConfig({...config,hostelLogoUrl:imageUrl(e.target.value)})}/></label><hr/><b>Slider Images — প্রতি ৩ সেকেন্ডে পরিবর্তন</b>{slides.map((s,i)=><div className="slideRow" key={s.id}><input value={s.title} onChange={e=>setSlides(slides.map((x,j)=>j===i?{...x,title:e.target.value}:x))}/><input value={s.url} onChange={e=>setSlides(slides.map((x,j)=>j===i?{...x,url:imageUrl(e.target.value)}:x))}/><button className="mini red" onClick={()=>setSlides(slides.filter(x=>x.id!==s.id))}><Trash2/></button></div>)}<button className="btn light" onClick={()=>setSlides([...slides,{id:'slide-'+Date.now(),title:'নতুন ছবি',url:''}])}><Plus/>ছবি যুক্ত করুন</button><hr/><b>Admin Password পরিবর্তন</b><input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="নতুন পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)"/><button className="btn" onClick={async()=>{if(newPass.length<8)return alert('কমপক্ষে ৮ অক্ষর দিন');try{await changePassword(config,newPass);setNewPass('');alert('পাসওয়ার্ড পরিবর্তন হয়েছে')}catch(e:any){alert(e.message)}}}>পাসওয়ার্ড পরিবর্তন</button><button className="btn full" onClick={onSave}>সব কনফিগারেশন সংরক্ষণ</button></div></Modal>}
