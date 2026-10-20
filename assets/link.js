// Ссылка на человека или комнату Matrix — как matrix.to, только своя.
//
// Адрес читается из пути (/@anya:matrix.org, /%23iskra:matrix.org, /!id:server?via=…) или из хэша —
// /#iskra:matrix.org (браузер сам уносит «#» в хэш) и /#/@anya:matrix.org, как у matrix.to, чтобы
// подменой домена открывалась любая старая ссылка. Всё берётся из адреса: к серверам Matrix
// страница не ходит, поэтому и имя — часть ID, а не отображаемое имя.
import { qrSvg } from './qr.js';

const ORIGIN = 'https://s.iskra.wtf';
const DOWNLOAD = 'https://iskra.wtf/#download';
const WEB = 'https://web.iskra.wtf';
/** Сколько ждать, что приложение открылось, прежде чем вести на страницу скачивания. */
const APP_WAIT_MS = 1600;

// ── Адрес ──

const SIGILS = { '@': 'user', '#': 'alias', '!': 'roomid' };

/** `{ kind, id, via }` или null. Проверки — как в iskra-web (`isMatrixId`, адрес комнаты). */
function parse(raw, search) {
  let text = raw.trim();
  if (!text) return null;
  let query = search;
  const q = text.indexOf('?');
  if (q !== -1) {
    query = text.slice(q);
    text = text.slice(0, q);
  }
  const kind = SIGILS[text[0]];
  if (!kind) return null;
  // Ссылка на сообщение (`!room:server/$event`) — открываем комнату.
  if (kind !== 'user') text = text.split('/')[0];
  if (kind === 'user' ? !/^@[^:\s]+:[^\s/]+$/.test(text) : !/^[#!][^:\s]+:[^\s/]+$/.test(text)) return null;
  const via = kind === 'user' ? [] : new URLSearchParams(query).getAll('via').filter((s) => /^[^\s/?#]+$/.test(s));
  return { kind, id: text, via };
}

function decode(text) {
  try { return decodeURIComponent(text); } catch { return null; }
}

/** Что просили открыть: путь, иначе хэш. `raw` — было ли вообще что-то, кроме корня. */
function fromLocation() {
  const path = location.pathname.replace(/^\/+/, '').replace(/^(index|404)\.html$/, '');
  if (path) return { raw: true, target: parse(decode(path) ?? '', location.search) };
  let hash = decode(location.hash.slice(1)) ?? '';
  if (hash.startsWith('/')) hash = hash.slice(1);
  if (!hash) return { raw: false, target: null };
  // /#iskra:matrix.org — «#» алиаса браузер забрал себе, возвращаем.
  if (!SIGILS[hash[0]]) hash = '#' + hash;
  return { raw: true, target: parse(hash, location.search) };
}

/** ID в путь: «@», «:» и «!» как есть, всё прочее (и «#» алиаса, и «/») — кодом. */
const pathPart = (id) => encodeURIComponent(id).replace(/%40/g, '@').replace(/%3A/gi, ':');
const viaQuery = (via) => (via.length ? '?' + via.map((s) => 'via=' + encodeURIComponent(s)).join('&') : '');

// ── Куда ведут кнопки ──

/** Ссылка этой страницы — она же в QR-коде. */
const canonical = (t) => `${ORIGIN}/${pathPart(t.id)}${viaQuery(t.via)}`;

/** Deep link нативной Искры: wtf.iskra://u|r|roomid/… — короткие имена как у `matrix:` (MSC2312). */
function iskraLink(t) {
  const host = { user: 'u', alias: 'r', roomid: 'roomid' }[t.kind];
  return `wtf.iskra://${host}/${pathPart(t.id.slice(1))}${viaQuery(t.via)}`;
}

const iskraWebLink = (t) => `${WEB}/#/open/${encodeURIComponent(t.id)}${viaQuery(t.via)}`;

function platform() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Macintosh/.test(ua)) return 'mac';
  return 'desktop';
}

/**
 * Другие клиенты — ссылки как у matrix.to (src/open/clients/*): Element и FluffyChat — своим
 * приложениям на телефоне, Element и Cinny на компьютере — в веб-версию. У FluffyChat на
 * компьютере ссылок нет: открываем веб-версию и кладём адрес в буфер.
 */
function otherApps(t, os) {
  const mobile = os === 'ios' || os === 'android';
  const room = t.kind !== 'user';
  const element = (room ? 'room/' : 'user/') + encodeURIComponent(t.id) + (room ? viaQuery(t.via) : '');
  const cinny = room
    ? `home/${encodeURIComponent(t.id)}${t.via.length ? '?via=' + t.via.map(encodeURIComponent).join(',') : ''}`
    : `direct/create?userId=${encodeURIComponent(t.id)}`;
  return [
    {
      key: 'element', name: mobile ? 'Element X' : 'Element', letter: 'E', color: 'var(--color-text-secondary)',
      // На iPhone app.element.io перехватывает само приложение — так делает и matrix.to.
      href: os === 'android' ? `element://${element}` : `https://app.element.io/#/${element}`,
      web: !mobile,
    },
    {
      key: 'fluffy', name: 'FluffyChat', letter: 'F', color: 'var(--color-text-secondary)',
      href: mobile ? `im.fluffychat://chat/${t.id}` : 'https://fluffychat.im/web/',
      web: !mobile, copy: !mobile,
    },
    {
      key: 'cinny', name: 'Cinny', letter: 'C', color: 'var(--color-text-secondary)',
      href: `https://app.cinny.in/${cinny}`,
      web: true,
    },
  ];
}

/**
 * Открыть приложение по схеме, а если его нет — страница скачивания. Ушла ли страница в фон,
 * видно по `visibilitychange`/`pagehide` (телефон) и `blur` (Mac): не ушла — приложения нет.
 */
function tryApp(url, fallback) {
  let left = false;
  const away = () => { left = true; };
  const onVisibility = () => { if (document.hidden) left = true; };
  addEventListener('pagehide', away, { once: true });
  addEventListener('blur', away, { once: true });
  document.addEventListener('visibilitychange', onVisibility);
  setTimeout(() => {
    removeEventListener('pagehide', away);
    removeEventListener('blur', away);
    document.removeEventListener('visibilitychange', onVisibility);
    if (!left && !document.hidden) location.href = fallback;
  }, APP_WAIT_MS);
  location.href = url;
}

// ── Тексты, которые собирает скрипт ──

const TEXT = {
  ru: {
    room: 'Комната',
    title: (id) => `${id} — Iskra`,
    description: (t) => (t.kind === 'user' ? `Напишите ${t.id} в Matrix: в Iskra или в другом приложении.` : `Зайдите в ${t.id} в Matrix: в Iskra или в другом приложении.`),
    app: 'Приложение',
    web: 'В браузере',
    copied: (name) => `Адрес скопирован — вставьте его в поиск ${name}.`,
  },
  en: {
    room: 'Room',
    title: (id) => `${id} — Iskra`,
    description: (t) => (t.kind === 'user' ? `Message ${t.id} on Matrix, in Iskra or any other app.` : `Join ${t.id} on Matrix, in Iskra or any other app.`),
    app: 'App',
    web: 'In the browser',
    copied: (name) => `Address copied — paste it into ${name}’s search.`,
  },
};

const EN = {
  'meta.title': 'Matrix link — Iskra',
  'meta.description': 'Open a link to a Matrix person or room in Iskra or any other app.',
  'nav.download': 'Download',
  'qr.aria': 'QR code of the link',
  'open.iskra': 'Open in&nbsp;Iskra',
  'open.web': 'Open in&nbsp;Iskra Web',
  'others.toggle': 'Using a&nbsp;different app?',
  'empty.title': 'A&nbsp;link to&nbsp;Matrix',
  'empty.body': 'Paste the address of&nbsp;a&nbsp;person or&nbsp;a&nbsp;room and get a&nbsp;link any Matrix app can open.',
  'empty.bad': 'That doesn’t look like a&nbsp;Matrix address. It&nbsp;looks like this: <code>@anya:matrix.org</code> or <code>#iskra:matrix.org</code>.',
  'empty.label': 'Matrix address',
  'empty.go': 'Open',
  'empty.matrix': 'What is&nbsp;Matrix',
  'footer.links': 'Links',
  'footer.home': 'Iskra',
  'footer.matrix': 'What is&nbsp;Matrix',
  'footer.privacy': 'Privacy',
};

// ── Страница ──

const $ = (id) => document.getElementById(id);
const { raw, target } = fromLocation();
const os = platform();

function setMeta(selector, attr, value) {
  const el = document.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

function showTarget(t) {
  $('target').hidden = false;
  const local = t.id.slice(1).split(':')[0];
  // Первая буква — целым символом, а не половиной суррогатной пары.
  $('avatar').textContent = t.kind === 'roomid' ? '#' : (Array.from(local)[0] ?? '?').toLocaleUpperCase();
  $('name').textContent = t.kind === 'roomid' ? '' : local;
  $('mxid').textContent = t.id;

  const link = canonical(t);
  $('qr').innerHTML = qrSvg(link);
  setMeta('link[rel="canonical"]', 'href', link);
  setMeta('meta[property="og:url"]', 'content', link);

  const iskra = $('open-iskra');
  if (os === 'ios' || os === 'mac') {
    iskra.href = iskraLink(t);
    iskra.addEventListener('click', (e) => {
      e.preventDefault();
      tryApp(iskraLink(t), DOWNLOAD);
    });
  }
  $('open-web').href = iskraWebLink(t);

  const toggle = $('others-toggle');
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    $('others').hidden = !open;
  });
}

function renderOthers(t, lang) {
  const text = TEXT[lang];
  const list = $('others');
  list.replaceChildren(...otherApps(t, os).map((app) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.className = 'others__item';
    a.href = app.href;
    if (app.web) { a.target = '_blank'; a.rel = 'noopener'; }
    a.innerHTML = `<span class="others__tile" style="--c:${app.color}" aria-hidden="true">${app.letter}</span>`
      + `<span class="others__text"><b></b><span></span></span>`
      + '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
    a.querySelector('b').textContent = app.name;
    a.querySelector('.others__text span').textContent = app.web ? text.web : text.app;
    if (app.copy) {
      a.addEventListener('click', () => {
        navigator.clipboard?.writeText(t.id).then(() => { $('others-note').textContent = text.copied(app.name); }, () => {});
      });
    }
    li.append(a);
    return li;
  }));
}

function showEmpty(bad) {
  $('empty').hidden = false;
  $('empty-text').hidden = bad;
  $('empty-bad').hidden = !bad;
  const input = $('address');
  $('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const t = parse(input.value, '');
    if (!t) {
      $('empty-text').hidden = true;
      $('empty-bad').hidden = false;
      input.focus();
      return;
    }
    location.href = canonical(t);
  });
}

if (target) showTarget(target);
else showEmpty(raw);

window.Site.init({
  en: EN,
  onLanguage(lang) {
    if (!target) return;
    const text = TEXT[lang];
    if (target.kind === 'roomid') $('name').textContent = text.room;
    document.title = text.title(target.id);
    const description = text.description(target);
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:title"]', 'content', document.title);
    setMeta('meta[property="og:description"]', 'content', description);
    renderOthers(target, lang);
  },
});
