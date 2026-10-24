# s.iskra.wtf

Ссылки на людей и комнаты Matrix — как [matrix.to](https://matrix.to), только свои и в стиле [iskra.wtf](https://iskra.wtf).

- `https://s.iskra.wtf/@anya:matrix.org` — человек
- `https://s.iskra.wtf/%23iskra:matrix.org` или `https://s.iskra.wtf/#iskra:matrix.org` — комната по алиасу
- `https://s.iskra.wtf/!id:server?via=matrix.org` — комната по ID
- `https://s.iskra.wtf/#/@anya:matrix.org` — старый адрес matrix.to с заменённым доменом тоже работает

На странице — аватар-буква, ID, QR-код с искрой (тот же, что в приложении и iskra-web) и кнопки:
«Открыть в Искре» (`wtf.iskra://u|r|roomid/…`, а без приложения — страница скачивания),
«Открыть в Iskra Web» (`https://web.iskra.wtf/#/open/<id>`) и список других клиентов
(Element X, FluffyChat, Cinny — ссылки как у matrix.to). К серверам Matrix страница не ходит.

## Устройство

Статический сайт без сборки на GitHub Pages. Любой путь отдаёт `404.html` — копию `index.html`,
поэтому после правки `index.html` запустите `scripts/sync-404.sh`.

- `assets/link.js` — разбор адреса, ссылки на приложения, отрисовка
- `assets/qr.js` — QR-код, порт `iskra-web/src/design/qr.ts`; `assets/vendor/uqr.mjs` — [uqr](https://github.com/unjs/uqr) (MIT)
- `assets/site.css`, `site.js`, `fonts/`, `sprite.svg` — общие с iskra.wtf, копии оттуда
- `.well-known/apple-app-site-association` — Universal Links: с установленной Искрой ссылки открываются сразу в приложении
- `.well-known/assetlinks.json` — App Links на Android (пакет `wtf.iskra`). **Список отпечатков пуст, пока у автора нет ключа
  релиза**: `scripts/set-assetlinks-cert.sh AA:BB:…` впишет SHA-256 сертификата подписи (тот же, что в описании релиза), после чего
  ссылки открываются сразу в Искре. Пока пусто, Android спросит, чем открыть

Локально нужен сервер, который, как Pages, отдаёт `404.html` на неизвестные пути.

## Публикация

GitHub Pages из ветки `main`, свой домен — `CNAME`. В DNS зоны `iskra.wtf` — запись
`CNAME s → iskra-app.github.io`.
