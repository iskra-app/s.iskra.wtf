#!/bin/sh
# GitHub Pages отдаёт 404.html на любой несуществующий путь — так /@anya:matrix.org попадает
# на страницу. Разметка одна: 404.html — копия index.html. Запускать после правки index.html.
set -e
cd "$(dirname "$0")/.."
cp index.html 404.html
