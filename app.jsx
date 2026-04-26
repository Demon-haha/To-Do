/* ============================================================
   To Do — React-приложение
   Карта файла (ищи по "── N."):
     1. Константы
     2. Утилиты (даты, формат)
     3. Хуки (localStorage, тема, long-press)
     4. Toast
     5. Service Worker / Web Worker
     6. useReminders
     7. Вспомогательные компоненты (L, ThemeToggle, Modal)
     8. Модалки (CreateList, DatePicker)
     9. ContextMenu
    10. ListRow, Sidebar
    11. TaskRow, TaskComposer
    12. App (главный)
    13. Mount
   ============================================================ */

const { useState, useEffect, useMemo, useRef, useCallback, memo } = React;

// ── 1. Константы ─────────────────────────────────────────────
const STORAGE_TASKS = "mstodo_clone_tasks_v3";
const STORAGE_LISTS = "mstodo_clone_lists_v3";
const STORAGE_THEME = "mstodo_theme";
const FIRED_KEY     = "mstodo_fired_reminders_v2";
const DEFAULT_EMOJI = "📋";
const EMOJI_BANK    = ["📋","✅","⭐","💼","🏠","🛒","🎯","📚","💡","🏋️","🍎","✈️","🎵","💻","🎨","🧘","🌱","🔥","💰","📦","🎮","🐶","☕","📝"];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,8);

const WEEKDAYS = {
  "понедельник":1,"вторник":2,"среда":3,"четверг":4,"пятница":5,"суббота":6,"воскресенье":0,
  "monday":1,"tuesday":2,"wednesday":3,"thursday":4,"friday":5,"saturday":6,"sunday":0,
};

// Определение touch-устройства (для long-press вместо right-click)
const IS_TOUCH = typeof window !== "undefined" && (
  "ontouchstart" in window || navigator.maxTouchPoints > 0
);

// ── 2. Утилиты ───────────────────────────────────────────────
function smartParseDate(text) {
  const lower = text.toLowerCase();
  const base  = new Date(); base.setHours(18,0,0,0);
  if (/\bсегодня\b|\btoday\b/.test(lower))   return base.toISOString();
  if (/\bзавтра\b|\btomorrow\b/.test(lower)) { const d=new Date(base); d.setDate(d.getDate()+1); return d.toISOString(); }
  for (const [w,dow] of Object.entries(WEEKDAYS)) {
    if (new RegExp(`\\b${w}\\b`).test(lower)) {
      const d=new Date(base); const diff=(dow-d.getDay()+7)%7||7; d.setDate(d.getDate()+diff);
      return d.toISOString();
    }
  }
  return null;
}

function atHour(offsetDays, hour=18) {
  const d=new Date(); d.setDate(d.getDate()+offsetDays); d.setHours(hour,0,0,0); return d.toISOString();
}

function formatDate(iso) {
  if (!iso) return "";
  const d=new Date(iso), now=new Date();
  const same=(a,b)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
  const tomorrow=new Date(now); tomorrow.setDate(tomorrow.getDate()+1);
  const time=d.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"});
  let date;
  if (same(d,now)) date="Сегодня";
  else if (same(d,tomorrow)) date="Завтра";
  else date=d.toLocaleDateString("ru-RU",{day:"numeric",month:"short"});
  return `${date}, ${time}`;
}

function toInputDT(iso) {
  if (!iso) return "";
  const d=new Date(iso); const p=n=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const isSameDay=(iso,ref=new Date())=>{
  if (!iso) return false;
  const d=new Date(iso);
  return d.getFullYear()===ref.getFullYear()&&d.getMonth()===ref.getMonth()&&d.getDate()===ref.getDate();
};

// Повторения
function addToDate(iso, n, unit) {
  const d = iso ? new Date(iso) : new Date();
  if (unit === "day")        d.setDate(d.getDate() + n);
  else if (unit === "week")  d.setDate(d.getDate() + n * 7);
  else if (unit === "month") d.setMonth(d.getMonth() + n);
  else if (unit === "year")  d.setFullYear(d.getFullYear() + n);
  return d.toISOString();
}
function nextWeekday(iso) {
  const d = iso ? new Date(iso) : new Date();
  do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6);
  return d.toISOString();
}
function nextRecurrence(rec, fromIso) {
  if (!rec) return null;
  switch (rec.type) {
    case "daily":    return addToDate(fromIso, 1, "day");
    case "weekdays": return nextWeekday(fromIso);
    case "weekly":   return addToDate(fromIso, 1, "week");
    case "monthly":  return addToDate(fromIso, 1, "month");
    case "yearly":   return addToDate(fromIso, 1, "year");
    case "custom":   return addToDate(fromIso, rec.interval || 1, rec.unit || "day");
    default: return null;
  }
}
function pluralRu(n, forms) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if ([2,3,4].includes(m10) && ![12,13,14].includes(m100)) return forms[1];
  return forms[2];
}
function recurrenceLabel(r) {
  if (!r) return "";
  const L = { daily:"Ежедневно", weekdays:"Рабочие дни", weekly:"Еженедельно", monthly:"Ежемесячно", yearly:"Ежегодно" };
  if (r.type === "custom") {
    const U = {
      day:   ["день","дня","дней"],
      week:  ["неделю","недели","недель"],
      month: ["месяц","месяца","месяцев"],
      year:  ["год","года","лет"],
    };
    const n = r.interval || 1;
    return n === 1 ? `Каждый ${U[r.unit||"day"][0]}` : `Каждые ${n} ${pluralRu(n, U[r.unit||"day"])}`;
  }
  return L[r.type] || "";
}
function reminderPresets() {
  const now = new Date();
  const later = new Date(); later.setHours(22, 0, 0, 0);
  const tom = new Date(); tom.setDate(tom.getDate() + 1); tom.setHours(9, 0, 0, 0);
  const nw = new Date();
  const dTo = (8 - nw.getDay()) % 7 || 7;
  nw.setDate(nw.getDate() + dTo); nw.setHours(9, 0, 0, 0);
  return {
    laterToday: later > now ? later.toISOString() : null,
    tomorrow:   tom.toISOString(),
    nextWeek:   nw.toISOString(),
  };
}

// ── 3. Хуки ──────────────────────────────────────────────────
function useLocalStorage(key, initial) {
  const [state,setState]=useState(()=>{
    try{ const r=localStorage.getItem(key); return r?JSON.parse(r):initial; }catch{ return initial; }
  });
  useEffect(()=>{ try{localStorage.setItem(key,JSON.stringify(state));}catch{} },[key,state]);
  return [state,setState];
}

function useTheme() {
  const [dark,setDark]=useState(()=>document.documentElement.classList.contains("dark"));
  const toggle=useCallback(()=>{
    setDark(v=>{
      const next=!v;
      if (next) { document.documentElement.classList.add("dark"); localStorage.setItem(STORAGE_THEME,"dark"); }
      else      { document.documentElement.classList.remove("dark"); localStorage.setItem(STORAGE_THEME,"light"); }
      return next;
    });
  },[]);
  return [dark,toggle];
}

// Long-press для контекстного меню на touch-устройствах.
// Отменяется, только если палец сдвинулся больше MOVE_THRESHOLD_PX (иначе не переживёт микро-дрожь).
function useLongPress(onLongPress, delay=500) {
  const MOVE_THRESHOLD_PX = 10;
  const timer = useRef(null);
  const target = useRef(null);
  const startEvent = useRef(null);

  const start = useCallback((e) => {
    const point = e.touches ? e.touches[0] : e;
    startEvent.current = { clientX: point.clientX, clientY: point.clientY };
    target.current = e.currentTarget;
    target.current?.classList.add("long-press-active");
    timer.current = setTimeout(() => {
      onLongPress(startEvent.current);
      target.current?.classList.remove("long-press-active");
      timer.current = null;
    }, delay);
  }, [onLongPress, delay]);

  const clear = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    target.current?.classList.remove("long-press-active");
  }, []);

  const move = useCallback((e) => {
    if (!timer.current || !startEvent.current) return;
    const p = e.touches ? e.touches[0] : e;
    const dx = p.clientX - startEvent.current.clientX;
    const dy = p.clientY - startEvent.current.clientY;
    if (dx*dx + dy*dy > MOVE_THRESHOLD_PX*MOVE_THRESHOLD_PX) clear();
  }, [clear]);

  return {
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: move,
    onTouchCancel: clear,
  };
}

// ── 4. Toast ─────────────────────────────────────────────────
let toastDispatch = null;
function ToastContainer() {
  const [toasts,setToasts]=useState([]);
  toastDispatch=useCallback((msg,sub,icon="🔔")=>{
    const id=uid();
    setToasts(p=>[...p,{id,msg,sub,icon,leaving:false}]);
    setTimeout(()=>{
      setToasts(p=>p.map(t=>t.id===id?{...t,leaving:true}:t));
      setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),350);
    },6000);
  },[]);
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-full pointer-events-none safe-top">
      {toasts.map(t=>(
        <div key={t.id}
          className={`pointer-events-auto rounded-xl shadow-2xl border px-4 py-3 flex items-start gap-3
            bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700
            ${t.leaving?"toast-leave":"toast-enter"}`}>
          <span className="text-xl leading-none mt-0.5">{t.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{t.msg}</div>
            {t.sub&&<div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{t.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 5. Service Worker / Web Worker ───────────────────────────
const workerSrc=`let T={};self.onmessage=e=>{const{type,id,delay}=e.data;if(type==="schedule"){if(T[id])clearTimeout(T[id]);T[id]=setTimeout(()=>{self.postMessage({type:"fire",id});delete T[id];},Math.max(0,delay));}else if(type==="cancel"){if(T[id]){clearTimeout(T[id]);delete T[id];}}else if(type==="cancelAll"){Object.values(T).forEach(clearTimeout);T={};} };`;
function createWorker(){try{return new Worker(URL.createObjectURL(new Blob([workerSrc],{type:"application/javascript"})));}catch{return null;}}

let swReg=null, swReady=false;
(async()=>{
  if(!("serviceWorker" in navigator)||location.protocol==="file:") return;
  try{ swReg=await navigator.serviceWorker.register("sw.js"); await navigator.serviceWorker.ready; swReady=true; }
  catch(e){ console.warn("SW:",e); }
})();

// ── 6. useReminders ──────────────────────────────────────────
function useReminders(tasks,onFire) {
  const wRef=useRef(null);
  useEffect(()=>{
    wRef.current=createWorker();
    const w=wRef.current;
    const getFired=()=>{try{return new Set(JSON.parse(localStorage.getItem(FIRED_KEY)||"[]"));}catch{return new Set();}};
    const addFired=k=>{const s=getFired();s.add(k);try{localStorage.setItem(FIRED_KEY,JSON.stringify([...s]));}catch{}};

    const fire=task=>{
      const key=`${task.id}_${task.reminder}`;
      if(getFired().has(key)) return;
      addFired(key);
      const title="🔔 "+task.title;
      const body=task.dueDate?"Срок: "+formatDate(task.dueDate):"Пора выполнить задачу!";
      toastDispatch?.("Напоминание: "+task.title,body,"🔔");
      if(swReady&&swReg&&Notification.permission==="granted"){
        swReg.showNotification(title,{body,tag:key,requireInteraction:true,icon:"https://cdn-icons-png.flaticon.com/512/2387/2387635.png"});
      } else if("Notification" in window&&Notification.permission==="granted"){
        try{ const n=new Notification(title,{body,tag:key,requireInteraction:true,icon:"https://cdn-icons-png.flaticon.com/512/2387/2387635.png"}); n.onclick=()=>{try{window.focus();n.close();}catch{}}; }catch{}
      }
      try{
        const ctx=new (window.AudioContext||window.webkitAudioContext)();
        [523.25,659.25,783.99].forEach((freq,i)=>{
          const o=ctx.createOscillator(),g=ctx.createGain();
          o.type="sine"; o.frequency.value=freq; o.connect(g); g.connect(ctx.destination);
          const t0=ctx.currentTime+i*0.15;
          g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(0.15,t0+0.02); g.gain.exponentialRampToValueAtTime(0.001,t0+0.4);
          o.start(t0); o.stop(t0+0.4);
        });
        setTimeout(()=>ctx.close(),1200);
      }catch{}
      // Вибрация на мобильных
      if (navigator.vibrate) { try { navigator.vibrate([200,100,200]); } catch {} }
      onFire?.(task.id);
    };

    const scheduleAll=()=>{
      w?.postMessage({type:"cancelAll"});
      if(swReg&&navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({type:"cancelAll"});
      const now=Date.now(), fired=getFired();
      tasks.forEach(t=>{
        if(!t.reminder||t.completed) return;
        const key=`${t.id}_${t.reminder}`;
        if(fired.has(key)) return;
        const rt=new Date(t.reminder).getTime();
        if(rt<=now){ fire(t); return; }
        if(swReg&&navigator.serviceWorker.controller)
          navigator.serviceWorker.controller.postMessage({type:"schedule",id:t.id,title:"🔔 "+t.title,body:t.dueDate?"Срок: "+formatDate(t.dueDate):"Пора выполнить задачу!",when:rt});
        w?.postMessage({type:"schedule",id:t.id,delay:rt-now});
      });
    };

    if(w) w.onmessage=e=>{ if(e.data.type==="fire"){const t=tasks.find(x=>x.id===e.data.id); if(t) fire(t);} };
    scheduleAll();
    const swTick=setInterval(()=>{ if(swReady){scheduleAll();clearInterval(swTick);} },500);
    setTimeout(()=>clearInterval(swTick),5000);
    const onVis=()=>{ if(document.visibilityState==="visible") scheduleAll(); };
    document.addEventListener("visibilitychange",onVis);
    window.addEventListener("focus",onVis);
    return()=>{ clearInterval(swTick); document.removeEventListener("visibilitychange",onVis); window.removeEventListener("focus",onVis); w?.postMessage({type:"cancelAll"}); w?.terminate(); };
  },[tasks,onFire]);
}

// ── 7. Вспомогательные компоненты ────────────────────────────
const L=memo(function L({name,...p}){
  const Icon=window.Lucide?.[name];
  return Icon?<Icon {...p}/>:<span style={{width:p.size||16,height:p.size||16,display:"inline-block"}}/>;
});

function ThemeToggle({dark,toggle}) {
  return (
    <button onClick={toggle} title={dark?"Светлая тема":"Тёмная тема"}
      className={`theme-track flex-shrink-0 ${dark?"dark-mode":"light-mode"}`}
      aria-label="Переключить тему">
      <div className="theme-thumb">
        {dark
          ? <L name="Moon" size={10} style={{color:"#4338ca"}} />
          : <L name="Sun"  size={10} style={{color:"#f59e0b"}} />
        }
      </div>
    </button>
  );
}

function Modal({open,onClose,children,title,closeOnOverlay=true}) {
  useEffect(()=>{ if(!open) return; const h=e=>{if(e.key==="Escape") onClose();}; window.addEventListener("keydown",h); return()=>window.removeEventListener("keydown",h); },[open,onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={()=>closeOnOverlay&&onClose()}>
      <div className="rounded-xl shadow-2xl w-full max-w-sm pop-in bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
        onClick={e=>e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="font-semibold text-gray-900 dark:text-gray-100">{title}</div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
            <L name="X" size={16}/>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ── 8. Модалки ───────────────────────────────────────────────
function CreateListModal({open,onClose,onCreate}) {
  const [name,setName]=useState(""); const [emoji,setEmoji]=useState(DEFAULT_EMOJI); const [custom,setCustom]=useState("");
  const inputRef=useRef(null);
  useEffect(()=>{ if(open){setName("");setEmoji(DEFAULT_EMOJI);setCustom("");setTimeout(()=>inputRef.current?.focus(),50);} },[open]);
  const submit=()=>{ const v=name.trim(); if(!v) return; onCreate({name:v,emoji:custom.trim()||emoji||DEFAULT_EMOJI}); onClose(); };
  const iCls="w-full text-sm rounded px-3 py-2 focus:outline-none border bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:border-blue-400 placeholder:text-gray-400 dark:placeholder:text-gray-500";
  return (
    <Modal open={open} onClose={onClose} title="Новый список">
      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Название</label>
      <input ref={inputRef} value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")submit();}}
        placeholder="Например: Покупки" className={iCls+" mb-4"} />
      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-2">Эмодзи</label>
      <div className="grid grid-cols-8 gap-1 mb-3">
        {EMOJI_BANK.map(e=>(
          <button key={e} onClick={()=>{setEmoji(e);setCustom("");}}
            className={`aspect-square text-lg rounded hover:bg-gray-100 dark:hover:bg-gray-600 ${emoji===e&&!custom?"bg-blue-50 dark:bg-blue-900/40 ring-1 ring-blue-400":""}`}>{e}</button>
        ))}
      </div>
      <input value={custom} onChange={e=>setCustom(e.target.value)} maxLength={4}
        placeholder="Или вставьте свой эмодзи" className={iCls+" mb-4"} />
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="text-sm px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Отмена</button>
        <button onClick={submit} disabled={!name.trim()} className="text-sm px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">Создать</button>
      </div>
    </Modal>
  );
}

function DatePickerModal({open,onClose,onPick,initial}) {
  const [value,setValue]=useState("");
  useEffect(()=>{ if(open) setValue(initial?toInputDT(initial):toInputDT(new Date().toISOString())); },[open,initial]);
  const apply=()=>{ onPick(value?new Date(value).toISOString():null); onClose(); };
  return (
    <Modal open={open} onClose={onClose} title="Выбрать дату" closeOnOverlay={false}>
      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Дата и время</label>
      <input type="datetime-local" value={value} onChange={e=>setValue(e.target.value)}
        onKeyDown={e=>{if(e.key==="Enter")apply();}}
        className="w-full text-sm rounded px-3 py-2 focus:outline-none border bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:border-blue-400 mb-2" />
      <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-4">В указанное время придёт напоминание.</div>
      <div className="flex justify-between gap-2">
        <button onClick={()=>{onPick(null);onClose();}} className="text-sm px-4 py-2 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600">Убрать</button>
        <div className="flex gap-2">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Отмена</button>
          <button onClick={apply} className="text-sm px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">ОК</button>
        </div>
      </div>
    </Modal>
  );
}

function ReminderModal({open,onClose,onPick,initial}) {
  const p = useMemo(()=>reminderPresets(),[open]);
  const [custom,setCustom] = useState("");
  useEffect(()=>{ if(open) setCustom(initial?toInputDT(initial):""); },[open,initial]);
  const row = "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100";
  const timeText = iso => iso ? new Date(iso).toLocaleDateString("ru-RU",{weekday:"short"})+", "+new Date(iso).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"}) : "";
  const pick = iso => { onPick(iso); onClose(); };
  const applyCustom = () => { if(custom) pick(new Date(custom).toISOString()); };
  return (
    <Modal open={open} onClose={onClose} title="Напомнить мне">
      {p.laterToday && (
        <button onClick={()=>pick(p.laterToday)} className={row}>
          <L name="Clock" size={18} className="text-gray-500 dark:text-gray-400"/>
          <span className="flex-1 text-left">Позднее сегодня</span>
          <span className="text-xs text-gray-500">22:00</span>
        </button>
      )}
      <button onClick={()=>pick(p.tomorrow)} className={row}>
        <L name="ArrowRightCircle" size={18} className="text-gray-500 dark:text-gray-400"/>
        <span className="flex-1 text-left">Завтра</span>
        <span className="text-xs text-gray-500">{timeText(p.tomorrow)}</span>
      </button>
      <button onClick={()=>pick(p.nextWeek)} className={row}>
        <L name="ChevronsRight" size={18} className="text-gray-500 dark:text-gray-400"/>
        <span className="flex-1 text-left">Следующая неделя</span>
        <span className="text-xs text-gray-500">{timeText(p.nextWeek)}</span>
      </button>
      <div className="h-px bg-gray-200 dark:bg-gray-700 my-2"/>
      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Выбрать дату и время</label>
      <input type="datetime-local" value={custom} onChange={e=>setCustom(e.target.value)}
        className="w-full text-sm rounded px-3 py-2 focus:outline-none border bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:border-blue-400 mb-3"/>
      <div className="flex justify-between gap-2">
        <button onClick={()=>pick(null)} className="text-sm px-4 py-2 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600">Убрать</button>
        <div className="flex gap-2">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Отмена</button>
          <button onClick={applyCustom} disabled={!custom} className="text-sm px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">ОК</button>
        </div>
      </div>
    </Modal>
  );
}

function RecurrenceModal({open,onClose,onPick,onOpenCustom}) {
  const row = "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100";
  const pick = r => { onPick(r); onClose(); };
  const items = [
    {type:"daily",    label:"Ежедневно",   icon:"CalendarDays"},
    {type:"weekdays", label:"Рабочие дни", icon:"CalendarRange"},
    {type:"weekly",   label:"Еженедельно", icon:"Calendar"},
    {type:"monthly",  label:"Ежемесячно",  icon:"CalendarClock"},
    {type:"yearly",   label:"Ежегодно",    icon:"PartyPopper"},
  ];
  return (
    <Modal open={open} onClose={onClose} title="Повтор">
      {items.map(it=>(
        <button key={it.type} onClick={()=>pick({type:it.type})} className={row}>
          <L name={it.icon} size={18} className="text-gray-500 dark:text-gray-400"/>
          <span className="flex-1 text-left">{it.label}</span>
        </button>
      ))}
      <div className="h-px bg-gray-200 dark:bg-gray-700 my-2"/>
      <button onClick={()=>{onClose();onOpenCustom();}} className={row}>
        <L name="Settings2" size={18} className="text-gray-500 dark:text-gray-400"/>
        <span className="flex-1 text-left">Настроить</span>
      </button>
      <div className="flex justify-between gap-2 mt-3">
        <button onClick={()=>pick(null)} className="text-sm px-4 py-2 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600">Убрать</button>
        <button onClick={onClose} className="text-sm px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Отмена</button>
      </div>
    </Modal>
  );
}

function CustomRecurrenceModal({open,onClose,onPick,initial}) {
  const [interval,setInterval] = useState(1);
  const [unit,setUnit]         = useState("day");
  useEffect(()=>{
    if(!open) return;
    setInterval(initial?.type==="custom" ? (initial.interval||1) : 1);
    setUnit(initial?.type==="custom" ? (initial.unit||"day") : "day");
  },[open,initial]);
  const apply = () => {
    const n = Math.max(1, parseInt(interval,10) || 1);
    onPick({type:"custom", interval:n, unit});
    onClose();
  };
  const units = [
    {v:"day",   labels:["день","дня","дней"]},
    {v:"week",  labels:["неделю","недели","недель"]},
    {v:"month", labels:["месяц","месяца","месяцев"]},
    {v:"year",  labels:["год","года","лет"]},
  ];
  const n = Math.max(1, parseInt(interval,10) || 1);
  return (
    <Modal open={open} onClose={onClose} title="Настроить повтор">
      <div className="text-sm text-gray-700 dark:text-gray-300 mb-3">Повторять каждые:</div>
      <div className="flex gap-2 mb-4">
        <input type="number" min="1" max="999" value={interval} onChange={e=>setInterval(e.target.value)}
          className="w-20 text-sm rounded px-3 py-2 focus:outline-none border bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:border-blue-400"/>
        <select value={unit} onChange={e=>setUnit(e.target.value)}
          className="flex-1 text-sm rounded px-3 py-2 focus:outline-none border bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:border-blue-400">
          {units.map(u=><option key={u.v} value={u.v}>{pluralRu(n,u.labels)}</option>)}
        </select>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="text-sm px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Отмена</button>
        <button onClick={apply} className="text-sm px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">ОК</button>
      </div>
    </Modal>
  );
}

// ── 9. ContextMenu ───────────────────────────────────────────
function ContextMenu({ctx,onClose,actions}) {
  const ref=useRef(null);
  useEffect(()=>{
    if(!ctx) return;
    const close=e=>{if(ref.current&&!ref.current.contains(e.target))onClose();};
    const esc=e=>{if(e.key==="Escape")onClose();};
    window.addEventListener("mousedown",close);
    window.addEventListener("touchstart",close);
    window.addEventListener("keydown",esc);
    window.addEventListener("scroll",onClose,true);
    return()=>{
      window.removeEventListener("mousedown",close);
      window.removeEventListener("touchstart",close);
      window.removeEventListener("keydown",esc);
      window.removeEventListener("scroll",onClose,true);
    };
  },[ctx,onClose]);
  if(!ctx) return null;
  const W=290;
  const posX=Math.min(ctx.x,window.innerWidth-W-8);
  const posY=Math.min(ctx.y,window.innerHeight-380-8);
  return (
    <div ref={ref} style={{left:posX,top:posY,minWidth:W}}
      className="fixed z-50 rounded-lg shadow-2xl py-1 pop-in no-select bg-[#2b2b2b] dark:bg-gray-900 dark:border dark:border-gray-700 text-gray-100">
      {actions.map((a,i)=>a.divider?(
        <div key={i} className="h-px bg-white/10 dark:bg-gray-700 my-1"/>
      ):(
        <button key={i} onClick={()=>{a.onClick();onClose();}}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/10 dark:hover:bg-white/5 transition-colors ${a.danger?"text-red-400":""}`}>
          <span className="w-5 flex justify-center opacity-80"><L name={a.icon} size={16}/></span>
          <span className="flex-1 text-left">{a.label}</span>
          {a.hint&&!IS_TOUCH&&<span className="text-xs opacity-40">{a.hint}</span>}
        </button>
      ))}
    </div>
  );
}

// ── 10. ListRow, Sidebar ─────────────────────────────────────
function ListRow({list,active,count,onSelect,onDelete,onRename,isMobile,onClose}) {
  const [editing,setEditing]=useState(false); const [value,setValue]=useState(list.name); const inputRef=useRef(null);
  useEffect(()=>setValue(list.name),[list.name]);
  useEffect(()=>{ if(editing){inputRef.current?.focus();inputRef.current?.select();} },[editing]);
  const commit=()=>{ const v=value.trim(); if(v&&v!==list.name) onRename(list.id,v); else setValue(list.name); setEditing(false); };
  return (
    <div className={`group relative mb-0.5 rounded-md transition-colors border
      ${active
        ? "bg-white dark:bg-gray-800/80 shadow-sm border-gray-200 dark:border-gray-700"
        : "hover:bg-white/70 dark:hover:bg-gray-800/50 border-transparent"}`}>
      <div className="flex items-center gap-3 px-3 py-2 text-sm">
        <span className="text-base leading-none w-5 text-center shrink-0">{list.emoji||DEFAULT_EMOJI}</span>
        {editing ? (
          <input ref={inputRef} value={value}
            onChange={e=>setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={e=>{if(e.key==="Enter")commit();if(e.key==="Escape"){setValue(list.name);setEditing(false);}}}
            onClick={e=>e.stopPropagation()}
            className={`flex-1 min-w-0 bg-transparent outline-none border-b text-sm
              ${active?"border-blue-400 text-blue-700 dark:text-blue-400 font-medium":"border-gray-400 dark:border-gray-500 text-gray-900 dark:text-gray-100"}`}
          />
        ) : (
          <button onClick={()=>{onSelect();if(isMobile)onClose?.();}}
            className={`flex-1 min-w-0 text-left truncate ${active?"text-blue-700 dark:text-blue-400 font-medium":"text-gray-700 dark:text-gray-300"}`}>
            {list.name}
          </button>
        )}
        {!editing && (
          <>
            <span className={`text-xs text-gray-500 dark:text-gray-500 shrink-0 ${count>0?"":"hidden"} group-hover:hidden`}>{count}</span>
            <button onClick={e=>{e.stopPropagation();setEditing(true);}}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <L name="Pencil" size={13}/>
            </button>
            <button onClick={e=>{e.stopPropagation();if(confirm(`Удалить список «${list.name}»?`))onDelete(list.id);}}
              className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <L name="Trash2" size={13}/>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Sidebar({view,setView,counts,lists,onDeleteList,onRenameList,onOpenCreate,search,setSearch,onClose,isMobile,notifStatus,onEnableNotif,onTestNotif,dark,toggleTheme}) {
  const builtins=[
    {id:"myday",    label:"Мой день",     icon:"Sun"},
    {id:"important",label:"Важное",        icon:"Star"},
    {id:"planned",  label:"Запланировано", icon:"CalendarDays"},
  ];
  return (
    <aside className={`sidebar-bg border-r border-gray-200 dark:border-gray-700/60 flex flex-col w-72 shrink-0 safe-left
      ${isMobile?"fixed inset-y-0 left-0 z-40 shadow-2xl":""}`}>
      <div className="px-3 pt-3 pb-2 flex items-center justify-between gap-2 safe-top">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0">
            <L name="CheckCircle2" size={18}/>
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">To Do</div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle dark={dark} toggle={toggleTheme}/>
          {isMobile&&<button onClick={onClose} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"><L name="X" size={22}/></button>}
        </div>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><L name="Search" size={15}/></span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск задач"
            className="w-full text-sm rounded-md pl-8 pr-8 py-2 focus:outline-none border
              bg-white/70 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700
              text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
              focus:bg-white dark:focus:bg-gray-800 focus:border-blue-400"/>
          {search&&<button onClick={()=>setSearch("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400"><L name="X" size={13}/></button>}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scroll-thin px-2">
        {builtins.map(it=>{
          const active=view===it.id&&!search;
          return (
            <button key={it.id} onClick={()=>{setView(it.id);setSearch("");if(isMobile)onClose?.();}}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm mb-0.5 transition-colors border
                ${active
                  ?"bg-white dark:bg-gray-800/80 shadow-sm border-gray-200 dark:border-gray-700 text-blue-700 dark:text-blue-400 font-medium"
                  :"hover:bg-white/70 dark:hover:bg-gray-800/50 border-transparent text-gray-700 dark:text-gray-300"}`}>
              <span className="flex items-center gap-3">
                <span className={active?"text-blue-600 dark:text-blue-400":"text-gray-500 dark:text-gray-400"}>
                  <L name={it.icon} size={18}/>
                </span>
                {it.label}
              </span>
              {counts[it.id]>0&&<span className="text-xs text-gray-500 dark:text-gray-500">{counts[it.id]}</span>}
            </button>
          );
        })}
        {lists.length>0&&<div className="h-px bg-gray-200 dark:bg-gray-700 my-2 mx-2"/>}
        {lists.map(l=>(
          <ListRow key={l.id} list={l}
            active={view==="list:"+l.id&&!search}
            count={counts["list:"+l.id]||0}
            onSelect={()=>{setView("list:"+l.id);setSearch("");}}
            onDelete={onDeleteList} onRename={onRenameList}
            isMobile={isMobile} onClose={onClose}
          />
        ))}
      </nav>

      <div className="border-t border-gray-200 dark:border-gray-700 p-2 space-y-0.5 safe-bottom">
        {notifStatus==="default"&&(
          <button onClick={onEnableNotif} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30">
            <L name="Bell" size={14}/> Включить уведомления
          </button>
        )}
        {notifStatus==="granted"&&(
          <button onClick={onTestNotif} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20">
            <L name="BellRing" size={14}/> Тест уведомления
          </button>
        )}
        {notifStatus==="denied"&&(
          <div className="px-3 py-1.5 text-[11px] text-red-500 flex items-center gap-1">
            <L name="BellOff" size={12}/> Уведомления заблокированы
          </div>
        )}
        <button onClick={onOpenCreate}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
            text-gray-700 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-gray-800/50">
          <L name="Plus" size={18}/> Создать список
        </button>
      </div>
    </aside>
  );
}

// ── 11. TaskRow, TaskComposer ────────────────────────────────
const TaskRow=memo(function TaskRow({task,showListEmoji,listEmoji,onToggle,onStar,onEdit,onContext,onOpenDate}) {
  const [editing,setEditing]=useState(false); const [value,setValue]=useState(task.title); const inputRef=useRef(null);
  useEffect(()=>setValue(task.title),[task.title]);
  useEffect(()=>{ if(editing){inputRef.current?.focus();inputRef.current?.select();} },[editing]);
  const commit=()=>{ const v=value.trim(); if(v&&v!==task.title) onEdit(task.id,v); else setValue(task.title); setEditing(false); };
  const swapEmoji=showListEmoji&&listEmoji&&!task.completed;

  // Long-press для touch (вместо правого клика)
  const longPress = useLongPress((point)=>{
    onContext({ clientX: point.clientX, clientY: point.clientY, preventDefault:()=>{} }, task);
  }, 500);

  return (
    <div onContextMenu={e=>{e.preventDefault();onContext(e,task);}}
      {...(IS_TOUCH ? longPress : {})}
      className="fade-in group rounded-md mb-1.5 transition-shadow border
        bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700
        hover:shadow-sm dark:hover:border-gray-600">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={()=>onToggle(task.id)} className="relative w-6 h-6 shrink-0 flex items-center justify-center" title="Отметить выполненной">
          <span className={`absolute inset-0 rounded-full border-2 flex items-center justify-center transition-all duration-200
            ${task.completed?"bg-blue-600 border-blue-600 opacity-100":"border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500"}
            ${swapEmoji?"opacity-0 group-hover:opacity-100":"opacity-100"}`}>
            {task.completed&&<L name="Check" size={14} className="text-white"/>}
          </span>
          {swapEmoji&&(
            <span className="absolute inset-0 flex items-center justify-center text-base leading-none opacity-100 group-hover:opacity-0 transition-opacity duration-200 pointer-events-none">
              {listEmoji}
            </span>
          )}
        </button>

        <div className="flex-1 min-w-0">
          {editing?(
            <input ref={inputRef} value={value} onChange={e=>setValue(e.target.value)}
              onBlur={commit} onKeyDown={e=>{if(e.key==="Enter")commit();if(e.key==="Escape"){setValue(task.title);setEditing(false);}}}
              className="w-full text-sm outline-none border-b border-blue-400 bg-transparent pb-0.5 text-gray-900 dark:text-gray-100"/>
          ):(
            <div onClick={()=>setEditing(true)} className={`text-sm cursor-text truncate text-gray-900 dark:text-gray-100 ${task.completed?"strike":""}`}>
              {task.title}
            </div>
          )}
          {(task.dueDate||task.recurrence||(task.reminder&&task.reminder!==task.dueDate))&&(
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
              {task.dueDate&&(
                <span className="flex items-center gap-1"><L name="CalendarDays" size={12}/>{formatDate(task.dueDate)}</span>
              )}
              {task.recurrence&&(
                <span className="flex items-center gap-1"><L name="Repeat" size={12}/>{recurrenceLabel(task.recurrence)}</span>
              )}
              {task.reminder&&task.reminder!==task.dueDate&&(
                <span className="flex items-center gap-1"><L name="Bell" size={12}/>{formatDate(task.reminder)}</span>
              )}
            </div>
          )}
        </div>

        <button onClick={()=>onOpenDate(task)}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Дата">
          <L name="CalendarDays" size={18}/>
        </button>
        <button onClick={()=>onStar(task.id)}
          className={`p-2 rounded hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors ${task.important?"text-yellow-500":"text-gray-400 dark:text-gray-500"}`}>
          <L name="Star" size={18} fill={task.important?"currentColor":"none"}/>
        </button>
      </div>
    </div>
  );
});

function TaskComposer({onAdd}) {
  const [value,setValue]=useState("");
  const [pDate,setPDate]=useState(null);
  const [pRem, setPRem] =useState(null);
  const [pRec, setPRec] =useState(null);
  const [showDate,setShowDate]=useState(false);
  const [showRem, setShowRem] =useState(false);
  const [showRec, setShowRec] =useState(false);
  const [showCustom,setShowCustom]=useState(false);

  const submit=()=>{
    const v=value.trim(); if(!v) return;
    onAdd(v,{dueDate:pDate,reminder:pRem,recurrence:pRec});
    setValue(""); setPDate(null); setPRem(null); setPRec(null);
  };
  const hasAny = pDate||pRem||pRec;
  const chip = (icon,text,onRemove) => (
    <span className="inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5
      bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
      <L name={icon} size={11}/>{text}
      <button onClick={onRemove} className="ml-0.5 hover:text-blue-900 dark:hover:text-blue-100"><L name="X" size={10}/></button>
    </span>
  );
  const iconBtn = "p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors";

  return (
    <>
      <div className="rounded-md border transition-colors
        bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700
        shadow-sm focus-within:border-blue-400 dark:focus-within:border-blue-500">
        <div className="px-4 py-3 flex items-center gap-3">
          <span className="text-blue-600 dark:text-blue-400"><L name="Plus" size={18}/></span>
          <input value={value} onChange={e=>setValue(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")submit();}}
            placeholder="Добавить задачу"
            className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"/>
          <button onClick={()=>setShowDate(true)}  className={iconBtn} title="Срок"><L name="CalendarDays" size={18}/></button>
          <button onClick={()=>setShowRem(true)}   className={iconBtn} title="Напомнить мне"><L name="AlarmClock" size={18}/></button>
          <button onClick={()=>setShowRec(true)}   className={iconBtn} title="Повтор"><L name="Repeat" size={18}/></button>
          {value&&<button onClick={submit} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium px-3 py-1">Добавить</button>}
        </div>
        {hasAny&&(
          <div className="px-4 pb-2 flex flex-wrap gap-1.5">
            {pDate&&chip("CalendarDays","Срок: "+formatDate(pDate),()=>setPDate(null))}
            {pRem&& chip("Bell","Напомнить: "+formatDate(pRem),()=>setPRem(null))}
            {pRec&& chip("Repeat",recurrenceLabel(pRec),()=>setPRec(null))}
          </div>
        )}
      </div>
      <DatePickerModal open={showDate} onClose={()=>setShowDate(false)} initial={pDate} onPick={setPDate}/>
      <ReminderModal open={showRem} onClose={()=>setShowRem(false)} initial={pRem} onPick={setPRem}/>
      <RecurrenceModal open={showRec} onClose={()=>setShowRec(false)}
        onPick={setPRec} onOpenCustom={()=>setShowCustom(true)}/>
      <CustomRecurrenceModal open={showCustom} onClose={()=>setShowCustom(false)} initial={pRec} onPick={setPRec}/>
    </>
  );
}

// ── 12. App ──────────────────────────────────────────────────
function App() {
  const [dark,toggleTheme]=useTheme();
  const [tasks,setTasks]=useLocalStorage(STORAGE_TASKS,[]);
  const [lists,setLists]=useLocalStorage(STORAGE_LISTS,[]);
  const [view,setView]=useState("myday");
  const [search,setSearch]=useState("");
  const [showCompleted,setShowCompleted]=useState(true);
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [isMobile,setIsMobile]=useState(typeof window!=="undefined"&&window.innerWidth<768);
  const [createOpen,setCreateOpen]=useState(false);
  const [ctxMenu,setCtxMenu]=useState(null);
  const [datePicker,setDatePicker]=useState(null);
  const [reminderPicker,setReminderPicker]=useState(null);
  const [recurrencePicker,setRecurrencePicker]=useState(null);
  const [customRecPicker,setCustomRecPicker]=useState(null);
  const [notifStatus,setNotifStatus]=useState(()=>"Notification" in window?Notification.permission:"denied");

  useEffect(()=>{ const h=()=>setIsMobile(window.innerWidth<768); window.addEventListener("resize",h); return()=>window.removeEventListener("resize",h); },[]);
  useEffect(()=>{ if(view==="tasks") setView("myday"); },[]);
  useEffect(()=>{ if(view.startsWith("list:")&&!lists.find(l=>l.id===view.slice(5))) setView("myday"); },[lists,view]);

  const markFired=useCallback(id=>setTasks(p=>p.map(t=>t.id===id?{...t,reminderFired:true}:t)),[setTasks]);
  useReminders(tasks,markFired);

  const enableNotif=useCallback(async()=>{
    if(!("Notification" in window)){toastDispatch?.("Уведомления не поддерживаются","","⚠️");return;}
    try{
      const p=await Notification.requestPermission(); setNotifStatus(p);
      if(p==="granted"){toastDispatch?.("Уведомления включены!","Напоминания будут приходить в других вкладках","✅"); try{new Notification("✅ Уведомления включены",{body:"Напоминания будут работать!"});}catch{}}
      else if(p==="denied") toastDispatch?.("Уведомления заблокированы","Разрешите в настройках браузера","🚫");
    }catch{setNotifStatus("denied");}
  },[]);
  const testNotif=useCallback(()=>{
    toastDispatch?.("Тестовое уведомление","Встроенные напоминания работают!","🔔");
    if("Notification" in window&&Notification.permission==="granted"){
      try{ const n=new Notification("🔔 Тест",{body:"Системные уведомления работают!",requireInteraction:true}); n.onclick=()=>{window.focus();n.close();}; }catch{}
    }
  },[]);

  const addTask=(title,meta={})=>{
    const dueDate = meta.dueDate !== undefined ? meta.dueDate : smartParseDate(title);
    const listId=view.startsWith("list:")?view.slice(5):null;
    setTasks(p=>[{
      id:uid(),title,completed:false,
      important:view==="important",
      myDay:!listId&&(view==="myday"||!!dueDate),
      listId,createdAt:new Date().toISOString(),
      dueDate,
      reminder:meta.reminder||null,
      recurrence:meta.recurrence||null,
      reminderFired:false,
    },...p]);
  };
  const updateTask=useCallback((id,patch)=>setTasks(p=>p.map(t=>t.id===id?{...t,...patch}:t)),[setTasks]);
  const toggleTask=useCallback(id=>setTasks(p=>{
    const t=p.find(x=>x.id===id); if(!t) return p;
    const completing=!t.completed;
    const updated=p.map(x=>x.id===id?{...x,completed:completing,completedAt:completing?new Date().toISOString():null}:x);
    if(completing&&t.recurrence){
      const base=t.dueDate||new Date().toISOString();
      const nextDue=nextRecurrence(t.recurrence,base);
      let nextRem=null;
      if(t.reminder&&t.dueDate){
        const delta=new Date(nextDue)-new Date(t.dueDate);
        nextRem=new Date(new Date(t.reminder).getTime()+delta).toISOString();
      } else if(t.reminder){
        nextRem=nextRecurrence(t.recurrence,t.reminder);
      }
      return [{
        ...t,id:uid(),completed:false,completedAt:null,reminderFired:false,
        dueDate:nextDue,reminder:nextRem,createdAt:new Date().toISOString(),
      },...updated];
    }
    return updated;
  }),[setTasks]);
  const starTask  =useCallback(id=>setTasks(p=>p.map(t=>t.id===id?{...t,important:!t.important}:t)),[setTasks]);
  const editTask  =useCallback((id,title)=>setTasks(p=>p.map(t=>t.id===id?{...t,title}:t)),[setTasks]);
  const deleteTask=useCallback(id=>setTasks(p=>p.filter(t=>t.id!==id)),[setTasks]);

  const createList=({name,emoji})=>{ const id=uid(); setLists(p=>[...p,{id,name,emoji:emoji||DEFAULT_EMOJI,createdAt:new Date().toISOString()}]); setView("list:"+id); };
  const deleteList=id=>{ setLists(p=>p.filter(l=>l.id!==id)); setTasks(p=>p.filter(t=>t.listId!==id)); };
  const renameList=useCallback((id,name)=>setLists(p=>p.map(l=>l.id===id?{...l,name}:l)),[setLists]);

  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase();
    let list=q?tasks.filter(t=>t.title.toLowerCase().includes(q)):
      (()=>{
        let l=tasks;
        if(view==="myday")              l=l.filter(t=>!t.listId&&(t.myDay||isSameDay(t.dueDate)));
        else if(view==="important")     l=l.filter(t=>t.important);
        else if(view==="planned")       l=l.filter(t=>t.dueDate);
        else if(view.startsWith("list:")){const id=view.slice(5);l=l.filter(t=>t.listId===id);}
        return l;
      })();
    return [...list].sort((a,b)=>{
      if(a.important!==b.important) return a.important?-1:1;
      if(a.dueDate&&b.dueDate) return new Date(a.dueDate)-new Date(b.dueDate);
      if(a.dueDate) return -1; if(b.dueDate) return 1;
      return new Date(b.createdAt)-new Date(a.createdAt);
    });
  },[tasks,view,search]);

  const active   =useMemo(()=>filtered.filter(t=>!t.completed),[filtered]);
  const completed=useMemo(()=>filtered.filter(t=> t.completed),[filtered]);

  const counts=useMemo(()=>{
    const c={};
    tasks.forEach(t=>{
      if(t.completed) return;
      if(!t.listId&&(t.myDay||isSameDay(t.dueDate))) c.myday=(c.myday||0)+1;
      if(t.important) c.important=(c.important||0)+1;
      if(t.dueDate)   c.planned  =(c.planned  ||0)+1;
      if(t.listId)    c["list:"+t.listId]=(c["list:"+t.listId]||0)+1;
    });
    return c;
  },[tasks]);

  const currentListId=view.startsWith("list:")?view.slice(5):null;
  const listEmojiById=useMemo(()=>Object.fromEntries(lists.map(l=>[l.id,l.emoji||DEFAULT_EMOJI])),[lists]);
  const showListEmoji=!!search.trim()||!currentListId;

  const buildActions=useCallback(task=>[
    {icon:"Sun",  label:task.myDay?"Убрать из «Мой день»":"Добавить в «Мой день»", hint:"Ctrl+T", onClick:()=>updateTask(task.id,{myDay:!task.myDay})},
    {icon:"Star", label:task.important?"Снять отметку важности":"Пометить как важную", onClick:()=>starTask(task.id)},
    {icon:task.completed?"RotateCcw":"CircleCheck", label:task.completed?"Вернуть в незавершённые":"Пометить как завершённую", hint:"Ctrl+D", onClick:()=>toggleTask(task.id)},
    {divider:true},
    {icon:"Calendar",        label:"Срок: сегодня", onClick:()=>updateTask(task.id,{dueDate:atHour(0,18),reminder:atHour(0,18),reminderFired:false})},
    {icon:"CalendarArrowUp", label:"Срок: завтра",  onClick:()=>updateTask(task.id,{dueDate:atHour(1,18),reminder:atHour(1,18),reminderFired:false})},
    {icon:"CalendarRange",   label:"Выбрать дату…", onClick:()=>setDatePicker({id:task.id,initial:task.dueDate||task.reminder})},
    {icon:"AlarmClock",      label:"Напомнить мне…",onClick:()=>setReminderPicker({id:task.id,initial:task.reminder})},
    {icon:"Repeat",          label:task.recurrence?`Повтор: ${recurrenceLabel(task.recurrence)}`:"Повтор…",onClick:()=>setRecurrencePicker({id:task.id,initial:task.recurrence})},
    ...(task.recurrence?[{icon:"X",label:"Убрать повторение",onClick:()=>updateTask(task.id,{recurrence:null})}]:[]),
    ...(lists.length?[
      {divider:true},
      {icon:"ArrowDownToLine",label:"Переместить задачу…",onClick:()=>{
        const names=["0. Без списка",...lists.map((l,i)=>`${i+1}. ${l.emoji} ${l.name}`)].join("\n");
        const ch=prompt(names); if(ch===null) return;
        const n=parseInt(ch,10);
        if(n===0) updateTask(task.id,{listId:null});
        else if(n>=1&&n<=lists.length) updateTask(task.id,{listId:lists[n-1].id});
      }},
    ]:[]),
    {divider:true},
    {icon:"Trash2",label:"Удалить задачу",hint:"Delete",danger:true,onClick:()=>deleteTask(task.id)},
  ],[lists,updateTask,starTask,toggleTask,deleteTask]);

  const openContext=useCallback((e,task)=>setCtxMenu({x:e.clientX,y:e.clientY,task}),[]);
  const openDate   =useCallback(task=>setDatePicker({id:task.id,initial:task.dueDate}),[]);
  const handleDatePick=iso=>{ if(!datePicker) return; updateTask(datePicker.id,{dueDate:iso,reminder:iso,reminderFired:false}); };
  const handleReminderPick=iso=>{ if(!reminderPicker) return; updateTask(reminderPicker.id,{reminder:iso,reminderFired:false}); };
  const handleRecurrencePick=rec=>{ if(!recurrencePicker) return; updateTask(recurrencePicker.id,{recurrence:rec}); };
  const handleCustomRecPick=rec=>{ if(!customRecPicker) return; updateTask(customRecPicker.id,{recurrence:rec}); };

  useEffect(()=>{
    if(!ctxMenu) return;
    const t=ctxMenu.task;
    const h=e=>{
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="t"){e.preventDefault();updateTask(t.id,{myDay:!t.myDay});setCtxMenu(null);}
      else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="d"){e.preventDefault();toggleTask(t.id);setCtxMenu(null);}
      else if(e.key==="Delete"){e.preventDefault();deleteTask(t.id);setCtxMenu(null);}
    };
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[ctxMenu,updateTask,toggleTask,deleteTask]);

  const viewMeta=useMemo(()=>{
    if(search.trim()) return{title:`Поиск: «${search.trim()}»`,sub:`Найдено: ${filtered.length}`,bg:"from-slate-600 to-slate-800"};
    if(view.startsWith("list:")){
      const l=lists.find(x=>x.id===view.slice(5));
      return{title:(l?.emoji||DEFAULT_EMOJI)+" "+(l?.name||"Список"),sub:"Пользовательский список",bg:"from-emerald-600 to-teal-700"};
    }
    return({
      myday:    {title:"Мой день",     sub:new Date().toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long"}),bg:"from-blue-600 to-indigo-700"},
      important:{title:"Важное",        sub:"Задачи, отмеченные звёздочкой",bg:"from-yellow-500 to-orange-500"},
      planned:  {title:"Запланировано", sub:"Задачи со сроком",            bg:"from-rose-500 to-pink-600"},
    })[view];
  },[view,lists,search,filtered.length]);

  return (
    <div className="flex h-full w-full">
      {(!isMobile||sidebarOpen)&&(
        <Sidebar view={view} setView={setView} counts={counts} lists={lists}
          onDeleteList={deleteList} onRenameList={renameList}
          onOpenCreate={()=>setCreateOpen(true)}
          search={search} setSearch={setSearch}
          onClose={()=>setSidebarOpen(false)} isMobile={isMobile}
          notifStatus={notifStatus} onEnableNotif={enableNotif} onTestNotif={testNotif}
          dark={dark} toggleTheme={toggleTheme}
        />
      )}
      {isMobile&&sidebarOpen&&<div className="fixed inset-0 bg-black/40 z-30" onClick={()=>setSidebarOpen(false)}/>}

      <main className="flex-1 flex flex-col min-w-0">
        <header className={`bg-gradient-to-r ${viewMeta.bg} text-white px-4 sm:px-6 py-5 flex items-center gap-3 safe-top safe-right`}>
          {isMobile&&<button onClick={()=>setSidebarOpen(true)} className="p-2 -ml-2 rounded hover:bg-white/20"><L name="Menu" size={24}/></button>}
          <div className="flex-1 min-w-0">
            <div className="text-xl font-semibold leading-tight truncate">{viewMeta.title}</div>
            <div className="text-xs opacity-80 capitalize truncate">{viewMeta.sub}</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto scroll-thin bg-[#faf9f8] dark:bg-gray-900">
          <div className="w-full px-3 sm:px-6 py-4 sm:py-5">
            {active.length===0&&(
              <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-10">
                {search.trim()?"Ничего не найдено":"Нет активных задач"}
              </div>
            )}
            {active.map(t=>(
              <TaskRow key={t.id} task={t}
                showListEmoji={showListEmoji} listEmoji={t.listId?listEmojiById[t.listId]:null}
                onToggle={toggleTask} onStar={starTask} onEdit={editTask} onContext={openContext} onOpenDate={openDate}
              />
            ))}
            {completed.length>0&&(
              <div className="mt-6">
                <button onClick={()=>setShowCompleted(v=>!v)}
                  className="flex items-center gap-2 text-xs font-medium mb-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                  <L name={showCompleted?"ChevronDown":"ChevronRight"} size={14}/>
                  Завершённые ({completed.length})
                </button>
                {showCompleted&&completed.map(t=>(
                  <TaskRow key={t.id} task={t}
                    showListEmoji={showListEmoji} listEmoji={t.listId?listEmojiById[t.listId]:null}
                    onToggle={toggleTask} onStar={starTask} onEdit={editTask} onContext={openContext} onOpenDate={openDate}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {!search.trim()&&(
          <div className="p-3 sm:p-4 border-t bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 safe-bottom safe-left safe-right">
            <TaskComposer onAdd={addTask}/>
            <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 text-center">
              {IS_TOUCH ? "Долгое нажатие — меню." : "Правый клик — меню."} «Сегодня», «завтра», «понедельник»… ставят срок автоматически.
            </div>
          </div>
        )}
      </main>

      <ToastContainer/>
      <CreateListModal open={createOpen} onClose={()=>setCreateOpen(false)} onCreate={createList}/>
      <DatePickerModal open={!!datePicker} onClose={()=>setDatePicker(null)} initial={datePicker?.initial} onPick={handleDatePick}/>
      <ReminderModal open={!!reminderPicker} onClose={()=>setReminderPicker(null)} initial={reminderPicker?.initial} onPick={handleReminderPick}/>
      <RecurrenceModal open={!!recurrencePicker} onClose={()=>setRecurrencePicker(null)}
        onPick={handleRecurrencePick}
        onOpenCustom={()=>{ if(recurrencePicker) setCustomRecPicker({id:recurrencePicker.id,initial:recurrencePicker.initial}); }}/>
      <CustomRecurrenceModal open={!!customRecPicker} onClose={()=>setCustomRecPicker(null)} initial={customRecPicker?.initial} onPick={handleCustomRecPick}/>
      <ContextMenu ctx={ctxMenu} onClose={()=>setCtxMenu(null)} actions={ctxMenu?buildActions(ctxMenu.task):[]}/>
    </div>
  );
}

// ── 13. Mount ────────────────────────────────────────────────
function mount(){
  if(!window.Lucide){window.addEventListener("lucide-ready",mount,{once:true});return;}
  ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
}
mount();
