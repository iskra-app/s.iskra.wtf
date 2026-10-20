// QR-код — порт iskra-web/src/design/qr.ts и QrCode.svelte (а те — QRCode нативной Искры):
// коррекция H и чистый квадрат посередине под искру. H восстанавливает до 30 % кода, вырезанный
// квадрат — меньше десятой. Квадрат нечётного числа модулей: код нечётной ширины, и нечётный
// квадрат по центру начинается и кончается на границе модуля, а не посередине.
import { encode } from './vendor/uqr.mjs';

// Контур искры — icons/iskra-spark-flat.svg нативной Искры (747 × 731), глаза — дырки (even-odd).
const SPARK_WIDTH = 747;
const SPARK_HEIGHT = 731;
const SPARK_PATH = 'M326.889 27.0854C347.131 -9.0285 399.111 -9.02845 419.353 27.0854L468.09 114.034C478.989 133.478 500.89 144.025 522.888 140.422L621.252 124.315C662.108 117.624 694.517 158.264 678.903 196.607L641.311 288.921C632.905 309.566 638.313 333.265 654.845 348.217L728.768 415.08C759.472 442.851 747.905 493.527 708.192 505.226L612.58 533.392C591.198 539.691 576.042 558.696 574.659 580.944L568.474 680.427C565.906 721.748 519.073 744.301 485.166 720.546L403.531 663.355C385.275 650.565 360.967 650.565 342.711 663.355L261.076 720.546C227.169 744.301 180.336 721.748 177.767 680.427L171.583 580.944C170.2 558.696 155.044 539.691 133.662 533.392L38.0497 505.226C-1.66341 493.527 -13.2304 442.851 17.4735 415.08L91.3973 348.217C107.929 333.265 113.337 309.566 104.931 288.921L67.3387 196.607C51.7248 158.264 84.1337 117.624 124.99 124.315L223.355 140.422C245.353 144.024 267.253 133.478 278.152 114.034L326.889 27.0854ZM419.114 253.578C413.68 234.385 392.921 224.562 374.117 231.218C355.314 237.874 345.604 258.488 350.856 277.731C359.141 308.086 364.48 339.17 366.799 370.549C368.269 390.442 384.301 406.633 404.248 406.633C424.195 406.633 440.485 390.447 439.204 370.541C436.656 330.954 429.921 291.747 419.114 253.578ZM554.324 234.055C548.89 214.863 528.131 205.04 509.328 211.696C490.524 218.352 480.814 238.965 486.066 258.208C494.351 288.564 499.69 319.647 502.01 351.027C503.48 370.919 519.511 387.111 539.458 387.111C559.405 387.111 575.695 370.925 574.414 351.019C571.865 311.431 565.131 272.224 554.324 234.055Z';

/** Сколько модулей в чистом квадрате кода шириной width: чуть больше четверти, нечётное. */
function centreSize(width) {
  const size = Math.round(width * 0.28);
  return size % 2 === 0 ? size + 1 : size;
}

function modules(text) {
  const { data, size } = encode(text, { ecc: 'H', border: 0 });
  const centre = centreSize(size);
  const from = (size - centre) / 2;
  const dark = data.map((row, y) => row.map((on, x) => on && !(x >= from && x < from + centre && y >= from && y < from + centre)));
  return { size, dark, sparkFraction: (centre - 2) / size };
}

/** Тёмные модули одним путём: подряд идущие в строке — одним прямоугольником. */
function path(dark) {
  let d = '';
  dark.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) { x += 1; continue; }
      const start = x;
      while (x < row.length && row[x]) x += 1;
      d += `M${start} ${y}h${x - start}v1h${start - x}z`;
    }
  });
  return d;
}

/** SVG кода с искрой посередине — чёрным по белому, цвет задаёт CSS. */
export function qrSvg(text) {
  const { size, dark, sparkFraction } = modules(text);
  const side = size * sparkFraction;
  const scale = side / Math.max(SPARK_WIDTH, SPARK_HEIGHT);
  const x = (size - SPARK_WIDTH * scale) / 2;
  const y = (size - SPARK_HEIGHT * scale) / 2;
  return `<svg viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" aria-hidden="true">`
    + `<path d="${path(dark)}"/>`
    + `<path d="${SPARK_PATH}" fill-rule="evenodd" transform="translate(${x} ${y}) scale(${scale})" shape-rendering="geometricPrecision"/>`
    + '</svg>';
}
