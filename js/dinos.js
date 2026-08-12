/* ============================================================
 * dinos.js — 可选恐龙种类 + 用 SVG 生成的萌系占位形象
 * 之后你可以用工具/上传替换成 Fion Os 风格的真实图片。
 * ============================================================ */
(function (global) {
  'use strict'

  // 恐龙种类（占位，名字取自常见恐龙）
  const SPECIES = [
    { id: 'trex',   name: '霸王龙',   color: '#e57373', accent: '#ffcdd2' },
    { id: 'spino',  name: '棘龙',     color: '#64b5f6', accent: '#bbdefb' },
    { id: 'tricer', name: '三角龙',   color: '#81c784', accent: '#c8e6c9' },
    { id: 'stego',  name: '剑龙',     color: '#ffb74d', accent: '#ffe0b2' },
    { id: 'ptero',  name: '翼龙',     color: '#ba68c8', accent: '#e1bee7' },
    { id: 'brachio',name: '腕龙',     color: '#4db6ac', accent: '#b2dfdb' },
  ]

  // 恐龙蛋（领养阶段 / Lv.1 未孵化时显示），用品种主色点缀
  function svgEgg(species, hatched) {
    const s = SPECIES.find(x => x.id === species) || SPECIES[0]
    const crack = hatched
      ? `<path d="M70 95 q12 -10 24 0 q14 12 30 -2 q10 -10 8 6 q-4 26 -32 30 q-30 4 -34 -22 q-2 -16 4 -12z" fill="#fff8e1" stroke="${s.color}" stroke-width="2"/>`
      : `<path d="M100 92 l-10 6 l8 6 l-9 7 l11 5" fill="none" stroke="${s.accent}" stroke-width="3"/>`
    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="100" cy="178" rx="58" ry="11" fill="rgba(0,0,0,0.12)"/>
      <path d="M100 40 C150 40 165 95 165 120 C165 155 135 175 100 175 C65 175 35 155 35 120 C35 95 50 40 100 40 Z"
            fill="${s.color}" stroke="${s.accent}" stroke-width="4"/>
      <ellipse cx="78" cy="95" rx="14" ry="18" fill="${s.accent}" opacity="0.7"/>
      <ellipse cx="125" cy="120" rx="11" ry="15" fill="${s.accent}" opacity="0.6"/>
      <ellipse cx="100" cy="140" rx="13" ry="16" fill="${s.accent}" opacity="0.55"/>
      ${crack}
      ${hatched ? '<text x="100" y="195" text-anchor="middle" font-size="14" fill="#555">孵化啦！</text>' : ''}
    </svg>`
  }

  // 按等级缩放（成长感）
  function svgDino(species, level) {
    const s = SPECIES.find(x => x.id === species) || SPECIES[0]
    const scale = 1 + Math.min(level - 1, 6) * 0.06 // Lv 越高越大
    const eye = level >= 3 ? 2 : 1
    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style="transform:scale(${scale})">
      <ellipse cx="100" cy="175" rx="60" ry="12" fill="rgba(0,0,0,0.12)"/>
      <path d="M60 120 Q40 70 80 60 Q90 30 130 45 Q170 55 160 95 Q175 120 150 135 L150 160 Q150 170 138 170 L126 170 Q120 150 110 150 Q100 170 88 170 L78 170 Q70 165 72 150 Q55 150 50 130 Z"
            fill="${s.color}" stroke="${s.accent}" stroke-width="4"/>
      <circle cx="120" cy="80" r="6" fill="#fff"/><circle cx="122" cy="80" r="3" fill="#333"/>
      <path d="M70 70 l-12 -22 l16 4 l8 18 Z" fill="${s.accent}" stroke="${s.color}" stroke-width="2"/>
      <path d="M150 95 l18 -10 l-2 16 Z" fill="${s.accent}"/>
      <text x="100" y="195" text-anchor="middle" font-size="14" fill="#555">Lv.${level}</text>
    </svg>`
  }

  global.Dinos = { SPECIES, svgDino, svgEgg }
})(window)
