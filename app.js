
const KEY="portfolio-v1";
const seed={
 profile:{name:"Your Name",title:"Your Role",bio:"A short intro about what you do and what you’re into. Click “Edit site” to make this yours.",
  about:"Write a longer story here: your background, what drives you, what you’re working on, and what you do outside of work.",
  email:"you@example.com",photo:"",links:[{label:"LinkedIn",url:"https://linkedin.com"},{label:"GitHub",url:"https://github.com"}]},
 exp:[
  {id:"e1",company:"Company One",role:"Your Role",desc:"One or two lines on what you built or improved and the result it had.",start:"May 2024",end:"Aug 2024"},
  {id:"e2",company:"Company Two",role:"Another Role",desc:"Quantify the impact where you can: money saved, speed gained, users reached.",start:"Jan 2023",end:"May 2023"}],
 projects:[
  {id:"p1",title:"Sample Project One",date:"2025-07-12",tags:"Build, Robotics",desc:"A short summary of the project, the problem it solves, and what you learned along the way.",img:"",url:""},
  {id:"p2",title:"Sample Project Two",date:"2024-02-22",tags:"Coding",desc:"Add a cover image and a link to the full write-up using the edit button.",img:"",url:""}]
};
let S,editing=false,filter="All";
try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){}
if(!S||!S.profile)S=JSON.parse(JSON.stringify(seed));
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){alert("Couldn’t save – storage may be full. Try smaller images.")}};
const uid=()=>"i"+Math.random().toString(36).slice(2,9);
const safeUrl=u=>/^(https?:|mailto:)/i.test(u||"")?u:"";
const fmtDate=d=>{const t=new Date(d+"T00:00");return isNaN(t)?esc(d):t.toLocaleDateString("en-US",{day:"2-digit",month:"short",year:"numeric"})};
const tagsOf=p=>(p.tags||"").split(",").map(t=>t.trim()).filter(Boolean);

// Icon links shown on the home page. Edit the URLs here.
const SOCIAL=[{label:"LinkedIn",url:"https://www.linkedin.com/in/rebecca-kong-b35383304",svg:'<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>'},{label:"GitHub",url:"https://github.com/rlxkong",svg:'<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>'}];
function render(){
 const p=S.profile;document.title=p.name+" – Portfolio";
 $("navName").textContent=p.name;$("mono").textContent=(p.name||"?").trim()[0]||"?";
 $("name").textContent=p.name;$("title").textContent=p.title;$("bio").textContent=p.bio;
 $("photo").innerHTML=p.photo?`<img src="${esc(p.photo)}" alt="${esc(p.name)}">`:"Add a photo";
 $("links").innerHTML=SOCIAL.map(l=>`<a class="btn ico" href="${l.url}" target="_blank" rel="noopener" aria-label="${l.label}" title="${l.label}"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">${l.svg}</svg></a>`).join("");
 
 
 $("aboutTxt").textContent=p.about;$("copy").textContent="© "+new Date().getFullYear()+" "+p.name;
 $("exp").innerHTML=S.exp.length?S.exp.map(e=>`<div class="card"><h3>${esc(e.role)}</h3><div class="co">${esc(e.company)}</div><p>${esc(e.sub||e.desc)}</p><small>${esc([e.start,e.end].filter(Boolean).join(" — "))}</small></div>`).join(""):'<div class="empty">No experience yet.</div>';
 const all=["All",...new Set(S.projects.flatMap(tagsOf))];if(!all.includes(filter))filter="All";
 $("filters").innerHTML=all.length>1?all.map(t=>`<button class="chip ${t===filter?"on":""}" onclick="setF(this.dataset.t)" data-t="${esc(t)}">${esc(t)}</button>`).join(""):"";
 const list=[...S.projects].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).filter(x=>filter==="All"||tagsOf(x).includes(filter));
 $("projs").innerHTML=list.length?list.map(x=>{const u=PROJECT_PAGES[x.id]||"#project-"+x.id;const t=`<a href="${u}">${esc(x.title)}</a>`;
  return `<article class="proj" style="cursor:pointer" onclick="if(!event.target.closest('a,button'))location.href='${u}'"><div class="ed"><button class="btn" onclick="editProj('${x.id}')">Edit</button><button class="btn d" onclick="del('projects','${x.id}')">✕</button></div>
  <div class="cv">${x.img?`<img src="${esc(x.img)}" alt="${esc(x.title)}" loading="lazy">`:"Cover image"}</div>
  <div><div class="date">${fmtDate(x.date)}</div><h3>${t}</h3><div class="tags">${tagsOf(x).map(g=>`<span>${esc(g)}</span>`).join("")}</div><p>${esc(x.desc)}</p>${u?`<a class="more" href="${u}">View more →</a>`:""}</div></article>`}).join(""):'<div class="empty">No projects yet. Click “Edit site” to add one.</div>';
}
function updProg(){const c=$("exp"),m=c.scrollWidth-c.clientWidth;$("bar").style.transform="scaleX("+(m>0?c.scrollLeft/m:1)+")"}
function nudge(d){const c=$("exp");waitUntil=performance.now()+2500;c.scrollBy({left:d*c.clientWidth*.8,behavior:"smooth"})}
// auto-scroll: slow continuous drift, pauses on hover/touch/focus/edit mode, loops at the end
let auto=!matchMedia("(prefers-reduced-motion:reduce)").matches,hover=false,touch=false,pos=0,last=0,waitUntil=0;
const pj=$("exp");
function togglePlay(){auto=!auto;$("play").textContent=auto?"\u275a\u275a":"\u25b6";pj.classList.toggle("playing",auto)}
pj.classList.toggle("playing",auto);$("play").textContent=auto?"\u275a\u275a":"\u25b6";
pj.addEventListener("mouseenter",()=>hover=true);pj.addEventListener("mouseleave",()=>hover=false);
pj.addEventListener("focusin",()=>hover=true);pj.addEventListener("focusout",()=>hover=false);
pj.addEventListener("touchstart",()=>touch=true,{passive:true});pj.addEventListener("touchend",()=>setTimeout(()=>touch=false,2500));
function tick(t){
 const dt=Math.min(t-last,50);last=t;
 const m=pj.scrollWidth-pj.clientWidth;
 if(!auto||hover||touch||editing||document.hidden||m<=0||t<waitUntil){pos=pj.scrollLeft}
 else{pos+=dt*0.04;
  if(pos>=m){pos=m;pj.scrollLeft=m;waitUntil=t+1500;setTimeout(()=>{pos=0;pj.scrollLeft=0},1500)}
  else pj.scrollLeft=pos}
 requestAnimationFrame(tick)}
requestAnimationFrame(tick);
$("exp").addEventListener("scroll",updProg,{passive:true});
addEventListener("resize",updProg);
new MutationObserver(updProg).observe($("exp"),{childList:true});
function setF(t){filter=t;$("projs").scrollLeft=0;render()}
function del(k,id){if(confirm("Delete this item?")){S[k]=S[k].filter(x=>x.id!==id);save();render()}}

// ---- modal editor ----
let imgData=null;
function openForm(title,fields,vals,onSave){
 imgData=null;
 $("frm").innerHTML=`<h3>${title}</h3>`+fields.map(f=>{
  if(f.t==="img")return `<label>${f.l}</label><input type="file" accept="image/*" id="f_${f.k}">${vals[f.k]?`<img class="pv" id="pv_${f.k}" src="${esc(vals[f.k])}" alt="">`:`<img class="pv" id="pv_${f.k}" style="display:none" alt="">`}`;
  return `<label>${f.l}</label>`+(f.t==="area"?`<textarea id="f_${f.k}">${esc(vals[f.k])}</textarea>`:`<input id="f_${f.k}" type="${f.t||"text"}" value="${esc(vals[f.k])}" placeholder="${esc(f.p||"")}">`)}).join("")+
  `<div class="row"><button type="button" class="btn" onclick="$('dlg').close()">Cancel</button><button type="button" class="btn p" id="sv">Save</button></div>`;
 const fi=fields.find(f=>f.t==="img");
 if(fi)$("f_"+fi.k).onchange=e=>shrink(e.target.files[0],fi.k,fi.w||1000);
 $("sv").onclick=()=>{const o={};fields.forEach(f=>{o[f.k]=f.t==="img"?(imgData??vals[f.k]??""):$("f_"+f.k).value.trim()});onSave(o);save();render();$("dlg").close()};
 $("dlg").showModal();
}
function shrink(file,k,w){if(!file)return;const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{
 const s=Math.min(1,w/im.width),c=document.createElement("canvas");c.width=im.width*s;c.height=im.height*s;c.getContext("2d").drawImage(im,0,0,c.width,c.height);
 imgData=c.toDataURL("image/jpeg",.8);const pv=$("pv_"+k);pv.src=imgData;pv.style.display="block"};im.src=r.result};r.readAsDataURL(file)}

function editProfile(){const p=S.profile;
 openForm("Edit profile",[{k:"name",l:"Name"},{k:"title",l:"Title / tagline"},{k:"bio",l:"Intro",t:"area"},{k:"photo",l:"Photo",t:"img",w:900},{k:"about",l:"About you (long)",t:"area"},{k:"email",l:"Email"},
  {k:"links",l:"Links (one per line: Label | https://url)",t:"area"}],
  {...p,links:(p.links||[]).map(l=>l.label+" | "+l.url).join("\n")},
  o=>{S.profile={...p,...o,links:o.links.split("\n").map(s=>s.split("|").map(x=>x.trim())).filter(a=>a[0]&&a[1]).map(a=>({label:a[0],url:a[1]}))}});
}
function editExp(id){const e=S.exp.find(x=>x.id===id)||{company:"",role:"",desc:"",start:"",end:""};
 openForm(id?"Edit experience":"Add experience",[{k:"role",l:"Role"},{k:"company",l:"Company"},{k:"sub",l:"One-line summary (shown on Home)"},{k:"desc",l:"Bullet points, one per line",t:"area"},{k:"start",l:"Start",p:"May 2024"},{k:"end",l:"End",p:"Aug 2024 or Present"}],e,
  o=>{id?Object.assign(e,o):S.exp.unshift({id:uid(),...o})});
}
function editProj(id){const e=S.projects.find(x=>x.id===id)||{title:"",date:new Date().toISOString().slice(0,10),tags:"",desc:"",img:"",url:""};
 openForm(id?"Edit project":"Add project",[{k:"title",l:"Title"},{k:"date",l:"Date",t:"date"},{k:"tags",l:"Tags (comma separated)",p:"Build, Robotics"},{k:"desc",l:"Short description",t:"area"},{k:"img",l:"Cover image",t:"img"},{k:"body",l:"Full write-up (shown on the project page)",t:"area"},{k:"url",l:"External link (optional)",p:"https://"}],e,
  o=>{id?Object.assign(e,o):S.projects.push({id:uid(),...o})});
}

// ---- export / import ----
function exportData(){const j=JSON.stringify(S);(navigator.clipboard?navigator.clipboard.writeText(j):Promise.reject()).then(()=>alert("Copied your site data to the clipboard. Paste it somewhere safe as a backup.")).catch(()=>prompt("Copy this backup:",j))}
function importData(){const j=prompt("Paste your exported site data:");if(!j)return;try{const d=JSON.parse(j);if(!d.profile)throw 0;S=d;save();render()}catch(e){alert("That doesn’t look like valid site data.")}}

// ---- mode + theme ----


try{const t=localStorage.getItem(KEY+"-theme");}catch(e){}
// page routing: #home, #experience, #projects, #about, #contact
const VIEWS=["home","experience","projects","about","resume","detail"];
if(!S.edu)S.edu=[{id:"u1",school:"Your University",degree:"B.S. Your Major",start:"2021",end:"2025"}];
if(S.skills==null)S.skills="Skill one, Skill two, Skill three";
function renderResume(){const p=S.profile,r=$("rs");
 const row=(l,t,s,d,ed)=>`<div class="rrow">${ed}<div class="rd">${esc(l)}</div><div><h4>${esc(t)}</h4><div class="rs2">${esc(s)}</div>${d?RL(d):""}</div></div>`;
 const btns=(f,k,id)=>`<div class="ed"><button class="btn" onclick="${f}('${id}')">Edit</button><button class="btn d" onclick="del('${k}','${id}')">✕</button></div>`;
 r.innerHTML=`<div class="sheet"><div class="rh"><div><h3>${esc(p.name)}</h3><div>${esc(p.title)}</div></div><div class="rc">${(p.contact||[p.email]).map(c=>c==="[redacted]"?'<span class="redact"></span>':esc(c)).join("<br>")}</div></div>
 <h5>Experience</h5>${S.exp.map(e=>row(dr(e.start,e.end),e.role,e.company,(e.sub?"::"+e.sub+"\n":"")+(e.desc||""),btns("editExp","exp",e.id))).join("")||'<div class="empty">Add your experience.</div>'}
 <h5>Education</h5>${S.edu.map(e=>row(dr(e.start,e.end),e.degree,e.school,e.desc,btns("editEdu","edu",e.id))).join("")||'<div class="empty">Add your education.</div>'}
 <h5>Skills</h5>${RK(S.skills)}<h5>Projects</h5>${S.projects.map(p=>`<div class="rrow"><div class="rd">${esc(p.dates||fmtDate(p.date))}</div><div><h4>${esc(p.title)}</h4><div class="rs2">${esc(p.tags)}</div>${RL(p.body||p.desc)}</div></div>`).join("")}<h5>Achievements</h5>${RL(S.ach||"")}</div>`}
function editEdu(id){const e=S.edu.find(x=>x.id===id)||{degree:"",school:"",start:"",end:""};
 openForm(id?"Edit education":"Add education",[{k:"degree",l:"Degree / program"},{k:"school",l:"School"},{k:"start",l:"Start"},{k:"end",l:"End"},{k:"desc",l:"Details (one per line)",t:"area"}],e,o=>{id?Object.assign(e,o):S.edu.unshift({id:uid(),...o})})}
function editSkills(){openForm("Edit skills & achievements",[{k:"skills",l:"Skills (one line each, e.g. Technical: Python, Java)",t:"area"},{k:"ach",l:"Achievements (one per line)",t:"area"}],{skills:S.skills||"",ach:S.ach||""},o=>{S.skills=o.skills;S.ach=o.ach})}
function delProj(id){if(confirm("Delete this project?")){S.projects=S.projects.filter(x=>x.id!==id);save();location.hash="projects";render()}}
function renderDetail(){const id=(location.hash||"").slice(9),p=S.projects.find(x=>x.id===id),b=$("dBody");
 if(!p){b.innerHTML='<div class="empty">Project not found.</div>';return}
 const u=safeUrl(p.url);
 b.innerHTML=`<div class="dcv">${p.img?`<img src="${esc(p.img)}" alt="${esc(p.title)}">`:""}</div><div class="date">${fmtDate(p.date)}</div><h2 class="sec">${esc(p.title)}</h2><div class="tags">${tagsOf(p).map(g=>`<span>${esc(g)}</span>`).join("")}</div><p class="lead">${esc(p.desc)}</p>${p.body?`<div class="dbody">${esc(p.body)}</div>`:""}<div class="dact">${u?`<a class="btn p" href="${esc(u)}" target="_blank" rel="noopener">Visit link ↗</a>`:""}<span class="ed2"><button class="btn" onclick="editProj('${p.id}')">Edit project</button><button class="btn d" onclick="delProj('${p.id}')">Delete</button></span></div>`;
 document.title=p.title+" – "+S.profile.name}

async function dlResume(){
 const url="assets/Rebecca_Kong_Resume.pdf";
 try{
  const response=await fetch(url);
  if(response.ok){
   const blob=await response.blob();
   const d=window.claude?await claude.use("downloads"):null;
   if(d){await d.save({filename:"Rebecca_Kong_Resume.pdf",data:blob});return}
  }
 }catch(e){if(e&&e.code==="declined")return}
 const a=document.createElement("a");a.href=url;a.download="Rebecca_Kong_Resume.pdf";document.body.appendChild(a);a.click();a.remove()
}
// To deliver messages straight to your inbox, paste a form-service URL here (Formspree, Web3Forms, Getform...). Leave empty to open the visitor's email app instead.
const FORM_ENDPOINT="";
async function sendMsg(){const em=$("cEmail").value.trim(),m=$("cMsg").value.trim(),st=$("cStat"),to=S.profile.email;
 if(!/^\S+@\S+\.\S+$/.test(em)){st.textContent="Please enter a valid email.";return}
 if(!m){st.textContent="Please write a message.";return}
 if(FORM_ENDPOINT){try{const r=await fetch(FORM_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({email:em,message:m})});if(r.ok){st.textContent="Thanks! Your message was sent.";$("cMsg").value="";return}}catch(e){}}
 const u="mailto:"+to+"?subject="+encodeURIComponent("Portfolio message from "+em)+"&body="+encodeURIComponent(m+"\n\n— Reply to: "+em);
 st.innerHTML='Almost done: <a class="more" href="'+esc(u)+'" target="_blank" rel="noopener">click here to open your email app</a> with your message ready to send.'}
const dr=(a,b)=>[a,b].filter(Boolean).join(" — ");
const RL=t=>`<div class="rl">${String(t||"").split("\n").filter(Boolean).map(l=>l.startsWith("::")?`<div class="rsub">${esc(l.slice(2))}</div>`:`<div class="li">${esc(l)}</div>`).join("")}</div>`;
const RK=t=>String(t||"").split("\n").filter(Boolean).map(l=>{const i=l.indexOf(":");return i>0&&i<20?`<div class="rk"><b>${esc(l.slice(0,i+1))}</b> ${esc(l.slice(i+1))}</div>`:`<div class="rk">${esc(l)}</div>`}).join("");
if(!S.rdata){
 Object.assign(S.profile,{name:"Rebecca Kong",title:"Engineering Student · Harvey Mudd College",email:"rebecca.lx.kong@gmail.com",bio:"I am an engineering student at Harvey Mudd College interested in computer and hardware engineering. Enjoy looking through my page and some of my projects!",contact:["San Diego, CA","rebecca.lx.kong@gmail.com","[redacted]","linkedin.com/in/rebecca-kong-b35383304"],links:[{label:"LinkedIn",url:"https://www.linkedin.com/in/rebecca-kong-b35383304"}]});
 S.exp=[
  {id:"e1",role:"Embedded System R&D Contractor",company:"Blackrock Neurotech",start:"Aug 2026",end:"Present",sub:"Industry-sponsored project to deliver a wireless data transmission device for a BCI",desc:"Designing and implementing a low power, high data transfer rate wireless device for collecting brain signal data for training purposes\nOngoing effort for profiling data throughput with different ESP32 MCUs to integrate wireless connection for the data transmission process"},
  {id:"e2",role:"AI Product Analysis Intern",company:"SenseTime · Beijing, China",start:"Summer 2026",end:"",sub:"Product development researcher for UniRead (an AI-based English learning system)",desc:"Performed competitive analysis for English-learning platforms to identify gaps in content discovery and community experiences\nAnalyzed customer needs against platform limitations and operational requirements to propose AI specific feature requirements\nCollaborated in a Mandarin-speaking work environment, iterating on product requirements and feature proposals based on team feedback"},
  {id:"e3",role:"Student Researcher, Entrepreneurship Studio Program",company:"Harvey Mudd College · Claremont, CA",start:"Summer 2025",end:"",sub:"Computer-vision tennis analysis platform using object detection and automated match processing",desc:"Developed an AI-based application PointView, which utilized computer vision and machine learning to analyze tennis matches by tracking player and ball with YOLOv8\nTrained a customized YOLOv8 object-detection model for tennis footage, managing the full pipeline from manual data collection and labeling to dataset preparation, model training, and evaluation\nCombined player detection, ball tracking, and coordinate mapping to transform raw match footage into a birds-eye-view of on-court activity"},
  {id:"e4",role:"Team Captain, NCAA Division III Women’s Tennis",company:"CMS Student-Athlete · Claremont, CA",start:"Aug 2024",end:"Present",sub:"",desc:"Coordinates practices, mentors teammates, and fosters team communication and accountability within a nationally competitive collegiate tennis program"}];
 S.edu=[{id:"u1",degree:"B.S. Engineering",school:"Harvey Mudd College · Claremont, CA",start:"",end:"Expected May 2028",desc:"GPA: 3.94/4.00 | Harvey Mudd Merit Scholarship | Dean’s List | Tau Beta Phi Engineering Honor Society\nRelevant Coursework: Digital Electrical & Computer Engineering, Experimental Engineering, Engineering Systems, Intro to Engineering Design & Manufacturing, Principles of Computer Science, Applied Math for Engineering, Electric and Magnetic Circuits/Devices, Microprocessor System: Design & Applications, Advanced Systems Engineering"}];
 S.skills="Technical: Python, Java, JavaScript, MATLAB, SystemVerilog, YOLOv8, OpenCV, CAD\nLanguages: English (fluent), Mandarin Chinese (conversational)";
 S.ach="NCAA Division III Doubles National Champion (2026)\nITA Cup Division III Doubles Champion & Singles Finalist (2025)\nITA Cup Division III Singles Finalist (2026)";
 S.projects=S.projects.filter(x=>!/^Sample Project/.test(x.title));
 S.projects.push({id:"auv",title:"Autonomous Underwater Vehicle",date:"2025-08-01",dates:"Aug 2025 – May 2026",tags:"Arduino, MATLAB",desc:"Multi-sensor circuitry for an autonomous underwater vehicle supporting ocean-sampling and environmental monitoring.",body:"Designed and integrated multi-sensor circuitry for an autonomous underwater vehicle supporting ocean-sampling and environmental monitoring.\nInterfaced six sensor systems, including GPS, IMU, pressure, temperature, motor-current, and magnetometer sensors, with Arduino for onboard data acquisition.\nDeveloped MATLAB code to analyze sensor data for water-current mapping and magnetic-object detection.",img:"",url:""});
 S.rdata=1;save()}

// Clean up the optional preview projects from an earlier version, once.
if(S.projectEntriesAdded){
 S.projects=S.projects.filter(item=>!['pointview','bci'].includes(item.id));
 delete S.projectEntriesAdded;
 const originalAuv=S.projects.find(item=>item.id==="auv");
 if(originalAuv&&originalAuv.img==="assets/auv-cover.svg")originalAuv.img="";
 save()
}

// Projects that have their own page in /projects.
// To add one: copy projects/project-template.html, add its id + file to PROJECT_PAGES,
// and add an entry to EXTRA_PROJECTS (it will appear on Home and the Projects page).
const PROJECT_PAGES={"auv": "projects/auv.html", "pointview": "projects/pointview.html", "bci": "projects/bci.html", "mobile-lectern": "projects/mobile-lectern.html"};
const EXTRA_PROJECTS=[
 {"id": "auv", "title": "Autonomous Underwater Vehicle", "date": "2025-08-01", "dates": "Aug 2025 – May 2026", "tags": "Arduino, MATLAB, Sensors", "desc": "An underwater robot that measures depth, temperature and magnetic flux to locate ferromagnetic objects on the ocean floor.", "body": "Designed and integrated multi-sensor circuitry for an autonomous underwater vehicle supporting ocean-sampling and environmental monitoring.\nInterfaced six sensor systems, including GPS, IMU, pressure, temperature, motor-current, and magnetometer sensors, with Arduino for onboard data acquisition.\nDeveloped MATLAB code to analyze sensor data for water-current mapping and magnetic-object detection.", "img": "assets/auv/auv-sketch.jpg", "url": ""},
 {"id": "pointview", "title": "PointView", "date": "2025-06-01", "dates": "Summer 2025", "tags": "Computer Vision, YOLOv8, GridTrackNet, React", "desc": "A website that automatically trims tennis match recordings, provides point statistics and lets players take notes.", "body": "Built in the Entrepreneurship Studio Program at Harvey Mudd College.\nTrained a customized YOLOv8 object-detection model for tennis footage.\nImplemented the keypoint-to-minicourt mapping that turns raw match footage into a birds-eye view.", "img": "assets/pointview/pv-notes.jpg", "url": ""},
 {"id": "bci", "title": "BCI Wireless Data Device", "date": "2026-08-01", "dates": "Aug 2026 – Present", "tags": "ESP32, Embedded Systems, Wireless", "desc": "An industry-sponsored project with Blackrock Neurotech to deliver a wireless data transmission device for a brain-computer interface (BCI).", "body": "Designing and implementing a low power, high data transfer rate wireless device for collecting brain signal data for training purposes.\nProfiling data throughput with different ESP32 microcontrollers to integrate the wireless connection for the data transmission process.", "img": "", "url": ""},
 {"id": "mobile-lectern", "title": "Mobile Lectern", "date": "", "dates": "E4 team project", "tags": "Product Design, 3D Printing", "desc": "A foldable, 3D-printed lectern that sets up in about three seconds, built for a professor who wants to teach among his students.", "body": "Average set-up time of 3.34 seconds, 1.15 pounds, about $15 to make.", "img": "assets/lectern/lectern-open.jpg", "url": ""}
];
S.projects=S.projects.filter(x=>x.id!=="laptop-stand");
EXTRA_PROJECTS.forEach(p=>{const i=S.projects.findIndex(x=>x.id===p.id);if(i<0)S.projects.push(p);else S.projects[i]=p});

const _r=render;render=function(){_r();if((location.hash||"").startsWith("#project-"))renderDetail()};
function route2(){let h=(location.hash||"").slice(1),pg=h;
 if(h==="experience")h=pg="resume";
 const toC=h==="contact";if(toC)h=pg="about";
 const det=h.startsWith("project-");
 if(det)pg="detail";else if(!VIEWS.includes(h)||h==="detail")pg=h="home";
 const HOME=["home","experience","projects","about"];
 VIEWS.forEach(v=>$(v).classList.toggle("on",pg==="home"?HOME.includes(v):v===pg));
 document.body.classList.toggle("sub",pg!=="home");document.body.dataset.page=pg;
 const nv=det?"projects":pg;
 document.querySelectorAll("nav a.l").forEach(a=>a.classList.toggle("on",a.getAttribute("href")==="#"+nv));
 if(det)renderDetail();else document.title=S.profile.name+" – Portfolio";
 if(toC)$("cMe").scrollIntoView();else scrollTo(0,0);updProg()}
VIEWS.forEach(v=>$(v).classList.add("view"));
function route(){let h=(location.hash||"").slice(1);if(!VIEWS.includes(h))h="home";
 VIEWS.forEach(v=>$(v).classList.toggle("on",h==="home"||v===h));
 document.body.classList.toggle("sub",h!=="home");document.body.dataset.page=h;
 document.querySelectorAll("nav a.l").forEach(a=>a.classList.toggle("on",a.getAttribute("href")==="#"+h));
 scrollTo(0,0);updProg()}
addEventListener("hashchange",route2);route2();
render();
