/* ============================================================
 * store.js — 本地数据层（localStorage 持久化）
 * 所有模块通过 Store 读写状态，统一封装，避免散落各处。
 * ============================================================ */
(function (global) {
  'use strict'

  const KEY = 'evans_app_state_v1'

  // 恐龙最高等级（达到后去世，需重新领养）
  const MAX_LEVEL = 50

  // 默认状态
  function defaultState() {
    return {
      version: 1,
      // 用户信息
      profile: {
        nickname: '小恐龙训练师',
        avatar: null, // dataURL
      },
      // 主题
      theme: {
        primary: '#7ec8e3',      // 浅蓝
        secondary: '#fff3b0',    // 浅黄
        bgType: 'nature',        // nature | solid | image
        bgColor: '#eaf6ff',
        bgImage: null,           // dataURL
      },
      // 恐龙状态
      dino: {
        adopted: false,
        species: null,           // 霸王龙 / 棘龙 ...
        speciesId: null,
        name: null,
        level: 1,
        spirit: 100,             // 精神百分比
        adoptedAt: null,         // 领养时间戳
        lastFedAt: null,         // 上次喂养时间戳
        image: null,             // 兼容字段（已废弃，改用 images）
        images: {},              // 按等级存图：{ 1: dataURL, 2: dataURL, ... }
        battlesWon: 0,
        battlesLost: 0,
        reborn: false,
        deceased: false,         // 是否已去世（达 Lv.50）
      },
      // 今日任务选项（可增删）
      taskOptions: [
        { id: 'hanzi', label: '学新字', icon: '📝' },
        { id: 'english', label: '阅读英语', icon: '🔤' },
        { id: 'writing', label: '写字', icon: '✍️' },
        { id: 'math', label: '数学', icon: '🔢' },
        { id: 'piano', label: '练钢琴', icon: '🎹' },
      ],
      // 每日任务完成记录：{ 'YYYY-MM-DD': [optionId, ...] }
      taskLog: {},
      // 打卡记录：{ 'YYYY-MM-DD': true }
      checkin: {},
      // 星星
      stars: 0,
      starLog: [], // {date, amount, reason}
      // 计时任务
      timers: [], // {id, label, duration(秒), remaining, running, startedAt, done}
      // 对战记录
      battles: [], // {date, opponent, result}
      // 已读绘本记录
      readLog: [], // {id, title, level, date}
      // 奖励列表
      rewards: [
        { id: 'r1', name: '冰淇淋', cost: 10, icon: '🍦', image: null },
        { id: 'r2', name: '30分钟游戏时间', cost: 20, icon: '🎮', image: null },
        { id: 'r3', name: '周末郊游', cost: 50, icon: '🏞️', image: null },
      ],
      redeemLog: [], // {date, rewardId, name, cost}
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return defaultState()
      const parsed = JSON.parse(raw)
      // 合并默认值，防止字段缺失
      return Object.assign(defaultState(), parsed)
    } catch (e) {
      console.warn('读取存档失败，使用默认状态', e)
      return defaultState()
    }
  }

  let state = load()

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch (e) {
      console.error('保存失败', e)
    }
  }

  const Store = {
    get() { return state },

    // 通用更新：传入一个 mutate 函数（直接改 state）或对象
    update(mutator) {
      if (typeof mutator === 'function') mutator(state)
      else Object.assign(state, mutator)
      save()
      return state
    },

  // 订阅变化（简单事件总线）
  listeners: [],
  subscribe(fn) { this.listeners.push(fn) },
  emit() { this.listeners.forEach(fn => fn(state)) },

  // 任意通过 update() 的写操作都会触发 emit，方便统一刷新 UI
  _origUpdate: null,

    // 重置全部（谨慎使用）
    reset() {
      state = defaultState()
      save()
      this.emit()
    },

    save,
  }

  // 工具函数
  Store.todayKey = function (d = new Date()) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  Store.dayDiff = function (ts1, ts2) {
    const a = new Date(ts1); a.setHours(0, 0, 0, 0)
    const b = new Date(ts2); b.setHours(0, 0, 0, 0)
    return Math.round((b - a) / 86400000)
  }

  // 根据领养天数计算等级：第1天Lv1，第7天Lv2，之后每7天+1（不超过 MAX_LEVEL）
  Store.levelForDays = function (daysSinceAdopt) {
    if (daysSinceAdopt < 0) daysSinceAdopt = 0
    return Math.min(MAX_LEVEL, Math.floor(daysSinceAdopt / 7) + 1)
  }
  Store.MAX_LEVEL = MAX_LEVEL

  global.Store = Store
})(window)
