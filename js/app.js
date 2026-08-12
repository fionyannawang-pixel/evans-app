/* ============================================================
 * app.js — Evan's App 主逻辑
 * 涵盖：领养/养成、今日任务、打卡、计时、对战、工具、阅读、奖励
 * ============================================================ */
(function () {
  'use strict'

  const $ = (s, r = document) => r.querySelector(s)
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s))
  const today = () => Store.todayKey()

  // 图片转 dataURL
  function fileToDataURL(file) {
    return new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(r.result)
      r.onerror = rej
      r.readAsDataURL(file)
    })
  }

  function toast(msg) {
    const t = $('#toast')
    t.textContent = msg
    t.classList.add('show')
    clearTimeout(t._t)
    t._t = setTimeout(() => t.classList.remove('show'), 1800)
  }

  // 成长阶段：Lv.1-4 幼崽 / Lv.5-9 少年 / Lv.10-14 青年 / Lv.15+ 成年
  function dinoStage(level) {
    if (level <= 4) return 1
    if (level <= 9) return 2
    if (level <= 14) return 3
    return 4
  }
  const STAGE_NAMES = { 1: '幼崽', 2: '少年', 3: '青年', 4: '成年' }

  function dinoImage(state) {
    const d = state.dino
    const stage = dinoStage(d.level)
    const stageImg = d.images && d.images[stage]
    if (stageImg) return `<img src="${stageImg}" alt="dino stage ${stage}" />`
    // 未上传该阶段图时：幼崽阶段显示为恐龙蛋，其余显示 SVG 恐龙（成长）
    if (stage <= 1) return Dinos.svgEgg(d.speciesId, false)
    return Dinos.svgDino(d.speciesId, d.level)
  }

  // 恐龙图上传（孵化弹窗 / 首页均可触发），按当前成长阶段存入 images
  $('#dinoFile').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return
    const url = await fileToDataURL(f)
    const d = Store.get().dino
    const stage = dinoStage(d.level)
    Store.update(st => {
      st.dino.images = st.dino.images || {}
      st.dino.images[stage] = url
      st.dino.image = url // 兼容字段
    })
    $('#hatchMask').style.display = 'none'
    renderHome()
    toast(`🦕 ${STAGE_NAMES[stage]}（Lv.${d.level}）恐龙图已设置！`)
    e.target.value = ''
  }
  $('#uploadDinoBtn').onclick = () => $('#dinoFile').click()

  /* ---------- 主题应用 ---------- */
  function applyTheme() {
    const t = Store.get().theme
    document.documentElement.style.setProperty('--primary', t.primary)
    document.documentElement.style.setProperty('--secondary', t.secondary)
    document.body.dataset.bg = t.bgType
    if (t.bgType === 'solid') {
      document.documentElement.style.setProperty('--bg-color', t.bgColor)
      document.documentElement.style.setProperty('--bg-image', 'none')
    } else if (t.bgType === 'image' && t.bgImage) {
      document.documentElement.style.setProperty('--bg-image', `url(${t.bgImage})`)
    } else {
      document.documentElement.style.setProperty('--bg-color', t.bgColor)
      document.documentElement.style.setProperty('--bg-image', 'none')
    }
  }

  /* ---------- 顶部星星 ---------- */
  function refreshStars() {
    $('#starsTotal').textContent = Store.get().stars
  }

  /* ============================================================
   * 领养向导
   * ============================================================ */
  function showAdoptIfNeeded() {
    const d = Store.get().dino
    if (!d.adopted) {
      $('#adoptMask').style.display = 'flex'
      renderDinoPick()
    }
  }

  function renderDinoPick() {
    const wrap = $('#dinoPick')
    wrap.innerHTML = ''
    Dinos.SPECIES.forEach(s => {
      const el = document.createElement('div')
      el.className = 'opt'
      el.dataset.id = s.id
      // 领养阶段显示为恐龙蛋，不露具体恐龙
      el.innerHTML = `<div class="pic">${Dinos.svgEgg(s.id, false)}</div><div class="nm">${s.name}蛋</div>`
      el.onclick = () => {
        $$('#dinoPick .opt').forEach(o => o.classList.remove('sel'))
        el.classList.add('sel')
        $('#adoptHint').textContent = `已选择：${s.name}（孵化后可见品种）`
        $('#confirmAdoptBtn').disabled = false
        el._species = s
      }
      wrap.appendChild(el)
    })
  }

  $('#confirmAdoptBtn').onclick = async () => {
    const sel = $('#dinoPick .opt.sel')
    if (!sel) return
    const s = Dinos.SPECIES.find(x => x.id === sel.dataset.id)
    const name = $('#dinoNameInput').value.trim() || s.name
    const now = Date.now()
    Store.update(st => {
      st.dino = {
        adopted: true, species: s.name, speciesId: s.id, name,
        level: 1, spirit: 100, adoptedAt: now, lastFedAt: now,
        image: null, battlesWon: 0, battlesLost: 0, reborn: false,
      }
    })
    $('#adoptMask').style.display = 'none'
    // 弹出孵化弹窗
    showHatchModal(s, name)
  }

  // 孵化弹窗：显示破壳蛋 + 上传恐龙图
  function showHatchModal(species, name) {
    const m = $('#hatchMask')
    m.querySelector('#hatchDino').innerHTML = Dinos.svgEgg(species.id, true)
    m.querySelector('#hatchTitle').textContent = `🐣 你的小恐龙孵化啦！`
    m.querySelector('#hatchText').textContent = `${name} 破壳而出～上传你喜欢的恐龙图来认养它吧！`
    m.style.display = 'flex'
    fullRefresh()
  }
  $('#hatchUploadBtn').onclick = () => $('#dinoFile').click()
  $('#hatchCloseBtn').onclick = () => { $('#hatchMask').style.display = 'none' }
  $('#reAdoptBtn').onclick = () => {
    $('#deceasedMask').style.display = 'none'
    renderDinoPick()
    $('#adoptMask').style.display = 'flex'
  }

  /* ============================================================
   * 养成 / 首页
   * ============================================================ */
  // 检查喂养状态：超过 3 天未喂养 -> 需要重新领养
  function checkFeeding() {
    const d = Store.get().dino
    if (!d.adopted) return
    const days = Store.dayDiff(d.lastFedAt, Date.now())
    if (days >= 3) {
      // 需要重新领养
      Store.update(st => { st.dino.adopted = false })
      toast('😢 太久没喂养，恐龙离开了…请重新领养')
      showAdoptIfNeeded()
      fullRefresh()
    }
  }

  function refreshLevelByDays() {
    const d = Store.get().dino
    if (!d.adopted) return
    const oldStage = dinoStage(d.level)
    const days = Store.dayDiff(d.adoptedAt, Date.now())
    const lv = Store.levelForDays(days)
    if (lv !== d.level) {
      const leveledUp = lv > d.level
      Store.update(st => { st.dino.level = lv })
      if (leveledUp) {
        if (lv >= Store.MAX_LEVEL) {
          // 达到最高等级：恐龙去世，需重新领养
          Store.update(st => { st.dino.deceased = true; st.dino.adopted = false })
          $('#deceasedText').textContent =
            `${d.name} 陪伴你走到了 Lv.${lv}，光荣退役啦。领养一只新恐龙，开启新的旅程吧！`
          $('#deceasedMask').style.display = 'flex'
          showAdoptIfNeeded()
        } else {
          toast(`🎊 ${d.name} 升到 Lv.${lv} 啦！`)
          // 跨入新阶段时提醒上传新形象
          const ns = dinoStage(lv)
          if (ns !== oldStage && !(d.images && d.images[ns])) {
            toast(`🖼️ 进入${STAGE_NAMES[ns]}期，记得上传新恐龙图`)
          }
        }
      }
    }
  }

  function renderHome() {
    const st = Store.get()
    const d = st.dino
    if (!d.adopted) {
      $('#homeGreeting').textContent = '请先领养一只恐龙'
      $('#uploadDinoBtn').style.display = 'none'
      return
    }

    $('#homeDino').innerHTML = dinoImage(st)
    $('#homeDinoName').textContent = `${d.name}（${d.species}）`
    $('#homeDinoMeta').innerHTML =
      `<span class="chip">Lv.${d.level}</span>` +
      `<span class="chip">第 ${Store.dayDiff(d.adoptedAt, Date.now()) + 1} 天</span>` +
      (d.reborn ? `<span class="chip">已复活</span>` : '')
    const sp = Math.max(0, Math.round(d.spirit))
    $('#homeSpiritBar').style.width = sp + '%'
    const stEl = $('#homeSpiritText')
    stEl.textContent = `精神 ${sp}%`
    if (sp <= 20) stEl.style.color = '#c0392b'; else stEl.style.color = ''

    // 上传/更换当前成长阶段的恐龙图（幼崽/少年/青年/成年 共 4 张）
    const udb = $('#uploadDinoBtn')
    const stage = dinoStage(d.level)
    const hasStageImg = d.images && d.images[stage]
    udb.style.display = 'inline-block'
    udb.textContent = hasStageImg
      ? `🖼️ 更换${STAGE_NAMES[stage]}恐龙图`
      : `🖼️ 上传${STAGE_NAMES[stage]}恐龙图（Lv.${d.level}）`

    // 任务
    renderTasks()
  }

  function renderTasks() {
    const st = Store.get()
    const key = today()
    const done = st.taskLog[key] || []
    const list = $('#taskList')
    list.innerHTML = ''
    st.taskOptions.forEach(opt => {
      const isDone = done.includes(opt.id)
      const row = document.createElement('div')
      row.className = 'task-row' + (isDone ? ' done' : '')
      row.innerHTML = `
        <span class="t-ico">${opt.icon}</span>
        <span class="t-label">${opt.label}</span>
        <button class="btn ${isDone ? 'ghost' : ''}" data-id="${opt.id}">${isDone ? '已完成 ✓' : '完成'}</button>
        <button class="del" title="删除">✕</button>`
      row.querySelector('button[data-id]').onclick = () => toggleTask(opt.id)
      row.querySelector('.del').onclick = () => removeTask(opt.id)
      list.appendChild(row)
    })
    const total = st.taskOptions.length
    const cnt = done.filter(id => st.taskOptions.some(o => o.id === id)).length
    $('#taskProgress').textContent = `今日进度：${cnt} / ${total}`
  }

  function toggleTask(id) {
    const key = today()
    Store.update(st => {
      st.taskLog[key] = st.taskLog[key] || []
      if (st.taskLog[key].includes(id)) {
        st.taskLog[key] = st.taskLog[key].filter(x => x !== id)
      } else {
        st.taskLog[key].push(id)
      }
    })
    renderTasks()
  }

  function removeTask(id) {
    Store.update(st => {
      st.taskOptions = st.taskOptions.filter(o => o.id !== id)
      // 同时从所有日志移除
      Object.keys(st.taskLog).forEach(k => {
        st.taskLog[k] = (st.taskLog[k] || []).filter(x => x !== id)
      })
    })
    renderTasks()
  }

  $('#addTaskBtn').onclick = () => {
    const inp = $('#newTaskInput')
    const v = inp.value.trim()
    if (!v) return
    const id = 't' + Date.now()
    Store.update(st => {
      st.taskOptions.push({ id, label: v, icon: '⭐' })
    })
    inp.value = ''
    renderTasks()
    toast('已添加任务')
  }

  $('#feedBtn').onclick = () => {
    const d = Store.get().dino
    if (!d.adopted) { showAdoptIfNeeded(); return }
    const now = Date.now()
    const days = Store.dayDiff(d.lastFedAt, now)
    if (days < 1) {
      toast('今天已经喂过啦，明天再来～')
      return
    }
    Store.update(st => {
      st.dino.lastFedAt = now
      st.dino.spirit = Math.min(100, st.dino.spirit + 30) // 喂养恢复精神
    })
    toast(`🍖 ${d.name} 吃饱啦！精神 +30%`)
    renderHome()
  }

  /* ============================================================
   * 打卡
   * ============================================================ */
  let calMonth = new Date().getMonth()
  let calYear = new Date().getFullYear()

  function renderCalendar() {
    const st = Store.get()
    const grid = $('#calendar')
    grid.innerHTML = ''
    $('#calTitle').textContent = `${calYear} 年 ${calMonth + 1} 月`
    const first = new Date(calYear, calMonth, 1)
    const startDay = first.getDay() // 0=日
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
    const now = new Date()
    // 前置空格
    for (let i = 0; i < startDay; i++) {
      const c = document.createElement('div')
      grid.appendChild(c)
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(calYear, calMonth, d)
      const key = Store.todayKey(cellDate)
      const checked = !!st.checkin[key]
      const c = document.createElement('div')
      c.className = 'cal-cell' + (checked ? ' checked' : '') +
        (key === today() ? ' today' : '') +
        (cellDate < new Date(now.getFullYear(), now.getMonth(), now.getDate()) && !checked ? ' past' : '')
      c.innerHTML = `<div>${d}</div>` + (checked ? `<div class="star">⭐</div>` : '')
      c.onclick = () => { if (key === today()) doCheckin() }
      grid.appendChild(c)
    }
    const checkedCount = Object.keys(st.checkin).filter(k => k.startsWith(`${calYear}-${String(calMonth + 1).padStart(2, '0')}`)).length
    $('#checkinStats').textContent = `本月已打卡 ${checkedCount} 天`
  }

  function doCheckin() {
    const key = today()
    const st = Store.get()
    if (st.checkin[key]) { toast('今天已经打卡啦！'); return }
    const gain = 1 + Math.floor(Math.random() * 5) // 1~5
    Store.update(s => {
      s.checkin[key] = true
      s.stars += gain
      s.starLog.push({ date: key, amount: gain, reason: '打卡' })
    })
    toast(`✅ 打卡成功！获得 ${gain} ⭐`)
    renderCalendar(); refreshStars()
  }

  $('#checkinBtn').onclick = doCheckin
  $('#calPrev').onclick = () => { calMonth--; if (calMonth < 0) { calMonth = 11; calYear-- } renderCalendar() }
  $('#calNext').onclick = () => { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++ } renderCalendar() }

  /* ============================================================
   * 计时
   * ============================================================ */
  function fmt(sec) {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    const mm = String(m).padStart(2, '0'), ss = String(s).padStart(2, '0')
    return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`
  }

  function addTimer(min, label) {
    const dur = Math.round(min * 60)
    Store.update(st => {
      st.timers.push({
        id: 'tm' + Date.now() + Math.random().toString(36).slice(2, 6),
        label: label || `${min}分钟`, duration: dur, remaining: dur,
        running: false, startedAt: null, done: false,
      })
    })
    renderTimers()
  }

  $('#addTimerBtn').onclick = () => {
    const cm = parseFloat($('#customMin').value)
    const label = $('#timerLabel').value.trim()
    if (!cm || cm <= 0) { toast('请输入有效分钟数'); return }
    addTimer(cm, label)
    $('#customMin').value = ''; $('#timerLabel').value = ''
  }
  $$('#presetBtns button').forEach(b => {
    b.onclick = () => addTimer(parseFloat(b.dataset.min), b.textContent.trim())
  })

  function renderTimers() {
    const st = Store.get()
    const wrap = $('#timerList')
    wrap.innerHTML = ''
    if (!st.timers.length) { wrap.innerHTML = '<p class="muted">还没有计时，先添加一个吧。</p>'; return }
    st.timers.forEach(t => {
      const card = document.createElement('div')
      card.className = 'timer-card'
      card.innerHTML = `
        <div class="row between"><b>${t.label}</b><span class="tag">${fmt(t.duration)}</span></div>
        <div class="timer-time" data-tid="${t.id}">${fmt(t.remaining)}</div>
        <div class="row mt">
          ${t.done ? '<span class="chip">已完成 🔔</span>'
            : t.running
              ? '<button class="btn ghost" data-act="pause">⏸ 暂停</button>'
              : '<button class="btn" data-act="start">▶ 开始</button>'}
          <button class="btn danger" data-act="del">删除</button>
        </div>`
      card.querySelector('[data-act="start"]').onclick = () => startTimer(t.id)
      card.querySelector('[data-act="pause"]')?.addEventListener('click', () => pauseTimer(t.id))
      card.querySelector('[data-act="del"]').onclick = () => {
        Store.update(s => { s.timers = s.timers.filter(x => x.id !== t.id) })
        renderTimers()
      }
      wrap.appendChild(card)
    })
  }

  function startTimer(id) {
    Store.update(st => {
      const t = st.timers.find(x => x.id === id)
      if (!t) return
      t.running = true
      t.startedAt = Date.now() - (t.duration - t.remaining) * 1000
    })
    tickTimers()
  }
  function pauseTimer(id) {
    Store.update(st => {
      const t = st.timers.find(x => x.id === id)
      if (!t) return
      t.remaining = Math.max(0, Math.round((t.startedAt + t.duration * 1000 - Date.now()) / 1000))
      t.running = false; t.startedAt = null
      if (t.remaining <= 0) t.done = true
    })
    renderTimers()
  }

  // 计时主循环
  function tickTimers() {
    const st = Store.get()
    let changed = false
    st.timers.forEach(t => {
      if (t.running) {
        const left = Math.max(0, Math.round((t.startedAt + t.duration * 1000 - Date.now()) / 1000))
        t.remaining = left
        if (left <= 0) { t.running = false; t.done = true; changed = true; notifyTimer(t) }
      }
    })
    if (changed) Store.save()
    // 更新显示
    $$('#timerList .timer-time').forEach(el => {
      const t = st.timers.find(x => x.id === el.dataset.tid)
      if (t) el.textContent = fmt(t.remaining)
    })
    // 重渲染（状态变化）
    if (changed) renderTimers()
  }
  setInterval(tickTimers, 1000)

  function notifyTimer(t) {
    toast(`🔔 计时「${t.label}」完成！`)
    try { new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=').play().catch(()=>{}) } catch (e) {}
  }

  /* ============================================================
   * 对战
   * ============================================================ */
  function renderBattle() {
    const st = Store.get()
    const d = st.dino
    const ready = d.adopted && d.level >= 2
    $('#battleLockedCard').style.display = ready ? 'none' : 'block'
    $('#battleReadyCard').style.display = ready ? 'block' : 'none'
    if (!ready) {
      $('#battleSub').textContent = `当前 Lv.${d.level}，达到 Lv.2 解锁`
      return
    }
    $('#battleSub').textContent = `Lv.${d.level} · 精神 ${Math.round(d.spirit)}%`
    $('#myFighter').innerHTML = dinoImage(st)
    $('#myFighterName').textContent = d.name
    $('#myFighterSpirit').textContent = `精神 ${Math.round(d.spirit)}%`

    // 随机对手
    const foe = Dinos.SPECIES[Math.floor(Math.random() * Dinos.SPECIES.length)]
    $('#foeFighter').innerHTML = Dinos.svgDino(foe.id, Math.max(2, d.level))
    $('#foeFighterName').textContent = foe.name

    renderBattleLog()
  }

  function renderBattleLog() {
    const log = Store.get().battles
    const el = $('#battleLog')
    if (!log.length) { el.innerHTML = '<span class="muted">暂无记录</span>'; return }
    el.innerHTML = log.slice().reverse().map(b =>
      `<div class="row between" style="padding:6px 0;border-bottom:1px solid #eee">
        <span>${b.date} 对战 ${b.opponent}</span>
        <b style="color:${b.result === 'win' ? '#2e7d32' : '#c62828'}">${b.result === 'win' ? '胜利 +15⭐' : '失败'}</b>
      </div>`).join('')
  }

  $('#startBattleBtn').onclick = () => {
    const st = Store.get()
    const d = st.dino
    if (d.spirit <= 0) {
      toast('精神为 0%，无法对战！请恢复精神。')
      return
    }
    if (st.stars < 5) { toast('星星不足 5 颗，无法对战'); return }

    // 扣除 5 星 + 20% 精神
    Store.update(s => {
      s.stars -= 5
      s.dino.spirit = Math.max(0, s.dino.spirit - 20)
    })
    refreshStars(); renderBattle()

    // 出 3 题
    const used = new Set()
    let round = 0, myScore = 0, foeScore = 0
    const box = $('#battleQBox')
    function nextQ() {
      if (round >= 3) { finish(); return }
      round++
      const { idx, q } = Battle.randomQuestion(used)
      used.add(idx)
      box.innerHTML = `<p class="muted">第 ${round}/3 题 · 你先作答，对手稍后选择</p>
        <p style="font-size:20px;font-weight:800;margin:8px 0">${q.q}</p>
        <div class="q-opts" id="qOpts"></div>
        <p class="muted mt" id="foeStatus">对手思考中…</p>`
      const opts = $('#qOpts')
      q.options.forEach((opt, i) => {
        const b = document.createElement('button')
        b.className = 'q-opt'; b.textContent = opt
        b.onclick = () => {
          $$('#qOpts .q-opt').forEach(x => x.disabled = true)
          if (i === q.answer) { b.classList.add('correct'); myScore++ }
          else { b.classList.add('wrong'); }
          // AI 作答
          Battle.aiAnswer(q, (choice, mistake) => {
            const foeStatus = $('#foeStatus')
            if (!mistake && choice === q.answer) { foeScore++; foeStatus.textContent = `对手选择了「${q.options[choice]}」✓ 答对` }
            else { foeStatus.textContent = `对手选择了「${q.options[choice]}」✗ 答错` }
            const nb = document.createElement('button')
            nb.className = 'btn mt'; nb.textContent = '下一题 ›'
            nb.onclick = nextQ
            box.appendChild(nb)
          })
        }
        opts.appendChild(b)
      })
    }
    function finish() {
      const win = myScore > foeScore
      const draw = myScore === foeScore
      Store.update(s => {
        s.battles.push({ date: today(), opponent: $('#foeFighterName').textContent, result: win ? 'win' : (draw ? 'draw' : 'lose') })
        if (win) { s.stars += 15; s.dino.battlesWon++ } else if (!draw) { s.dino.battlesLost++ }
      })
      const icon = win ? '🏆' : (draw ? '🤝' : '💔')
      const title = win ? '你赢了对战！' : (draw ? '平局！' : '惜败…再接再厉')
      box.innerHTML = `<div class="center">
        <div style="font-size:46px">${icon}</div>
        <p style="font-size:20px;font-weight:800">${title}</p>
        <p class="muted">比分 你 ${myScore} : ${foeScore} 对手${win ? ' · 获得 15⭐' : ''}</p>
        ${!win && Store.get().dino.spirit <= 0 ? '<p style="color:#c0392b">⚠️ 精神已耗尽，请恢复或复活</p>' : ''}
        <button class="btn mt" onclick="location.reload()">返回</button>
      </div>`
      refreshStars(); renderBattle()
    }
    nextQ()
  }

  // 精神恢复 / 复活面板（在 battleReadyCard 下方注脚提示）
  // 通过工具/额外学习恢复：这里提供“多学30分钟恢复”与“5星复活”按钮
  function renderSpiritControls() {
    // 注入到 battleSub 区域下方（仅在 spirit<=0 时显示）
    const d = Store.get().dino
    const card = $('#battleReadyCard')
    let helper = $('#spiritHelper')
    if (!helper) {
      helper = document.createElement('div')
      helper.id = 'spiritHelper'; helper.className = 'card'; helper.style.marginTop = '14px'
      card.after(helper)
    }
    if (d.spirit <= 0) {
      helper.style.display = 'block'
      helper.innerHTML = `<h2>⚠️ 精神耗尽</h2>
        <p class="muted">选择一种方式恢复：</p>
        <div class="row">
          <button class="btn" id="study30Btn">📖 多学习 30 分钟（恢复 30%）</button>
          <button class="btn secondary" id="reviveBtn">✨ 用 5⭐ 复活（恢复 100%）</button>
          <button class="btn danger" id="rebornBtn">🥚 重新领养</button>
        </div>`
      $('#study30Btn').onclick = () => { recoverSpirit(30); toast('学习了 30 分钟，精神 +30%') }
      $('#reviveBtn').onclick = () => {
        const s = Store.get()
        if (s.stars < 5) { toast('星星不足 5 颗'); return }
        Store.update(x => { x.stars -= 5; x.dino.spirit = 100; x.dino.reborn = true })
        refreshStars(); renderBattle(); renderSpiritControls()
      }
      $('#rebornBtn').onclick = () => {
        Store.update(x => { x.dino.adopted = false })
        showAdoptIfNeeded(); renderBattle(); renderSpiritControls()
      }
    } else {
      helper.style.display = 'none'
    }
  }
  function recoverSpirit(pct) {
    Store.update(st => { st.dino.spirit = Math.min(100, st.dino.spirit + pct) })
    renderBattle(); renderSpiritControls(); renderHome()
  }

  /* ============================================================
   * 工具
   * ============================================================ */
  const PRIMARY_SW = ['#7ec8e3', '#a8d8ea', '#9ad0c2', '#b3c7f0', '#c9b6e4']
  const SECONDARY_SW = ['#fff3b0', '#ffe0b2', '#ffd6e0', '#d7f9c9', '#ffe9a8']

  function renderThemeControls() {
    const t = Store.get().theme
    const pw = $('#primarySwatches'); pw.innerHTML = ''
    PRIMARY_SW.forEach(c => {
      const s = document.createElement('div')
      s.className = 'swatch' + (t.primary.toLowerCase() === c ? ' active' : '')
      s.style.background = c
      s.onclick = () => { Store.update(x => x.theme.primary = c); applyTheme(); renderThemeControls() }
      pw.appendChild(s)
    })
    const sw = $('#secondarySwatches'); sw.innerHTML = ''
    SECONDARY_SW.forEach(c => {
      const s = document.createElement('div')
      s.className = 'swatch' + (t.secondary.toLowerCase() === c ? ' active' : '')
      s.style.background = c
      s.onclick = () => { Store.update(x => x.theme.secondary = c); applyTheme(); renderThemeControls() }
      sw.appendChild(s)
    })
    $('#bgColorInput').value = t.bgColor
  }

  $('#nicknameInput').value = Store.get().profile.nickname
  function renderAvatar() {
    const p = Store.get().profile
    $('#avatarBox').innerHTML = p.avatar ? `<img src="${p.avatar}"/>` : '🧒'
  }
  $('#saveProfileBtn').onclick = () => {
    Store.update(st => { st.profile.nickname = $('#nicknameInput').value.trim() || '小恐龙训练师' })
    toast('资料已保存')
  }
  $('#uploadAvatarBtn').onclick = () => $('#avatarFile').click()
  $('#avatarFile').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return
    const url = await fileToDataURL(f)
    Store.update(st => { st.profile.avatar = url })
    renderAvatar(); toast('头像已更新')
  }
  $('#removeAvatarBtn').onclick = () => { Store.update(st => st.profile.avatar = null); renderAvatar() }

  $$('[data-bg]').forEach(b => {
    b.onclick = () => {
      const type = b.dataset.bg
      Store.update(st => {
        st.theme.bgType = type
        if (type !== 'image') st.theme.bgImage = null
      })
      applyTheme()
    }
  })
  $('#bgColorInput').oninput = (e) => {
    Store.update(st => { st.theme.bgColor = e.target.value; if (st.theme.bgType !== 'solid') st.theme.bgType = 'solid' })
    applyTheme()
  }
  $('#uploadBgBtn').onclick = () => $('#bgFile').click()
  $('#bgFile').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return
    const url = await fileToDataURL(f)
    Store.update(st => { st.theme.bgType = 'image'; st.theme.bgImage = url })
    applyTheme(); toast('背景图已设置')
  }

  $('#resetBtn').onclick = () => {
    if (confirm('确定重置全部数据？将清空恐龙、星星、打卡等所有进度。')) {
      Store.reset(); location.reload()
    }
  }

  /* ============================================================
   * 英语阅读
   * ============================================================ */
  let BOOKS = []
  let currentLevel = 1
  let readerState = { book: null, page: 0 }

  async function loadBooks() {
    // 优先使用内联数据（兼容 Electron file:// 协议，无需服务器）
    if (window.BOOKS_DATA && window.BOOKS_DATA.length) {
      BOOKS = window.BOOKS_DATA
    } else {
      try {
        const res = await fetch('assets/books/books.json')
        BOOKS = await res.json()
      } catch (e) {
        console.warn('load books failed', e)
      }
    }
    renderShelf(1)
  }

  let shelfFilter = 'all' // all | unread | read
  function renderShelf(level) {
    currentLevel = level
    const list = BOOKS.filter(b => b.level === level)
    const readIds = new Set((Store.get().readLog || []).map(r => r.id))
    const readCount = list.filter(b => readIds.has(b.id)).length
    $('#shelfStat').textContent = `已读 ${readCount} / ${list.length}（每本 +1⭐）`
    const kw = ($('#bookSearch').value || '').toLowerCase()
    let filtered = list.filter(b => b.title.toLowerCase().includes(kw))
    if (shelfFilter === 'read') filtered = filtered.filter(b => readIds.has(b.id))
    if (shelfFilter === 'unread') filtered = filtered.filter(b => !readIds.has(b.id))
    const wrap = $('#bookShelf')
    wrap.innerHTML = ''
    if (!filtered.length) { wrap.innerHTML = '<p class="muted">没有匹配的绘本。</p>'; return }
    filtered.slice(0, 120).forEach(b => {
      const read = readIds.has(b.id)
      const el = document.createElement('div')
      el.className = 'book' + (read ? ' read' : '')
      el.innerHTML = `
        <div class="cover">${read ? '✅' : '📖'}</div>
        <div class="bt">${b.title}</div>
        <div class="lv">${level === 1 ? 'Grade 1' : 'Grade 2'} · ${b.words}词</div>
        ${read ? '<div class="lv" style="color:#2e7d32;font-weight:700">已读完 ✓</div>' : ''}`
      el.onclick = () => openReader(b)
      wrap.appendChild(el)
    })
  }

  function openReader(book) {
    readerState = { book, page: 0 }
    $('#readerTitle').textContent = book.title
    $('#readerMask').style.display = 'flex'
    renderReaderPage()
  }
  function renderReaderPage() {
    const { book, page } = readerState
    $('#readerPage').textContent = book.pages[page]
    $('#readerCount').textContent = `${page + 1} / ${book.pages.length}`
    $('#readerPrev').disabled = page === 0
    const isLast = page === book.pages.length - 1
    $('#readerNext').disabled = isLast
    // 最后一页显示“完成阅读”按钮
    const done = $('#readerDone')
    if (isLast) { done.style.display = 'inline-block' } else { done.style.display = 'none' }
  }
  function markRead() {
    const { book } = readerState
    const readIds = new Set((Store.get().readLog || []).map(r => r.id))
    if (readIds.has(book.id)) { toast('这本已经读过啦'); return }
    Store.update(st => {
      st.readLog = st.readLog || []
      st.readLog.push({ id: book.id, title: book.title, level: book.level, date: Store.todayKey() })
      // 读完一本奖励 1 颗星星
      st.stars += 1
      st.starLog.push({ date: Store.todayKey(), amount: 1, reason: '读完绘本：' + book.title })
    })
    refreshStars()
    toast('📚 读完《' + book.title + '》+1 ⭐')
    $('#readerMask').style.display = 'none'
    renderShelf(currentLevel)
  }
  $('#readerPrev').onclick = () => { if (readerState.page > 0) { readerState.page--; renderReaderPage() } }
  $('#readerNext').onclick = () => { if (readerState.page < readerState.book.pages.length - 1) { readerState.page++; renderReaderPage() } }
  $('#readerClose').onclick = () => { $('#readerMask').style.display = 'none' }
  $('#readerDone').onclick = () => markRead()
  $('#bookSearch').oninput = () => renderShelf(currentLevel)
  $$('#view-read [data-level]').forEach(b => b.onclick = () => renderShelf(parseInt(b.dataset.level)))
  $$('#shelfFilter button').forEach(b => b.onclick = () => {
    shelfFilter = b.dataset.f
    $$('#shelfFilter button').forEach(x => x.classList.remove('active'))
    b.classList.add('active')
    renderShelf(currentLevel)
  })

  /* ============================================================
   * 奖励
   * ============================================================ */
  function renderRewards() {
    const st = Store.get()
    const grid = $('#rewardGrid')
    grid.innerHTML = ''
    st.rewards.forEach(r => {
      const afford = st.stars >= r.cost
      const el = document.createElement('div')
      el.className = 'reward'
      el.innerHTML = `
        <div class="ric">${r.image ? `<img src="${r.image}" style="width:40px;height:40px;border-radius:8px"/>` : (r.icon || '🎁')}</div>
        <div class="rname">${r.name}</div>
        <div class="rcost">${r.cost} ⭐</div>
        <div class="row" style="justify-content:center;margin-top:8px">
          <button class="btn ${afford ? '' : ''}" ${afford ? '' : 'disabled'} data-id="${r.id}">兑换</button>
          <button class="btn ghost" data-edit="${r.id}">编辑</button>
        </div>`
      el.querySelector('button[data-id]').onclick = () => redeem(r.id)
      el.querySelector('button[data-edit]').onclick = () => editReward(r.id)
      grid.appendChild(el)
    })
    const log = st.redeemLog
    $('#redeemLog').innerHTML = log.length
      ? log.slice().reverse().map(l => `<div class="row between" style="padding:6px 0;border-bottom:1px solid #eee"><span>${l.date} · ${l.name}</span><b style="color:#8a6d00">-${l.cost}⭐</b></div>`).join('')
      : '<span class="muted">暂无兑换</span>'
  }

  function redeem(id) {
    const st = Store.get()
    const r = st.rewards.find(x => x.id === id)
    if (!r) return
    if (st.stars < r.cost) { toast('星星不足'); return }
    Store.update(s => {
      s.stars -= r.cost
      s.redeemLog.push({ date: today(), rewardId: id, name: r.name, cost: r.cost })
    })
    refreshStars(); renderRewards(); toast(`🎉 兑换了 ${r.name}`)
  }

  function editReward(id) {
    const st = Store.get()
    const r = st.rewards.find(x => x.id === id)
    const name = prompt('奖励名称', r.name)
    if (name === null) return
    const cost = parseInt(prompt('所需星星', r.cost))
    if (isNaN(cost)) return
    const icon = prompt('图标 emoji（可留空）', r.icon || '')
    Store.update(s => {
      const x = s.rewards.find(y => y.id === id)
      x.name = name.trim() || x.name; x.cost = cost; x.icon = icon || x.icon
    })
    renderRewards()
  }

  $('#addRewardBtn').onclick = () => {
    const name = prompt('新奖励名称', '新奖励')
    if (!name) return
    const cost = parseInt(prompt('所需星星', '15'))
    if (isNaN(cost)) return
    const icon = prompt('图标 emoji', '🌟') || '🌟'
    Store.update(s => s.rewards.push({ id: 'r' + Date.now(), name: name.trim(), cost, icon, image: null }))
    renderRewards(); toast('已添加奖励')
  }

  /* ============================================================
   * 导航
   * ============================================================ */
  $$('#nav .nav-item').forEach(btn => {
    btn.onclick = () => {
      $$('#nav .nav-item').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      const v = btn.dataset.view
      $$('.view').forEach(s => s.classList.remove('active'))
      $('#view-' + v).classList.add('active')
      if (v === 'battle') { renderBattle(); renderSpiritControls() }
      if (v === 'tools') { renderThemeControls(); renderAvatar() }
      if (v === 'read') renderShelf(currentLevel)
      if (v === 'reward') renderRewards()
      if (v === 'checkin') renderCalendar()
      if (v === 'timer') renderTimers()
      if (v === 'home') { refreshLevelByDays(); renderHome() }
    }
  })

  /* ============================================================
   * 初始化
   * ============================================================ */
  function fullRefresh() {
    applyTheme()
    refreshStars()
    refreshLevelByDays()
    renderHome()
    renderCalendar()
    renderTimers()
    renderBattle()
    renderSpiritControls()
    renderThemeControls()
    renderAvatar()
    renderRewards()
  }

  function init() {
    applyTheme()
    refreshStars()
    // 任何数据写入后自动刷新顶部星星数
    Store.subscribe(() => refreshStars())
    showAdoptIfNeeded()
    checkFeeding()
    refreshLevelByDays()
    renderHome()
    renderCalendar()
    renderTimers()
    renderBattle()
    renderSpiritControls()
    renderThemeControls()
    renderAvatar()
    renderRewards()
    loadBooks()
  }

  // 每天首次打开检查喂养
  init()
})()
