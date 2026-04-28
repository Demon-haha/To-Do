function _extends() {
  return (
    (_extends = Object.assign
      ? Object.assign.bind()
      : function (n) {
          for (var e = 1; e < arguments.length; e++) {
            var t = arguments[e];
            for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
          }
          return n;
        }),
    _extends.apply(null, arguments)
  );
}
const { useState, useEffect, useMemo, useRef, useCallback, memo } = React;

// ─── КОНСТАНТЫ ────────────────────────────────────────────────────
const STORAGE_TASKS = "mstodo_clone_tasks_v3";
const STORAGE_LISTS = "mstodo_clone_lists_v3";
const STORAGE_THEME = "mstodo_theme";
const STORAGE_SYNC = "mstodo_sync_settings_v1";
const STORAGE_DEVICE = "mstodo_device_id";
const FIRED_KEY = "mstodo_fired_reminders_v2";
const FILE_DB_NAME = "mstodo_files_v1";
const FILE_STORE = "files";
const SYNC_TABLE = "todo_user_sync";
const DEFAULT_EMOJI = "📋";
const EMOJI_BANK = ["📋", "✅", "⭐", "💼", "🏠", "🛒", "🎯", "📚", "💡", "🏋️", "🍎", "✈️", "🎵", "💻", "🎨", "🧘", "🌱", "🔥", "💰", "📦", "🎮", "🐶", "☕", "📝"];
const COLOR_BANK = [
  {
    id: "teal",
    label: "Бирюзовый",
    gradient: "from-emerald-600 to-teal-700",
  },
  {
    id: "brown",
    label: "Шоколадный",
    gradient: "from-stone-600 to-amber-900",
  },
  {
    id: "purple",
    label: "Фиолетовый",
    gradient: "from-purple-600 to-fuchsia-700",
  },
  {
    id: "pink",
    label: "Розовый",
    gradient: "from-rose-500 to-pink-600",
  },
  {
    id: "red",
    label: "Красный",
    gradient: "from-red-600 to-rose-700",
  },
  {
    id: "gold",
    label: "Золотой",
    gradient: "from-amber-400 to-yellow-400",
  },
  {
    id: "lime",
    label: "Лаймовый",
    gradient: "from-lime-500 to-lime-700",
  },
  {
    id: "green",
    label: "Зелёный",
    gradient: "from-green-600 to-emerald-700",
  },
  {
    id: "cyan",
    label: "Голубой",
    gradient: "from-cyan-500 to-sky-600",
  },
  {
    id: "slate",
    label: "Графит",
    gradient: "from-slate-600 to-slate-800",
  },
];
const DEFAULT_COLOR = "teal";
const gradientOf = (cid) => (COLOR_BANK.find((c) => c.id === cid) || COLOR_BANK[0]).gradient;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const IS_TOUCH = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
const WEEKDAYS = {
  понедельник: 1,
  вторник: 2,
  среда: 3,
  четверг: 4,
  пятница: 5,
  суббота: 6,
  воскресенье: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 0,
};

// ─── УТИЛИТЫ ──────────────────────────────────────────────────────
function smartParseDate(text) {
  const lower = text.toLowerCase();
  const base = new Date();
  base.setHours(23, 59, 0, 0);
  if (/\bсегодня\b|\btoday\b/.test(lower)) return base.toISOString();
  if (/\bзавтра\b|\btomorrow\b/.test(lower)) {
    const d = new Date(base);
    d.setDate(d.getDate() + 1);
    return d.toISOString();
  }
  for (const [w, dow] of Object.entries(WEEKDAYS)) {
    if (new RegExp(`\\b${w}\\b`).test(lower)) {
      const d = new Date(base);
      const diff = (dow - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      return d.toISOString();
    }
  }
  return null;
}
function atHour(offsetDays, hour = 18) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}
function endOfDay(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(23, 59, 0, 0);
  return d.toISOString();
}
const _sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
function formatDateOnly(iso) {
  if (!iso) return "";
  const d = new Date(iso),
    now = new Date(),
    tom = new Date(now);
  tom.setDate(tom.getDate() + 1);
  if (_sameDay(d, now)) return "Сегодня";
  if (_sameDay(d, tom)) return "Завтра";
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}
function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso),
    now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const time = d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  let date;
  if (_sameDay(d, now)) date = "Сегодня";
  else if (_sameDay(d, tomorrow)) date = "Завтра";
  else
    date = d.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
    });
  return `${date}, ${time}`;
}
function toInputDT(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function addToDate(iso, n, unit) {
  const d = iso ? new Date(iso) : new Date();
  if (unit === "day") d.setDate(d.getDate() + n);
  else if (unit === "week") d.setDate(d.getDate() + n * 7);
  else if (unit === "month") d.setMonth(d.getMonth() + n);
  else if (unit === "year") d.setFullYear(d.getFullYear() + n);
  return d.toISOString();
}
function nextWeekday(iso) {
  const d = iso ? new Date(iso) : new Date();
  do {
    d.setDate(d.getDate() + 1);
  } while (d.getDay() === 0 || d.getDay() === 6);
  return d.toISOString();
}
function nextRecurrence(rec, fromIso) {
  if (!rec) return null;
  switch (rec.type) {
    case "daily":
      return addToDate(fromIso, 1, "day");
    case "weekdays":
      return nextWeekday(fromIso);
    case "weekends": {
      const d = fromIso ? new Date(fromIso) : new Date();
      do {
        d.setDate(d.getDate() + 1);
      } while (d.getDay() !== 0 && d.getDay() !== 6);
      return d.toISOString();
    }
    case "weekly":
      return addToDate(fromIso, 1, "week");
    case "monthly":
      return addToDate(fromIso, 1, "month");
    case "yearly":
      return addToDate(fromIso, 1, "year");
    case "custom":
      return addToDate(fromIso, rec.interval || 1, rec.unit || "day");
    default:
      return null;
  }
}
function pluralRu(n, forms) {
  const m10 = n % 10,
    m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if ([2, 3, 4].includes(m10) && ![12, 13, 14].includes(m100)) return forms[1];
  return forms[2];
}
function recurrenceLabel(r) {
  if (!r) return "";
  const L = {
    daily: "Ежедневно",
    weekdays: "Рабочие дни",
    weekends: "Только выходные",
    weekly: "Еженедельно",
    monthly: "Ежемесячно",
    yearly: "Ежегодно",
  };
  if (r.type === "custom") {
    const U = {
      day: ["день", "дня", "дней"],
      week: ["неделю", "недели", "недель"],
      month: ["месяц", "месяца", "месяцев"],
      year: ["год", "года", "лет"],
    };
    const n = r.interval || 1;
    return n === 1 ? `Каждый ${U[r.unit || "day"][0]}` : `Каждые ${n} ${pluralRu(n, U[r.unit || "day"])}`;
  }
  return L[r.type] || "";
}
const isSameDay = (iso, ref = new Date()) => {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate();
};

// ─── STORAGE ──────────────────────────────────────────────────────
function useLocalStorage(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const r = localStorage.getItem(key);
      return r ? JSON.parse(r) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);
  return [state, setState];
}

function openFileDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const req = indexedDB.open(FILE_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FILE_STORE)) db.createObjectStore(FILE_STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function fileDbRequest(mode, action) {
  return openFileDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(FILE_STORE, mode);
        const store = tx.objectStore(FILE_STORE);
        const req = action(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      })
  );
}

function saveFileBlob(meta, blob) {
  return fileDbRequest("readwrite", (store) => store.put({ ...meta, blob }));
}

function getFileBlob(id) {
  return fileDbRequest("readonly", (store) => store.get(id));
}

function deleteFileBlob(id) {
  return fileDbRequest("readwrite", (store) => store.delete(id)).catch(() => {});
}

function getDeviceId() {
  try {
    const existing = localStorage.getItem(STORAGE_DEVICE);
    if (existing) return existing;
    const next = uid();
    localStorage.setItem(STORAGE_DEVICE, next);
    return next;
  } catch {
    return uid();
  }
}

function stripTaskForSync(task) {
  return {
    ...task,
    files: (task.files || []).map(({ data, ...file }) => file),
  };
}

function isSyncReady(settings) {
  const cfg = window.MSTODO_SYNC || {};
  return !!(settings?.enabled && cfg.supabaseUrl?.trim() && cfg.supabaseAnonKey?.trim());
}

function createSyncClient() {
  const api = window.supabase;
  const cfg = window.MSTODO_SYNC || {};
  if (!api?.createClient) throw new Error("Supabase library is not loaded");
  if (!cfg.supabaseUrl?.trim() || !cfg.supabaseAnonKey?.trim()) throw new Error("Sync config is missing");
  return api.createClient(cfg.supabaseUrl.trim(), cfg.supabaseAnonKey.trim(), {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    realtime: { params: { eventsPerSecond: 2 } },
  });
}

function useCloudSync(settings, setSettings, tasks, setTasks, lists, setLists) {
  const [syncStatus, setSyncStatus] = useState({ state: "off", text: "Синхронизация выключена" });
  const [syncUser, setSyncUser] = useState(null);
  const clientRef = useRef(null);
  const readyRef = useRef(false);
  const applyingRemoteRef = useRef(false);
  const deviceIdRef = useRef(null);
  const tasksRef = useRef(tasks);
  const listsRef = useRef(lists);
  const userRef = useRef(null);
  if (!deviceIdRef.current) deviceIdRef.current = getDeviceId();
  useEffect(() => {
    tasksRef.current = tasks;
    listsRef.current = lists;
  }, [lists, tasks]);

  const applyPayload = useCallback(
    (payload) => {
      if (!payload || payload.deviceId === deviceIdRef.current) return;
      if (!Array.isArray(payload.tasks) || !Array.isArray(payload.lists)) return;
      applyingRemoteRef.current = true;
      setTasks(payload.tasks);
      setLists(payload.lists);
      setSettings((prev) => ({ ...prev, lastSyncedAt: payload.updatedAt || Date.now() }));
      setSyncStatus({ state: "on", text: "Синхронизировано" });
      setTimeout(() => {
        applyingRemoteRef.current = false;
      }, 1000);
    },
    [setLists, setSettings, setTasks]
  );

  const pushSnapshot = useCallback(async () => {
    const client = clientRef.current;
    const user = userRef.current;
    if (!client || !user || !isSyncReady(settings)) return;
    const updatedAt = Date.now();
    const payload = {
      tasks: tasksRef.current.map(stripTaskForSync),
      lists: listsRef.current,
      updatedAt,
      deviceId: deviceIdRef.current,
    };
    const { error } = await client.from(SYNC_TABLE).upsert({
      user_id: user.id,
      payload,
      updated_at: new Date(updatedAt).toISOString(),
    });
    if (error) throw error;
    setSettings((prev) => ({ ...prev, lastSyncedAt: updatedAt }));
    setSyncStatus({ state: "on", text: "Синхронизировано" });
  }, [setSettings, settings?.enabled]);

  useEffect(() => {
    readyRef.current = false;
    clientRef.current = null;
    userRef.current = null;
    setSyncUser(null);
    if (!settings?.enabled) {
      setSyncStatus({ state: "off", text: "Синхронизация выключена" });
      return;
    }
    if (!isSyncReady(settings)) {
      setSyncStatus({ state: "warn", text: "Нужна настройка синхронизации" });
      return;
    }
    let cancelled = false;
    let channel = null;
    let pollId = null;
    const pullRemote = async (client, user) => {
      const { data, error } = await client.from(SYNC_TABLE).select("payload").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      if (data?.payload) applyPayload(data.payload);
      else await pushSnapshot();
    };
    (async () => {
      try {
        setSyncStatus({ state: "syncing", text: "Подключение..." });
        const client = createSyncClient();
        clientRef.current = client;
        const { data: sessionData } = await client.auth.getSession();
        const user = sessionData.session?.user || null;
        if (!user) {
          setSyncStatus({ state: "warn", text: "Войдите в аккаунт" });
          return;
        }
        userRef.current = user;
        setSyncUser(user);
        await pullRemote(client, user);
        if (cancelled) return;
        readyRef.current = true;
        channel = client
          .channel("todo-sync-" + user.id)
          .on("postgres_changes", { event: "*", schema: "public", table: SYNC_TABLE, filter: "user_id=eq." + user.id }, (event) => {
            applyPayload(event.new?.payload);
          })
          .subscribe();
        pollId = setInterval(() => pullRemote(client, user).catch(() => setSyncStatus({ state: "warn", text: "Ошибка синхронизации" })), 15000);
        setSyncStatus({ state: "on", text: "Синхронизация включена" });
      } catch {
        if (!cancelled) setSyncStatus({ state: "warn", text: "Ошибка синхронизации" });
      }
    })();
    return () => {
      cancelled = true;
      readyRef.current = false;
      if (pollId) clearInterval(pollId);
      if (channel && clientRef.current) clientRef.current.removeChannel(channel);
    };
  }, [applyPayload, pushSnapshot, settings?.enabled, settings?.sessionNonce]);

  useEffect(() => {
    if (!readyRef.current || applyingRemoteRef.current || !isSyncReady(settings) || !syncUser) return;
    setSyncStatus({ state: "syncing", text: "Сохранение..." });
    const id = setTimeout(() => {
      pushSnapshot().catch(() => setSyncStatus({ state: "warn", text: "Ошибка синхронизации" }));
    }, 800);
    return () => clearTimeout(id);
  }, [lists, pushSnapshot, settings, syncUser, tasks]);

  return { ...syncStatus, user: syncUser, client: clientRef.current };
}

// ─── ТЕМА ─────────────────────────────────────────────────────────
function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const toggle = useCallback(() => {
    setDark((v) => {
      const next = !v;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem(STORAGE_THEME, "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem(STORAGE_THEME, "light");
      }
      return next;
    });
  }, []);
  return [dark, toggle];
}

// ─── LONG PRESS (для мобильных) ───────────────────────────────────
function useLongPress(onLongPress, delay = 500) {
  const MOVE_THRESHOLD_PX = 10;
  const timer = useRef(null);
  const target = useRef(null);
  const startEvent = useRef(null);
  const start = useCallback(
    (e) => {
      const point = e.touches ? e.touches[0] : e;
      startEvent.current = {
        clientX: point.clientX,
        clientY: point.clientY,
      };
      target.current = e.currentTarget;
      target.current?.classList.add("long-press-active");
      timer.current = setTimeout(() => {
        onLongPress(startEvent.current);
        target.current?.classList.remove("long-press-active");
        timer.current = null;
      }, delay);
    },
    [onLongPress, delay]
  );
  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    target.current?.classList.remove("long-press-active");
  }, []);
  const move = useCallback(
    (e) => {
      if (!timer.current || !startEvent.current) return;
      const p = e.touches ? e.touches[0] : e;
      const dx = p.clientX - startEvent.current.clientX;
      const dy = p.clientY - startEvent.current.clientY;
      if (dx * dx + dy * dy > MOVE_THRESHOLD_PX * MOVE_THRESHOLD_PX) clear();
    },
    [clear]
  );
  return {
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: move,
    onTouchCancel: clear,
  };
}

// ─── TOAST ────────────────────────────────────────────────────────
let toastDispatch = null;
function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  toastDispatch = useCallback((msg, sub, icon = "🔔") => {
    const id = uid();
    setToasts((p) => [
      ...p,
      {
        id,
        msg,
        sub,
        icon,
        leaving: false,
      },
    ]);
    setTimeout(() => {
      setToasts((p) =>
        p.map((t) =>
          t.id === id
            ? {
                ...t,
                leaving: true,
              }
            : t
        )
      );
      setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 350);
    }, 6000);
  }, []);
  return (
    /*#__PURE__*/ <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-full pointer-events-none">
      {toasts.map((t) => (
        /*#__PURE__*/ <div
          key={t.id}
          className={`pointer-events-auto rounded-xl shadow-2xl border px-4 py-3 flex items-start gap-3
              bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700
              ${t.leaving ? "toast-leave" : "toast-enter"}`}>
          <span className="text-xl leading-none mt-0.5">{t.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{t.msg}</div>
            {t.sub && /*#__PURE__*/ <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{t.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── REAL-TIME CLOCK ──────────────────────────────────────────────
function useNow(ms = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

// ─── WEB WORKER ───────────────────────────────────────────────────
const workerSrc = `let T={};self.onmessage=e=>{const{type,id,delay}=e.data;if(type==="schedule"){if(T[id])clearTimeout(T[id]);T[id]=setTimeout(()=>{self.postMessage({type:"fire",id});delete T[id];},Math.max(0,delay));}else if(type==="cancel"){if(T[id]){clearTimeout(T[id]);delete T[id];}}else if(type==="cancelAll"){Object.values(T).forEach(clearTimeout);T={};} };`;
function createWorker() {
  try {
    return new Worker(
      URL.createObjectURL(
        new Blob([workerSrc], {
          type: "application/javascript",
        })
      )
    );
  } catch {
    return null;
  }
}

// ─── SERVICE WORKER ───────────────────────────────────────────────
let swReg = null,
  swReady = false;
(async () => {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  try {
    swReg = await navigator.serviceWorker.register("sw.js");
    await navigator.serviceWorker.ready;
    swReady = true;
  } catch (e) {
    console.warn("SW:", e);
  }
})();

// ─── УВЕДОМЛЕНИЯ ──────────────────────────────────────────────────
function useReminders(tasks, onFire) {
  const wRef = useRef(null);
  useEffect(() => {
    wRef.current = createWorker();
    const w = wRef.current;
    const getFired = () => {
      try {
        return new Set(JSON.parse(localStorage.getItem(FIRED_KEY) || "[]"));
      } catch {
        return new Set();
      }
    };
    const addFired = (k) => {
      const s = getFired();
      s.add(k);
      try {
        localStorage.setItem(FIRED_KEY, JSON.stringify([...s]));
      } catch {}
    };
    const fire = (task) => {
      const key = `${task.id}_${task.reminder}`;
      if (getFired().has(key)) return;
      addFired(key);
      const title = "🔔 " + task.title;
      const body = task.dueDate ? "Срок: " + formatDate(task.dueDate) : "Пора выполнить задачу!";
      toastDispatch?.("Напоминание: " + task.title, body, "🔔");
      if (swReady && swReg && Notification.permission === "granted") {
        swReg.showNotification(title, {
          body,
          tag: key,
          requireInteraction: true,
          icon: "https://cdn-icons-png.flaticon.com/128/2387/2387635.png",
        });
      } else if ("Notification" in window && Notification.permission === "granted") {
        try {
          const n = new Notification(title, {
            body,
            tag: key,
            requireInteraction: true,
            icon: "https://cdn-icons-png.flaticon.com/128/2387/2387635.png",
          });
          n.onclick = () => {
            try {
              window.focus();
              n.close();
            } catch {}
          };
        } catch {}
      }
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [523.25, 659.25, 783.99].forEach((freq, i) => {
          const o = ctx.createOscillator(),
            g = ctx.createGain();
          o.type = "sine";
          o.frequency.value = freq;
          o.connect(g);
          g.connect(ctx.destination);
          const t0 = ctx.currentTime + i * 0.15;
          g.gain.setValueAtTime(0, t0);
          g.gain.linearRampToValueAtTime(0.15, t0 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);
          o.start(t0);
          o.stop(t0 + 0.4);
        });
        setTimeout(() => ctx.close(), 1200);
      } catch {}
      if (navigator.vibrate) {
        try {
          navigator.vibrate([200, 100, 200]);
        } catch {}
      }
      onFire?.(task.id);
    };
    const scheduleAll = () => {
      w?.postMessage({
        type: "cancelAll",
      });
      const swTarget = navigator.serviceWorker.controller || swReg?.active;
      if (swReg && swTarget)
        swTarget.postMessage({
          type: "cancelAll",
        });
      const now = Date.now(),
        fired = getFired();
      tasks.forEach((t) => {
        if (!t.reminder || t.completed) return;
        const key = `${t.id}_${t.reminder}`;
        if (fired.has(key)) return;
        const rt = new Date(t.reminder).getTime();
        if (rt <= now) {
          fire(t);
          return;
        }
        if (swReg && swTarget)
          swTarget.postMessage({
            type: "schedule",
            id: t.id,
            title: "🔔 " + t.title,
            body: t.dueDate ? "Срок: " + formatDate(t.dueDate) : "Пора выполнить задачу!",
            when: rt,
          });
        w?.postMessage({
          type: "schedule",
          id: t.id,
          delay: rt - now,
        });
      });
    };
    if (w)
      w.onmessage = (e) => {
        if (e.data.type === "fire") {
          const t = tasks.find((x) => x.id === e.data.id);
          if (t) fire(t);
        }
      };
    scheduleAll();
    const swTick = setInterval(() => {
      if (swReady) {
        scheduleAll();
        clearInterval(swTick);
      }
    }, 500);
    setTimeout(() => clearInterval(swTick), 5000);
    const onVis = () => {
      if (document.visibilityState === "visible") scheduleAll();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      clearInterval(swTick);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
      w?.postMessage({
        type: "cancelAll",
      });
      w?.terminate();
    };
  }, [tasks, onFire]);
}

// ─── ИКОНКА ───────────────────────────────────────────────────────
// Vanilla lucide UMD кладёт каждую иконку в window.lucide как тройку
// [tag, attrs, [[childTag, childAttrs], ...]]. Из неё руками собираем SVG.
// Если скрипт ещё не успел загрузиться — ждём событие lucide-ready и
// перерисовываемся.
const _lucideLib = () => window.lucide || window.Lucide;
const L = memo(function L({ name, size = 16, className, style }) {
  const [, force] = useState(0);
  useEffect(() => {
    if (_lucideLib()?.[name]) return;
    const onReady = () => force((n) => n + 1);
    window.addEventListener("lucide-ready", onReady);
    return () => window.removeEventListener("lucide-ready", onReady);
  }, [name]);
  const node = _lucideLib()?.[name];
  if (!node || !Array.isArray(node)) {
    return /*#__PURE__*/ <span style={{ width: size, height: size, display: "inline-block" }} />;
  }
  const [, defaults, children] = node;
  return /*#__PURE__*/ React.createElement(
    "svg",
    {
      ...defaults,
      width: size,
      height: size,
      className,
      style,
    },
    (children || []).map(([tag, attrs], i) =>
      React.createElement(tag, { key: i, ...attrs })
    )
  );
});

// ─── ПЕРЕКЛЮЧАТЕЛЬ ТЕМЫ ───────────────────────────────────────────
function ThemeToggle({ dark, toggle }) {
  return (
    /*#__PURE__*/ <button
      onClick={toggle}
      title={dark ? "Светлая тема" : "Тёмная тема"}
      className={`theme-track flex-shrink-0 ${dark ? "dark-mode" : "light-mode"}`}
      aria-label="Переключить тему">
      <div className="theme-thumb">
        {dark ? (
          /*#__PURE__*/ <L
            name="Moon"
            size={10}
            style={{
              color: "#4338ca",
            }}
          />
        ) : (
          /*#__PURE__*/ <L
            name="Sun"
            size={10}
            style={{
              color: "#f59e0b",
            }}
          />
        )}
      </div>
    </button>
  );
}

// ─── МОДАЛКА ──────────────────────────────────────────────────────
function Modal({ open, onClose, children, title, closeOnOverlay = true }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    /*#__PURE__*/ <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50" onClick={() => closeOnOverlay && onClose()}>
      <div
        className="rounded-xl shadow-2xl w-full max-w-sm pop-in bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="font-semibold text-gray-900 dark:text-gray-100">{title}</div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
            <L name="X" size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── MODAL: СОЗДАТЬ СПИСОК ────────────────────────────────────────
function CreateListModal({ open, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(DEFAULT_EMOJI);
  const [custom, setCustom] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const inputRef = useRef(null);
  useEffect(() => {
    if (open) {
      setName("");
      setEmoji(DEFAULT_EMOJI);
      setCustom("");
      setColor(DEFAULT_COLOR);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);
  const submit = () => {
    const v = name.trim();
    if (!v) return;
    onCreate({
      name: v,
      emoji: custom.trim() || emoji || DEFAULT_EMOJI,
      color,
    });
    onClose();
  };
  const iCls =
    "w-full text-sm rounded px-3 py-2 focus:outline-none border bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:border-blue-400 placeholder:text-gray-400 dark:placeholder:text-gray-500";
  return (
    /*#__PURE__*/ <Modal open={open} onClose={onClose} title="Новый список">
      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Название</label>
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder="Например: Покупки"
        className={iCls + " mb-4"}
      />
      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-2">Эмодзи</label>
      <div className="grid grid-cols-8 gap-1 mb-3">
        {EMOJI_BANK.map((e) => (
          /*#__PURE__*/ <button
            key={e}
            onClick={() => {
              setEmoji(e);
              setCustom("");
            }}
            className={`aspect-square text-lg rounded hover:bg-gray-100 dark:hover:bg-gray-600 ${emoji === e && !custom ? "bg-blue-50 dark:bg-blue-900/40 ring-1 ring-blue-400" : ""}`}>
            {e}
          </button>
        ))}
      </div>
      <input
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
        maxLength={4}
        placeholder="Или вставьте свой эмодзи"
        className={iCls + " mb-4"}
      />
      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1.5">
        <L name="Palette" size={13} /> Цвет
      </label>
      <div className="grid grid-cols-5 gap-2 mb-4">
        {COLOR_BANK.map((c) => (
          /*#__PURE__*/ <button
            key={c.id}
            onClick={() => setColor(c.id)}
            title={c.label}
            className={`aspect-square rounded-lg bg-gradient-to-br ${c.gradient} flex items-center justify-center transition-all ring-2 ${color === c.id ? "ring-blue-400 ring-offset-2 ring-offset-white dark:ring-offset-gray-800" : "ring-transparent hover:ring-white/40"}`}>
            {color === c.id && /*#__PURE__*/ <L name="Check" size={18} className="text-white" />}
          </button>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="text-sm px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
          Отмена
        </button>
        <button onClick={submit} disabled={!name.trim()} className="text-sm px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
          Создать
        </button>
      </div>
    </Modal>
  );
}

// ─── MODAL: ЦВЕТ СПИСКА ───────────────────────────────────────────
function ColorPickerModal({ open, onClose, current, onPick }) {
  return (
    /*#__PURE__*/ <Modal open={open} onClose={onClose} title="Цвет списка">
      <div className="grid grid-cols-5 gap-2 mb-4">
        {COLOR_BANK.map((c) => (
          /*#__PURE__*/ <button
            key={c.id}
            onClick={() => {
              onPick(c.id);
              onClose();
            }}
            title={c.label}
            className={`aspect-square rounded-lg bg-gradient-to-br ${c.gradient} flex items-center justify-center transition-all ring-2 ${current === c.id ? "ring-blue-400 ring-offset-2 ring-offset-white dark:ring-offset-gray-800" : "ring-transparent hover:ring-white/40"}`}>
            {current === c.id && /*#__PURE__*/ <L name="Check" size={18} className="text-white" />}
          </button>
        ))}
      </div>
      <div className="flex justify-end">
        <button onClick={onClose} className="text-sm px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
          Отмена
        </button>
      </div>
    </Modal>
  );
}

// ─── MODAL: СИНХРОНИЗАЦИЯ ─────────────────────────────────────────
function SyncModal({ open, onClose, settings, setSettings, status }) {
  const [draft, setDraft] = useState(settings);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const syncConfigured = !!((window.MSTODO_SYNC || {}).supabaseUrl?.trim() && (window.MSTODO_SYNC || {}).supabaseAnonKey?.trim());
  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);
  const saveConfig = (extra = {}) => {
    setSettings({
      ...settings,
      ...draft,
      ...extra,
      enabled: extra.enabled ?? true,
      sessionNonce: Date.now(),
    });
  };
  const getAuthClient = () => status.client || createSyncClient();
  const ensureSyncConfigured = () => {
    if (syncConfigured) return true;
    toastDispatch?.("Синхронизация не настроена", "Владелец сайта должен заполнить sync-config.js", "⚠️");
    return false;
  };
  const validateEmailPassword = () => {
    if (!email.trim() || password.length < 6) {
      toastDispatch?.("Введите email и пароль", "Пароль должен быть не короче 6 символов", "⚠️");
      return false;
    }
    return true;
  };
  const signInEmail = async () => {
    if (!ensureSyncConfigured() || !validateEmailPassword()) return;
    try {
      setBusy(true);
      saveConfig();
      const client = getAuthClient();
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      setSettings((p) => ({ ...p, enabled: true, sessionNonce: Date.now() }));
      toastDispatch?.("Вход выполнен", "Синхронизация подключается", "☁️");
    } catch (e) {
      toastDispatch?.("Не удалось войти", e.message || "Проверьте email и пароль", "⚠️");
    } finally {
      setBusy(false);
    }
  };
  const signUpEmail = async () => {
    if (!ensureSyncConfigured() || !validateEmailPassword()) return;
    try {
      setBusy(true);
      saveConfig();
      const client = getAuthClient();
      const { error } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: location.origin + location.pathname },
      });
      if (error) throw error;
      setSettings((p) => ({ ...p, enabled: true, sessionNonce: Date.now() }));
      toastDispatch?.("Аккаунт создан", "Если нужно, подтвердите почту и затем войдите", "☁️");
    } catch (e) {
      toastDispatch?.("Не удалось зарегистрироваться", e.message || "Проверьте email и пароль", "⚠️");
    } finally {
      setBusy(false);
    }
  };
  const signInGoogle = async () => {
    if (!ensureSyncConfigured()) return;
    try {
      setBusy(true);
      saveConfig();
      const client = getAuthClient();
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: location.origin + location.pathname,
        },
      });
      if (error) throw error;
    } catch (e) {
      toastDispatch?.("Не удалось открыть вход Google", e.message || "Проверьте настройки Supabase", "⚠️");
      setBusy(false);
    }
  };
  const saveOnly = () => {
    try {
      saveConfig();
      toastDispatch?.("Настройки сохранены", "Теперь можно войти или зарегистрироваться", "☁️");
    } finally {
      onClose();
    }
  };
  const signOut = async () => {
    try {
      setBusy(true);
      await status.client?.auth.signOut();
      setSettings((p) => ({ ...p, sessionNonce: Date.now() }));
      toastDispatch?.("Вы вышли из аккаунта", "", "☁️");
    } finally {
      setBusy(false);
    }
  };
  return (
    /*#__PURE__*/ <Modal open={open} onClose={onClose} title="Синхронизация">
      <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200 mb-4">
        <input
          type="checkbox"
          checked={!!draft.enabled}
          onChange={(e) => setDraft((p) => ({ ...p, enabled: e.target.checked }))}
          className="w-4 h-4"
        />
        Включить синхронизацию
      </label>
      {!syncConfigured && (
        <div className="mb-4 rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          Синхронизация ещё не настроена владельцем сайта.
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 mb-4">
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" className="w-full text-sm rounded px-3 py-2 focus:outline-none border bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:border-blue-400 placeholder:text-gray-400 dark:placeholder:text-gray-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Пароль</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="минимум 6 символов" className="w-full text-sm rounded px-3 py-2 focus:outline-none border bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:border-blue-400 placeholder:text-gray-400 dark:placeholder:text-gray-500" />
        </div>
      </div>
      <button
        onClick={signInGoogle}
        disabled={busy}
        className="w-full mb-4 flex items-center justify-center gap-2 rounded bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50">
        <L name="Chrome" size={18} />
        Войти через Google
      </button>
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Статус: {status.text}{status.user?.email ? `, ${status.user.email}` : ""}. Вложения-файлы остаются локально на устройстве.
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {status.user && (
          <button onClick={signOut} disabled={busy} className="text-sm px-4 py-2 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 disabled:opacity-50">
            Выйти
          </button>
        )}
        <button onClick={onClose} className="text-sm px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
          Закрыть
        </button>
        <button onClick={() => saveConfig({ enabled: false })} disabled={busy} className="text-sm px-4 py-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50">
          Выключить
        </button>
        <button onClick={signUpEmail} disabled={busy} className="text-sm px-4 py-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50">
          Регистрация
        </button>
        <button onClick={signInEmail} disabled={busy} className="text-sm px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
          Войти
        </button>
        <button onClick={saveOnly} disabled={busy} className="text-sm px-4 py-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50">
          Сохранить
        </button>
      </div>
    </Modal>
  );
}

// ─── MODAL: ВЫБОР ДАТЫ ────────────────────────────────────────────
const RU_MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const RU_WD = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
function DatePickerModal({ open, onClose, onPick, initial, showTime = true }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [viewDate, setViewDate] = useState(new Date());
  const [selected, setSelected] = useState(null);
  const [h, setH] = useState(9);
  const [m, setM] = useState(0);
  useEffect(() => {
    if (!open) return;
    const init = initial ? new Date(initial) : new Date();
    const s = new Date(init);
    s.setHours(0, 0, 0, 0);
    setSelected(s);
    setViewDate(new Date(init));
    setH(init.getHours());
    setM(init.getMinutes());
  }, [open, initial]);
  const y = viewDate.getFullYear(),
    mo = viewDate.getMonth();
  const first = new Date(y, mo, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, mo, d));
  const prevMonth = () => setViewDate(new Date(y, mo - 1, 1));
  const nextMonth = () => setViewDate(new Date(y, mo + 1, 1));
  const canGoPrev = new Date(y, mo, 1) > new Date(today.getFullYear(), today.getMonth(), 1);
  const resultDate = selected
    ? (() => {
        const r = new Date(selected);
        r.setHours(h, m, 0, 0);
        return r;
      })()
    : null;
  const isPast = showTime ? resultDate && resultDate < new Date() : false;
  const apply = () => {
    if (!selected) return;
    if (showTime) {
      if (!resultDate || isPast) return;
      onPick(resultDate.toISOString());
    } else {
      const r = new Date(selected);
      r.setHours(23, 59, 0, 0);
      onPick(r.toISOString());
    }
    onClose();
  };
  const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  return (
    /*#__PURE__*/ <Modal open={open} onClose={onClose} title={showTime ? "Напоминание" : "Дата выполнения"} closeOnOverlay={false}>
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} disabled={!canGoPrev} className={`p-1.5 rounded ${canGoPrev ? "hover:bg-gray-100 dark:hover:bg-gray-700" : "opacity-30 cursor-not-allowed"}`}>
          ‹
        </button>
        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
          {RU_MONTHS[mo]} {y}
        </div>
        <button onClick={nextMonth} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {RU_WD.map((w) => (
          /*#__PURE__*/ <div key={w} className="text-[11px] text-center text-gray-500 dark:text-gray-400 py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 mb-4">
        {cells.map((d, i) => {
          if (!d) return /*#__PURE__*/ <div key={i} />;
          const past = d < today;
          const isToday = sameDay(d, new Date());
          const isSel = sameDay(d, selected);
          return (
            /*#__PURE__*/ <button
              key={i}
              disabled={past}
              onClick={() => setSelected(d)}
              className={`text-sm py-1.5 rounded ${past ? "text-gray-300 dark:text-gray-600 cursor-not-allowed" : isSel ? "bg-blue-600 text-white" : isToday ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"}`}>
              {d.getDate()}
            </button>
          );
        })}
      </div>
      {showTime && (
        /*#__PURE__*/ <div className="flex items-center gap-2 mb-3">
          <label className="text-xs text-gray-600 dark:text-gray-400">Время</label>
          <input
            type="number"
            min="0"
            max="23"
            value={h}
            onChange={(e) => setH(Math.max(0, Math.min(23, parseInt(e.target.value, 10) || 0)))}
            className="w-14 text-sm rounded px-2 py-1 border bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100"
          />
          <span className="text-gray-500">:</span>
          <input
            type="number"
            min="0"
            max="59"
            value={m}
            onChange={(e) => setM(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))}
            className="w-14 text-sm rounded px-2 py-1 border bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100"
          />
        </div>
      )}
      {showTime && /*#__PURE__*/ <div className="text-[11px] mb-3 text-gray-500 dark:text-gray-400">В указанное время придёт напоминание.</div>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="text-sm px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
          Отмена
        </button>
        <button
          onClick={apply}
          disabled={showTime ? !resultDate || isPast : !selected}
          className={`text-sm px-4 py-2 rounded text-white ${(showTime ? !resultDate || isPast : !selected) ? "bg-blue-300 dark:bg-blue-900 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
          ОК
        </button>
      </div>
    </Modal>
  );
}

// ─── MODAL: ПЕРЕМЕСТИТЬ ЗАДАЧУ ────────────────────────────────────
function MoveTaskModal({ open, onClose, lists, currentListId, onPick }) {
  return (
    /*#__PURE__*/ <Modal open={open} onClose={onClose} title="Переместить задачу">
      <div className="flex flex-col gap-1 max-h-80 overflow-y-auto scroll-thin">
        <button
          onClick={() => {
            onPick(null);
            onClose();
          }}
          className={`flex items-center gap-3 px-3 py-2.5 rounded text-left text-sm ${currentListId === null ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"}`}>
          <L name="Sun" size={18} className="text-yellow-500 shrink-0" />
          <span>Без списка</span>
        </button>
        {lists.map((l) => (
          /*#__PURE__*/ <button
            key={l.id}
            onClick={() => {
              onPick(l.id);
              onClose();
            }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded text-left text-sm ${currentListId === l.id ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"}`}>
            <span className="text-lg">{l.emoji}</span>
            <span>{l.name}</span>
          </button>
        ))}
      </div>
      <div className="flex justify-end mt-4">
        <button onClick={onClose} className="text-sm px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
          Отмена
        </button>
      </div>
    </Modal>
  );
}

// ─── FILE VIEWER ──────────────────────────────────────────────────
function FileViewer({ file, onClose }) {
  const [fileUrl, setFileUrl] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";
    setFileUrl("");
    setLoading(false);
    if (!file) return;
    if (file.data) {
      setFileUrl(file.data);
      return;
    }
    setLoading(true);
    getFileBlob(file.id)
      .then((stored) => {
        if (cancelled) return;
        if (!stored?.blob) throw new Error("File is missing");
        objectUrl = URL.createObjectURL(stored.blob);
        setFileUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) toastDispatch?.("Файл не найден", "Вложение не удалось открыть", "⚠️");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file?.id, file?.data]);
  if (!file) return null;
  const isImg = file.type?.startsWith("image/");
  return (
    /*#__PURE__*/ <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 safe-top">
        <span className="text-white/70 text-sm truncate max-w-[75%]">{file.name}</span>
        <button className="p-2 text-white" onClick={onClose}>
          <L name="X" size={24} />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
        {loading ? (
          /*#__PURE__*/ <div className="text-white/60 text-sm">Загрузка...</div>
        ) : isImg && fileUrl ? (
          /*#__PURE__*/ <img src={fileUrl} className="max-w-full max-h-full object-contain rounded-xl" alt={file.name} />
        ) : (
          /*#__PURE__*/ <div className="text-center">
            <L name="File" size={64} className="text-gray-400 mx-auto mb-4" />
            <div className="text-white/60 text-sm mb-5">{file.name}</div>
            <a href={fileUrl || file.data} download={file.name} className="text-blue-400 border border-blue-400/40 px-4 py-2 rounded-lg text-sm">
              Скачать
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TASK DETAIL PANEL ────────────────────────────────────────────
function TaskDetailPanel({ taskId, tasks, lists, nowTs, isMobile, onClose, onUpdate, onToggle, onStar, onDelete, onOpenDate, onOpenReminder, onOpenRecurrence }) {
  const task = tasks.find((t) => t.id === taskId);
  const [titleEdit, setTitleEdit] = useState(false);
  const [titleVal, setTitleVal] = useState("");
  const [newStep, setNewStep] = useState("");
  const [editingStep, setEditingStep] = useState(null);
  const [viewFile, setViewFile] = useState(null);
  const fileInput = useRef(null);
  const titleRef = useRef(null);
  const swipeDownRef = useRef(null);
  useEffect(() => {
    if (task) setTitleVal(task.title);
  }, [task?.title]);
  useEffect(() => {
    if (titleEdit) titleRef.current?.select();
  }, [titleEdit]);
  if (!task) return null;
  const steps = task.steps || [];
  const files = task.files || [];
  const list = lists.find((l) => l.id === task.listId);
  const myDayLocked = !!task.myDayLocked;
  const dateOverdue = task.dueDate && !task.completed && new Date(task.dueDate) < new Date(nowTs);
  const reminderOverdue = task.reminder && !task.completed && new Date(task.reminder) < new Date(nowTs);
  const onPanelTouchStart = (e) => {
    if (!isMobile) return;
    const t = e.touches[0];
    swipeDownRef.current = { x: t.clientX, y: t.clientY };
  };
  const onPanelTouchEnd = (e) => {
    if (!isMobile || !swipeDownRef.current) return;
    const start = swipeDownRef.current;
    swipeDownRef.current = null;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (start.y < 140 && dy > 70 && Math.abs(dx) < 80) onClose();
  };
  const commitTitle = () => {
    const v = titleVal.trim();
    if (v && v !== task.title)
      onUpdate(task.id, {
        title: v,
      });
    else setTitleVal(task.title);
    setTitleEdit(false);
  };
  const addStep = () => {
    const v = newStep.trim();
    if (!v) return;
    onUpdate(task.id, {
      steps: [
        ...steps,
        {
          id: uid(),
          title: v,
          completed: false,
        },
      ],
    });
    setNewStep("");
  };
  const handleFile = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 3000000) {
      toastDispatch?.("Файл слишком большой", "Максимум 3 МБ", "⚠️");
      return;
    }
    const meta = {
      id: uid(),
      name: f.name,
      type: f.type,
      size: f.size,
      stored: "indexedDB",
    };
    try {
      await saveFileBlob(meta, f);
      onUpdate(task.id, {
        files: [...files, meta],
      });
    } catch {
      toastDispatch?.("Файл не сохранён", "Браузер не дал сохранить вложение", "⚠️");
    }
    e.target.value = "";
  };
  const panelCls = isMobile
    ? "fixed inset-0 z-50 bg-[#1c1c1e] dark:bg-gray-950 flex flex-col"
    : "fixed right-0 top-0 bottom-0 z-50 w-[380px] bg-[#1c1c1e] dark:bg-gray-950 flex flex-col shadow-2xl border-l border-gray-700/50";
  return (
    /*#__PURE__*/ <React.Fragment>
      <FileViewer file={viewFile} onClose={() => setViewFile(null)} />
      {!isMobile && /*#__PURE__*/ <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />}
      <div
        className={panelCls}
        onTouchStart={onPanelTouchStart}
        onTouchEnd={onPanelTouchEnd}
        style={{
          animation: "slideUp .2s ease-out",
        }}>
        <style>{`@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:none;opacity:1}}`}</style>
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700/40 safe-top">
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-200">
            <L name="ArrowLeft" size={22} />
          </button>
          <span className="text-sm text-gray-500">{list ? `${list.emoji} ${list.name}` : "Мой день"}</span>
        </div>
        <div className="flex-1 overflow-y-auto scroll-thin">
          <div className="flex items-start gap-4 px-5 py-5 border-b border-gray-700/30">
            <button onClick={() => onToggle(task.id)} className="task-check-btn mt-0.5 shrink-0 relative w-6 h-6 flex items-center justify-center">
              <span
                className={`absolute inset-0 rounded-full border-2 flex items-center justify-center transition-all ${task.completed ? "bg-blue-600 border-blue-600" : "border-gray-500 hover:border-blue-400"}`}>
                {task.completed && /*#__PURE__*/ <L name="Check" size={14} className="text-white" />}
              </span>
            </button>
            <div className="flex-1">
              {titleEdit ? (
                /*#__PURE__*/ <input
                  ref={titleRef}
                  value={titleVal}
                  onChange={(e) => setTitleVal(e.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitTitle();
                  }}
                  className="w-full bg-transparent outline-none text-base font-medium text-gray-100 border-b border-blue-500 pb-0.5"
                />
              ) : (
                /*#__PURE__*/ <div
                  onClick={() => {
                    setTitleVal(task.title);
                    setTitleEdit(true);
                  }}
                  className={`text-base font-medium cursor-text ${task.completed ? "line-through text-gray-500" : "text-gray-100"}`}>
                  {task.title}
                </div>
              )}
            </div>
            <button
              onClick={() => onStar(task.id)}
              className={`p-1 mt-0.5 shrink-0 ${task.important ? "text-yellow-400 star-active" : "text-gray-600 hover:text-gray-400"}`}
              style={task.important ? {filter: "drop-shadow(0 0 7px rgba(251,191,36,0.9))"} : undefined}>
              <L name="Star" size={22} fill={task.important ? "currentColor" : "none"} />
            </button>
          </div>
          <div className="border-b border-gray-700/30">
            {steps.map((s) => (
              /*#__PURE__*/ <div key={s.id} className="flex items-start gap-3 pl-10 pr-5 py-3">
                <button
                  onClick={() =>
                    onUpdate(task.id, {
                      steps: steps.map((x) =>
                        x.id === s.id
                          ? {
                              ...x,
                              completed: !x.completed,
                            }
                          : x
                      ),
                    })
                  }
                  className="task-check-btn shrink-0 relative w-5 h-5 flex items-center justify-center mt-0.5">
                  <span className={`absolute inset-0 rounded-full border-2 flex items-center justify-center ${s.completed ? "bg-blue-600 border-blue-600" : "border-gray-500"}`}>
                    {s.completed && /*#__PURE__*/ <L name="Check" size={11} className="text-white" />}
                  </span>
                </button>
                {editingStep?.id === s.id ? (
                  /*#__PURE__*/ <textarea
                    autoFocus={true}
                    value={editingStep.value}
                    rows={1}
                    onChange={(e) => {
                      setEditingStep({
                        id: s.id,
                        value: e.target.value,
                      });
                      e.target.style.height = "auto";
                      e.target.style.height = e.target.scrollHeight + "px";
                    }}
                    onBlur={() => {
                      const v = editingStep.value.trim();
                      if (v)
                        onUpdate(task.id, {
                          steps: steps.map((x) =>
                            x.id === s.id
                              ? {
                                  ...x,
                                  title: v,
                                }
                              : x
                          ),
                        });
                      setEditingStep(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        const v = editingStep.value.trim();
                        if (v)
                          onUpdate(task.id, {
                            steps: steps.map((x) =>
                              x.id === s.id
                                ? {
                                    ...x,
                                    title: v,
                                  }
                                : x
                            ),
                          });
                        setEditingStep(null);
                      }
                      if (e.key === "Escape") setEditingStep(null);
                    }}
                    className="flex-1 min-w-0 bg-transparent text-sm text-gray-300 outline-none border-b border-blue-500 pb-0.5 resize-none overflow-hidden leading-5"
                  />
                ) : (
                  /*#__PURE__*/ <span
                    onClick={() =>
                      setEditingStep({
                        id: s.id,
                        value: s.title,
                      })
                    }
                    className={`flex-1 min-w-0 text-sm cursor-text break-words ${s.completed ? "line-through text-gray-500" : "text-gray-300"}`}>
                    {s.title}
                  </span>
                )}
                <button
                  onClick={() =>
                    onUpdate(task.id, {
                      steps: steps.filter((x) => x.id !== s.id),
                    })
                  }
                  className="p-1 text-gray-600 hover:text-red-400 shrink-0 mt-0.5">
                  <L name="X" size={14} />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-3 px-5 py-3">
              <span className="w-5 h-5 flex items-center justify-center text-gray-600">
                <L name="Plus" size={16} />
              </span>
              <input
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addStep();
                }}
                placeholder="Добавить шаг"
                className="flex-1 bg-transparent text-sm text-gray-300 outline-none placeholder:text-gray-600"
              />
              {newStep && (
                /*#__PURE__*/ <button onClick={addStep} className="text-xs text-blue-400 px-2">
                  ОК
                </button>
              )}
            </div>
          </div>
          <div
            onClick={() => {
              if (!myDayLocked) onUpdate(task.id, { myDay: !task.myDay });
            }}
            className={`w-full flex items-center gap-4 px-5 py-4 border-b border-gray-700/30 transition-colors ${myDayLocked ? "cursor-default" : "cursor-pointer hover:bg-gray-800/30"}`}>
            <L name="Sun" size={20} className={task.myDay ? "text-yellow-400" : "text-gray-500"} />
            <span className={`text-sm flex-1 text-left ${task.myDay ? "text-yellow-400" : "text-gray-400"}`}>{task.myDay ? "Добавлено в «Мой день»" : "Добавить в «Мой день»"}</span>
            {task.myDay && !myDayLocked && (
              <button
                onClick={(e) => { e.stopPropagation(); onUpdate(task.id, { myDay: false }); }}
                className="p-1 text-gray-600 hover:text-gray-400 rounded">
                <L name="X" size={14} />
              </button>
            )}
          </div>
          <button onClick={() => onOpenDate(task)} className="w-full flex items-center gap-4 px-5 py-4 border-b border-gray-700/30 hover:bg-gray-800/30 transition-colors">
            <L name="Calendar" size={20} className={dateOverdue ? "text-red-400" : "text-gray-500"} />
            <span className={`text-sm flex-1 text-left ${dateOverdue ? "text-red-400" : "text-gray-400"}`}>{task.dueDate ? formatDateOnly(task.dueDate) : "Добавить дату выполнения"}</span>
            {task.dueDate && (
              /*#__PURE__*/ <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate(task.id, {
                    dueDate: null,
                  });
                }}
                className="p-1 text-gray-600 hover:text-gray-400">
                <L name="X" size={14} />
              </button>
            )}
          </button>
          <button onClick={() => onOpenReminder(task)} className="w-full flex items-center gap-4 px-5 py-4 border-b border-gray-700/30 hover:bg-gray-800/30 transition-colors">
            <L name="Bell" size={20} className={reminderOverdue ? "text-red-400" : "text-gray-500"} />
            <span className={`text-sm flex-1 text-left ${reminderOverdue ? "text-red-400" : "text-gray-400"}`}>
              {task.reminder ? (_sameDay(new Date(task.reminder), new Date()) ? formatTime(task.reminder) : `${formatDateOnly(task.reminder)}, ${formatTime(task.reminder)}`) : "Напомнить"}
            </span>
            {task.reminder && (
              /*#__PURE__*/ <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate(task.id, {
                    reminder: null,
                    reminderFired: false,
                  });
                }}
                className="p-1 text-gray-600 hover:text-gray-400">
                <L name="X" size={14} />
              </button>
            )}
          </button>
          <button onClick={() => onOpenRecurrence(task)} className="w-full flex items-center gap-4 px-5 py-4 border-b border-gray-700/30 hover:bg-gray-800/30 transition-colors">
            <L name="Repeat" size={20} className="text-gray-500" />
            <span className="text-sm flex-1 text-left text-gray-400">{task.recurrence ? recurrenceLabel(task.recurrence) : "Повтор"}</span>
            {task.recurrence && (
              /*#__PURE__*/ <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate(task.id, {
                    recurrence: null,
                  });
                }}
                className="p-1 text-gray-600 hover:text-gray-400">
                <L name="X" size={14} />
              </button>
            )}
          </button>
          {files.length > 0 && (
            /*#__PURE__*/ <div className="px-5 py-4 border-b border-gray-700/30 flex flex-wrap gap-3">
              {files.map((f) => (
                /*#__PURE__*/ <div key={f.id} className="relative">
                  {f.type?.startsWith("image/") && f.data ? (
                    /*#__PURE__*/ <button onClick={() => setViewFile(f)} className="w-16 h-16 rounded-xl overflow-hidden border border-gray-600 hover:border-blue-400">
                      <img src={f.data} className="w-full h-full object-cover" alt={f.name} />
                    </button>
                  ) : (
                    /*#__PURE__*/ <button
                      onClick={() => setViewFile(f)}
                      className="w-16 h-16 rounded-xl border border-gray-600 hover:border-blue-400 flex flex-col items-center justify-center gap-1 bg-gray-800">
                      <L name="File" size={20} className="text-gray-400" />
                      <span className="text-[9px] text-gray-500 uppercase">{f.name.split(".").pop()}</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      deleteFileBlob(f.id);
                      onUpdate(task.id, {
                        files: files.filter((x) => x.id !== f.id),
                      });
                    }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-700 hover:bg-red-600 rounded-full flex items-center justify-center border border-gray-600">
                    <L name="X" size={10} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => fileInput.current?.click()} className="w-full flex items-center gap-4 px-5 py-4 border-b border-gray-700/30 hover:bg-gray-800/30 transition-colors">
            <L name="Paperclip" size={20} className="text-gray-500" />
            <span className="text-sm text-gray-400">Добавить файл</span>
          </button>
          <input ref={fileInput} type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleFile} />
          <div className="px-5 py-4">
            <textarea
              key={task.id}
              defaultValue={task.notes || ""}
              onBlur={(e) =>
                onUpdate(task.id, {
                  notes: e.target.value,
                })
              }
              placeholder="Добавить заметку"
              className="w-full bg-transparent text-sm text-gray-400 placeholder:text-gray-600 outline-none resize-none min-h-[80px]"
              rows={3}
            />
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/40 safe-bottom">
          <span className="text-xs text-gray-600">
            {new Date(task.createdAt).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
            })}
          </span>
          <button
            onClick={() => {
              onDelete(task.id);
              onClose();
            }}
            className="p-2 text-red-500/60 hover:text-red-400">
            <L name="Trash2" size={20} />
          </button>
        </div>
      </div>
    </React.Fragment>
  );
}

// ─── SEARCH OVERLAY (мобильный) ───────────────────────────────────
function SearchOverlay({ search, setSearch, onClose, tasks, lists, nowTs, onOpenTask }) {
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return tasks.filter((t) => t.title.toLowerCase().includes(q) || (t.notes || "").toLowerCase().includes(q));
  }, [tasks, search]);
  return (
    /*#__PURE__*/ <div className="fixed inset-0 z-50 bg-[#1c1c1e] dark:bg-gray-950 flex flex-col">
      <div className="flex items-center gap-3 px-3 py-2 safe-top border-b border-gray-700/40">
        <button
          onClick={() => {
            setSearch("");
            onClose();
          }}
          className="p-2 text-gray-400 hover:text-gray-200">
          <L name="ArrowLeft" size={22} />
        </button>
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск"
          className="flex-1 bg-transparent text-base text-gray-100 outline-none placeholder:text-gray-500"
        />
        {search && (
          /*#__PURE__*/ <button onClick={() => setSearch("")} className="p-2 text-gray-500">
            <L name="X" size={18} />
          </button>
        )}
      </div>
      {!search.trim() ? (
        /*#__PURE__*/ <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8">
          <L name="Search" size={72} className="text-gray-700" />
          <div className="text-center text-gray-500 text-sm leading-relaxed">
            Что вы хотите найти?
            <br />
            Вы можете искать задачи и заметки
          </div>
        </div>
      ) : results.length === 0 ? (
        /*#__PURE__*/ <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <L name="SearchX" size={48} className="text-gray-700" />
          <div className="text-gray-500 text-sm">Ничего не найдено</div>
        </div>
      ) : (
        /*#__PURE__*/ <div className="flex-1 overflow-y-auto scroll-thin">
          {results.map((t) => {
            const overdue = t.dueDate && !t.completed && new Date(t.dueDate) < new Date(nowTs);
            const list = lists.find((l) => l.id === t.listId);
            return (
              /*#__PURE__*/ <button
                key={t.id}
                onClick={() => onOpenTask(t.id)}
                className="w-full flex items-center gap-4 px-5 py-4 border-b border-gray-700/20 text-left hover:bg-gray-800/30 transition-colors">
                <span className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${t.completed ? "bg-blue-600 border-blue-600" : "border-gray-500"}`}>
                  {t.completed && /*#__PURE__*/ <L name="Check" size={11} className="text-white" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${t.completed ? "line-through text-gray-500" : "text-gray-200"}`}>{t.title}</div>
                  {(t.dueDate || list) && (
                    /*#__PURE__*/ <div className="flex items-center gap-3 mt-0.5">
                      {t.dueDate && /*#__PURE__*/ <span className={`text-[11px] ${overdue ? "text-red-400" : "text-gray-600"}`}>{formatDate(t.dueDate)}</span>}
                      {list && (
                        /*#__PURE__*/ <span className="text-[11px] text-gray-600">
                          {list.emoji} {list.name}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {t.important && /*#__PURE__*/ <L name="Star" size={16} className="text-yellow-400 shrink-0" fill="currentColor" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MODAL: НАПОМНИТЬ ─────────────────────────────────────────────
function reminderPresets() {
  const now = new Date();
  const h = now.getHours();
  const later = new Date();
  if (h < 15) later.setHours(15, 0, 0, 0);
  else if (h < 18) later.setHours(18, 0, 0, 0);
  else if (h < 21) later.setHours(21, 0, 0, 0);
  const tom = new Date();
  tom.setDate(tom.getDate() + 1);
  tom.setHours(9, 0, 0, 0);
  const nw = new Date();
  const diff = (1 - nw.getDay() + 7) % 7 || 7;
  nw.setDate(nw.getDate() + diff);
  nw.setHours(9, 0, 0, 0);
  return {
    laterToday: later > now ? later.toISOString() : null,
    tomorrow: tom.toISOString(),
    nextWeek: nw.toISOString(),
  };
}
function ReminderModal({ open, onClose, onPick, current }) {
  const p = useMemo(() => reminderPresets(), [open]);
  const [custom, setCustom] = useState("");
  useEffect(() => {
    if (open) setCustom(current ? toInputDT(current) : toInputDT(new Date().toISOString()));
  }, [open, current]);
  const row = "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100";
  const timeText = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return _sameDay(d, new Date())
      ? formatTime(iso)
      : d.toLocaleDateString("ru-RU", {
          weekday: "short",
        }) +
          ", " +
          formatTime(iso);
  };
  const pick = (iso) => {
    onPick(iso);
    onClose();
  };
  const applyCustom = () => {
    if (custom) pick(new Date(custom).toISOString());
  };
  return (
    /*#__PURE__*/ <Modal open={open} onClose={onClose} title="Напомнить мне" closeOnOverlay={false}>
      {p.laterToday && (
        /*#__PURE__*/ <button onClick={() => pick(p.laterToday)} className={row}>
          <L name="Clock" size={18} className="text-gray-500 dark:text-gray-400" />
          <span className="flex-1 text-left">Позднее сегодня</span>
          <span className="text-xs text-gray-500">{timeText(p.laterToday)}</span>
        </button>
      )}
      <button onClick={() => pick(p.tomorrow)} className={row}>
        <L name="ArrowRightCircle" size={18} className="text-gray-500 dark:text-gray-400" />
        <span className="flex-1 text-left">Завтра</span>
        <span className="text-xs text-gray-500">{timeText(p.tomorrow)}</span>
      </button>
      <button onClick={() => pick(p.nextWeek)} className={row}>
        <L name="ChevronsRight" size={18} className="text-gray-500 dark:text-gray-400" />
        <span className="flex-1 text-left">Следующая неделя</span>
        <span className="text-xs text-gray-500">{timeText(p.nextWeek)}</span>
      </button>
      <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" />
      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Выбрать дату и время</label>
      <input
        type="datetime-local"
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
        className="w-full text-sm rounded px-3 py-2 focus:outline-none border bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:border-blue-400 mb-3"
      />
      <div className="flex justify-between gap-2">
        <button onClick={() => pick(null)} disabled={!current} className="text-sm px-4 py-2 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 disabled:opacity-40">
          Убрать
        </button>
        <div className="flex gap-2">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
            Отмена
          </button>
          <button onClick={applyCustom} disabled={!custom} className="text-sm px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            ОК
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── MODAL: ПОВТОР ────────────────────────────────────────────────
function RecurrenceModal({ open, onClose, onPick, onOpenCustom, current }) {
  const row = "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100";
  const pick = (r) => {
    onPick(r);
    onClose();
  };
  const items = [
    {
      type: "daily",
      label: "Ежедневно",
      icon: "CalendarDays",
    },
    {
      type: "weekdays",
      label: "Рабочие дни",
      icon: "CalendarRange",
    },
    {
      type: "weekends",
      label: "Только выходные",
      icon: "Umbrella",
    },
    {
      type: "weekly",
      label: "Еженедельно",
      icon: "Calendar",
    },
    {
      type: "monthly",
      label: "Ежемесячно",
      icon: "CalendarClock",
    },
    {
      type: "yearly",
      label: "Ежегодно",
      icon: "PartyPopper",
    },
  ];
  return (
    /*#__PURE__*/ <Modal open={open} onClose={onClose} title="Повтор">
      {items.map((it) => (
        /*#__PURE__*/ <button
          key={it.type}
          onClick={() =>
            pick({
              type: it.type,
            })
          }
          className={row}>
          <L name={it.icon} size={18} className="text-gray-500 dark:text-gray-400" />
          <span className="flex-1 text-left">{it.label}</span>
          {current?.type === it.type && /*#__PURE__*/ <L name="Check" size={16} className="text-blue-500" />}
        </button>
      ))}
      <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" />
      <button
        onClick={() => {
          onClose();
          onOpenCustom();
        }}
        className={row}>
        <L name="Settings2" size={18} className="text-gray-500 dark:text-gray-400" />
        <span className="flex-1 text-left">Настроить</span>
        {current?.type === "custom" && /*#__PURE__*/ <L name="Check" size={16} className="text-blue-500" />}
      </button>
      <div className="flex justify-between gap-2 mt-3">
        <button onClick={() => pick(null)} className="text-sm px-4 py-2 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 disabled:opacity-40" disabled={!current}>
          Убрать
        </button>
        <button onClick={onClose} className="text-sm px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
          Отмена
        </button>
      </div>
    </Modal>
  );
}
function CustomRecurrenceModal({ open, onClose, onPick, initial }) {
  const [interval, setInterval] = useState(1);
  const [unit, setUnit] = useState("day");
  useEffect(() => {
    if (!open) return;
    setInterval(initial?.type === "custom" ? initial.interval || 1 : 1);
    setUnit(initial?.type === "custom" ? initial.unit || "day" : "day");
  }, [open, initial]);
  const n = Math.max(1, parseInt(interval, 10) || 1);
  const units = [
    {
      v: "day",
      labels: ["день", "дня", "дней"],
    },
    {
      v: "week",
      labels: ["неделю", "недели", "недель"],
    },
    {
      v: "month",
      labels: ["месяц", "месяца", "месяцев"],
    },
    {
      v: "year",
      labels: ["год", "года", "лет"],
    },
  ];
  const apply = () => {
    onPick({
      type: "custom",
      interval: n,
      unit,
    });
    onClose();
  };
  return (
    /*#__PURE__*/ <Modal open={open} onClose={onClose} title="Настроить повтор">
      <div className="text-sm text-gray-700 dark:text-gray-300 mb-3">Повторять каждые:</div>
      <div className="flex gap-2 mb-4">
        <input
          type="number"
          min="1"
          max="999"
          value={interval}
          onChange={(e) => setInterval(e.target.value)}
          className="w-20 text-sm rounded px-3 py-2 focus:outline-none border bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:border-blue-400"
        />
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="flex-1 text-sm rounded px-3 py-2 focus:outline-none border bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:border-blue-400">
          {units.map((u) => (
            /*#__PURE__*/ <option key={u.v} value={u.v}>
              {pluralRu(n, u.labels)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="text-sm px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
          Отмена
        </button>
        <button onClick={apply} className="text-sm px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
          ОК
        </button>
      </div>
    </Modal>
  );
}

// ─── КОНТЕКСТНОЕ МЕНЮ ─────────────────────────────────────────────
function ContextMenu({ ctx, onClose, actions }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ctx) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const esc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("touchstart", close);
    window.addEventListener("keydown", esc);
    window.addEventListener("scroll", onClose, true);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("touchstart", close);
      window.removeEventListener("keydown", esc);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [ctx, onClose]);
  if (!ctx) return null;
  const W = 290;
  const posX = Math.min(ctx.x, window.innerWidth - W - 8);
  const posY = Math.min(ctx.y, window.innerHeight - 380 - 8);
  return (
    /*#__PURE__*/ <div
      ref={ref}
      style={{
        left: posX,
        top: posY,
        minWidth: W,
      }}
      className="fixed z-50 rounded-lg shadow-2xl py-1 pop-in no-select bg-[#2b2b2b] dark:bg-gray-900 dark:border dark:border-gray-700 text-gray-100">
      {actions.map((a, i) =>
        a.divider ? (
          /*#__PURE__*/ <div key={i} className="h-px bg-white/10 dark:bg-gray-700 my-1" />
        ) : (
          /*#__PURE__*/ <button
            key={i}
            onClick={() => {
              a.onClick();
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/10 dark:hover:bg-white/5 transition-colors ${a.danger ? "text-red-400" : ""}`}>
            <span className="w-5 flex justify-center opacity-80">
              <L name={a.icon} size={16} />
            </span>
            <span className="flex-1 text-left">{a.label}</span>
            {a.hint && !IS_TOUCH && /*#__PURE__*/ <span className="text-xs opacity-40">{a.hint}</span>}
          </button>
        )
      )}
    </div>
  );
}

// ─── СТРОКА СПИСКА В САЙДБАРЕ ─────────────────────────────────────
function ListRow({ list, active, count, onSelect, onDelete, onRename, onReEmoji, isMobile, onClose }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(list.name);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => setValue(list.name), [list.name]);
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);
  const commit = () => {
    const v = value.trim();
    if (v && v !== list.name) onRename(list.id, v);
    else setValue(list.name);
    setEditing(false);
  };
  return (
    /*#__PURE__*/ <div
      className={`group relative mb-0.5 rounded-md transition-colors border
        ${active ? "bg-white dark:bg-gray-800/80 shadow-sm border-gray-200 dark:border-gray-700" : "hover:bg-white/70 dark:hover:bg-gray-800/50 border-transparent"}`}>
      {emojiOpen && (
        /*#__PURE__*/ <div
          className={
            isMobile
              ? "fixed inset-x-0 bottom-0 z-[80] rounded-t-2xl bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-2xl p-4 safe-bottom"
              : "absolute left-0 bottom-full mb-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-2 w-56"
          }>
          {isMobile && <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />}
          <div className={`grid ${isMobile ? "grid-cols-6 gap-2" : "grid-cols-8 gap-1"} mb-3`}>
            {EMOJI_BANK.map((e) => (
              /*#__PURE__*/ <button
                key={e}
                onClick={(ev) => { ev.stopPropagation(); onReEmoji?.(list.id, e); setEmojiOpen(false); }}
                className={`${isMobile ? "h-11 text-2xl" : "text-lg p-0.5"} hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors`}>
                {e}
              </button>
            ))}
          </div>
          <input
            placeholder="Свой эмодзи…"
            className="w-full text-sm bg-gray-50 dark:bg-gray-700 rounded px-3 py-2 outline-none border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100"
            onKeyDown={(ev) => {
              if (ev.key === "Enter") {
                const v = ev.target.value.trim();
                if (v) { onReEmoji?.(list.id, v); setEmojiOpen(false); }
              }
              ev.stopPropagation();
            }}
            onClick={(ev) => ev.stopPropagation()}
          />
          {isMobile && (
            <button onClick={(ev) => { ev.stopPropagation(); setEmojiOpen(false); }} className="mt-3 w-full rounded bg-gray-100 dark:bg-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
              Готово
            </button>
          )}
        </div>
      )}
      <div className="flex items-center gap-3 px-3 py-2 text-sm">
        <button
          onClick={(e) => { e.stopPropagation(); setEmojiOpen((o) => !o); }}
          className="text-base leading-none w-5 text-center shrink-0 hover:scale-110 transition-transform"
          title="Изменить эмодзи">
          {list.emoji || DEFAULT_EMOJI}
        </button>
        {editing ? (
          /*#__PURE__*/ <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setValue(list.name);
                setEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className={`flex-1 min-w-0 bg-transparent outline-none border-b text-sm
                ${active ? "border-blue-400 text-blue-700 dark:text-blue-400 font-medium" : "border-gray-400 dark:border-gray-500 text-gray-900 dark:text-gray-100"}`}
          />
        ) : (
          /*#__PURE__*/ <button
            onClick={() => {
              onSelect();
              if (isMobile) onClose?.();
            }}
            className={`flex-1 min-w-0 text-left break-words ${active ? "text-blue-700 dark:text-blue-400 font-medium" : "text-gray-700 dark:text-gray-300"}`}>
            {list.name}
          </button>
        )}
        {!editing && (
          /*#__PURE__*/ <React.Fragment>
            <span className={`text-xs text-gray-500 dark:text-gray-500 shrink-0 ${count > 0 ? "" : "hidden"} group-hover:hidden`}>{count}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
              }}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              title="Переименовать">
              <L name="Pencil" size={13} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Удалить список «${list.name}»?`)) onDelete(list.id);
              }}
              className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <L name="Trash2" size={13} />
            </button>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

// ─── САЙДБАР ──────────────────────────────────────────────────────
function Sidebar({
  view,
  setView,
  counts,
  lists,
  onDeleteList,
  onRenameList,
  onReEmojiList,
  onOpenCreate,
  search,
  setSearch,
  onClose,
  isMobile,
  open,
  notifStatus,
  onEnableNotif,
  onTestNotif,
  syncStatus,
  onOpenSync,
  dark,
  toggleTheme,
}) {
  const builtins = [
    {
      id: "myday",
      label: "Мой день",
      icon: "Sun",
    },
    {
      id: "important",
      label: "Важное",
      icon: "Star",
    },
    {
      id: "planned",
      label: "Запланировано",
      icon: "CalendarDays",
    },
  ];
  return (
    /*#__PURE__*/ <aside
      className={`sidebar-bg border-r border-gray-200 dark:border-gray-700/60 flex flex-col w-72 shrink-0
        ${isMobile ? "fixed inset-y-0 left-0 z-40 shadow-2xl transition-transform duration-300 ease-out" : ""}
        ${isMobile && !open ? "-translate-x-full" : "translate-x-0"}`}>
      <div className="px-3 pt-3 pb-2 flex items-center justify-between gap-2 safe-top">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0">
            <L name="CheckCircle2" size={18} />
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">To Do</div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle dark={dark} toggle={toggleTheme} />
          {isMobile && (
            /*#__PURE__*/ <button onClick={onClose} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400">
              <L name="X" size={22} />
            </button>
          )}
        </div>
      </div>
      {!isMobile && (
        /*#__PURE__*/ <div className="px-3 pb-2">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <L name="Search" size={15} />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск задач"
              className="w-full text-sm rounded-md pl-8 pr-8 py-2 focus:outline-none border bg-white/70 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:border-blue-400"
            />
            {search && (
              /*#__PURE__*/ <button onClick={() => setSearch("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400">
                <L name="X" size={13} />
              </button>
            )}
          </div>
        </div>
      )}
      <nav className="flex-1 overflow-y-auto scroll-thin px-2">
        {builtins.map((it) => {
          const active = view === it.id && !search;
          return (
            /*#__PURE__*/ <button
              key={it.id}
              onClick={() => {
                setView(it.id);
                setSearch("");
                if (isMobile) onClose?.();
              }}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm mb-0.5 transition-colors border
                  ${active ? "bg-white dark:bg-gray-800/80 shadow-sm border-gray-200 dark:border-gray-700 text-blue-700 dark:text-blue-400 font-medium" : "hover:bg-white/70 dark:hover:bg-gray-800/50 border-transparent text-gray-700 dark:text-gray-300"}`}>
              <span className="flex items-center gap-3">
                <span className={active ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}>
                  <L name={it.icon} size={18} />
                </span>
                {it.label}
              </span>
              {counts[it.id] > 0 && /*#__PURE__*/ <span className="text-xs text-gray-500 dark:text-gray-500">{counts[it.id]}</span>}
            </button>
          );
        })}
        {lists.length > 0 && /*#__PURE__*/ <div className="h-px bg-gray-200 dark:bg-gray-700 my-2 mx-2" />}
        {lists.map((l) => (
          /*#__PURE__*/ <ListRow
            key={l.id}
            list={l}
            active={view === "list:" + l.id && !search}
            count={counts["list:" + l.id] || 0}
            onSelect={() => {
              setView("list:" + l.id);
              setSearch("");
            }}
            onDelete={onDeleteList}
            onRename={onRenameList}
            onReEmoji={onReEmojiList}
            isMobile={isMobile}
            onClose={onClose}
          />
        ))}
      </nav>
      <div className="border-t border-gray-200 dark:border-gray-700 p-2 space-y-0.5 safe-bottom">
        {notifStatus === "denied" && (
          /*#__PURE__*/ <div className="px-3 py-1.5 text-[11px] text-red-500 flex items-center gap-1">
            <L name="BellOff" size={12} /> Уведомления заблокированы в браузере
          </div>
        )}
        <button
          onClick={onOpenCreate}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-700 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-gray-800/50">
          <L name="Plus" size={18} /> Создать список
        </button>
        <button
          onClick={onOpenSync}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-gray-700 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-gray-800/50">
          <L name={syncStatus.state === "on" ? "CloudCheck" : syncStatus.state === "syncing" ? "RefreshCw" : "Cloud"} size={18} />
          <span className="flex-1 text-left">Синхронизация</span>
          <span className={`w-2 h-2 rounded-full ${syncStatus.state === "on" ? "bg-green-500" : syncStatus.state === "syncing" ? "bg-blue-500" : syncStatus.state === "warn" ? "bg-amber-500" : "bg-gray-400"}`} />
        </button>
      </div>
    </aside>
  );
}

// ─── СТРОКА ЗАДАЧИ ────────────────────────────────────────────────
const TaskRow = memo(function TaskRow({ task, showListEmoji, listEmoji, nowTs, isMobile, onToggle, onStar, onEdit, onContext, onOpenDate, onClearDate, onOpen }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.title);
  const inputRef = useRef(null);
  useEffect(() => setValue(task.title), [task.title]);
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);
  const commit = () => {
    const v = value.trim();
    if (v && v !== task.title) onEdit(task.id, v);
    else setValue(task.title);
    setEditing(false);
  };
  const swapEmoji = showListEmoji && listEmoji && !task.completed;
  const dateOverdue = task.dueDate && !task.completed && new Date(task.dueDate) < new Date(nowTs);
  const reminderOverdue = task.reminder && !task.completed && new Date(task.reminder) < new Date(nowTs);
  const overdue = dateOverdue || reminderOverdue;
  const longPress = useLongPress((point) => {
    onContext(
      {
        clientX: point.clientX,
        clientY: point.clientY,
        preventDefault: () => {},
      },
      task
    );
  }, 500);
  const handleBodyClick = () => {
    IS_TOUCH ? onOpen?.(task) : setEditing(true);
  };
  return (
    /*#__PURE__*/ <div
      onContextMenu={(e) => {
        e.preventDefault();
        onContext(e, task);
      }}
      {...(IS_TOUCH ? longPress : {})}
      className="fade-in group rounded-md mb-1.5 transition-shadow border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-sm dark:hover:border-gray-600 task-row">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => onToggle(task.id)}
          className="task-check-btn relative w-6 h-6 shrink-0 flex items-center justify-center"
          title="Отметить выполненной">
          <span
            className={`absolute inset-0 rounded-full border-2 flex items-center justify-center transition-all duration-200
              ${task.completed ? "bg-blue-600 border-blue-600 opacity-100" : "border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500"}
              ${swapEmoji ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}>
            {task.completed && /*#__PURE__*/ <L name="Check" size={14} className="text-white" />}
          </span>
          {swapEmoji && (
            /*#__PURE__*/ <span className="absolute inset-0 flex items-center justify-center text-base leading-none opacity-100 group-hover:opacity-0 transition-opacity duration-200 pointer-events-none">
              {listEmoji}
            </span>
          )}
        </button>
        <div className="flex-1 min-w-0" onClick={handleBodyClick}>
          {!IS_TOUCH && editing ? (
            /*#__PURE__*/ <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") {
                  setValue(task.title);
                  setEditing(false);
                }
              }}
              className="w-full text-sm outline-none border-b border-blue-400 bg-transparent pb-0.5 text-gray-900 dark:text-gray-100"
            />
          ) : (
            /*#__PURE__*/ <div className={`text-sm cursor-pointer break-words text-gray-900 dark:text-gray-100 ${task.completed ? "strike" : ""}`}>{task.title}</div>
          )}
          {(() => {
            const hasNotes = !!(task.notes && task.notes.trim());
            const metas = [
              task.dueDate && {
                icon: "CalendarDays",
                text: formatDateOnly(task.dueDate),
                cls: dateOverdue ? "text-red-400" : "text-gray-500 dark:text-gray-400",
              },
              task.reminder && {
                icon: "Bell",
                text: formatTime(task.reminder),
                cls: reminderOverdue ? "text-red-400" : "text-gray-500 dark:text-gray-400",
              },
              task.recurrence && {
                icon: "Repeat",
                text: recurrenceLabel(task.recurrence),
                cls: "text-gray-500 dark:text-gray-400",
              },
              task.steps?.length > 0 && {
                icon: "ListChecks",
                text: `${task.steps.filter((s) => s.completed).length}/${task.steps.length}`,
                cls: "text-gray-400 dark:text-gray-500",
                always: true,
              },
              hasNotes && {
                icon: "StickyNote",
                text: "Заметка",
                cls: "text-gray-400 dark:text-gray-500",
              },
              task.files?.length > 0 && {
                icon: "Paperclip",
                text: `${task.files.length} ${task.files.length === 1 ? "файл" : task.files.length < 5 ? "файла" : "файлов"}`,
                cls: "text-gray-400 dark:text-gray-500",
              },
            ].filter(Boolean);
            if (metas.length === 0) return null;
            const compact = isMobile && metas.length >= 4;
            return (
              /*#__PURE__*/ <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {metas.map((m, i) => (
                  /*#__PURE__*/ <span key={i} className={`flex items-center gap-1 text-[11px] ${m.cls}`}>
                    <L name={m.icon} size={11} />
                    {(!compact || m.always) && m.text}
                  </span>
                ))}
              </div>
            );
          })()}
        </div>
        <button
          onClick={() => onStar(task.id)}
          className={`p-2 rounded transition-colors ${task.important ? "text-yellow-400 star-active" : "text-gray-400 dark:text-gray-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"}`}
          style={task.important ? {filter: "drop-shadow(0 0 5px rgba(251,191,36,0.85))"} : undefined}>
          <L name="Star" size={18} fill={task.important ? "currentColor" : "none"} />
        </button>
      </div>
    </div>
  );
});

// ─── ПОЛЕ ВВОДА ЗАДАЧИ ────────────────────────────────────────────
function TaskComposer({
  onAdd,
  pickedDate,
  pickedReminder,
  pickedRecurrence,
  onOpenCalendar,
  onOpenReminder,
  onOpenRecurrence,
  onClearComposerDate,
  onClearComposerReminder,
  onClearComposerRecurrence,
  isMobile,
  sidebarOpen,
}) {
  const [value, setValue] = useState("");
  const [fabOpen, setFabOpen] = useState(false);
  const taRef = useRef(null);
  const submit = () => {
    const v = value.trim();
    if (!v) return;
    onAdd(v, {
      dueDate: pickedDate || null,
      reminder: pickedReminder || null,
      recurrence: pickedRecurrence || null,
    });
    setValue("");
    if (taRef.current) taRef.current.style.height = "auto";
    onClearComposerDate();
    onClearComposerReminder();
    onClearComposerRecurrence();
    if (isMobile) setFabOpen(false);
  };
  const iconBtn = (active) =>
    `flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs font-medium ${active ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30" : "text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"}`;
  const hasAny = pickedDate || pickedReminder || pickedRecurrence;
  const autoResize = (e) => {
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };
  const openFab = () => {
    setFabOpen(true);
    setTimeout(() => taRef.current?.focus(), 60);
  };

  // Мобильный режим — FAB (свёрнутый кружок)
  if (isMobile && !fabOpen) {
    if (sidebarOpen) return null;
    return (
      /*#__PURE__*/ <button
        onClick={openFab}
        aria-label="Добавить задачу"
        className="fixed bottom-6 left-4 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full flex items-center justify-center shadow-xl transition-transform duration-200 safe-bottom">
        <L name="Plus" size={26} />
      </button>
    );
  }

  // Мобильный режим — раскрытый поверх контента
  const overlay = isMobile && fabOpen;
  return (
    /*#__PURE__*/ <>
      {overlay && /*#__PURE__*/ <div className="fixed inset-0 z-40 bg-black/20" onClick={() => { if (!value.trim() && !hasAny) setFabOpen(false); }} />}
      <div className={overlay ? "fixed bottom-0 left-0 right-0 z-50 p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-2xl safe-bottom safe-left safe-right composer-slide-up" : ""}>
        <div className="rounded-md border transition-colors bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm focus-within:border-blue-400 dark:focus-within:border-blue-500">
          <div className="px-4 pt-3 pb-2 flex items-center gap-2">
            <span className="text-blue-600 dark:text-blue-400 shrink-0">
              <L name="Plus" size={18} />
            </span>
            <textarea
              ref={taRef}
              rows={1}
              value={value}
              onChange={(e) => { setValue(e.target.value); autoResize(e); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
              }}
              placeholder="Добавить задачу"
              className="flex-1 min-w-0 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none overflow-hidden leading-5"
            />
            {value.trim() && (
              /*#__PURE__*/ <button
                onClick={submit}
                aria-label="Добавить задачу"
                className="shrink-0 w-8 h-8 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg flex items-center justify-center transition-colors">
                <L name="ArrowUp" size={16} />
              </button>
            )}
          </div>
          {(value.trim() || hasAny) && (
            <div className="px-3 pb-2.5 flex items-center gap-1 flex-wrap border-t border-gray-100 dark:border-gray-700 pt-2">
              {pickedDate ? (
                <div className={iconBtn(true)}>
                  <L name="CalendarDays" size={14} />
                  <span onClick={onOpenCalendar} className="cursor-pointer">{formatDate(pickedDate)}</span>
                  <span onClick={onClearComposerDate} className="ml-0.5 hover:text-red-500 cursor-pointer"><L name="X" size={11} /></span>
                </div>
              ) : (
                <button onClick={onOpenCalendar} title="Срок выполнения" className={iconBtn(false)}>
                  <L name="CalendarDays" size={14} /><span>Срок</span>
                </button>
              )}
              {pickedReminder ? (
                <div className={iconBtn(true)}>
                  <L name="Bell" size={14} />
                  <span onClick={onOpenReminder} className="cursor-pointer">{formatDate(pickedReminder)}</span>
                  <span onClick={onClearComposerReminder} className="ml-0.5 hover:text-red-500 cursor-pointer"><L name="X" size={11} /></span>
                </div>
              ) : (
                <button onClick={onOpenReminder} title="Напомнить мне" className={iconBtn(false)}>
                  <L name="Bell" size={14} /><span>Напомнить</span>
                </button>
              )}
              {pickedRecurrence ? (
                <div className={iconBtn(true)}>
                  <L name="Repeat" size={14} />
                  <span onClick={onOpenRecurrence} className="cursor-pointer">{recurrenceLabel(pickedRecurrence)}</span>
                  <span onClick={onClearComposerRecurrence} className="ml-0.5 hover:text-red-500 cursor-pointer"><L name="X" size={11} /></span>
                </div>
              ) : (
                <button onClick={onOpenRecurrence} title="Повторение задачи" className={iconBtn(false)}>
                  <L name="Repeat" size={14} /><span>Повтор</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── APP ──────────────────────────────────────────────────────────
function App() {
  const [dark, toggleTheme] = useTheme();
  const [tasks, setTasks] = useLocalStorage(STORAGE_TASKS, []);
  const [lists, setLists] = useLocalStorage(STORAGE_LISTS, []);
  const [syncSettings, setSyncSettings] = useLocalStorage(STORAGE_SYNC, { enabled: false, lastSyncedAt: 0 });
  const [view, setView] = useState("myday");
  const [search, setSearch] = useState("");
  const [showCompleted, setShowCompleted] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768);
  const [createOpen, setCreateOpen] = useState(false);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [datePicker, setDatePicker] = useState(null);
  const [movePicker, setMovePicker] = useState(null);
  const [openTask, setOpenTask] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const now = useNow();
  const nowTs = now.getTime();
  const [composerDate, setComposerDate] = useState(null);
  const [composerReminder, setComposerReminder] = useState(null);
  const [composerRecurrence, setComposerRecurrence] = useState(null);
  const [composerCalOpen, setComposerCalOpen] = useState(false);
  const [composerRemOpen, setComposerRemOpen] = useState(false);
  const [composerRecOpen, setComposerRecOpen] = useState(false);
  const [composerCustomRecOpen, setComposerCustomRecOpen] = useState(false);
  const [recurrencePicker, setRecurrencePicker] = useState(null);
  const [customRecPicker, setCustomRecPicker] = useState(null);
  const [reminderPicker, setReminderPicker] = useState(null);
  const [colorPicker, setColorPicker] = useState(null);
  const [notifStatus, setNotifStatus] = useState(() => ("Notification" in window ? Notification.permission : "denied"));
  const syncStatus = useCloudSync(syncSettings, setSyncSettings, tasks, setTasks, lists, setLists);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  useEffect(() => {
    if (view === "tasks") setView("myday");
  }, []);
  useEffect(() => {
    if (view.startsWith("list:") && !lists.find((l) => l.id === view.slice(5))) setView("myday");
  }, [lists, view]);
  const markFired = useCallback(
    (id) =>
      setTasks((p) =>
        p.map((t) =>
          t.id === id
            ? {
                ...t,
                reminderFired: true,
              }
            : t
        )
      ),
    [setTasks]
  );
  useReminders(tasks, markFired);
  const enableNotif = useCallback(async () => {
    if (!("Notification" in window)) {
      toastDispatch?.("Уведомления не поддерживаются", "", "⚠️");
      return;
    }
    try {
      const p = await Notification.requestPermission();
      setNotifStatus(p);
      if (p === "granted") {
        toastDispatch?.("Уведомления включены!", "Напоминания будут приходить в других вкладках", "✅");
        try {
          new Notification("✅ Уведомления включены", {
            body: "Напоминания будут работать!",
          });
        } catch {}
      } else if (p === "denied") toastDispatch?.("Уведомления заблокированы", "Разрешите в настройках браузера", "🚫");
    } catch {
      setNotifStatus("denied");
    }
  }, []);
  const testNotif = useCallback(() => {
    toastDispatch?.("Тестовое уведомление", "Встроенные напоминания работают!", "🔔");
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const n = new Notification("🔔 Тест", {
          body: "Системные уведомления работают!",
          requireInteraction: true,
        });
        n.onclick = () => {
          window.focus();
          n.close();
        };
      } catch {}
    }
  }, []);
  const addTask = (title, meta = {}) => {
    const explicitDate = meta.dueDate !== undefined ? meta.dueDate : null;
    const dueDate = explicitDate || smartParseDate(title) || (view === "planned" ? endOfDay(0) : null);
    const listId = view.startsWith("list:") ? view.slice(5) : null;
    const reminder = meta.reminder || null;
    const recurrence = meta.recurrence || null;
    setTasks((p) => [
      {
        id: uid(),
        title,
        completed: false,
        important: view === "important",
        myDay: !listId && (view === "myday" || view === "important" || !!dueDate),
        myDayLocked: !listId && view === "myday",
        listId,
        createdAt: new Date().toISOString(),
        dueDate,
        reminder,
        recurrence,
        reminderFired: false,
      },
      ...p,
    ]);
  };
  const updateTask = useCallback(
    (id, patch) =>
      setTasks((p) =>
        p.map((t) =>
          t.id === id
            ? {
                ...t,
                ...patch,
              }
            : t
        )
      ),
    [setTasks]
  );
  const toggleTask = useCallback(
    (id) =>
      setTasks((p) => {
        const t = p.find((x) => x.id === id);
        if (!t) return p;
        const completing = !t.completed;
        if (completing && t.recurrence) {
          const base = t.dueDate || new Date().toISOString();
          const nextDue = nextRecurrence(t.recurrence, base);
          let nextRem = null;
          if (t.reminder && t.dueDate) {
            const delta = new Date(nextDue) - new Date(t.dueDate);
            nextRem = new Date(new Date(t.reminder).getTime() + delta).toISOString();
          } else if (t.reminder) {
            nextRem = nextRecurrence(t.recurrence, t.reminder);
          }
          // same task: mark completed, store next occurrence date — auto-restored when date arrives
          return p.map((x) =>
            x.id === id
              ? {
                  ...x,
                  completed: true,
                  completedAt: new Date().toISOString(),
                  dueDate: nextDue,
                  reminder: nextRem,
                  reminderFired: false,
                  deferUntil: nextDue,
                  steps: (x.steps || []).map((s) => ({
                    ...s,
                    completed: false,
                  })),
                }
              : x
          );
        }
        return p.map((x) =>
          x.id === id
            ? {
                ...x,
                completed: completing,
                completedAt: completing ? new Date().toISOString() : null,
                deferUntil: null,
              }
            : x
        );
      }),
    [setTasks]
  );
  // auto-restore recurring tasks when their deferUntil passes
  useEffect(() => {
    const now = new Date(nowTs);
    setTasks((p) => {
      const any = p.some((t) => t.completed && t.deferUntil && new Date(t.deferUntil) <= now);
      if (!any) return p;
      return p.map((t) =>
        t.completed && t.deferUntil && new Date(t.deferUntil) <= now
          ? {
              ...t,
              completed: false,
              completedAt: null,
              deferUntil: null,
            }
          : t
      );
    });
  }, [nowTs]);
  const starTask = useCallback(
    (id) =>
      setTasks((p) =>
        p.map((t) =>
          t.id === id
            ? {
                ...t,
                important: !t.important,
              }
            : t
        )
      ),
    [setTasks]
  );
  const editTask = useCallback(
    (id, title) =>
      setTasks((p) =>
        p.map((t) =>
          t.id === id
            ? {
                ...t,
                title,
              }
            : t
        )
      ),
    [setTasks]
  );
  const deleteTask = useCallback((id) => setTasks((p) => p.filter((t) => t.id !== id)), [setTasks]);
  const clearDate = useCallback(
    (id) =>
      updateTask(id, {
        dueDate: null,
        reminder: null,
        reminderFired: false,
      }),
    [updateTask]
  );
  const createList = ({ name, emoji, color }) => {
    const id = uid();
    setLists((p) => [
      ...p,
      {
        id,
        name,
        emoji: emoji || DEFAULT_EMOJI,
        color: color || DEFAULT_COLOR,
        createdAt: new Date().toISOString(),
      },
    ]);
    setView("list:" + id);
  };
  const recolorList = useCallback(
    (id, color) =>
      setLists((p) =>
        p.map((l) =>
          l.id === id
            ? {
                ...l,
                color,
              }
            : l
        )
      ),
    [setLists]
  );
  const deleteList = (id) => {
    setLists((p) => p.filter((l) => l.id !== id));
    setTasks((p) => p.filter((t) => t.listId !== id));
  };
  const renameList = useCallback(
    (id, name) =>
      setLists((p) =>
        p.map((l) =>
          l.id === id
            ? {
                ...l,
                name,
              }
            : l
        )
      ),
    [setLists]
  );
  const reemojiList = useCallback(
    (id, emoji) => setLists((p) => p.map((l) => (l.id === id ? { ...l, emoji } : l))),
    [setLists]
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = q
      ? tasks.filter((t) => t.title.toLowerCase().includes(q))
      : (() => {
          let l = tasks;
          if (view === "myday") l = l.filter((t) => !t.listId && (t.myDay || isSameDay(t.dueDate)));
          else if (view === "important") l = l.filter((t) => t.important);
          else if (view === "planned") l = l.filter((t) => t.dueDate);
          else if (view.startsWith("list:")) {
            const id = view.slice(5);
            l = l.filter((t) => t.listId === id);
          }
          return l;
        })();
    return [...list].sort((a, b) => {
      if (a.important !== b.important) return a.important ? -1 : 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [tasks, view, search]);
  const active = useMemo(() => filtered.filter((t) => !t.completed && !(t.deferUntil && new Date(t.deferUntil) > new Date(nowTs))), [filtered, nowTs]);
  const completed = useMemo(() => filtered.filter((t) => t.completed), [filtered]);
  const counts = useMemo(() => {
    const now = new Date(nowTs);
    const c = {};
    tasks.forEach((t) => {
      if (t.completed) return;
      if (t.deferUntil && new Date(t.deferUntil) > now) return;
      if (!t.listId && (t.myDay || isSameDay(t.dueDate))) c.myday = (c.myday || 0) + 1;
      if (t.important) c.important = (c.important || 0) + 1;
      if (t.dueDate) c.planned = (c.planned || 0) + 1;
      if (t.listId) c["list:" + t.listId] = (c["list:" + t.listId] || 0) + 1;
    });
    return c;
  }, [tasks, nowTs]);
  const currentListId = view.startsWith("list:") ? view.slice(5) : null;
  const listEmojiById = useMemo(() => Object.fromEntries(lists.map((l) => [l.id, l.emoji || DEFAULT_EMOJI])), [lists]);
  const showListEmoji = !!search.trim() || !currentListId;
  const buildActions = useCallback(
    (task) => [
      ...(task.myDayLocked
        ? []
        : [
            {
              icon: "Sun",
              label: task.myDay ? "Убрать из «Мой день»" : "Добавить в «Мой день»",
              hint: "Ctrl+T",
              onClick: () =>
                updateTask(task.id, {
                  myDay: !task.myDay,
                }),
            },
          ]),
      {
        icon: "Star",
        label: task.important ? "Снять отметку важности" : "Пометить как важную",
        onClick: () => starTask(task.id),
      },
      {
        icon: task.completed ? "RotateCcw" : "CircleCheck",
        label: task.completed ? "Вернуть в незавершённые" : "Пометить как завершённую",
        hint: "Ctrl+D",
        onClick: () => toggleTask(task.id),
      },
      {
        divider: true,
      },
      {
        icon: "Calendar",
        label: "Срок: сегодня",
        onClick: () =>
          updateTask(task.id, {
            dueDate: endOfDay(0),
            reminder: null,
            reminderFired: false,
          }),
      },
      {
        icon: "CalendarArrowUp",
        label: "Срок: завтра",
        onClick: () =>
          updateTask(task.id, {
            dueDate: endOfDay(1),
            reminder: null,
            reminderFired: false,
          }),
      },
      {
        icon: "CalendarRange",
        label: "Выбрать дату…",
        onClick: () =>
          setDatePicker({
            id: task.id,
            initial: task.dueDate,
            type: "due",
          }),
      },
      {
        icon: "Bell",
        label: "Напомнить…",
        onClick: () =>
          setReminderPicker({
            id: task.id,
            initial: task.reminder,
          }),
      },
      {
        icon: "Repeat",
        label: task.recurrence ? `Повтор: ${recurrenceLabel(task.recurrence)}` : "Повтор…",
        onClick: () =>
          setRecurrencePicker({
            id: task.id,
            initial: task.recurrence,
          }),
      },
      ...(task.dueDate
        ? [
            {
              icon: "CalendarX",
              label: "Убрать дату",
              onClick: () =>
                updateTask(task.id, {
                  dueDate: null,
                }),
            },
          ]
        : []),
      ...(task.reminder
        ? [
            {
              icon: "BellOff",
              label: "Убрать напоминание",
              onClick: () =>
                updateTask(task.id, {
                  reminder: null,
                  reminderFired: false,
                }),
            },
          ]
        : []),
      ...(task.recurrence
        ? [
            {
              icon: "X",
              label: "Убрать повтор",
              onClick: () =>
                updateTask(task.id, {
                  recurrence: null,
                }),
            },
          ]
        : []),
      ...(lists.length
        ? [
            {
              divider: true,
            },
            {
              icon: "ArrowDownToLine",
              label: "Переместить задачу…",
              onClick: () =>
                setMovePicker({
                  id: task.id,
                }),
            },
          ]
        : []),
      {
        divider: true,
      },
      {
        icon: "Trash2",
        label: "Удалить задачу",
        hint: "Delete",
        danger: true,
        onClick: () => deleteTask(task.id),
      },
    ],
    [lists, updateTask, starTask, toggleTask, deleteTask]
  );
  const openContext = useCallback(
    (e, task) =>
      setCtxMenu({
        x: e.clientX,
        y: e.clientY,
        task,
      }),
    []
  );
  const openDate = useCallback(
    (task) =>
      setDatePicker({
        id: task.id,
        initial: task.dueDate,
        type: "due",
      }),
    []
  );
  const openReminder = useCallback(
    (task) =>
      setDatePicker({
        id: task.id,
        initial: task.reminder,
        type: "reminder",
      }),
    []
  );
  const handleDatePick = (iso) => {
    if (!datePicker) return;
    if (datePicker.type === "reminder")
      updateTask(datePicker.id, {
        reminder: iso,
        reminderFired: false,
      });
    else
      updateTask(datePicker.id, {
        dueDate: iso,
      });
  };
  useEffect(() => {
    if (!ctxMenu) return;
    const t = ctxMenu.task;
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "t") {
        e.preventDefault();
        if (!t.myDayLocked)
          updateTask(t.id, {
            myDay: !t.myDay,
          });
        setCtxMenu(null);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        toggleTask(t.id);
        setCtxMenu(null);
      } else if (e.key === "Delete") {
        e.preventDefault();
        deleteTask(t.id);
        setCtxMenu(null);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [ctxMenu, updateTask, toggleTask, deleteTask]);
  const viewMeta = useMemo(() => {
    if (search.trim())
      return {
        title: `Поиск: «${search.trim()}»`,
        sub: `Найдено: ${filtered.length}`,
        bg: "from-slate-600 to-slate-800",
      };
    if (view.startsWith("list:")) {
      const l = lists.find((x) => x.id === view.slice(5));
      return {
        title: (l?.emoji || DEFAULT_EMOJI) + " " + (l?.name || "Список"),
        sub: "",
        bg: gradientOf(l?.color),
      };
    }
    return {
      myday: {
        title: "Мой день",
        sub: new Date().toLocaleDateString("ru-RU", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }),
        bg: "from-blue-900 to-indigo-900",
      },
      important: {
        title: "Важное",
        sub: "Задачи, отмеченные звёздочкой",
        bg: "from-yellow-500 to-amber-500",
      },
      planned: {
        title: "Запланировано",
        sub: "Задачи со сроком",
        bg: "from-rose-900 to-pink-900",
      },
    }[view];
  }, [view, lists, search, filtered.length]);
  const swipeRef = useRef(null);
  const onSwipeStart = useCallback((e) => {
    const t = e.touches[0];
    swipeRef.current = { x: t.clientX, y: t.clientY };
  }, []);
  const onSwipeEnd = useCallback((e) => {
    if (!swipeRef.current) return;
    const start = swipeRef.current;
    swipeRef.current = null;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dy) > Math.abs(dx) * 1.5) return;
    if (dx > 50 && !sidebarOpen && start.x < 40) setSidebarOpen(true);
    if (dx < -50 && sidebarOpen) setSidebarOpen(false);
  }, [sidebarOpen]);
  return (
    /*#__PURE__*/ <div className="flex h-full w-full" onTouchStart={onSwipeStart} onTouchEnd={onSwipeEnd}>
      <Sidebar
        view={view}
        setView={setView}
        counts={counts}
        lists={lists}
        onDeleteList={deleteList}
        onRenameList={renameList}
        onReEmojiList={reemojiList}
        onOpenCreate={() => setCreateOpen(true)}
        search={search}
        setSearch={setSearch}
        onClose={() => setSidebarOpen(false)}
        isMobile={isMobile}
        open={sidebarOpen}
        notifStatus={notifStatus}
        onEnableNotif={enableNotif}
        onTestNotif={testNotif}
        syncStatus={syncStatus}
        onOpenSync={() => setSyncOpen(true)}
        dark={dark}
        toggleTheme={toggleTheme}
      />
      {isMobile && <div
        className={`fixed inset-0 bg-black/40 z-30 transition-opacity duration-300 ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setSidebarOpen(false)}
      />}
      <main className="flex-1 flex flex-col min-w-0">
        <header className={`bg-gradient-to-r ${viewMeta.bg} text-white px-4 sm:px-6 py-5 flex items-center gap-3 safe-top safe-right`}>
          {isMobile && (
            /*#__PURE__*/ <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 rounded hover:bg-white/20">
              <L name="Menu" size={24} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xl font-semibold leading-tight truncate">{viewMeta.title}</div>
            {viewMeta.sub && /*#__PURE__*/ <div className="text-xs opacity-80 capitalize truncate">{viewMeta.sub}</div>}
          </div>
          {view.startsWith("list:") && (() => {
            const hl = lists.find((l) => l.id === view.slice(5));
            return hl ? (
              /*#__PURE__*/ <button onClick={() => setColorPicker({ id: hl.id, current: hl.color })} className="p-2 rounded hover:bg-white/20" title="Цвет списка">
                <L name="Palette" size={20} />
              </button>
            ) : null;
          })()}
          {isMobile && (
            /*#__PURE__*/ <button onClick={() => setSearchOpen(true)} className="p-2 rounded hover:bg-white/20">
              <L name="Search" size={20} />
            </button>
          )}
        </header>
        <div className="flex-1 overflow-y-auto scroll-thin bg-[#faf9f8] dark:bg-gray-900">
          <div className="w-full px-3 sm:px-6 py-4 sm:py-5">
            {active.length === 0 && /*#__PURE__*/ <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-10">{search.trim() ? "Ничего не найдено" : "Нет активных задач"}</div>}
            {active.map((t) => (
              /*#__PURE__*/ <TaskRow
                key={t.id}
                task={t}
                nowTs={nowTs}
                isMobile={isMobile}
                showListEmoji={showListEmoji}
                listEmoji={t.listId ? listEmojiById[t.listId] : null}
                onToggle={toggleTask}
                onStar={starTask}
                onEdit={editTask}
                onContext={openContext}
                onOpenDate={openDate}
                onClearDate={clearDate}
                onOpen={(t) => setOpenTask(t.id)}
              />
            ))}
            {completed.length > 0 && (
              /*#__PURE__*/ <div className="mt-6">
                <button
                  onClick={() => setShowCompleted((v) => !v)}
                  className="flex items-center gap-2 text-xs font-medium mb-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                  <L name={showCompleted ? "ChevronDown" : "ChevronRight"} size={14} />
                  Завершённые ({completed.length})
                </button>
                {showCompleted &&
                  completed.map((t) => (
                    /*#__PURE__*/ <TaskRow
                      key={t.id}
                      task={t}
                      nowTs={nowTs}
                      showListEmoji={showListEmoji}
                      listEmoji={t.listId ? listEmojiById[t.listId] : null}
                      onToggle={toggleTask}
                      onStar={starTask}
                      onEdit={editTask}
                      onContext={openContext}
                      onOpenDate={openDate}
                      onClearDate={clearDate}
                      onOpen={(t) => setOpenTask(t.id)}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>
        {!search.trim() && (
          isMobile ? (
            /*#__PURE__*/ <TaskComposer
              isMobile={true}
              sidebarOpen={sidebarOpen}
              onAdd={addTask}
              pickedDate={composerDate}
              pickedReminder={composerReminder}
              pickedRecurrence={composerRecurrence}
              onOpenCalendar={() => setComposerCalOpen(true)}
              onOpenReminder={() => setComposerRemOpen(true)}
              onOpenRecurrence={() => setComposerRecOpen(true)}
              onClearComposerDate={() => setComposerDate(null)}
              onClearComposerReminder={() => setComposerReminder(null)}
              onClearComposerRecurrence={() => setComposerRecurrence(null)}
            />
          ) : (
            /*#__PURE__*/ <div className="p-3 sm:p-4 border-t bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 safe-bottom safe-left safe-right">
              <TaskComposer
                onAdd={addTask}
                pickedDate={composerDate}
                pickedReminder={composerReminder}
                pickedRecurrence={composerRecurrence}
                onOpenCalendar={() => setComposerCalOpen(true)}
                onOpenReminder={() => setComposerRemOpen(true)}
                onOpenRecurrence={() => setComposerRecOpen(true)}
                onClearComposerDate={() => setComposerDate(null)}
                onClearComposerReminder={() => setComposerReminder(null)}
                onClearComposerRecurrence={() => setComposerRecurrence(null)}
              />
            </div>
          )
        )}
      </main>
      <ToastContainer />
      <CreateListModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={createList} />
      <SyncModal open={syncOpen} onClose={() => setSyncOpen(false)} settings={syncSettings} setSettings={setSyncSettings} status={syncStatus} />
      <ColorPickerModal
        open={!!colorPicker}
        onClose={() => setColorPicker(null)}
        current={colorPicker?.current}
        onPick={(cid) => {
          if (colorPicker) recolorList(colorPicker.id, cid);
        }}
      />
      <DatePickerModal open={!!datePicker} onClose={() => setDatePicker(null)} initial={datePicker?.initial} onPick={handleDatePick} showTime={datePicker?.type === "reminder"} />
      <MoveTaskModal
        open={!!movePicker}
        onClose={() => setMovePicker(null)}
        lists={lists}
        currentListId={movePicker ? (tasks.find((t) => t.id === movePicker.id)?.listId ?? null) : null}
        onPick={(id) => {
          if (movePicker)
            updateTask(movePicker.id, {
              listId: id,
            });
        }}
      />
      <DatePickerModal
        open={composerCalOpen}
        onClose={() => setComposerCalOpen(false)}
        initial={composerDate}
        showTime={false}
        onPick={(iso) => {
          setComposerDate(iso);
          setComposerCalOpen(false);
        }}
      />
      <ReminderModal open={composerRemOpen} onClose={() => setComposerRemOpen(false)} current={composerReminder} onPick={setComposerReminder} />
      <ReminderModal
        open={!!reminderPicker}
        onClose={() => setReminderPicker(null)}
        current={reminderPicker?.initial}
        onPick={(iso) => {
          if (reminderPicker)
            updateTask(reminderPicker.id, {
              reminder: iso,
              reminderFired: false,
            });
        }}
      />
      <RecurrenceModal
        open={composerRecOpen}
        onClose={() => setComposerRecOpen(false)}
        current={composerRecurrence}
        onPick={setComposerRecurrence}
        onOpenCustom={() => setComposerCustomRecOpen(true)}
      />
      <CustomRecurrenceModal open={composerCustomRecOpen} onClose={() => setComposerCustomRecOpen(false)} initial={composerRecurrence} onPick={setComposerRecurrence} />
      <RecurrenceModal
        open={!!recurrencePicker}
        onClose={() => setRecurrencePicker(null)}
        current={recurrencePicker?.initial}
        onPick={(rec) => {
          if (recurrencePicker)
            updateTask(recurrencePicker.id, {
              recurrence: rec,
            });
        }}
        onOpenCustom={() => {
          if (recurrencePicker)
            setCustomRecPicker({
              id: recurrencePicker.id,
              initial: recurrencePicker.initial,
            });
        }}
      />
      <CustomRecurrenceModal
        open={!!customRecPicker}
        onClose={() => setCustomRecPicker(null)}
        initial={customRecPicker?.initial}
        onPick={(rec) => {
          if (customRecPicker)
            updateTask(customRecPicker.id, {
              recurrence: rec,
            });
        }}
      />
      <ContextMenu ctx={ctxMenu} onClose={() => setCtxMenu(null)} actions={ctxMenu ? buildActions(ctxMenu.task) : []} />
      {openTask && (
        /*#__PURE__*/ <TaskDetailPanel
          taskId={openTask}
          tasks={tasks}
          lists={lists}
          nowTs={nowTs}
          isMobile={isMobile}
          onClose={() => setOpenTask(null)}
          onUpdate={updateTask}
          onToggle={toggleTask}
          onStar={starTask}
          onDelete={deleteTask}
          onOpenDate={(task) => {
            setDatePicker({
              id: task.id,
              initial: task.dueDate,
              type: "due",
            });
          }}
          onOpenReminder={(task) => {
            setReminderPicker({
              id: task.id,
              initial: task.reminder,
            });
          }}
          onOpenRecurrence={(task) => {
            setRecurrencePicker({
              id: task.id,
              initial: task.recurrence,
            });
          }}
        />
      )}
      {searchOpen && (
        /*#__PURE__*/ <SearchOverlay
          search={search}
          setSearch={setSearch}
          onClose={() => setSearchOpen(false)}
          tasks={tasks}
          lists={lists}
          nowTs={nowTs}
          onOpenTask={(id) => {
            setSearch("");
            setSearchOpen(false);
            setOpenTask(id);
          }}
        />
      )}
    </div>
  );
}
// Иконки теперь грузятся обычным <script> тегом из template.html и блокируют
// рендер до завершения. Если ассета не будет (нет интернета) — onerror в
// template.html выдаст событие lucide-ready, и L просто покажет пустые квадраты.
document.getElementById("app-loading")?.remove();
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/ <App />);
