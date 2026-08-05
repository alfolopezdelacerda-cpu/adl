"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { LayoutDashboard, CheckSquare, FileText, Calendar, Users, Bell, Plus, X, Edit2, Trash2, Sun, Moon, Mail, Search, ChevronLeft, ChevronRight, AlertTriangle, Menu, Check, Download, Upload, Shield, MessageSquare } from "lucide-react";
import { storage } from "../lib/storage";

const uid = () => Math.random().toString(36).slice(2,9);
const toDay = () => new Date().toISOString().split("T")[0];
const fmt = d => d ? new Date(d+"T12:00:00").toLocaleDateString("es-MX",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const daysLeft = d => { if(!d) return null; return Math.ceil((new Date(d+"T12:00:00")-new Date(toDay()+"T12:00:00"))/86400000); };
const getAssignees = task => task.assignees || (task.ass ? [task.ass] : []);

const PRIO=["Alta","Media","Baja"], STAT=["Pendiente","En proceso","Completado","Vencido"];
const PC={Alta:"#ef4444",Media:"#f59e0b",Baja:"#22c55e"};
const SC={Pendiente:"#94a3b8","En proceso":"#3b82f6",Completado:"#22c55e",Vencido:"#ef4444"};
const CCOLS=["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#22c55e","#06b6d4","#f97316","#6366f1"];
const MONTHS=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DNAMES=["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const INIT_C=[{id:uid(),name:"Alfonso",role:"General Manager",email:"alfonso@adltransportes.com",color:"#3b82f6"}];
const SK={t:"adlc5-tasks",m:"adlc5-min",c:"adlc5-col",n:"adlc5-notif",a:"adlc5-act"};
const ADMIN_PASS="0";

const dlCSV=(name,data,cols)=>{
  if(!data.length) return;
  const csv=[cols.join(","),...data.map(r=>cols.map(c=>`"${String(r[c]||"").replace(/"/g,'""')}"`).join(","))].join("\n");
  const a=Object.assign(document.createElement("a"),{href:URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv"})),download:name});
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
};
const parseCSV=txt=>{
  const lines=txt.trim().split("\n"); if(lines.length<2) return [];
  const hdrs=lines[0].split(",").map(h=>h.trim().replace(/^"|"$/g,""));
  return lines.slice(1).filter(l=>l.trim()).map(line=>{
    const vals=line.split(",").map(v=>v.trim().replace(/^"|"$/g,""));
    return Object.fromEntries(hdrs.map((h,i)=>[h,vals[i]||""]));
  });
};

const autoEmail=(collab,task,type,extra)=>{
  if(!collab?.email) return;
  const sub=type==="assigned"?`ADL Colabora — Nueva tarea: ${task.title}`:type==="status"?`ADL Colabora — Cambio de estatus: ${task.title}`:`ADL Colabora — Cambio de fecha: ${task.title}`;
  const body=type==="assigned"?`Hola ${collab.name},\n\nSe te ha asignado una tarea:\n📋 ${task.title}\n📅 Fecha: ${fmt(task.due)||"Sin fecha"}\n⚡ Prioridad: ${task.priority||"Media"}\n${task.desc?`📝 ${task.desc}\n`:""}\nSaludos,\nADL Colabora`:
    type==="status"?`Hola ${collab.name},\n\nActualización:\n📋 ${task.title}\n🔄 Nuevo estatus: ${extra||task.s}\n\nSaludos,\nADL Colabora`:
    `Hola ${collab.name},\n\nFecha modificada:\n📋 ${task.title}\n📅 Nueva fecha: ${fmt(task.due)}\n\nSaludos,\nADL Colabora`;
  window.open(`mailto:${collab.email}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`,"_blank");
};

const th=d=>({bg:d?"#0f172a":"#f1f5f9",card:d?"#1e293b":"#ffffff",border:d?"#334155":"#e2e8f0",text:d?"#f1f5f9":"#0f172a",sub:d?"#94a3b8":"#64748b",inp:d?"#0f172a":"#f8fafc",hov:d?"#334155":"#f1f5f9",side:d?"#1e293b":"#ffffff"});

function Toasts({toasts}){return(<div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">{toasts.map(to=>(<div key={to.id} className="flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl text-sm font-medium text-white" style={{background:to.type==="email"?"#3b82f6":to.type==="warn"?"#f59e0b":"#22c55e",minWidth:260,animation:"slideIn .3s ease"}}>{to.type==="email"?"✉️":to.type==="warn"?"⚠️":"✅"} {to.msg}</div>))}</div>);}

function Modal({title,onClose,children,t,wide}){return(<div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,.65)"}}><div className={`rounded-2xl shadow-2xl w-full ${wide?"max-w-2xl":"max-w-lg"} max-h-[90vh] overflow-y-auto`} style={{background:t.card,border:`1px solid ${t.border}`}}><div className="flex items-center justify-between p-5" style={{borderBottom:`1px solid ${t.border}`}}><h3 className="font-bold text-lg" style={{color:t.text}}>{title}</h3><button onClick={onClose} className="p-1 rounded-lg hover:opacity-70" style={{color:t.sub}}><X size={20}/></button></div><div className="p-5">{children}</div></div></div>);}

const FI=({label,t,...p})=>(<div className="mb-4">{label&&<label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{color:t.sub}}>{label}</label>}<input className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{background:t.inp,borderColor:t.border,color:t.text}} {...p}/></div>);
const FS=({label,t,opts,...p})=>(<div className="mb-4">{label&&<label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{color:t.sub}}>{label}</label>}<select className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{background:t.inp,borderColor:t.border,color:t.text}} {...p}>{opts.map(o=><option key={o.v??o} value={o.v??o}>{o.l??o}</option>)}</select></div>);
const FT=({label,t,...p})=>(<div className="mb-4">{label&&<label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{color:t.sub}}>{label}</label>}<textarea className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={3} style={{background:t.inp,borderColor:t.border,color:t.text}} {...p}/></div>);
const Bdg=({label,color})=>(<span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{background:color+"22",color}}>{label}</span>);

function AssigneeSelector({collabs,selected,onChange,t}){
  return(<div className="mb-4"><label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{color:t.sub}}>Asignados (puede ser compartida entre varios)</label>
    <div className="flex flex-wrap gap-2">{collabs.map(c=>{const sel=selected.includes(c.id);return(<button key={c.id} type="button" onClick={()=>onChange(sel?selected.filter(x=>x!==c.id):[...selected,c.id])} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all" style={{background:sel?c.color:"transparent",color:sel?"white":t.sub,borderColor:c.color}}>{sel&&<Check size={11}/>}{c.name}</button>);})}</div>
  </div>);
}

function AvatarStack({collabs,ids}){
  const shown=ids.slice(0,3),rest=ids.length-3;
  return(<div className="flex items-center">{shown.map((id,i)=>{const c=collabs.find(x=>x.id===id);return c?<div key={id} title={c.name} className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-white font-bold" style={{background:c.color,fontSize:8,marginLeft:i>0?-4:0,zIndex:10-i}}>{c.name[0]}</div>:null;})}{rest>0&&<div className="w-5 h-5 rounded-full border border-white bg-gray-500 flex items-center justify-center text-white font-bold" style={{fontSize:8,marginLeft:-4}}>+{rest}</div>}</div>);
}

function DashboardView({tasks,minutas,collabs,t}){
  const total=tasks.length,done=tasks.filter(x=>x.s==="Completado").length,overdue=tasks.filter(x=>x.s==="Vencido").length,inprog=tasks.filter(x=>x.s==="En proceso").length;
  const upcoming=tasks.filter(x=>x.s!=="Completado"&&x.due).sort((a,b)=>a.due.localeCompare(b.due)).slice(0,6);
  const cData=collabs.map(c=>{const mine=tasks.filter(x=>getAssignees(x).includes(c.id)),d2=mine.filter(x=>x.s==="Completado").length;return{name:c.name,total:mine.length,done:d2,pct:mine.length?Math.round(d2/mine.length*100):0,color:c.color};});
  return(
    <div>
      <div className="mb-6"><h1 className="text-2xl font-black" style={{color:t.text}}>Dashboard</h1><p className="text-sm mt-1" style={{color:t.sub}}>Resumen del equipo · {toDay()}</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">{[{l:"Total tareas",v:total,col:"#3b82f6",ic:"📋"},{l:"Completadas",v:done,col:"#22c55e",ic:"✅"},{l:"En proceso",v:inprog,col:"#f59e0b",ic:"⚙️"},{l:"Vencidas",v:overdue,col:"#ef4444",ic:"⚠️"}].map(s=>(<div key={s.l} className="rounded-2xl p-4" style={{background:t.card,border:`1px solid ${t.border}`}}><div className="text-2xl mb-2">{s.ic}</div><div className="text-3xl font-black mb-1" style={{color:s.col}}>{s.v}</div><div className="text-xs" style={{color:t.sub}}>{s.l}</div></div>))}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="rounded-2xl p-5" style={{background:t.card,border:`1px solid ${t.border}`}}>
          <h3 className="font-bold mb-4" style={{color:t.text}}>% Cumplimiento por colaborador</h3>
          {!cData.some(c=>c.total>0)?<p className="text-sm" style={{color:t.sub}}>Sin datos aún.</p>:<div className="space-y-3">{cData.map(c=>(<div key={c.name}><div className="flex justify-between text-xs mb-1.5"><span className="font-medium" style={{color:t.text}}>{c.name}</span><span style={{color:t.sub}}>{c.done}/{c.total} · <b style={{color:c.color}}>{c.pct}%</b></span></div><div className="h-2 rounded-full overflow-hidden" style={{background:t.hov}}><div className="h-full rounded-full transition-all" style={{width:`${c.pct}%`,background:c.color}}/></div></div>))}</div>}
        </div>
        <div className="rounded-2xl p-5" style={{background:t.card,border:`1px solid ${t.border}`}}>
          <h3 className="font-bold mb-4" style={{color:t.text}}>Próximos vencimientos</h3>
          {upcoming.length===0?<p className="text-sm" style={{color:t.sub}}>Sin vencimientos próximos.</p>:<div className="space-y-3">{upcoming.map(task=>{const dl=daysLeft(task.due),dc=dl===null?t.sub:dl<0?"#ef4444":dl<=3?"#f59e0b":"#22c55e";return(<div key={task.id} className="flex items-center gap-3"><div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:SC[task.s]}}/><div className="flex-1 min-w-0"><div className="text-sm font-medium truncate" style={{color:t.text}}>{task.title}</div><div className="text-xs" style={{color:t.sub}}><AvatarStack collabs={collabs} ids={getAssignees(task)}/></div></div><div className="text-xs font-bold flex-shrink-0" style={{color:dc}}>{dl===0?"Hoy":dl<0?`${Math.abs(dl)}d venc.`:dl===null?"—":`${dl}d`}</div></div>);})}</div>}
        </div>
      </div>
      {cData.some(c=>c.total>0)&&(<div className="rounded-2xl p-5" style={{background:t.card,border:`1px solid ${t.border}`}}><h3 className="font-bold mb-4" style={{color:t.text}}>Tareas por colaborador</h3><ResponsiveContainer width="100%" height={200}><BarChart data={cData}><CartesianGrid strokeDasharray="3 3" stroke={t.border}/><XAxis dataKey="name" tick={{fill:t.sub,fontSize:12}}/><YAxis tick={{fill:t.sub,fontSize:12}}/><Tooltip contentStyle={{background:t.card,borderColor:t.border,color:t.text,borderRadius:12}}/><Bar dataKey="total" name="Total" radius={[4,4,0,0]}>{cData.map((c,i)=><Cell key={i} fill={c.color}/>)}</Bar><Bar dataKey="done" name="Completadas" fill="#22c55e" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>)}
    </div>
  );
}

function TaskDetailModal({task,collabs,onClose,onUpdate,t,addNotif,addToast,logActivity}){
  const [status,setStatus]=useState(task.s);
  const [due,setDue]=useState(task.due||"");
  const [comment,setComment]=useState("");
  const [cAuthor,setCAuthor]=useState(collabs[0]?.id||"");
  const comments=task.comments||[];
  const dateChanges=task.dateChanges||[];
  const canDate=dateChanges.length<2;
  const dateChanged=due!==(task.due||"");
  const assignees=getAssignees(task);

  const save=()=>{
    let upd={...task};
    if(status!==task.s){
      upd.s=status;
      assignees.forEach(id=>{const a=collabs.find(c=>c.id===id);if(a){autoEmail(a,upd,"status",status);}});
      addToast(`Estatus → ${status}`,"email");
      addNotif({id:uid(),msg:`"${task.title}" cambió a ${status}`,date:toDay(),read:false});
      logActivity({type:"task_status",detail:`"${task.title}" cambió a ${status}`});
    }
    if(dateChanged&&canDate){
      upd.dateChanges=[...dateChanges,{from:task.due||"",to:due,date:toDay()}];
      upd.due=due;
      assignees.forEach(id=>{const a=collabs.find(c=>c.id===id);if(a){autoEmail(a,upd,"date");}});
      addToast(`Fecha actualizada a ${fmt(due)}`,"email");
      addNotif({id:uid(),msg:`Fecha de "${task.title}" → ${fmt(due)} (${upd.dateChanges.length}/2 cambios)`,date:toDay(),read:false});
      logActivity({type:"task_date",detail:`Fecha de "${task.title}" modificada a ${fmt(due)}`});
    }
    if(comment.trim()){
      const a=collabs.find(c=>c.id===cAuthor);
      upd.comments=[...comments,{id:uid(),authorId:cAuthor,authorName:a?.name||"—",text:comment.trim(),date:toDay()}];
      logActivity({type:"comment",detail:`Comentario en "${task.title}" por ${a?.name||"—"}`});
    }
    onUpdate(upd);
    onClose();
  };

  return(
    <Modal title={task.title} onClose={onClose} t={t} wide>
      {/* Info row */}
      <div className="grid grid-cols-2 gap-4 mb-4 p-4 rounded-xl" style={{background:t.hov}}>
        <div><p className="text-xs font-bold uppercase mb-1.5" style={{color:t.sub}}>Asignados</p>
          <div className="flex flex-wrap gap-1">{assignees.map(id=>{const c=collabs.find(x=>x.id===id);return c?<span key={id} className="px-2 py-0.5 rounded-full text-xs text-white font-semibold" style={{background:c.color}}>{c.name}</span>:null;})}{assignees.length===0&&<span className="text-xs" style={{color:t.sub}}>Sin asignar</span>}</div>
        </div>
        <div><p className="text-xs font-bold uppercase mb-1.5" style={{color:t.sub}}>Prioridad</p><Bdg label={task.priority} color={PC[task.priority]}/></div>
      </div>
      {task.desc&&<p className="text-sm mb-4 p-3 rounded-xl" style={{background:t.hov,color:t.sub}}>{task.desc}</p>}

      {/* Status */}
      <FS label="Cambiar estatus" t={t} value={status} onChange={e=>setStatus(e.target.value)} opts={STAT}/>

      {/* Due date with change tracking */}
      <div className="mb-4">
        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{color:t.sub}}>
          Fecha compromiso · <span style={{color:canDate?"#22c55e":"#ef4444"}}>{dateChanges.length}/2 cambios usados</span>
        </label>
        <input type="date" value={due} disabled={!canDate} onChange={e=>setDue(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={{background:canDate?t.inp:t.hov,borderColor:t.border,color:t.text,opacity:canDate?1:0.6}}/>
        {dateChanges.length>0&&<div className="mt-2 space-y-1">{dateChanges.map((dc,i)=><div key={i} className="text-xs px-2 py-1 rounded-lg" style={{background:t.hov,color:t.sub}}>Cambio {i+1}: {fmt(dc.from)} → {fmt(dc.to)} · {dc.date}</div>)}</div>}
        {!canDate&&<p className="text-xs mt-1" style={{color:"#ef4444"}}>Se alcanzó el límite de 2 cambios de fecha.</p>}
      </div>

      {/* Comments */}
      <div className="mb-4">
        <p className="text-xs font-bold uppercase mb-2" style={{color:t.sub}}>Comentarios ({comments.length})</p>
        <div className="space-y-2 mb-3 max-h-36 overflow-y-auto rounded-xl p-2" style={{background:t.hov}}>
          {comments.length===0?<p className="text-xs text-center py-2" style={{color:t.sub}}>Sin comentarios aún.</p>
            :comments.map(c=>(<div key={c.id} className="p-2.5 rounded-xl text-xs" style={{background:t.card}}><div className="flex justify-between mb-0.5"><span className="font-semibold" style={{color:t.text}}>{c.authorName}</span><span style={{color:t.sub}}>{c.date}</span></div><p style={{color:t.sub}}>{c.text}</p></div>))}
        </div>
        <div className="flex gap-2">
          <select value={cAuthor} onChange={e=>setCAuthor(e.target.value)} className="px-2 py-2 rounded-xl border text-xs outline-none" style={{background:t.inp,borderColor:t.border,color:t.text}}>
            {collabs.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input value={comment} onChange={e=>setComment(e.target.value)} placeholder="Agrega un comentario..." className="flex-1 px-3 py-2 rounded-xl border text-sm outline-none" style={{background:t.inp,borderColor:t.border,color:t.text}} onKeyDown={e=>{if(e.key==="Enter"&&comment.trim()) save();}}/>
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm" style={{borderColor:t.border,color:t.sub}}>Cancelar</button>
        <button onClick={save} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{background:"#3b82f6"}}>Guardar cambios</button>
      </div>
    </Modal>
  );
}

function TasksView({tasks,setTasks,collabs,t,addNotif,addToast,logActivity}){
  const [modal,setModal]=useState(null);
  // Guardamos solo el ID para que el modal siempre lea la tarea MÁS RECIENTE del estado
  // (evita el bug de props stale cuando el polling actualiza tasks mientras el modal está abierto)
  const [detailId,setDetailId]=useState(null);
  const detail=detailId?tasks.find(t=>t.id===detailId)||null:null;
  const setDetail=t=>{setDetailId(t?.id||null);}; // wrapper compatible con el JSX existente
  const [filt,setFilt]=useState({s:"",p:"",a:"",q:""});
  const blank={title:"",desc:"",assignees:[],priority:"Media",s:"Pendiente",due:""};
  const [form,setForm]=useState(blank);

  const openNew=()=>{setForm(blank);setModal("new");};
  const openEdit=task=>{setForm({title:task.title,desc:task.desc||"",assignees:getAssignees(task),priority:task.priority,s:task.s,due:task.due||"",_ps:task.s,_pa:getAssignees(task)});setModal(task);};

  const save=()=>{
    if(!form.title.trim()) return;
    if(modal==="new"){
      const nt={...form,id:uid(),createdAt:toDay(),comments:[],dateChanges:[]};
      setTasks(p=>[...p,nt]);
      form.assignees.forEach(id=>{const a=collabs.find(c=>c.id===id);if(a){autoEmail(a,nt,"assigned");addToast(`✉️ Correo a ${a.name} — nueva tarea`,"email");addNotif({id:uid(),msg:`"${form.title}" asignada a ${a.name}`,date:toDay(),read:false});}});
      logActivity({type:"task_new",detail:`Tarea "${form.title}" creada`});
    } else {
      const upd={...modal,...form};
      setTasks(p=>p.map(x=>x.id===modal.id?upd:x));
      const newAss=form.assignees.filter(id=>!form._pa.includes(id));
      newAss.forEach(id=>{const a=collabs.find(c=>c.id===id);if(a){autoEmail(a,upd,"assigned");addToast(`✉️ Correo a ${a.name} — reasignación`,"email");}});
      if(form.s!==form._ps){
        form.assignees.forEach(id=>{const a=collabs.find(c=>c.id===id);if(a) autoEmail(a,upd,"status",form.s);});
        addNotif({id:uid(),msg:`"${form.title}" → ${form.s}`,date:toDay(),read:false});
        logActivity({type:"task_status",detail:`"${form.title}" cambió a ${form.s}`});
      }
    }
    setModal(null);
  };

  const del=id=>{if(window.confirm("¿Eliminar tarea?")) setTasks(p=>p.filter(x=>x.id!==id));};
  const onUpdate=upd=>setTasks(p=>p.map(x=>x.id===upd.id?upd:x));

  const filtered=tasks.filter(x=>{
    if(filt.s&&x.s!==filt.s) return false;
    if(filt.p&&x.priority!==filt.p) return false;
    if(filt.a&&!getAssignees(x).includes(filt.a)) return false;
    if(filt.q&&!x.title.toLowerCase().includes(filt.q.toLowerCase())) return false;
    return true;
  }).sort((a,b)=>{if(a.s==="Vencido"&&b.s!=="Vencido") return -1; if(!a.due) return 1; return a.due.localeCompare(b.due);});

  return(
    <div>
      <div className="flex items-center justify-between mb-4">
        <div><h1 className="text-2xl font-black" style={{color:t.text}}>Pendientes</h1><p className="text-sm mt-1" style={{color:t.sub}}>{tasks.length} tareas · Haz clic en el título para ver detalle</p></div>
        <button onClick={openNew} className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm text-white" style={{background:"#3b82f6"}}><Plus size={15}/>Nueva tarea</button>
      </div>

      <div className="rounded-2xl p-4 mb-4 flex flex-wrap gap-2" style={{background:t.card,border:`1px solid ${t.border}`}}>
        <div className="relative flex-1" style={{minWidth:140}}>
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:t.sub}}/>
          <input placeholder="Buscar..." value={filt.q} onChange={e=>setFilt(p=>({...p,q:e.target.value}))} className="w-full pl-8 pr-3 py-2 rounded-xl border text-sm outline-none" style={{background:t.inp,borderColor:t.border,color:t.text}}/>
        </div>
        <select value={filt.s} onChange={e=>setFilt(p=>({...p,s:e.target.value}))} className="px-3 py-2 rounded-xl border text-sm outline-none" style={{background:t.inp,borderColor:t.border,color:t.text}}><option value="">Estado</option>{STAT.map(o=><option key={o} value={o}>{o}</option>)}</select>
        <select value={filt.p} onChange={e=>setFilt(p=>({...p,p:e.target.value}))} className="px-3 py-2 rounded-xl border text-sm outline-none" style={{background:t.inp,borderColor:t.border,color:t.text}}><option value="">Prioridad</option>{PRIO.map(o=><option key={o} value={o}>{o}</option>)}</select>
        <select value={filt.a} onChange={e=>setFilt(p=>({...p,a:e.target.value}))} className="px-3 py-2 rounded-xl border text-sm outline-none" style={{background:t.inp,borderColor:t.border,color:t.text}}><option value="">Asignado</option>{collabs.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </div>

      <div className="space-y-2">
        {filtered.length===0?<div className="text-center py-16" style={{color:t.sub}}><CheckSquare size={48} className="mx-auto mb-3 opacity-20"/><p>Sin tareas. ¡Agrega la primera!</p></div>
          :filtered.map(task=>{
            const asns=getAssignees(task),dl=daysLeft(task.due),dc=dl===null?t.sub:dl<0?"#ef4444":dl<=3?"#f59e0b":t.sub;
            const cmts=(task.comments||[]).length, dcs=(task.dateChanges||[]).length;
            return(<div key={task.id} className="rounded-2xl p-4 flex items-center gap-3 transition-all" style={{background:t.card,border:`1px solid ${task.s==="Vencido"?"#ef444440":t.border}`}}>
              <div className="flex-1 min-w-0">
                <button onClick={()=>setDetail(task)} className="text-left w-full">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`font-semibold text-sm hover:underline ${task.s==="Completado"?"line-through opacity-40":""}`} style={{color:t.text}}>{task.title}</span>
                    <Bdg label={task.priority} color={PC[task.priority]}/><Bdg label={task.s} color={SC[task.s]}/>
                    {cmts>0&&<span className="text-xs flex items-center gap-1" style={{color:t.sub}}><MessageSquare size={11}/>{cmts}</span>}
                    {dcs>0&&<span className="text-xs" style={{color:"#f59e0b"}}>📅{dcs}/2</span>}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {asns.length>0&&<AvatarStack collabs={collabs} ids={asns}/>}
                    {task.due&&<span className="text-xs" style={{color:dc}}>📅 {fmt(task.due)}{dl===0?" · Hoy":dl!==null&&dl<0?` · ${Math.abs(dl)}d venc.`:dl!==null&&dl<=3?` · ${dl}d`:""}</span>}
                    {task.minutaId&&<span className="text-xs px-1.5 py-0.5 rounded-full" style={{background:"#8b5cf620",color:"#8b5cf6"}}>Minuta</span>}
                  </div>
                </button>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={()=>openEdit(task)} className="p-2 rounded-xl hover:opacity-70" style={{color:t.sub}}><Edit2 size={14}/></button>
                <button onClick={()=>del(task.id)} className="p-2 rounded-xl hover:opacity-70" style={{color:"#ef4444"}}><Trash2 size={14}/></button>
              </div>
            </div>);
          })
        }
      </div>

      {detail&&<TaskDetailModal task={detail} collabs={collabs} onClose={()=>setDetail(null)} onUpdate={upd=>{onUpdate(upd);setDetail(null);}} t={t} addNotif={addNotif} addToast={addToast} logActivity={logActivity}/>}

      {modal&&(<Modal title={modal==="new"?"Nueva tarea":"Editar tarea"} onClose={()=>setModal(null)} t={t}>
        <FI label="Título *" t={t} value={form.title} placeholder="Nombre de la tarea" onChange={e=>setForm(p=>({...p,title:e.target.value}))}/>
        <FT label="Descripción" t={t} value={form.desc} placeholder="Detalle o contexto..." onChange={e=>setForm(p=>({...p,desc:e.target.value}))}/>
        <AssigneeSelector collabs={collabs} selected={form.assignees} onChange={v=>setForm(p=>({...p,assignees:v}))} t={t}/>
        <div className="grid grid-cols-2 gap-3">
          <FS label="Prioridad" t={t} value={form.priority} onChange={e=>setForm(p=>({...p,priority:e.target.value}))} opts={PRIO}/>
          <FS label="Estado" t={t} value={form.s} onChange={e=>setForm(p=>({...p,s:e.target.value}))} opts={STAT}/>
        </div>
        <FI label="Fecha compromiso" t={t} type="date" value={form.due} onChange={e=>setForm(p=>({...p,due:e.target.value}))}/>
        {form.assignees.length>0&&<div className="mb-3 px-3 py-2.5 rounded-xl flex items-center gap-2 text-xs" style={{background:"#3b82f610",border:"1px solid #3b82f630",color:"#3b82f6"}}><Mail size={13}/>Se enviará correo a los {form.assignees.length} asignados al guardar</div>}
        <div className="flex gap-3 pt-1">
          <button onClick={()=>setModal(null)} className="flex-1 py-2.5 rounded-xl border text-sm" style={{borderColor:t.border,color:t.sub}}>Cancelar</button>
          <button onClick={save} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{background:"#3b82f6"}}>Guardar</button>
        </div>
      </Modal>)}
    </div>
  );
}

function MinutasView({minutas,setMinutas,tasks,setTasks,collabs,t,addNotif,addToast,logActivity}){
  const [modal,setModal]=useState(null);
  const [view,setView]=useState(null);
  const blank={date:toDay(),topic:"",participants:[],notes:"",agreements:[]};
  const [form,setForm]=useState(blank);
  const [agr,setAgr]=useState({title:"",assignees:[],due:""});
  const openNew=()=>{setForm(blank);setModal(true);};
  const addAgr=()=>{if(!agr.title.trim()) return;setForm(p=>({...p,agreements:[...p.agreements,{...agr,id:uid()}]}));setAgr({title:"",assignees:[],due:""}); };
  const rmAgr=id=>setForm(p=>({...p,agreements:p.agreements.filter(a=>a.id!==id)}));
  const togPart=id=>setForm(p=>({...p,participants:p.participants.includes(id)?p.participants.filter(x=>x!==id):[...p.participants,id]}));

  const save=()=>{
    if(!form.topic.trim()) return;
    const min={...form,id:uid(),createdAt:toDay()};
    setMinutas(p=>[min,...p]);
    const newTasks=form.agreements.map(a=>({id:uid(),title:a.title,desc:`Acuerdo: ${form.topic}`,assignees:a.assignees,priority:"Media",s:"Pendiente",due:a.due||"",createdAt:toDay(),minutaId:min.id,comments:[],dateChanges:[]}));
    setTasks(p=>[...p,...newTasks]);
    const notified=new Set();
    newTasks.forEach(task=>{
      task.assignees.forEach(id=>{const a=collabs.find(c=>c.id===id);if(a&&!notified.has(a.id)){autoEmail(a,task,"assigned");addToast(`✉️ Correo a ${a.name} — acuerdo de minuta`,"email");addNotif({id:uid(),msg:`Acuerdo asignado a ${a.name}: "${task.title}"`,date:toDay(),read:false});notified.add(a.id);}});
    });
    logActivity({type:"minuta",detail:`Minuta "${form.topic}" creada con ${form.agreements.length} acuerdos`});
    setModal(null);
  };
  const del=id=>{if(window.confirm("¿Eliminar minuta?")) setMinutas(p=>p.filter(x=>x.id!==id));};

  return(<div>
    <div className="flex items-center justify-between mb-6"><div><h1 className="text-2xl font-black" style={{color:t.text}}>Minutas</h1><p className="text-sm mt-1" style={{color:t.sub}}>{minutas.length} minutas</p></div><button onClick={openNew} className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm text-white" style={{background:"#8b5cf6"}}><Plus size={15}/>Nueva minuta</button></div>
    <div className="space-y-3">
      {minutas.length===0?<div className="text-center py-16" style={{color:t.sub}}><FileText size={48} className="mx-auto mb-3 opacity-20"/><p>Sin minutas.</p></div>
        :minutas.map(m=>{const mt=tasks.filter(x=>x.minutaId===m.id),done=mt.filter(x=>x.s==="Completado").length,pts=m.participants.map(id=>collabs.find(c=>c.id===id)).filter(Boolean);
          return(<div key={m.id} className="rounded-2xl p-5" style={{background:t.card,border:`1px solid ${t.border}`}}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1"><div className="flex items-center gap-3 flex-wrap mb-2"><span className="font-bold" style={{color:t.text}}>{m.topic}</span><span className="text-xs px-2 py-0.5 rounded-full" style={{background:"#8b5cf622",color:"#8b5cf6"}}>{fmt(m.date)}</span></div>
              <div className="flex items-center gap-4 text-xs flex-wrap" style={{color:t.sub}}><span>📋 {m.agreements.length} acuerdos</span>{mt.length>0&&<span>✅ {done}/{mt.length}</span>}{pts.length>0&&<span>👥 {pts.map(p=>p.name).join(", ")}</span>}</div></div>
              <div className="flex gap-1"><button onClick={()=>setView(m)} className="px-3 py-1.5 rounded-xl text-xs font-semibold" style={{background:"#8b5cf620",color:"#8b5cf6"}}>Ver</button><button onClick={()=>del(m.id)} className="p-2 rounded-xl hover:opacity-70" style={{color:"#ef4444"}}><Trash2 size={14}/></button></div>
            </div>
          </div>);
        })}
    </div>

    {modal&&(<Modal title="Nueva minuta" onClose={()=>setModal(null)} t={t} wide>
      <div className="grid grid-cols-2 gap-3"><FI label="Fecha" t={t} type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/><div/></div>
      <FI label="Tema *" t={t} value={form.topic} placeholder="Ej: Reunión semanal ADL" onChange={e=>setForm(p=>({...p,topic:e.target.value}))}/>
      <FT label="Notas" t={t} value={form.notes} placeholder="Resumen..." onChange={e=>setForm(p=>({...p,notes:e.target.value}))}/>
      <div className="mb-4"><label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{color:t.sub}}>Participantes</label><div className="flex flex-wrap gap-2">{collabs.map(c=>(<button key={c.id} onClick={()=>togPart(c.id)} className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all" style={{background:form.participants.includes(c.id)?c.color:"transparent",color:form.participants.includes(c.id)?"white":t.sub,borderColor:c.color}}>{c.name}</button>))}</div></div>
      <div className="mb-4">
        <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{color:t.sub}}>Acuerdos → tareas automáticas</label>
        <div className="flex gap-2 mb-2 flex-wrap">
          <input placeholder="Acuerdo…" value={agr.title} onChange={e=>setAgr(p=>({...p,title:e.target.value}))} className="flex-1 px-3 py-2 rounded-xl border text-sm outline-none" style={{background:t.inp,borderColor:t.border,color:t.text,minWidth:100}}/>
          <input type="date" value={agr.due} onChange={e=>setAgr(p=>({...p,due:e.target.value}))} className="px-3 py-2 rounded-xl border text-sm outline-none" style={{background:t.inp,borderColor:t.border,color:t.text}}/>
          <button onClick={addAgr} className="px-4 py-2 rounded-xl text-white font-bold" style={{background:"#8b5cf6"}}>+</button>
        </div>
        <div className="mb-2"><AssigneeSelector collabs={collabs} selected={agr.assignees} onChange={v=>setAgr(p=>({...p,assignees:v}))} t={t}/></div>
        <div className="space-y-1">{form.agreements.map(a=>{const asns=a.assignees.map(id=>collabs.find(c=>c.id===id)?.name).filter(Boolean);return(<div key={a.id} className="flex items-center gap-2 p-2.5 rounded-xl text-xs" style={{background:t.hov}}><div className="flex-1 font-medium" style={{color:t.text}}>{a.title}</div>{asns.length>0&&<span style={{color:t.sub}}>{asns.join(", ")}</span>}{a.due&&<span style={{color:t.sub}}>{fmt(a.due)}</span>}<button onClick={()=>rmAgr(a.id)} style={{color:"#ef4444"}}><X size={13}/></button></div>);})}</div>
      </div>
      <div className="flex gap-3 pt-1">
        <button onClick={()=>setModal(null)} className="flex-1 py-2.5 rounded-xl border text-sm" style={{borderColor:t.border,color:t.sub}}>Cancelar</button>
        <button onClick={save} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{background:"#8b5cf6"}}>Guardar minuta</button>
      </div>
    </Modal>)}

    {view&&(<Modal title={view.topic} onClose={()=>setView(null)} t={t} wide>
      <div className="space-y-4">
        <div><p className="text-xs font-bold uppercase mb-1" style={{color:t.sub}}>Fecha</p><p className="text-sm" style={{color:t.text}}>{fmt(view.date)}</p></div>
        {view.notes&&<div><p className="text-xs font-bold uppercase mb-1" style={{color:t.sub}}>Notas</p><p className="text-sm" style={{color:t.text}}>{view.notes}</p></div>}
        {view.participants.length>0&&<div><p className="text-xs font-bold uppercase mb-2" style={{color:t.sub}}>Participantes</p><div className="flex flex-wrap gap-2">{view.participants.map(id=>{const c=collabs.find(x=>x.id===id);return c?<span key={id} className="px-2 py-0.5 rounded-full text-xs text-white" style={{background:c.color}}>{c.name}</span>:null;})}</div></div>}
        {view.agreements.length>0&&<div><p className="text-xs font-bold uppercase mb-2" style={{color:t.sub}}>Acuerdos</p><div className="space-y-2">{view.agreements.map(a=>{const task=tasks.find(x=>x.minutaId===view.id&&x.title===a.title);const asns=(a.assignees||[]).map(id=>collabs.find(c=>c.id===id)?.name).filter(Boolean);return(<div key={a.id} className="flex items-center gap-2 p-3 rounded-xl" style={{background:t.hov}}><div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:task?SC[task.s]:"#94a3b8"}}/><div className="flex-1 text-sm" style={{color:t.text}}>{a.title}</div>{asns.length>0&&<span className="text-xs" style={{color:t.sub}}>{asns.join(", ")}</span>}{a.due&&<span className="text-xs" style={{color:t.sub}}>{fmt(a.due)}</span>}{task&&<Bdg label={task.s} color={SC[task.s]}/>}</div>);})}</div></div>}
      </div>
    </Modal>)}
  </div>);
}

function CalendarView({tasks,collabs,t}){
  const [curr,setCurr]=useState(new Date());const [sel,setSel]=useState(null);
  const yr=curr.getFullYear(),mo=curr.getMonth(),firstDay=new Date(yr,mo,1).getDay(),daysInMo=new Date(yr,mo+1,0).getDate(),pad=n=>String(n).padStart(2,"0"),todayStr=toDay();
  const byDate={};tasks.forEach(task=>{if(task.due){if(!byDate[task.due])byDate[task.due]=[];byDate[task.due].push(task);}});
  const selStr=sel?`${yr}-${pad(mo+1)}-${pad(sel)}`:null,selTasks=selStr?(byDate[selStr]||[]):[];
  return(<div>
    <div className="mb-6"><h1 className="text-2xl font-black" style={{color:t.text}}>Calendario</h1><p className="text-sm mt-1" style={{color:t.sub}}>Fechas compromiso del equipo</p></div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 rounded-2xl p-5" style={{background:t.card,border:`1px solid ${t.border}`}}>
        <div className="flex items-center justify-between mb-5"><button onClick={()=>setCurr(new Date(yr,mo-1,1))} className="p-2 rounded-xl hover:opacity-70" style={{color:t.sub}}><ChevronLeft size={18}/></button><h3 className="font-black text-lg" style={{color:t.text}}>{MONTHS[mo]} {yr}</h3><button onClick={()=>setCurr(new Date(yr,mo+1,1))} className="p-2 rounded-xl hover:opacity-70" style={{color:t.sub}}><ChevronRight size={18}/></button></div>
        <div className="grid grid-cols-7 mb-2">{DNAMES.map(d=><div key={d} className="text-center text-xs font-bold py-1" style={{color:t.sub}}>{d}</div>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {Array(firstDay).fill(null).map((_,i)=><div key={`e${i}`}/>)}
          {Array(daysInMo).fill(null).map((_,i)=>{const day=i+1,ds=`${yr}-${pad(mo+1)}-${pad(day)}`,dt=byDate[ds]||[],isToday=ds===todayStr,isSel=sel===day,hasV=dt.some(x=>x.s==="Vencido"),hasA=dt.some(x=>x.s!=="Completado"&&x.s!=="Vencido"),hasD=dt.some(x=>x.s==="Completado");
            return(<button key={day} onClick={()=>setSel(sel===day?null:day)} className="flex flex-col items-center py-1 rounded-xl text-xs hover:opacity-80 transition-all" style={{background:isSel?"#3b82f6":isToday?"#3b82f620":"transparent",color:isSel?"white":t.text,border:isToday&&!isSel?"1px solid #3b82f6":"1px solid transparent",minHeight:40}}>
              <span className="font-semibold">{day}</span>
              {dt.length>0&&<div className="flex gap-0.5 mt-0.5">{hasV&&<div className="w-1.5 h-1.5 rounded-full" style={{background:isSel?"white":"#ef4444"}}/>}{hasA&&<div className="w-1.5 h-1.5 rounded-full" style={{background:isSel?"white":"#3b82f6"}}/>}{hasD&&<div className="w-1.5 h-1.5 rounded-full" style={{background:isSel?"white":"#22c55e"}}/>}</div>}
            </button>);
          })}
        </div>
      </div>
      <div className="rounded-2xl p-5" style={{background:t.card,border:`1px solid ${t.border}`}}>
        {sel?(<><h3 className="font-bold mb-4" style={{color:t.text}}>{sel} de {MONTHS[mo]}</h3>
          {selTasks.length===0?<p className="text-sm" style={{color:t.sub}}>Sin tareas.</p>:<div className="space-y-2">{selTasks.map(task=>(<div key={task.id} className="p-3 rounded-xl" style={{background:t.hov}}><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold" style={{color:t.text}}>{task.title}</p><AvatarStack collabs={collabs} ids={getAssignees(task)}/></div><Bdg label={task.s} color={SC[task.s]}/></div></div>))}</div>}
        </>):(<><h3 className="font-bold mb-4" style={{color:t.text}}>Este mes</h3>
          <div className="space-y-2">{Object.entries(byDate).filter(([d])=>d.startsWith(`${yr}-${pad(mo+1)}`)).sort(([a],[b])=>a.localeCompare(b)).slice(0,10).map(([date,dt])=>(<div key={date} className="flex items-start gap-2"><span className="text-xs w-6 font-bold" style={{color:t.sub}}>{date.split("-")[2]}</span><div className="flex flex-wrap gap-1">{dt.map(task=>(<span key={task.id} className="text-xs px-2 py-0.5 rounded-full" style={{background:SC[task.s]+"22",color:SC[task.s]}}>{task.title.slice(0,16)}{task.title.length>16?"…":""}</span>))}</div></div>))}
          {!Object.entries(byDate).some(([d])=>d.startsWith(`${yr}-${pad(mo+1)}`))&&<p className="text-sm" style={{color:t.sub}}>Sin tareas este mes.</p>}</div>
        </>)}
      </div>
    </div>
  </div>);
}

function CollaboratorsView({collabs,setCollabs,tasks,setTasks,t,addToast,logActivity}){
  const [modal,setModal]=useState(null);
  const blank={name:"",role:"",email:"",color:CCOLS[0]};
  const [form,setForm]=useState(blank);
  const fileRef=useRef();
  const openNew=()=>{setForm({...blank,color:CCOLS[collabs.length%CCOLS.length]});setModal("new");};
  const openEdit=c=>{setForm({...c});setModal(c);};
  const save=()=>{if(!form.name.trim()||!form.email.trim()) return;if(modal==="new"){setCollabs(p=>[...p,{...form,id:uid()}]);logActivity({type:"collab",detail:`Colaborador "${form.name}" agregado`});}else setCollabs(p=>p.map(x=>x.id===modal.id?{...x,...form}:x));setModal(null);};
  const del=id=>{
    const c=collabs.find(x=>x.id===id),cnt=tasks.filter(x=>getAssignees(x).includes(id)).length;
    const msg=`¿Eliminar a ${c?.name||"este colaborador"}?${cnt>0?`\n\nTiene ${cnt} tarea(s) asignada(s) — quedarán sin responsable.`:""}`;
    if(!window.confirm(msg)) return;
    setTasks(p=>p.map(t=>({...t,assignees:(t.assignees||[]).filter(a=>a!==id)})));
    setCollabs(p=>p.filter(x=>x.id!==id));
    addToast(`🗑️ ${c?.name||"Colaborador"} eliminado`,"warn");
    logActivity({type:"collab",detail:`Colaborador "${c?.name}" eliminado del equipo`});
  };
  const remind=c=>{const mine=tasks.filter(x=>getAssignees(x).includes(c.id)&&x.s!=="Completado"),ov=mine.filter(x=>x.s==="Vencido"),up=mine.filter(x=>x.s!=="Vencido").slice(0,5);const sub=`ADL Colabora — Tus pendientes`;let body=`Hola ${c.name},\n\n`;if(ov.length){body+=`⚠️ VENCIDAS:\n`;ov.forEach(x=>{body+=`• ${x.title} — ${fmt(x.due)}\n`;});body+="\n";}if(up.length){body+=`📋 PENDIENTES:\n`;up.forEach(x=>{body+=`• ${x.title} — ${fmt(x.due)||"Sin fecha"}\n`;});}body+="\n\nSaludos,\nADL Colabora";window.open(`mailto:${c.email}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`);addToast(`✉️ Recordatorio a ${c.name}`,"email");};

  const dlTemplate=()=>dlCSV("plantilla_colaboradores.csv",[{Nombre:"Ejemplo López",Rol:"Coordinador",Correo:"correo@empresa.com",Color:"#3b82f6"}],["Nombre","Rol","Correo","Color"]);
  const uploadCSV=e=>{const file=e.target.files[0];if(!file) return;const r=new FileReader();r.onload=ev=>{const rows=parseCSV(ev.target.result);const nc=rows.filter(x=>x.Nombre&&x.Correo).map(x=>({id:uid(),name:x.Nombre,role:x.Rol||"",email:x.Correo,color:x.Color||CCOLS[collabs.length%CCOLS.length]})).filter(nc=>!collabs.some(c=>c.email===nc.email));if(!nc.length){addToast("Sin nuevos registros válidos","warn");return;}setCollabs(p=>[...p,...nc]);logActivity({type:"collab",detail:`${nc.length} colaboradores importados por CSV`});addToast(`✅ ${nc.length} colaboradores importados`,"info");};r.readAsText(file);e.target.value="";};

  return(<div>
    <div className="flex items-center justify-between mb-5">
      <div><h1 className="text-2xl font-black" style={{color:t.text}}>Colaboradores</h1><p className="text-sm mt-1" style={{color:t.sub}}>{collabs.length} miembros</p></div>
      <div className="flex gap-2">
        <button onClick={dlTemplate} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border" style={{borderColor:t.border,color:t.sub}}><Download size={13}/>Plantilla CSV</button>
        <button onClick={()=>fileRef.current.click()} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border" style={{borderColor:"#22c55e",color:"#22c55e"}}><Upload size={13}/>Importar CSV</button>
        <input ref={fileRef} type="file" accept=".csv" onChange={uploadCSV} className="hidden"/>
        <button onClick={openNew} className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm text-white" style={{background:"#22c55e"}}><Plus size={15}/>Agregar</button>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {collabs.map(c=>{const mine=tasks.filter(x=>getAssignees(x).includes(c.id)),done=mine.filter(x=>x.s==="Completado").length,ov=mine.filter(x=>x.s==="Vencido").length,pct=mine.length?Math.round(done/mine.length*100):0;
        return(<div key={c.id} className="rounded-2xl p-5" style={{background:t.card,border:`1px solid ${t.border}`}}>
          <div className="flex items-start justify-between mb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl" style={{background:c.color}}>{c.name[0]}</div><div><div className="font-bold" style={{color:t.text}}>{c.name}</div><div className="text-xs" style={{color:t.sub}}>{c.role||"Sin rol"}</div></div></div><div className="flex gap-1"><button onClick={()=>openEdit(c)} className="p-1.5 rounded-lg hover:opacity-70" style={{color:t.sub}}><Edit2 size={13}/></button><button onClick={()=>del(c.id)} className="p-1.5 rounded-lg hover:opacity-70" style={{color:"#ef4444"}}><Trash2 size={13}/></button></div></div>
          <div className="flex items-center gap-1.5 text-xs mb-3 truncate" style={{color:t.sub}}><Mail size={12}/>{c.email}</div>
          <div className="grid grid-cols-3 gap-2 mb-3">{[["Total",mine.length,"#3b82f6"],["Hechas",done,"#22c55e"],["Vencidas",ov,"#ef4444"]].map(([l,v,col])=>(<div key={l} className="text-center p-2 rounded-xl" style={{background:t.hov}}><div className="font-black text-lg" style={{color:col}}>{v}</div><div className="text-xs" style={{color:t.sub}}>{l}</div></div>))}</div>
          <div className="mb-3"><div className="flex justify-between text-xs mb-1.5"><span style={{color:t.sub}}>Cumplimiento</span><b style={{color:c.color}}>{pct}%</b></div><div className="h-2 rounded-full overflow-hidden" style={{background:t.hov}}><div className="h-full rounded-full transition-all" style={{width:`${pct}%`,background:c.color}}/></div></div>
          <button onClick={()=>remind(c)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border transition-all hover:opacity-80" style={{borderColor:c.color,color:c.color}}><Mail size={13}/>Enviar recordatorio</button>
        </div>);
      })}
    </div>
    {modal&&(<Modal title={modal==="new"?"Nuevo colaborador":"Editar"} onClose={()=>setModal(null)} t={t}>
      <FI label="Nombre *" t={t} value={form.name} placeholder="Nombre completo" onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
      <FI label="Puesto / Rol" t={t} value={form.role} placeholder="Ej: Coordinador de Operaciones" onChange={e=>setForm(p=>({...p,role:e.target.value}))}/>
      <FI label="Correo *" t={t} type="email" value={form.email} placeholder="correo@empresa.com" onChange={e=>setForm(p=>({...p,email:e.target.value}))}/>
      <div className="mb-4"><label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{color:t.sub}}>Color</label><div className="flex gap-2 flex-wrap">{CCOLS.map(col=>(<button key={col} onClick={()=>setForm(p=>({...p,color:col}))} className="w-8 h-8 rounded-full border-2 transition-all" style={{background:col,borderColor:form.color===col?"white":"transparent",transform:form.color===col?"scale(1.25)":"scale(1)"}}/>))}</div></div>
      <div className="flex gap-3 pt-1"><button onClick={()=>setModal(null)} className="flex-1 py-2.5 rounded-xl border text-sm" style={{borderColor:t.border,color:t.sub}}>Cancelar</button><button onClick={save} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{background:"#22c55e"}}>Guardar</button></div>
    </Modal>)}
  </div>);
}

function ReportsView({tasks,collabs,minutas,t}){
  const cStats=collabs.map(c=>{const mine=tasks.filter(x=>getAssignees(x).includes(c.id)),done=mine.filter(x=>x.s==="Completado").length,ov=mine.filter(x=>x.s==="Vencido").length,ip=mine.filter(x=>x.s==="En proceso").length;return{...c,total:mine.length,done,ov,ip,pct:mine.length?Math.round(done/mine.length*100):0};});
  const expTasks=()=>dlCSV("ADL_Tareas.csv",tasks.map(task=>({Título:task.title,Descripción:task.desc||"",Asignados:getAssignees(task).map(id=>collabs.find(c=>c.id===id)?.name||"").filter(Boolean).join("; "),Prioridad:task.priority,Estatus:task.s,"Fecha compromiso":task.due||"",Creado:task.createdAt||"",Comentarios:(task.comments||[]).length,"Cambios de fecha":(task.dateChanges||[]).length})),["Título","Descripción","Asignados","Prioridad","Estatus","Fecha compromiso","Creado","Comentarios","Cambios de fecha"]);
  const expCollabs=()=>dlCSV("ADL_Colaboradores.csv",cStats.map(c=>({Nombre:c.name,Rol:c.role,Correo:c.email,Total:c.total,Completadas:c.done,"En proceso":c.ip,Vencidas:c.ov,Cumplimiento:`${c.pct}%`})),["Nombre","Rol","Correo","Total","Completadas","En proceso","Vencidas","Cumplimiento"]);
  const expMinutas=()=>dlCSV("ADL_Minutas.csv",minutas.map(m=>({Tema:m.topic,Fecha:m.date,Participantes:m.participants.map(id=>collabs.find(c=>c.id===id)?.name||"").filter(Boolean).join("; "),Acuerdos:m.agreements.length,Notas:m.notes||""})),["Tema","Fecha","Participantes","Acuerdos","Notas"]);

  return(<div>
    <div className="flex items-center justify-between mb-6">
      <div><h1 className="text-2xl font-black" style={{color:t.text}}>Reportes</h1><p className="text-sm mt-1" style={{color:t.sub}}>Exporta datos y analiza desempeño</p></div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={expTasks} className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs text-white" style={{background:"#3b82f6"}}><Download size={13}/>Tareas CSV</button>
        <button onClick={expCollabs} className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs text-white" style={{background:"#8b5cf6"}}><Download size={13}/>Colaboradores CSV</button>
        <button onClick={expMinutas} className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs text-white" style={{background:"#06b6d4"}}><Download size={13}/>Minutas CSV</button>
      </div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">{[{l:"Total tareas",v:tasks.length,col:"#3b82f6"},{l:"Completadas",v:tasks.filter(x=>x.s==="Completado").length,col:"#22c55e"},{l:"Vencidas",v:tasks.filter(x=>x.s==="Vencido").length,col:"#ef4444"},{l:"Minutas",v:minutas.length,col:"#8b5cf6"}].map(s=>(<div key={s.l} className="rounded-2xl p-4 text-center" style={{background:t.card,border:`1px solid ${t.border}`}}><div className="text-2xl font-black mb-1" style={{color:s.col}}>{s.v}</div><div className="text-xs" style={{color:t.sub}}>{s.l}</div></div>))}</div>

    <div className="rounded-2xl overflow-hidden mb-4" style={{background:t.card,border:`1px solid ${t.border}`}}>
      <div className="p-4" style={{borderBottom:`1px solid ${t.border}`}}><h3 className="font-bold" style={{color:t.text}}>Desempeño por colaborador</h3></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm"><thead><tr style={{background:t.hov}}>{["Colaborador","Total","Completadas","En proceso","Vencidas","% Cumplimiento"].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase" style={{color:t.sub}}>{h}</th>)}</tr></thead>
          <tbody>{cStats.map(c=><tr key={c.id} style={{borderTop:`1px solid ${t.border}`}}>
            <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full text-white flex items-center justify-center text-xs font-bold" style={{background:c.color}}>{c.name[0]}</div><span className="font-medium" style={{color:t.text}}>{c.name}</span></div></td>
            <td className="px-4 py-3 font-semibold" style={{color:t.text}}>{c.total}</td>
            <td className="px-4 py-3 font-semibold" style={{color:"#22c55e"}}>{c.done}</td>
            <td className="px-4 py-3 font-semibold" style={{color:"#3b82f6"}}>{c.ip}</td>
            <td className="px-4 py-3 font-semibold" style={{color:"#ef4444"}}>{c.ov}</td>
            <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="flex-1 h-2 rounded-full overflow-hidden" style={{background:t.hov}}><div className="h-full rounded-full" style={{width:`${c.pct}%`,background:c.color}}/></div><b className="text-xs" style={{color:c.color}}>{c.pct}%</b></div></td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>

    <div className="rounded-2xl p-5" style={{background:t.card,border:`1px solid ${t.border}`}}>
      <h3 className="font-bold mb-3" style={{color:t.text}}>Tareas por estatus</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{STAT.map(s=>{const cnt=tasks.filter(x=>x.s===s).length,pct=tasks.length?Math.round(cnt/tasks.length*100):0;return(<div key={s} className="p-3 rounded-xl text-center" style={{background:SC[s]+"15",border:`1px solid ${SC[s]}30`}}><div className="text-2xl font-black mb-1" style={{color:SC[s]}}>{cnt}</div><div className="text-xs font-semibold" style={{color:SC[s]}}>{s}</div><div className="text-xs mt-0.5" style={{color:t.sub}}>{pct}%</div></div>);})}</div>
    </div>
  </div>);
}

function AdminView({tasks,collabs,minutas,notifs,activity,t}){
  const [auth,setAuth]=useState(false);
  const [pass,setPass]=useState("");
  const [tab,setTab]=useState("activity");

  if(!auth) return(
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="rounded-2xl p-8 w-full max-w-sm text-center" style={{background:t.card,border:`1px solid ${t.border}`}}>
        <Shield size={40} className="mx-auto mb-4" style={{color:"#f59e0b"}}/>
        <h2 className="font-black text-xl mb-1" style={{color:t.text}}>Panel de Administrador</h2>
        <p className="text-sm mb-5" style={{color:t.sub}}>Acceso restringido</p>
        <input type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&pass===ADMIN_PASS) setAuth(true);}} placeholder="Contraseña" className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none mb-3 text-center tracking-widest" style={{background:t.inp,borderColor:t.border,color:t.text}}/>
        <button onClick={()=>{if(pass===ADMIN_PASS) setAuth(true);else{setPass("");window.alert("Contraseña incorrecta");}}} className="w-full py-2.5 rounded-xl font-bold text-white" style={{background:"#f59e0b"}}>Acceder</button>
      </div>
    </div>
  );

  const TABS=[{id:"activity",label:"📋 Actividad"},{id:"tasks",label:"✅ Tareas"},{id:"collabs",label:"👥 Colaboradores"},{id:"stats",label:"📊 Resumen"}];
  const typeCol={task_new:"#22c55e",task_status:"#3b82f6",task_date:"#f59e0b",comment:"#8b5cf6",minuta:"#06b6d4",collab:"#f97316"};

  return(<div>
    <div className="flex items-center gap-3 mb-6">
      <Shield size={22} style={{color:"#f59e0b"}}/>
      <div><h1 className="text-2xl font-black" style={{color:t.text}}>Admin Panel</h1><p className="text-sm" style={{color:t.sub}}>{activity.length} eventos · acceso completo</p></div>
      <span className="ml-auto px-3 py-1.5 rounded-full text-xs font-bold" style={{background:"#f59e0b20",color:"#f59e0b"}}>🔐 Administrador</span>
    </div>

    <div className="flex gap-1 mb-5 p-1 rounded-2xl" style={{background:t.card,border:`1px solid ${t.border}`,display:"inline-flex"}}>
      {TABS.map(tb=><button key={tb.id} onClick={()=>setTab(tb.id)} className="px-3 py-2 rounded-xl text-xs font-semibold transition-all" style={{background:tab===tb.id?"#f59e0b":"transparent",color:tab===tb.id?"white":t.sub}}>{tb.label}</button>)}
    </div>

    {tab==="activity"&&(<div className="rounded-2xl overflow-hidden" style={{background:t.card,border:`1px solid ${t.border}`}}>
      <div className="p-4 flex items-center justify-between" style={{borderBottom:`1px solid ${t.border}`}}><h3 className="font-bold" style={{color:t.text}}>Log de actividad</h3><span className="text-xs" style={{color:t.sub}}>{activity.length} eventos</span></div>
      <div className="max-h-[60vh] overflow-y-auto">
        {activity.length===0?<div className="p-8 text-center" style={{color:t.sub}}>Sin actividad registrada.</div>
          :[...activity].reverse().map(a=>(<div key={a.id} className="flex items-start gap-3 p-4" style={{borderBottom:`1px solid ${t.border}`}}>
            <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{background:typeCol[a.type]||"#94a3b8"}}/>
            <div className="flex-1"><p className="text-sm" style={{color:t.text}}>{a.detail}</p><p className="text-xs mt-0.5" style={{color:t.sub}}>{a.date} · {a.type.replace("_"," ")}</p></div>
          </div>))}
      </div>
    </div>)}

    {tab==="tasks"&&(<div className="rounded-2xl overflow-hidden" style={{background:t.card,border:`1px solid ${t.border}`}}>
      <div className="p-4" style={{borderBottom:`1px solid ${t.border}`}}><h3 className="font-bold" style={{color:t.text}}>Todas las tareas ({tasks.length})</h3></div>
      <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
        <table className="w-full text-xs"><thead><tr style={{background:t.hov}}>{["Tarea","Asignados","Prioridad","Estatus","Fecha","💬","📅"].map(h=><th key={h} className="text-left px-3 py-3 font-bold uppercase" style={{color:t.sub}}>{h}</th>)}</tr></thead>
          <tbody>{tasks.map(task=>{const asns=getAssignees(task).map(id=>collabs.find(c=>c.id===id)?.name).filter(Boolean);return(<tr key={task.id} style={{borderTop:`1px solid ${t.border}`}}>
            <td className="px-3 py-3 font-medium" style={{color:t.text,maxWidth:160}}><span className="truncate block">{task.title}</span></td>
            <td className="px-3 py-3" style={{color:t.sub}}>{asns.join(", ")||"—"}</td>
            <td className="px-3 py-3"><Bdg label={task.priority} color={PC[task.priority]}/></td>
            <td className="px-3 py-3"><Bdg label={task.s} color={SC[task.s]}/></td>
            <td className="px-3 py-3" style={{color:t.sub}}>{fmt(task.due)}</td>
            <td className="px-3 py-3" style={{color:t.sub}}>{(task.comments||[]).length}</td>
            <td className="px-3 py-3" style={{color:(task.dateChanges||[]).length>=2?"#ef4444":t.sub}}>{(task.dateChanges||[]).length}/2</td>
          </tr>);})}</tbody>
        </table>
      </div>
    </div>)}

    {tab==="collabs"&&(<div className="rounded-2xl overflow-hidden" style={{background:t.card,border:`1px solid ${t.border}`}}>
      <div className="p-4" style={{borderBottom:`1px solid ${t.border}`}}><h3 className="font-bold" style={{color:t.text}}>Colaboradores ({collabs.length})</h3></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm"><thead><tr style={{background:t.hov}}>{["Nombre","Rol","Correo","Tareas"].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase" style={{color:t.sub}}>{h}</th>)}</tr></thead>
          <tbody>{collabs.map(c=>{const cnt=tasks.filter(x=>getAssignees(x).includes(c.id)).length;return(<tr key={c.id} style={{borderTop:`1px solid ${t.border}`}}>
            <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full text-white flex items-center justify-center text-xs font-bold" style={{background:c.color}}>{c.name[0]}</div><span className="font-medium" style={{color:t.text}}>{c.name}</span></div></td>
            <td className="px-4 py-3" style={{color:t.sub}}>{c.role||"—"}</td>
            <td className="px-4 py-3" style={{color:t.sub}}>{c.email}</td>
            <td className="px-4 py-3 font-bold" style={{color:t.text}}>{cnt}</td>
          </tr>);})}</tbody>
        </table>
      </div>
    </div>)}

    {tab==="stats"&&(<div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[
      {l:"Total tareas",v:tasks.length,col:"#3b82f6"},{l:"Completadas",v:tasks.filter(x=>x.s==="Completado").length,col:"#22c55e"},
      {l:"Vencidas",v:tasks.filter(x=>x.s==="Vencido").length,col:"#ef4444"},{l:"Total comentarios",v:tasks.reduce((s,x)=>s+(x.comments||[]).length,0),col:"#8b5cf6"},
      {l:"Minutas",v:minutas.length,col:"#06b6d4"},{l:"Colaboradores",v:collabs.length,col:"#f59e0b"},
      {l:"Notificaciones",v:notifs.length,col:"#94a3b8"},{l:"Eventos",v:activity.length,col:"#22c55e"},
    ].map(s=><div key={s.l} className="rounded-2xl p-4 text-center" style={{background:t.card,border:`1px solid ${t.border}`}}><div className="text-2xl font-black mb-1" style={{color:s.col}}>{s.v}</div><div className="text-xs" style={{color:t.sub}}>{s.l}</div></div>)}</div>)}
  </div>);
}

export default function App(){
  const [view,setView]=useState("dashboard");
  const [tasks,setTasks]=useState([]);
  const [minutas,setMinutas]=useState([]);
  const [collabs,setCollabs]=useState([]);
  const [notifs,setNotifs]=useState([]);
  const [activity,setActivity]=useState([]);
  const [toasts,setToasts]=useState([]);
  const [dark,setDark]=useState(true);
  const [sideOpen,setSideOpen]=useState(true);
  const [notifOpen,setNotifOpen]=useState(false);
  const [loaded,setLoaded]=useState(false);

  useEffect(()=>{
    (async()=>{
      try{
        const [tR,mR,cR,nR,aR]=await Promise.allSettled([
          storage.get(SK.t,true),storage.get(SK.m,true),
          storage.get(SK.c,true),storage.get(SK.n,true),storage.get(SK.a,true)
        ]);
        // Load and migrate tasks (ass → assignees)
        if(tR.status==="fulfilled"&&tR.value){
          const raw=JSON.parse(tR.value.value);
          setTasks(raw.map(t=>({...t,assignees:t.assignees||(t.ass?[t.ass]:[]),comments:t.comments||[],dateChanges:t.dateChanges||[]})));
        }
        if(mR.status==="fulfilled"&&mR.value) setMinutas(JSON.parse(mR.value.value));
        setCollabs(cR.status==="fulfilled"&&cR.value?JSON.parse(cR.value.value):INIT_C);
        if(nR.status==="fulfilled"&&nR.value) setNotifs(JSON.parse(nR.value.value));
        if(aR.status==="fulfilled"&&aR.value) setActivity(JSON.parse(aR.value.value));
      }catch{setCollabs(INIT_C);}
      setLoaded(true);
    })();
  },[]);

  // write-guard: timestamp hasta el que el poll NO debe sobreescribir este dato
  const wp=useRef({t:0,m:0,c:0,n:0,a:0});
  const GRACE=7000; // 7s — el poll corre cada 5s, así el save siempre gana
  useEffect(()=>{if(!loaded) return; wp.current.t=Date.now()+GRACE; storage.set(SK.t,JSON.stringify(tasks),true).catch(()=>{});},[tasks,loaded]);
  useEffect(()=>{if(!loaded) return; wp.current.m=Date.now()+GRACE; storage.set(SK.m,JSON.stringify(minutas),true).catch(()=>{});},[minutas,loaded]);
  useEffect(()=>{if(!loaded) return; wp.current.c=Date.now()+GRACE; storage.set(SK.c,JSON.stringify(collabs),true).catch(()=>{});},[collabs,loaded]);
  useEffect(()=>{if(!loaded) return; wp.current.n=Date.now()+GRACE; storage.set(SK.n,JSON.stringify(notifs),true).catch(()=>{});},[notifs,loaded]);
  useEffect(()=>{if(!loaded) return; wp.current.a=Date.now()+GRACE; storage.set(SK.a,JSON.stringify(activity),true).catch(()=>{});},[activity,loaded]);

  // Mark overdue
  useEffect(()=>{if(!loaded) return;setTasks(p=>p.map(task=>task.s!=="Completado"&&task.due&&task.due<toDay()?{...task,s:"Vencido"}:task));},[loaded]);

  // ── Real-time sync (polling cada 5s) ─────────────────────────
  const [syncedAt,setSyncedAt]=useState(null);
  const [syncPulse,setSyncPulse]=useState(false);
  useEffect(()=>{
    if(!loaded) return;
    const poll=async()=>{
      try{
        const [tR,mR,cR,nR,aR]=await Promise.allSettled([
          storage.get(SK.t,true),storage.get(SK.m,true),
          storage.get(SK.c,true),storage.get(SK.n,true),storage.get(SK.a,true)
        ]);
        let changed=false;
        if(tR.status==="fulfilled"&&tR.value){
          const rem=JSON.parse(tR.value.value).map(t=>({...t,assignees:t.assignees||(t.ass?[t.ass]:[]),comments:t.comments||[],dateChanges:t.dateChanges||[]}));
          setTasks(prev=>{if(JSON.stringify(prev)!==JSON.stringify(rem)){changed=true;return rem;}return prev;});
        }
        if(mR.status==="fulfilled"&&mR.value){const rem=JSON.parse(mR.value.value);setMinutas(prev=>{if(JSON.stringify(prev)!==JSON.stringify(rem)){changed=true;return rem;}return prev;});}
        if(cR.status==="fulfilled"&&cR.value){const rem=JSON.parse(cR.value.value);setCollabs(prev=>{if(JSON.stringify(prev)!==JSON.stringify(rem)){changed=true;return rem;}return prev;});}
        if(nR.status==="fulfilled"&&nR.value){const rem=JSON.parse(nR.value.value);setNotifs(prev=>{if(JSON.stringify(prev)!==JSON.stringify(rem)){changed=true;return rem;}return prev;});}
        if(aR.status==="fulfilled"&&aR.value){const rem=JSON.parse(aR.value.value);setActivity(prev=>{if(JSON.stringify(prev)!==JSON.stringify(rem)){changed=true;return rem;}return prev;});}
        setSyncedAt(new Date());
        if(changed){setSyncPulse(true);setTimeout(()=>setSyncPulse(false),1200);}
      }catch{}
    };
    const id=setInterval(poll,5000);
    return()=>clearInterval(id);
  },[loaded]);

  const addToast=useCallback((msg,type="info")=>{const id=uid();setToasts(p=>[...p,{id,msg,type}]);setTimeout(()=>setToasts(p=>p.filter(x=>x.id!==id)),4000);},[]);
  const addNotif=useCallback(n=>setNotifs(p=>[n,...p.slice(0,49)]),[]);
  const logActivity=useCallback(e=>setActivity(p=>[...p.slice(-199),{...e,id:uid(),date:toDay()}]),[]);

  const t=th(dark);
  const unread=notifs.filter(n=>!n.read).length;
  const overdue=tasks.filter(x=>x.s==="Vencido").length;

  const NAV=[
    {id:"dashboard",label:"Dashboard",Icon:LayoutDashboard},
    {id:"tasks",label:"Pendientes",Icon:CheckSquare,badge:overdue},
    {id:"minutas",label:"Minutas",Icon:FileText},
    {id:"calendar",label:"Calendario",Icon:Calendar},
    {id:"collaborators",label:"Colaboradores",Icon:Users},
    {id:"reports",label:"Reportes",Icon:Download},
    {id:"admin",label:"Admin",Icon:Shield,color:"#f59e0b"},
  ];

  if(!loaded) return(<div className="flex items-center justify-center h-screen" style={{background:"#0f172a"}}><div style={{color:"#94a3b8"}} className="animate-pulse text-lg font-medium">Cargando ADL Colabora…</div></div>);

  return(
    <div className="flex h-screen overflow-hidden" style={{background:t.bg}}>
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <aside className="flex flex-col flex-shrink-0 transition-all duration-200 overflow-hidden" style={{width:sideOpen?224:64,background:t.side,borderRight:`1px solid ${t.border}`}}>
        <div className="flex items-center gap-3 px-4 overflow-hidden" style={{height:64,borderBottom:`1px solid ${t.border}`,minHeight:64}}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0" style={{background:"#3b82f6"}}>A</div>
          {sideOpen&&<div><div className="font-black text-sm leading-tight" style={{color:t.text}}>ADL Colabora</div><div className="text-xs" style={{color:t.sub}}>Datos compartidos ✓</div></div>}
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV.map(({id,label,Icon,badge,color})=>(
            <button key={id} onClick={()=>setView(id)} className="w-full flex items-center gap-3 px-4 py-3 transition-all overflow-hidden" style={{background:view===id?`${color||"#3b82f6"}15`:"transparent",color:view===id?color||"#3b82f6":t.sub,borderLeft:view===id?`3px solid ${color||"#3b82f6"}`:"3px solid transparent"}}>
              <Icon size={18} className="flex-shrink-0"/>{sideOpen&&<span className="text-sm font-semibold truncate">{label}</span>}
              {badge>0&&<span className="ml-auto text-xs rounded-full px-1.5 py-0.5 font-bold text-white" style={{background:"#ef4444",fontSize:9}}>{badge}</span>}
            </button>
          ))}
        </nav>
        <div className="p-3" style={{borderTop:`1px solid ${t.border}`}}>
          <button onClick={()=>setDark(d=>!d)} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:opacity-70" style={{color:t.sub}}>{dark?<Sun size={16}/>:<Moon size={16}/>}{sideOpen&&<span className="text-xs">{dark?"Modo claro":"Modo oscuro"}</span>}</button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center gap-3 px-5 flex-shrink-0" style={{height:64,borderBottom:`1px solid ${t.border}`,background:t.side}}>
          <button onClick={()=>setSideOpen(s=>!s)} className="p-2 rounded-xl hover:opacity-70" style={{color:t.sub}}><Menu size={18}/></button>
          <div className="flex-1"/>
          <div className="flex items-center gap-1.5 text-xs" style={{color:syncedAt?"#22c55e":t.sub}} title={syncedAt?`Sincronizado: ${syncedAt.toLocaleTimeString("es-MX")}`:"Conectando con almacenamiento compartido…"}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{background:syncedAt?"#22c55e":"#f59e0b"}}/>
            {syncedAt?"En vivo":"Conectando…"}
          </div>
          {overdue>0&&<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold" style={{background:"#ef444415",color:"#ef4444"}}><AlertTriangle size={13}/>{overdue} vencida{overdue!==1?"s":""}</div>}
          <div className="relative">
            <button onClick={()=>{setNotifOpen(o=>!o);if(!notifOpen) setNotifs(p=>p.map(n=>({...n,read:true})));}} className="p-2 rounded-xl hover:opacity-70 relative" style={{color:t.sub}}>
              <Bell size={18}/>{unread>0&&<span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{background:"#ef4444"}}/>}
            </button>
            {notifOpen&&(<div className="absolute right-0 top-12 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden" style={{background:t.card,border:`1px solid ${t.border}`}}>
              <div className="flex items-center justify-between p-4" style={{borderBottom:`1px solid ${t.border}`}}><span className="font-bold text-sm" style={{color:t.text}}>Notificaciones</span><button onClick={()=>setNotifOpen(false)} style={{color:t.sub}}><X size={16}/></button></div>
              <div className="max-h-72 overflow-y-auto">{notifs.length===0?<div className="p-5 text-center text-sm" style={{color:t.sub}}>Sin notificaciones</div>:notifs.slice(0,20).map(n=>(<div key={n.id} className="p-3 flex items-start gap-2.5" style={{borderBottom:`1px solid ${t.border}`}}><div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{background:"#3b82f6"}}/><div><p className="text-xs" style={{color:t.text}}>{n.msg}</p><p className="text-xs mt-0.5" style={{color:t.sub}}>{n.date}</p></div></div>))}</div>
            </div>)}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 lg:p-6">
          {view==="dashboard"     &&<DashboardView tasks={tasks} minutas={minutas} collabs={collabs} t={t}/>}
          {view==="tasks"         &&<TasksView tasks={tasks} setTasks={setTasks} collabs={collabs} t={t} addNotif={addNotif} addToast={addToast} logActivity={logActivity}/>}
          {view==="minutas"       &&<MinutasView minutas={minutas} setMinutas={setMinutas} tasks={tasks} setTasks={setTasks} collabs={collabs} t={t} addNotif={addNotif} addToast={addToast} logActivity={logActivity}/>}
          {view==="calendar"      &&<CalendarView tasks={tasks} collabs={collabs} t={t}/>}
          {view==="collaborators" &&<CollaboratorsView collabs={collabs} setCollabs={setCollabs} tasks={tasks} setTasks={setTasks} t={t} addToast={addToast} logActivity={logActivity}/>}
          {view==="reports"       &&<ReportsView tasks={tasks} collabs={collabs} minutas={minutas} t={t}/>}
          {view==="admin"         &&<AdminView tasks={tasks} collabs={collabs} minutas={minutas} notifs={notifs} activity={activity} t={t}/>}
        </main>
      </div>
      <Toasts toasts={toasts}/>
    </div>
  );
}
