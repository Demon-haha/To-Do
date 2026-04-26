# To Do — карта проекта

Клон Microsoft To Do. Один пользователь (не программист), деплой — перетаскиванием папки в Netlify Drop.

## Файлы

| Файл | Назначение |
|------|-----------|
| `index.html` | Минимальная HTML-оболочка: meta-теги (PWA/iOS), подключение CDN (Tailwind, React, Babel, Lucide), шрифт Inter, `#root` + `<script src="app.jsx">`. Anti-flash для тёмной темы. |
| `styles.css` | Все кастомные стили (темы, анимации, скроллбары, theme-toggle, toast, **мобильные правила**). |
| `app.jsx` | Всё React-приложение. Нумерованные секции `── N.` — ищи по ним. |
| `sw.js` | Service Worker: фоновые уведомления через setTimeout + `TimestampTrigger` (Chrome). |
| `manifest.json` | PWA: имя, иконки, standalone. |
| `КАК_ПОЛОЖИТЬ_В_ИНТЕРНЕТ.txt` | Инструкция пользователю по деплою на Netlify. |

## Карта app.jsx

```
 1. Константы          — STORAGE_*, EMOJI_BANK, IS_TOUCH
 2. Утилиты            — smartParseDate, atHour, formatDate, toInputDT, isSameDay
 3. Хуки               — useLocalStorage, useTheme, useLongPress
 4. Toast              — ToastContainer + toastDispatch (глобальный)
 5. SW / Web Worker    — регистрация, workerSrc
 6. useReminders       — расписание + fire (toast + Notification + звук + vibrate)
 7. Компоненты         — L (Lucide wrapper), ThemeToggle, Modal
 8. Модалки            — CreateListModal, DatePickerModal
 9. ContextMenu        — правый клик / long-press
10. ListRow, Sidebar
11. TaskRow, TaskComposer
12. App                — CRUD, фильтрация, контекстные действия
13. Mount              — ждёт lucide-ready
```

## Архитектурные решения

- **Без build-шага**: Babel Standalone компилирует JSX в браузере. `app.jsx` грузится как external src — работает на https (Netlify), **не работает на file://**.
- **Tailwind**: CDN + `darkMode: "class"`. Конфиг должен быть ПОСЛЕ CDN-скрипта, иначе не применяется.
- **LocalStorage-ключи версионированы**: `*_v3`. Бамп версии = сброс данных.
- **Уведомления — тройное резервирование**: Service Worker (фон) → Web Worker setTimeout (вкладка есть, но заснула) → AudioContext звук + toast + native Notification.
- **Мобильный контекстник**: `useLongPress` (500 мс). Десктоп — `onContextMenu`. Определение — через `IS_TOUCH`.
- **Safe-area**: CSS-классы `.safe-top/bottom/left/right` используют `env(safe-area-inset-*)` — iPhone с чёлкой.
- **Touch-мишени**: `@media (hover: none)` делает hover-кнопки всегда видимыми.

## Что НЕ работает

- Уведомления при полностью закрытом браузере — ограничение веба. Решение для пользователя: «Установить как приложение» из адресной строки Chrome.
- Тестирование локально (file://): Service Worker и external `app.jsx` отключены. Для полноценного теста — Netlify Drop.

## Чек-лист при изменениях

- [ ] Если трогаю структуру данных задачи/списка — бампнуть `STORAGE_*_v{N}`.
- [ ] Новые классы opacity-0/hover — проверить `@media (hover: none)` в styles.css.
- [ ] Новые интерактивные элементы — `min-height: 36px` и `p-2` вместо `p-1.5` для touch.
- [ ] После изменений sw.js — пользователю придётся перезагрузить страницу дважды (SW кешируется).
