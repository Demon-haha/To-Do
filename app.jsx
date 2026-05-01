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
const T = {
  appName: "To Do",
  views: {
    myday: "Мой день",
    important: "Важное",
    planned: "Запланировано",
    listFallback: "Список",
    searchPrefix: "\u041f\u043e\u0438\u0441\u043a",
    foundPrefix: "\u041d\u0430\u0439\u0434\u0435\u043d\u043e",
    importantSub: "\u0417\u0430\u0434\u0430\u0447\u0438, \u043e\u0442\u043c\u0435\u0447\u0435\u043d\u043d\u044b\u0435 \u0437\u0432\u0451\u0437\u0434\u043e\u0447\u043a\u043e\u0439",
    plannedSub: "\u0417\u0430\u0434\u0430\u0447\u0438 \u0441\u043e \u0441\u0440\u043e\u043a\u043e\u043c",
  },
  actions: {
    lightTheme: "\u0421\u0432\u0435\u0442\u043b\u0430\u044f \u0442\u0435\u043c\u0430",
    darkTheme: "\u0422\u0451\u043c\u043d\u0430\u044f \u0442\u0435\u043c\u0430",
    toggleTheme: "\u041f\u0435\u0440\u0435\u043a\u043b\u044e\u0447\u0438\u0442\u044c \u0442\u0435\u043c\u0443",
    refresh: "Обновить",
    searchTasks: "Поиск задач",
    createList: "Создать список",
    sync: "Синхронизация",
    listColor: "\u0426\u0432\u0435\u0442 \u0441\u043f\u0438\u0441\u043a\u0430",
    clearText: "Очистить текст",
    addTask: "Добавить задачу",
  },
  empty: {
    noTasks: "Нет активных задач",
    noResults: "Ничего не найдено",
  },
  colors: {
    teal: "Бирюзовый",
    brown: "Шоколадный",
    purple: "Фиолетовый",
    pink: "Розовый",
    red: "Красный",
    gold: "Золотой",
    lime: "Лаймовый",
    green: "Зелёный",
    cyan: "Голубой",
    slate: "Графит",
  },
};
const DEFAULT_EMOJI = "📋";
const EMOJI_BANK = ["📋", "✅", "⭐", "💼", "🏠", "🛒", "🎯", "📚", "💡", "🏋️", "🍎", "✈️", "🎵", "💻", "🎨", "🧘", "🌱", "🔥", "💰", "📦", "🎮", "🐶", "☕", "📝"];
const COLOR_BANK = [
  {
    id: "teal",
    label: T.colors.teal,
    className: "list-color-teal",
  },
  {
    id: "brown",
    label: T.colors.brown,
    className: "list-color-brown",
  },
  {
    id: "purple",
    label: T.colors.purple,
    className: "list-color-purple",
  },
  {
    id: "pink",
    label: T.colors.pink,
    className: "list-color-pink",
  },
  {
    id: "red",
    label: T.colors.red,
    className: "list-color-red",
  },
  {
    id: "gold",
    label: T.colors.gold,
    className: "list-color-gold",
  },
  {
    id: "lime",
    label: T.colors.lime,
    className: "list-color-lime",
  },
  {
    id: "green",
    label: T.colors.green,
    className: "list-color-green",
  },
  {
    id: "cyan",
    label: T.colors.cyan,
    className: "list-color-cyan",
  },
  {
    id: "slate",
    label: T.colors.slate,
    className: "list-color-slate",
  },
];
const DEFAULT_COLOR = "teal";
const gradientOf = (cid) => (COLOR_BANK.find((c) => c.id === cid) || COLOR_BANK[0]).className;
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
  const settingsRef = useRef(settings);
  const tasksRef = useRef(tasks);
  const listsRef = useRef(lists);
  const userRef = useRef(null);
  if (!deviceIdRef.current) deviceIdRef.current = getDeviceId();
  useEffect(() => {
    settingsRef.current = settings;
    tasksRef.current = tasks;
    listsRef.current = lists;
  }, [lists, settings, tasks]);

  const applyPayload = useCallback(
    (payload) => {
      if (!payload || payload.deviceId === deviceIdRef.current) return;
      if (!Array.isArray(payload.tasks) || !Array.isArray(payload.lists)) return;
      const remoteUpdatedAt = Number(payload.updatedAt || 0);
      const localSyncedAt = Number(settingsRef.current?.lastSyncedAt || 0);
      const hasLocalData = tasksRef.current.length > 0 || listsRef.current.length > 0;
      if (hasLocalData && (!localSyncedAt || localSyncedAt > remoteUpdatedAt)) return;
      applyingRemoteRef.current = true;
      setTasks(payload.tasks);
      setLists(payload.lists);
      setSettings((prev) => ({ ...prev, lastSyncedAt: remoteUpdatedAt || Date.now() }));
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
    if (!client || !user || !isSyncReady(settingsRef.current)) return;
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
  }, [setSettings]);

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
      const remote = data?.payload;
      if (!remote) {
        await pushSnapshot();
        return;
      }
      const remoteUpdatedAt = Number(remote.updatedAt || 0);
      const localSyncedAt = Number(settingsRef.current?.lastSyncedAt || 0);
      const hasLocalData = tasksRef.current.length > 0 || listsRef.current.length > 0;
      if (hasLocalData && (!localSyncedAt || localSyncedAt > remoteUpdatedAt)) {
        await pushSnapshot();
        return;
      }
      applyPayload(remote);
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
  }, [lists, pushSnapshot, settings?.enabled, syncUser, tasks]);

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
    /*#__PURE__*/ <div className="ui-c-1">
      {toasts.map((t) => (
        /*#__PURE__*/ <div
          key={t.id}
          className={`pointer-events-auto rounded-xl shadow-2xl border px-4 py-3 flex items-start gap-3
              bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700
              ${t.leaving ? "toast-leave" : "toast-enter"}`}>
          <span className="ui-c-2">{t.icon}</span>
          <div className="ui-c-3">
            <div className="ui-c-4">{t.msg}</div>
            {t.sub && /*#__PURE__*/ <div className="ui-c-5">{t.sub}</div>}
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
    const url = URL.createObjectURL(
      new Blob([workerSrc], {
        type: "application/javascript",
      })
    );
    const worker = new Worker(url);
    URL.revokeObjectURL(url);
    return worker;
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
      title={dark ? T.actions.lightTheme : T.actions.darkTheme}
      className={`theme-track flex-shrink-0 ${dark ? "dark-mode" : "light-mode"}`}
      aria-label={T.actions.toggleTheme}>
      <div className="ui-c-6">
        {dark ? (
          /*#__PURE__*/ <L name="Moon" size={10} className="theme-icon-moon" />
        ) : (
          /*#__PURE__*/ <L name="Sun" size={10} className="theme-icon-sun" />
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
    /*#__PURE__*/ <div className="ui-c-7" onClick={() => closeOnOverlay && onClose()}>
      <div
        className="ui-c-8"
        onClick={(e) => e.stopPropagation()}>
        <div className="ui-c-9">
          <div className="ui-c-10">{title}</div>
          <button onClick={onClose} className="ui-c-11">
            <L name="X" size={16} />
          </button>
        </div>
        <div className="ui-c-12">{children}</div>
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
      <label className="ui-c-13">Название</label>
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
      <label className="ui-c-14">Эмодзи</label>
      <div className="ui-c-15">
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
      <label className="ui-c-16">
        <L name="Palette" size={13} /> Цвет
      </label>
      <div className="ui-c-17">
        {COLOR_BANK.map((c) => (
          /*#__PURE__*/ <button
            key={c.id}
            onClick={() => setColor(c.id)}
            title={c.label}
            className={`color-swatch ${c.className} ${color === c.id ? "color-swatch-selected" : "color-swatch-idle"}`}>
            {color === c.id && /*#__PURE__*/ <L name="Check" size={18} className="ui-c-18" />}
          </button>
        ))}
      </div>
      <div className="ui-c-19">
        <button onClick={onClose} className="ui-c-20">
          Отмена
        </button>
        <button onClick={submit} disabled={!name.trim()} className="ui-c-21">
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
      <div className="ui-c-17">
        {COLOR_BANK.map((c) => (
          /*#__PURE__*/ <button
            key={c.id}
            onClick={() => {
              onPick(c.id);
              onClose();
            }}
            title={c.label}
            className={`color-swatch ${c.className} ${current === c.id ? "color-swatch-selected" : "color-swatch-idle"}`}>
            {current === c.id && /*#__PURE__*/ <L name="Check" size={18} className="ui-c-18" />}
          </button>
        ))}
      </div>
      <div className="ui-c-22">
        <button onClick={onClose} className="ui-c-20">
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
      <label className="ui-c-23">
        <input
          type="checkbox"
          checked={!!draft.enabled}
          onChange={(e) => setDraft((p) => ({ ...p, enabled: e.target.checked }))}
          className="ui-c-24"
        />
        Включить синхронизацию
      </label>
      {!syncConfigured && (
        <div className="ui-c-25">
          Синхронизация ещё не настроена владельцем сайта.
        </div>
      )}
      <div className="ui-c-26">
        <div>
          <label className="ui-c-13">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" className="ui-c-27" />
        </div>
        <div>
          <label className="ui-c-13">Пароль</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="минимум 6 символов" className="ui-c-27" />
        </div>
      </div>
      <button
        onClick={signInGoogle}
        disabled={busy}
        className="ui-c-28">
        <L name="Chrome" size={18} />
        Войти через Google
      </button>
      <div className="ui-c-29">
        Статус: {status.text}{status.user?.email ? `, ${status.user.email}` : ""}. Вложения-файлы остаются локально на устройстве.
      </div>
      <div className="ui-c-30">
        {status.user && (
          <button onClick={signOut} disabled={busy} className="ui-c-31">
            Выйти
          </button>
        )}
        <button onClick={onClose} className="ui-c-20">
          Закрыть
        </button>
        <button onClick={() => saveConfig({ enabled: false })} disabled={busy} className="ui-c-32">
          Выключить
        </button>
        <button onClick={signUpEmail} disabled={busy} className="ui-c-32">
          Регистрация
        </button>
        <button onClick={signInEmail} disabled={busy} className="ui-c-21">
          Войти
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
  const monthSwipeRef = useRef(null);
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
  const onMonthTouchStart = (e) => {
    const t = e.touches[0];
    monthSwipeRef.current = { x: t.clientX, y: t.clientY };
  };
  const onMonthTouchEnd = (e) => {
    if (!monthSwipeRef.current) return;
    const start = monthSwipeRef.current;
    monthSwipeRef.current = null;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    if (dx < 0) nextMonth();
    if (dx > 0 && canGoPrev) prevMonth();
  };
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
      <div className="ui-c-33">
        <button onClick={prevMonth} disabled={!canGoPrev} className={`p-1.5 rounded ${canGoPrev ? "hover:bg-gray-100 dark:hover:bg-gray-700" : "opacity-30 cursor-not-allowed"}`}>
          ‹
        </button>
        <div className="ui-c-34">
          {RU_MONTHS[mo]} {y}
        </div>
        <button onClick={nextMonth} className="ui-c-35">
          ›
        </button>
      </div>
      <div onTouchStart={onMonthTouchStart} onTouchEnd={onMonthTouchEnd}>
      <div className="ui-c-36">
        {RU_WD.map((w) => (
          /*#__PURE__*/ <div key={w} className="ui-c-37">
            {w}
          </div>
        ))}
      </div>
      <div className="ui-c-38">
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
      </div>
      {showTime && (
        /*#__PURE__*/ <div className="ui-c-39">
          <label className="ui-c-40">Время</label>
          <input
            type="number"
            min="0"
            max="23"
            value={h}
            onChange={(e) => setH(Math.max(0, Math.min(23, parseInt(e.target.value, 10) || 0)))}
            className="ui-c-41"
          />
          <span className="ui-c-42">:</span>
          <input
            type="number"
            min="0"
            max="59"
            value={m}
            onChange={(e) => setM(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))}
            className="ui-c-41"
          />
        </div>
      )}
      {showTime && /*#__PURE__*/ <div className="ui-c-43">В указанное время придёт напоминание.</div>}
      <div className="ui-c-19">
        <button onClick={onClose} className="ui-c-20">
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
      <div className="ui-c-44">
        <button
          onClick={() => {
            onPick(null);
            onClose();
          }}
          className={`flex items-center gap-3 px-3 py-2.5 rounded text-left text-sm ${currentListId === null ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"}`}>
          <L name="Sun" size={18} className="ui-c-45" />
          <span>{T.views.myday}</span>
        </button>
        {lists.map((l) => (
          /*#__PURE__*/ <button
            key={l.id}
            onClick={() => {
              onPick(l.id);
              onClose();
            }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded text-left text-sm ${currentListId === l.id ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"}`}>
            <span className="ui-c-46">{l.emoji}</span>
            <span>{l.name}</span>
          </button>
        ))}
      </div>
      <div className="ui-c-47">
        <button onClick={onClose} className="ui-c-20">
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
    /*#__PURE__*/ <div className="ui-c-48" onClick={onClose}>
      <div className="ui-c-49">
        <span className="ui-c-50">{file.name}</span>
        <button className="ui-c-51" onClick={onClose}>
          <L name="X" size={24} />
        </button>
      </div>
      <div className="ui-c-52" onClick={(e) => e.stopPropagation()}>
        {loading ? (
          /*#__PURE__*/ <div className="ui-c-53">Загрузка...</div>
        ) : isImg && fileUrl ? (
          /*#__PURE__*/ <img src={fileUrl} className="ui-c-54" alt={file.name} />
        ) : (
          /*#__PURE__*/ <div className="ui-c-55">
            <L name="File" size={64} className="ui-c-56" />
            <div className="ui-c-57">{file.name}</div>
            <a href={fileUrl || file.data} download={file.name} className="ui-c-58">
              Скачать
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TASK DETAIL PANEL ────────────────────────────────────────────
function TaskDetailPanel({ taskId, tasks, lists, nowTs, isMobile, onClose, onUpdate, onToggle, onStar, onDelete, onAddToMyDay, onOpenDate, onOpenReminder, onOpenRecurrence }) {
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
  const onPanelTouchMove = (e) => {
    if (!isMobile || !swipeDownRef.current) return;
    const t = e.touches[0];
    const dy = t.clientY - swipeDownRef.current.y;
    if (swipeDownRef.current.y < 140 && dy > 12) e.preventDefault();
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
    ? "task-detail-panel task-detail-panel-mobile"
    : "task-detail-panel task-detail-panel-desktop";
  return (
    /*#__PURE__*/ <React.Fragment>
      <FileViewer file={viewFile} onClose={() => setViewFile(null)} />
      {!isMobile && /*#__PURE__*/ <div className="ui-c-59" onClick={onClose} />}
      <div
        className={panelCls}
        onTouchStart={onPanelTouchStart}
        onTouchMove={onPanelTouchMove}
        onTouchEnd={onPanelTouchEnd}
        >
        <div className="ui-c-60">
          <button onClick={onClose} className="ui-c-61">
            <L name="ArrowLeft" size={22} />
          </button>
          <span className="ui-c-62">{list ? `${list.emoji} ${list.name}` : "Мой день"}</span>
        </div>
        <div className="ui-c-63">
          <div className="ui-c-64">
            <button onClick={() => onToggle(task.id)} className="ui-c-65">
              <span
                className={`absolute inset-0 rounded-full border-2 flex items-center justify-center transition-all ${task.completed ? "bg-blue-600 border-blue-600" : "border-gray-500 hover:border-blue-400"}`}>
                {task.completed && /*#__PURE__*/ <L name="Check" size={14} className="ui-c-18" />}
              </span>
            </button>
            <div className="ui-c-66">
              {titleEdit ? (
                /*#__PURE__*/ <input
                  ref={titleRef}
                  value={titleVal}
                  onChange={(e) => setTitleVal(e.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitTitle();
                  }}
                  className="ui-c-67"
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
          <div className="ui-c-68">
            {steps.map((s) => (
              /*#__PURE__*/ <div key={s.id} className="ui-c-69">
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
                  className="ui-c-70">
                  <span className={`absolute inset-0 rounded-full border-2 flex items-center justify-center ${s.completed ? "bg-blue-600 border-blue-600" : "border-gray-500"}`}>
                    {s.completed && /*#__PURE__*/ <L name="Check" size={11} className="ui-c-18" />}
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
                    className="ui-c-71"
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
                  className="ui-c-72">
                  <L name="X" size={14} />
                </button>
              </div>
            ))}
            <div className="ui-c-73">
              <span className="ui-c-74">
                <L name="Plus" size={16} />
              </span>
              <input
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addStep();
                }}
                placeholder="Добавить шаг"
                className="ui-c-75"
              />
              {newStep && (
                /*#__PURE__*/ <button onClick={addStep} className="ui-c-76">
                  ОК
                </button>
              )}
            </div>
          </div>
          <div
            onClick={() => {
              if (myDayLocked) return;
              if (task.myDay) onUpdate(task.id, { myDay: false });
              else onAddToMyDay?.(task.id);
            }}
            className={`w-full flex items-center gap-4 px-5 py-4 border-b border-gray-700/30 transition-colors ${myDayLocked ? "cursor-default" : "cursor-pointer hover:bg-gray-800/30"}`}>
            <L name="Sun" size={20} className={task.myDay ? "text-yellow-400" : "text-gray-500"} />
            <span className={`text-sm flex-1 text-left ${task.myDay ? "text-yellow-400" : "text-gray-400"}`}>{task.myDay ? "Добавлено в «Мой день»" : "Добавить в «Мой день»"}</span>
            {task.myDay && !myDayLocked && (
              <button
                onClick={(e) => { e.stopPropagation(); onUpdate(task.id, { myDay: false }); }}
                className="ui-c-77">
                <L name="X" size={14} />
              </button>
            )}
          </div>
          <button onClick={() => onOpenDate(task)} className="ui-c-78">
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
                className="ui-c-79">
                <L name="X" size={14} />
              </button>
            )}
          </button>
          <button onClick={() => onOpenReminder(task)} className="ui-c-78">
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
                className="ui-c-79">
                <L name="X" size={14} />
              </button>
            )}
          </button>
          <button onClick={() => onOpenRecurrence(task)} className="ui-c-78">
            <L name="Repeat" size={20} className="ui-c-42" />
            <span className="ui-c-80">{task.recurrence ? recurrenceLabel(task.recurrence) : "Повтор"}</span>
            {task.recurrence && (
              /*#__PURE__*/ <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate(task.id, {
                    recurrence: null,
                  });
                }}
                className="ui-c-79">
                <L name="X" size={14} />
              </button>
            )}
          </button>
          {files.length > 0 && (
            /*#__PURE__*/ <div className="ui-c-81">
              {files.map((f) => (
                /*#__PURE__*/ <div key={f.id} className="ui-c-82">
                  {f.type?.startsWith("image/") && f.data ? (
                    /*#__PURE__*/ <button onClick={() => setViewFile(f)} className="ui-c-83">
                      <img src={f.data} className="ui-c-84" alt={f.name} />
                    </button>
                  ) : (
                    /*#__PURE__*/ <button
                      onClick={() => setViewFile(f)}
                      className="ui-c-85">
                      <L name="File" size={20} className="ui-c-86" />
                      <span className="ui-c-87">{f.name.split(".").pop()}</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      deleteFileBlob(f.id);
                      onUpdate(task.id, {
                        files: files.filter((x) => x.id !== f.id),
                      });
                    }}
                    className="ui-c-88">
                    <L name="X" size={10} className="ui-c-18" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => fileInput.current?.click()} className="ui-c-78">
            <L name="Paperclip" size={20} className="ui-c-42" />
            <span className="ui-c-89">Добавить файл</span>
          </button>
          <input ref={fileInput} type="file" accept="image/*,.pdf,.doc,.docx" className="ui-c-90" onChange={handleFile} />
          <div className="ui-c-91">
            <textarea
              key={task.id}
              defaultValue={task.notes || ""}
              onBlur={(e) =>
                onUpdate(task.id, {
                  notes: e.target.value,
                })
              }
              placeholder="Добавить заметку"
              className="ui-c-92"
              rows={3}
            />
          </div>
        </div>
        <div className="ui-c-93">
          <span className="ui-c-94">
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
            className="ui-c-95">
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
    /*#__PURE__*/ <div className="ui-c-96">
      <div className="ui-c-97">
        <button
          onClick={() => {
            setSearch("");
            onClose();
          }}
          className="ui-c-61">
          <L name="ArrowLeft" size={22} />
        </button>
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск"
          className="ui-c-98"
        />
        {search && (
          /*#__PURE__*/ <button onClick={() => setSearch("")} className="ui-c-99">
            <L name="X" size={18} />
          </button>
        )}
      </div>
      {!search.trim() ? (
        /*#__PURE__*/ <div className="ui-c-100">
          <L name="Search" size={72} className="ui-c-101" />
          <div className="ui-c-102">
            Что вы хотите найти?
            <br />
            Вы можете искать задачи и заметки
          </div>
        </div>
      ) : results.length === 0 ? (
        /*#__PURE__*/ <div className="ui-c-103">
          <L name="SearchX" size={48} className="ui-c-101" />
          <div className="ui-c-104">Ничего не найдено</div>
        </div>
      ) : (
        /*#__PURE__*/ <div className="ui-c-63">
          {results.map((t) => {
            const overdue = t.dueDate && !t.completed && new Date(t.dueDate) < new Date(nowTs);
            const list = lists.find((l) => l.id === t.listId);
            return (
              /*#__PURE__*/ <button
                key={t.id}
                onClick={() => onOpenTask(t.id)}
                className="ui-c-105">
                <span className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${t.completed ? "bg-blue-600 border-blue-600" : "border-gray-500"}`}>
                  {t.completed && /*#__PURE__*/ <L name="Check" size={11} className="ui-c-18" />}
                </span>
                <div className="ui-c-3">
                  <div className={`text-sm ${t.completed ? "line-through text-gray-500" : "text-gray-200"}`}>{t.title}</div>
                  {(t.dueDate || list) && (
                    /*#__PURE__*/ <div className="ui-c-106">
                      {t.dueDate && /*#__PURE__*/ <span className={`text-[11px] ${overdue ? "text-red-400" : "text-gray-600"}`}>{formatDate(t.dueDate)}</span>}
                      {list && (
                        /*#__PURE__*/ <span className="ui-c-107">
                          {list.emoji} {list.name}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {t.important && /*#__PURE__*/ <L name="Star" size={16} className="ui-c-108" fill="currentColor" />}
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
          <L name="Clock" size={18} className="ui-c-109" />
          <span className="ui-c-110">Позднее сегодня</span>
          <span className="ui-c-111">{timeText(p.laterToday)}</span>
        </button>
      )}
      <button onClick={() => pick(p.tomorrow)} className={row}>
        <L name="ArrowRightCircle" size={18} className="ui-c-109" />
        <span className="ui-c-110">Завтра</span>
        <span className="ui-c-111">{timeText(p.tomorrow)}</span>
      </button>
      <button onClick={() => pick(p.nextWeek)} className={row}>
        <L name="ChevronsRight" size={18} className="ui-c-109" />
        <span className="ui-c-110">Следующая неделя</span>
        <span className="ui-c-111">{timeText(p.nextWeek)}</span>
      </button>
      <div className="ui-c-112" />
      <label className="ui-c-13">Выбрать дату и время</label>
      <input
        type="datetime-local"
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
        className="ui-c-113"
      />
      <div className="ui-c-114">
        <button onClick={() => pick(null)} disabled={!current} className="ui-c-115">
          Убрать
        </button>
        <div className="ui-c-116">
          <button onClick={onClose} className="ui-c-20">
            Отмена
          </button>
          <button onClick={applyCustom} disabled={!custom} className="ui-c-21">
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
          <L name={it.icon} size={18} className="ui-c-109" />
          <span className="ui-c-110">{it.label}</span>
          {current?.type === it.type && /*#__PURE__*/ <L name="Check" size={16} className="ui-c-117" />}
        </button>
      ))}
      <div className="ui-c-112" />
      <button
        onClick={() => {
          onClose();
          onOpenCustom();
        }}
        className={row}>
        <L name="Settings2" size={18} className="ui-c-109" />
        <span className="ui-c-110">Настроить</span>
        {current?.type === "custom" && /*#__PURE__*/ <L name="Check" size={16} className="ui-c-117" />}
      </button>
      <div className="ui-c-118">
        <button onClick={() => pick(null)} className="ui-c-115" disabled={!current}>
          Убрать
        </button>
        <button onClick={onClose} className="ui-c-20">
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
      <div className="ui-c-119">Повторять каждые:</div>
      <div className="ui-c-120">
        <input
          type="number"
          min="1"
          max="999"
          value={interval}
          onChange={(e) => setInterval(e.target.value)}
          className="ui-c-121"
        />
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="ui-c-122">
          {units.map((u) => (
            /*#__PURE__*/ <option key={u.v} value={u.v}>
              {pluralRu(n, u.labels)}
            </option>
          ))}
        </select>
      </div>
      <div className="ui-c-19">
        <button onClick={onClose} className="ui-c-20">
          Отмена
        </button>
        <button onClick={apply} className="ui-c-123">
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
      className="ui-c-124">
      {actions.map((a, i) =>
        a.divider ? (
          /*#__PURE__*/ <div key={i} className="ui-c-125" />
        ) : (
          /*#__PURE__*/ <button
            key={i}
            onClick={() => {
              a.onClick();
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/10 dark:hover:bg-white/5 transition-colors ${a.danger ? "text-red-400" : ""}`}>
            <span className="ui-c-126">
              <L name={a.icon} size={16} />
            </span>
            <span className="ui-c-110">{a.label}</span>
            {a.hint && !IS_TOUCH && /*#__PURE__*/ <span className="ui-c-127">{a.hint}</span>}
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
          {isMobile && <div className="ui-c-128" />}
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
            className="ui-c-129"
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
            <button onClick={(ev) => { ev.stopPropagation(); setEmojiOpen(false); }} className="ui-c-130">
              Готово
            </button>
          )}
        </div>
      )}
      <div className="ui-c-131">
        <button
          onClick={(e) => { e.stopPropagation(); setEmojiOpen((o) => !o); }}
          className="ui-c-132"
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
              className="ui-c-133"
              title="Переименовать">
              <L name="Pencil" size={13} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Удалить список «${list.name}»?`)) onDelete(list.id);
              }}
              className="ui-c-134">
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
  onRefresh,
  dark,
  toggleTheme,
}) {
  const builtins = [
    {
      id: "myday",
      label: T.views.myday,
      icon: "Sun",
    },
    {
      id: "important",
      label: T.views.important,
      icon: "Star",
    },
    {
      id: "planned",
      label: T.views.planned,
      icon: "CalendarDays",
    },
  ];
  return (
    /*#__PURE__*/ <aside
      className={`sidebar-bg border-r border-gray-200 dark:border-gray-700/60 flex flex-col w-72 shrink-0
        ${isMobile ? "fixed inset-y-0 left-0 z-[70] shadow-2xl transition-transform duration-300 ease-out" : ""}
        ${isMobile && !open ? "-translate-x-full" : "translate-x-0"}`}>
      <div className="ui-c-135">
        <div className="ui-c-136">
          <div className="ui-c-137">
            <L name="CheckCircle2" size={18} />
          </div>
          <div className="ui-c-138">{T.appName}</div>
        </div>
        <div className="ui-c-139">
          {isMobile && (
            /*#__PURE__*/ <button onClick={onRefresh} className="sidebar-refresh-btn" title={T.actions.refresh}>
              <L name="RefreshCw" size={17} />
            </button>
          )}
          <ThemeToggle dark={dark} toggle={toggleTheme} />
          {isMobile && (
            /*#__PURE__*/ <button onClick={onClose} className="ui-c-140">
              <L name="X" size={22} />
            </button>
          )}
        </div>
      </div>
      {!isMobile && (
        /*#__PURE__*/ <div className="ui-c-141">
          <div className="ui-c-82">
            <span className="ui-c-142">
              <L name="Search" size={15} />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={T.actions.searchTasks}
              className="ui-c-143"
            />
            {search && (
              /*#__PURE__*/ <button onClick={() => setSearch("")} className="ui-c-144">
                <L name="X" size={13} />
              </button>
            )}
          </div>
        </div>
      )}
      <nav className="ui-c-145">
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
              <span className="ui-c-146">
                <span className={active ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}>
                  <L name={it.icon} size={18} />
                </span>
                {it.label}
              </span>
              {counts[it.id] > 0 && /*#__PURE__*/ <span className="ui-c-147">{counts[it.id]}</span>}
            </button>
          );
        })}
        {lists.length > 0 && /*#__PURE__*/ <div className="ui-c-148" />}
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
      <div className="ui-c-149">
        {notifStatus === "denied" && (
          /*#__PURE__*/ <div className="ui-c-150">
            <L name="BellOff" size={12} /> Уведомления заблокированы в браузере
          </div>
        )}
        <button
          onClick={onOpenCreate}
          className="ui-c-151">
          <L name="Plus" size={18} /> {T.actions.createList}
        </button>
        <button
          onClick={onOpenSync}
          className="ui-c-152">
          <L name={syncStatus.state === "on" ? "CloudCheck" : syncStatus.state === "syncing" ? "RefreshCw" : "Cloud"} size={18} />
          <span className="ui-c-110">Синхронизация</span>
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
      className="ui-c-153 group">
      <div className="ui-c-154">
        <button
          onClick={() => onToggle(task.id)}
          className="ui-c-155"
          title="Отметить выполненной">
          <span
            className={`absolute inset-0 rounded-full border-2 flex items-center justify-center transition-all duration-200
              ${task.completed ? "bg-blue-600 border-blue-600 opacity-100" : "border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500"}
              ${swapEmoji ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}>
            {task.completed && /*#__PURE__*/ <L name="Check" size={14} className="ui-c-18" />}
          </span>
          {swapEmoji && (
            /*#__PURE__*/ <span className="ui-c-156">
              {listEmoji}
            </span>
          )}
        </button>
        <div className="ui-c-3" onClick={handleBodyClick}>
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
              className="ui-c-157"
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
              /*#__PURE__*/ <div className="ui-c-158">
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
  const [clearHintOpen, setClearHintOpen] = useState(false);
  const taRef = useRef(null);
  const clearTapRef = useRef(0);
  const clearHintTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(clearHintTimerRef.current), []);
  useEffect(() => {
    if (!isMobile || !sidebarOpen) return;
    taRef.current?.blur();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setFabOpen(false);
  }, [isMobile, sidebarOpen]);
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
  const clearText = () => {
    const now = Date.now();
    if (now - clearTapRef.current > 900) {
      clearTapRef.current = now;
      setClearHintOpen(true);
      clearTimeout(clearHintTimerRef.current);
      clearHintTimerRef.current = setTimeout(() => setClearHintOpen(false), 1400);
      return;
    }
    clearTapRef.current = 0;
    setClearHintOpen(false);
    setValue("");
    if (taRef.current) taRef.current.style.height = "auto";
    taRef.current?.focus();
  };

  // Мобильный режим — FAB (свёрнутый кружок)
  if (isMobile && !fabOpen) {
    return (
      /*#__PURE__*/ <button
        onClick={openFab}
        aria-label={T.actions.addTask}
        className="ui-c-159">
        <L name="Plus" size={26} />
      </button>
    );
  }

  // Мобильный режим — раскрытый поверх контента
  const overlay = isMobile && fabOpen;
  return (
    /*#__PURE__*/ <>
      {overlay && /*#__PURE__*/ <div className="ui-c-160" onClick={() => { if (!value.trim() && !hasAny) setFabOpen(false); }} />}
      <div className={overlay ? "fixed bottom-0 left-0 right-0 z-50 p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-2xl safe-bottom safe-left safe-right composer-slide-up" : ""}>
        <div className="ui-c-161">
          <div className="ui-c-162">
            <span className="ui-c-163">
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
              placeholder={T.actions.addTask}
              className="ui-c-164"
            />
            {value.trim() && (
              /*#__PURE__*/ <button
                onClick={clearText}
                aria-label={T.actions.clearText}
                className="ui-c-165">
                {clearHintOpen && (
                  /*#__PURE__*/ <span className="composer-clear-hint">
                    \u041d\u0430\u0436\u043c\u0438\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437
                  </span>
                )}
                <L name="X" size={16} />
              </button>
            )}
            {value.trim() && (
              /*#__PURE__*/ <button
                onClick={submit}
                aria-label={T.actions.addTask}
                className="ui-c-166">
                <L name="ArrowUp" size={16} />
              </button>
            )}
          </div>
          {(value.trim() || hasAny) && (
            <div className="ui-c-167">
              {pickedDate ? (
                <div className={iconBtn(true)}>
                  <L name="CalendarDays" size={14} />
                  <span onClick={onOpenCalendar} className="ui-c-168">{formatDateOnly(pickedDate)}</span>
                  <span onClick={onClearComposerDate} className="ui-c-169"><L name="X" size={11} /></span>
                </div>
              ) : (
                <button onClick={onOpenCalendar} title="Срок выполнения" className={iconBtn(false)}>
                  <L name="CalendarDays" size={14} /><span>Срок</span>
                </button>
              )}
              {pickedReminder ? (
                <div className={iconBtn(true)}>
                  <L name="Bell" size={14} />
                  <span onClick={onOpenReminder} className="ui-c-168">{formatDate(pickedReminder)}</span>
                  <span onClick={onClearComposerReminder} className="ui-c-169"><L name="X" size={11} /></span>
                </div>
              ) : (
                <button onClick={onOpenReminder} title="Напомнить мне" className={iconBtn(false)}>
                  <L name="Bell" size={14} /><span>Напомнить</span>
                </button>
              )}
              {pickedRecurrence ? (
                <div className={iconBtn(true)}>
                  <L name="Repeat" size={14} />
                  <span onClick={onOpenRecurrence} className="ui-c-168">{recurrenceLabel(pickedRecurrence)}</span>
                  <span onClick={onClearComposerRecurrence} className="ui-c-169"><L name="X" size={11} /></span>
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
  const tasksRef = useRef(tasks);
  const [view, setView] = useState("myday");
  const [search, setSearch] = useState("");
  const [showCompleted, setShowCompleted] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarOpenRef = useRef(false);
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
    tasksRef.current = tasks;
  }, [tasks]);
  useEffect(() => {
    sidebarOpenRef.current = sidebarOpen;
  }, [sidebarOpen]);
  useEffect(() => {
    if (!isMobile) return;
    const touch = { x: 0, y: 0, target: null };
    const isTypingTarget = (el) => {
      const tag = el?.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable;
    };
    const onTouchStart = (e) => {
      const t = e.touches[0];
      touch.x = t.clientX;
      touch.y = t.clientY;
      touch.target = e.target;
    };
    const onTouchMove = (e) => {
      const t = e.touches[0];
      const dx = t.clientX - touch.x;
      const dy = t.clientY - touch.y;
      const fromRightEdge = touch.x > window.innerWidth - 58;
      if (sidebarOpenRef.current && fromRightEdge && dx < -8) {
        e.preventDefault();
        return;
      }
      if (!isTypingTarget(touch.target) && touch.y < 150 && dy > 8 && Math.abs(dy) > Math.abs(dx)) {
        e.preventDefault();
      }
    };
    const onTouchEnd = (e) => {
      if (!sidebarOpenRef.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touch.x;
      const dy = t.clientY - touch.y;
      if (touch.x > window.innerWidth - 58 && dx < -45 && Math.abs(dx) > Math.abs(dy)) setSidebarOpen(false);
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isMobile]);
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
        myDay: !listId && view === "myday",
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
  const deleteTaskFiles = useCallback((task) => {
    (task?.files || []).forEach((file) => deleteFileBlob(file.id));
  }, []);
  const deleteTask = useCallback(
    (id) => {
      const task = tasksRef.current?.find((t) => t.id === id);
      deleteTaskFiles(task);
      setTasks((p) => p.filter((t) => t.id !== id));
    },
    [deleteTaskFiles, setTasks]
  );
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
    tasksRef.current?.filter((t) => t.listId === id).forEach(deleteTaskFiles);
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
  const moveTaskToList = useCallback(
    (taskId, listId) => {
      setTasks((p) =>
        p.map((t) => {
          if (t.id !== taskId) return t;
          const targetListId = listId || null;
          return {
            ...t,
            listId: targetListId,
            myDay: !targetListId,
            myDayLocked: false,
          };
        })
      );
      setSearch("");
      setView(listId ? "list:" + listId : "myday");
    },
    [setTasks]
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = q
      ? tasks.filter((t) => t.title.toLowerCase().includes(q))
      : (() => {
          let l = tasks;
          if (view === "myday") l = l.filter((t) => t.myDay);
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
      if (t.myDay) c.myday = (c.myday || 0) + 1;
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
              onClick: () => {
                if (task.myDay) updateTask(task.id, { myDay: false, myDayLocked: false });
                else moveTaskToList(task.id, null);
              },
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
    [lists, updateTask, starTask, toggleTask, deleteTask, moveTaskToList]
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
          if (t.myDay) updateTask(t.id, { myDay: false, myDayLocked: false });
          else moveTaskToList(t.id, null);
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
  }, [ctxMenu, updateTask, toggleTask, deleteTask, moveTaskToList]);
  const viewMeta = useMemo(() => {
    if (search.trim())
      return {
        title: `${T.views.searchPrefix}: \u00ab${search.trim()}\u00bb`,
        sub: `${T.views.foundPrefix}: ${filtered.length}`,
        bg: "view-bg-search",
      };
    if (view.startsWith("list:")) {
      const l = lists.find((x) => x.id === view.slice(5));
      return {
        title: (l?.emoji || DEFAULT_EMOJI) + " " + (l?.name || T.views.listFallback),
        sub: "",
        bg: gradientOf(l?.color),
      };
    }
    return {
      myday: {
        title: T.views.myday,
        sub: new Date().toLocaleDateString("ru-RU", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }),
        bg: "view-bg-myday",
      },
      important: {
        title: T.views.important,
        sub: T.views.importantSub,
        bg: "view-bg-important",
      },
      planned: {
        title: T.views.planned,
        sub: T.views.plannedSub,
        bg: "view-bg-planned",
      },
    }[view];
  }, [view, lists, search, filtered.length]);
  const swipeRef = useRef(null);
  const openSidebar = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setSidebarOpen(true);
  }, []);
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
    if (dx > 50 && !sidebarOpen && start.x < 40) openSidebar();
    if (dx < -50 && sidebarOpen) setSidebarOpen(false);
  }, [openSidebar, sidebarOpen]);
  return (
    /*#__PURE__*/ <div className="ui-c-170" onTouchStart={onSwipeStart} onTouchEnd={onSwipeEnd}>
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
        onRefresh={() => location.reload()}
        dark={dark}
        toggleTheme={toggleTheme}
      />
      {isMobile && <div
        className={`fixed inset-0 bg-black/40 z-[60] transition-opacity duration-300 ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setSidebarOpen(false)}
      />}
      <main className="ui-c-171">
        <header className={`app-header ${viewMeta.bg}`}>
          {isMobile && (
            /*#__PURE__*/ <button onClick={openSidebar} className="ui-c-172">
              <L name="Menu" size={24} />
            </button>
          )}
          <div className="ui-c-3">
            <div className="ui-c-173">{viewMeta.title}</div>
            {viewMeta.sub && /*#__PURE__*/ <div className="ui-c-174">{viewMeta.sub}</div>}
          </div>
          {view.startsWith("list:") && (() => {
            const hl = lists.find((l) => l.id === view.slice(5));
            return hl ? (
              /*#__PURE__*/ <button onClick={() => setColorPicker({ id: hl.id, current: hl.color })} className="ui-c-175" title={T.actions.listColor}>
                <L name="Palette" size={20} />
              </button>
            ) : null;
          })()}
          {isMobile && (
            /*#__PURE__*/ <button onClick={() => setSearchOpen(true)} className="ui-c-175">
              <L name="Search" size={20} />
            </button>
          )}
        </header>
        <div className="ui-c-177">
          <div className="ui-c-178">
            {active.length === 0 && /*#__PURE__*/ <div className="ui-c-179">{search.trim() ? T.empty.noResults : T.empty.noTasks}</div>}
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
              /*#__PURE__*/ <div className="ui-c-180">
                <button
                  onClick={() => setShowCompleted((v) => !v)}
                  className="ui-c-181">
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
            /*#__PURE__*/ <div className="ui-c-182">
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
          if (movePicker) moveTaskToList(movePicker.id, id);
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
          onAddToMyDay={(id) => {
            updateTask(id, { myDay: true, myDayLocked: false, listId: null });
            setView("myday");
          }}
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
