/* ============================================================
 * battle.js — 对战题库（一年级~二年级水平中文字）
 * AI 对手：等待 3~8 秒后作答，可能出错（模拟真人）。
 * ============================================================ */
(function (global) {
  'use strict'

  // 题库：每题 {q, options, answer(索引), type}
  const QUESTIONS = [
    { q: '“大”的反义词是？', options: ['小', '多', '高'], answer: 0 },
    { q: '“火”字有几笔？', options: ['3笔', '4笔', '5笔'], answer: 1 },
    { q: '下列哪个是水果？', options: ['萝卜', '苹果', '土豆'], answer: 1 },
    { q: '“明”是由哪两个字组成？', options: ['日+月', '木+子', '人+火'], answer: 0 },
    { q: '“上”的反义词是？', options: ['左', '下', '右'], answer: 1 },
    { q: '“水”的拼音是？', options: ['shuǐ', 'suǐ', 'shǐ'], answer: 0 },
    { q: '“三”的下一笔数是？', options: ['二', '四', '五'], answer: 1 },
    { q: '“日”字加一笔可以变成？', options: ['目', '田', '以上都是'], answer: 2 },
    { q: '“好朋友”的“友”读作？', options: ['yǒu', 'yòu', 'yiǔ'], answer: 0 },
    { q: '“猫”这种动物属于？', options: ['鸟类', '兽类', '鱼类'], answer: 1 },
    { q: '“山”字的形状像什么？', options: ['高高隆起', '平平的', '圆圆的'], answer: 0 },
    { q: '“风”字里没有哪个部件？', options: ['几', '×', '月'], answer: 2 },
    { q: '“红”是什么颜色？', options: ['红色', '蓝色', '绿色'], answer: 0 },
    { q: '“门”字有几笔？', options: ['3笔', '4笔', '5笔'], answer: 0 },
    { q: '“鸟”字里有一点，它代表？', options: ['眼睛', '尾巴', '翅膀'], answer: 0 },
    { q: '“春”是哪个季节？', options: ['春天', '夏天', '冬天'], answer: 0 },
    { q: '“左”的反方向是？', options: ['前', '右', '后'], answer: 1 },
    { q: '“书”是用来做什么的？', options: ['读', '吃', '穿'], answer: 0 },
    { q: '“雨”从天上怎么下来？', options: ['落下来', '飞上去', '飘左边'], answer: 0 },
    { q: '“木”加一笔可以变成？', options: ['本', '禾', '以上都是'], answer: 2 },
    { q: '“花”生长在？', options: ['天上', '土里/枝头', '水里'], answer: 1 },
    { q: '“马”有几条腿？', options: ['2条', '4条', '6条'], answer: 1 },
    { q: '“一”加“大”可以组成？', options: ['天', '夫', '以上都是'], answer: 2 },
    { q: '“早”和“晚”是什么关系？', options: ['反义词', '同义词', '没关系'], answer: 0 },
    { q: '“口”字加两笔可以变成？', options: ['只', '中', '以上都是'], answer: 2 },
  ]

  function randomQuestion(used) {
    const pool = QUESTIONS.filter((_, i) => !used.has(i))
    const list = pool.length ? pool : QUESTIONS
    const idx = QUESTIONS.indexOf(list[Math.floor(Math.random() * list.length)])
    return { idx, q: QUESTIONS[idx] }
  }

  // AI 作答：3~8 秒后选择，约 30% 概率答错
  function aiAnswer(q, cb) {
    const delay = 3000 + Math.floor(Math.random() * 5000) // 3~8秒
    const mistake = Math.random() < 0.3
    setTimeout(() => {
      let choice
      if (mistake) {
        const wrong = q.options.map((_, i) => i).filter(i => i !== q.answer)
        choice = wrong[Math.floor(Math.random() * wrong.length)]
      } else {
        choice = q.answer
      }
      cb(choice, mistake)
    }, delay)
  }

  global.Battle = { QUESTIONS, randomQuestion, aiAnswer }
})(window)
