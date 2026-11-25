(function (root) {
  'use strict';
  const SIZE = 10, LIMIT = 12, COST = { gun: 2, amp: 1 }, depots = [3, 8];
  const cards = {
    dynamo: ['折返发电机', '电弧', '与上一回合走向不同时，出发前获得电荷。'],
    socket: ['导电货架', '混合', '每次获得零件，同时获得电荷。'],
    fork: ['分流线圈', '电弧', '带电弩炮命中后，向目标周围 3 格内另外最多两只敌人各放电 3 点。'],
    relay: ['跳弧继电器', '电弧', '每次击杀向尸体周围 2 格内最近的活敌放电 2 点。可接续击杀。'],
    leak: ['感应触片', '电弧', '每次获得电荷，对自身周围 2 格内最近敌人放电 2 点。'],
    nails: ['钉雨喷口', '回收', '每次获得零件，向自身周围 3 格内最近的两只敌人各发射 2 点钉雨。'],
    claw: ['拆解磁爪', '回收', '每次击杀回收 1 零件，可触发其他获得零件的协议。'],
    shunt: ['废料弹匣', '回收', '弩炮开火时若有零件，自动消耗 1 个，对主目标追加 2 伤害。'],
    cache: ['夹层货箱', '回收', '经过已经搬空的补给格也能回收 1 零件。'],
    patch: ['医疗铆钉', '回收', '每回合第一次获得零件时恢复 1 生命，上限 7。']
  };
  const wrap = value => (value + SIZE) % SIZE;
  const tile = value => String(value + 1).padStart(2, '0');
  const copy = value => JSON.parse(JSON.stringify(value));
  function random(state, key) {
    state[key] = (Math.imul(state[key], 1664525) + 1013904223) >>> 0;
    return state[key] / 4294967296;
  }
  function draw(state, excluded = []) {
    const pool = Object.keys(cards).filter(card => !state.deck.includes(card) && !excluded.includes(card));
    for (let index = pool.length - 1; index > 0; index--) {
      const swap = Math.floor(random(state, 'draftRng') * (index + 1));
      [pool[swap], pool[index]] = [pool[index], pool[swap]];
    }
    state.offer = pool.slice(0, 3);
  }
  function start(seed = 17, mode = 'classic') {
    const state = { seed, rng: seed >>> 0, draftRng: (seed ^ 0xa24baed5) >>> 0, round: 1, phase: 'draft', pos: 0, hp: 7, scrap: 2,
      devices: { 2: 'gun' }, enemies: [{ pos: 4, hp: 2, dir: 1 }, { pos: 7, hp: 2, dir: -1 }],
      stocked: depots.slice(), charged: false, built: false, healed: false, die: 0, lastDir: 0, kills: 0, peak: 0, peakRound: 0,
      deck: [], offer: [], redrawn: false };
    if (mode === 'bag') {
      state.bag = [1,2,3,4]; state.lockedDir = 0; state.rng = (seed ^ 0x9e3779b9) >>> 0;
    }
    draw(state); return state;
  }
  function pick(state, card) {
    if (state.phase !== 'draft' || !state.offer.includes(card)) throw Error('协议不在当前选项内');
    state.deck.push(card); state.offer = []; state.phase = 'plan';
  }
  function reroll(state) {
    if (state.phase !== 'draft' || state.redrawn || state.scrap < 2) throw Error('无法刷新');
    state.redrawn = true; state.scrap -= 2;
    const reserve = Object.keys(cards).length - state.deck.length - state.offer.length;
    draw(state, reserve >= 3 ? state.offer : state.offer.slice(0, Math.min(2, Object.keys(cards).length - state.deck.length - 3)));
  }
  function canBuild(state, kind, pos) {
    return state.phase === 'plan' && !state.built && Object.hasOwn(COST, kind) && state.scrap >= COST[kind] &&
      Number.isInteger(pos) && pos >= 0 && pos < SIZE && !state.devices[pos] && !depots.includes(pos);
  }
  function build(state, kind, pos) {
    if (!canBuild(state, kind, pos)) throw Error('不能在这里部署');
    state.devices[pos] = kind; state.scrap -= COST[kind]; state.built = true;
  }
  function roll(state, lock = 0) {
    if (state.phase !== 'plan') throw Error('现在不能掷骰');
    if (![0,1,-1].includes(lock) || (lock && !state.bag)) throw Error('现在不能押线');
    if (state.bag) {
      state.lockedDir = lock;
      const index = Math.floor(random(state, 'rng') * state.bag.length);
      state.die = state.bag.splice(index, 1)[0];
    } else state.die = 1 + Math.floor(random(state, 'rng') * 4);
    state.phase = 'move'; return state.die;
  }
  function route(state, dir) {
    return Array.from({ length: state.die }, (_, index) => wrap(state.pos + dir * (index + 1)));
  }
  const dist = (left, right) => Math.min(wrap(left - right), wrap(right - left));
  function move(state, dir) {
    if (state.phase !== 'move' || ![1,-1].includes(dir)) throw Error('现在不能移动');
    if (state.lockedDir && dir !== state.lockedDir) throw Error('已经押线，不能改变走向');
    const frames = [], has = card => state.deck.includes(card);
    let notes = [], damage = 0, strikes = [];
    const nearby = (origin, range, skip) => state.enemies.filter(enemy => enemy !== skip && dist(enemy.pos, origin) <= range)
      .sort((left, right) => dist(left.pos, origin) - dist(right.pos, origin));
    function hit(enemy, amount, source) {
      if (!enemy || !state.enemies.includes(enemy)) return;
      damage += Math.min(enemy.hp, amount); enemy.hp -= amount;
      notes.push(source + ' → ' + tile(enemy.pos) + ' · ' + amount + '伤');
      const dead = enemy.hp <= 0;
      if (dead) {
        state.enemies.splice(state.enemies.indexOf(enemy), 1); state.kills++;
        notes.push(tile(enemy.pos) + ' 击杀');
      }
      strikes.push({ state: copy(state), pos: enemy.pos, damage, source, dead });
      if (!dead) return;
      if (has('claw')) salvage(1, '拆解磁爪');
      if (has('relay')) hit(nearby(enemy.pos, 2)[0], 2, '跳弧继电器');
    }
    function charge(source) {
      state.charged = true; notes.push(source + ' → 获得电荷');
      if (has('leak')) hit(nearby(state.pos, 2)[0], 2, '感应触片');
    }
    function salvage(amount, source) {
      state.scrap += amount; notes.push(source + ' → 零件 +' + amount);
      if (has('patch') && !state.healed) {
        state.healed = true; if (state.hp < 7) { state.hp++; notes.push('医疗铆钉 → 生命 +1'); }
      }
      if (has('socket')) charge('导电货架');
      if (has('nails')) nearby(state.pos, 3).slice(0, 2).forEach(enemy => hit(enemy, 2, '钉雨喷口'));
    }
    function record() {
      if (damage > state.peak) { state.peak = damage; state.peakRound = state.round; }
      frames.push({ state: copy(state), pos: state.pos, notes, damage, strikes }); notes = []; damage = 0; strikes = [];
    }
    function fire(pos, bonus) {
      const enemy = [0,1,2].map(distance => state.enemies.find(unit => unit.pos === wrap(pos + distance * dir))).find(Boolean);
      if (!enemy) { notes.push(bonus ? '押线补射：射界内无目标' : '弩炮射界内无目标'); return; }
      const powered = state.charged;
      const extra = has('shunt') && state.scrap > 0;
      if (extra) { state.scrap--; notes.push('废料弹匣 → 零件 −1'); }
      state.charged = false;
      hit(enemy, (powered ? 3 : 1) + (extra ? 2 : 0), (bonus ? '押线补射·' : '') + (powered ? '带电弩炮' : '弩炮'));
      if (powered && has('fork')) nearby(enemy.pos, 3, enemy).slice(0, 2).forEach(unit => hit(unit, 3, '分流线圈'));
    }
    const path = route(state, dir);
    let bonusReady = Boolean(state.lockedDir);
    if (has('dynamo') && state.lastDir && state.lastDir !== dir) { charge('折返发电机'); record(); }
    state.lastDir = dir;
    for (const pos of path) {
      state.pos = pos;
      if (state.devices[pos] === 'amp') charge('电容');
      if (state.devices[pos] === 'gun') {
        fire(pos, false);
        if (bonusReady) { fire(pos, true); bonusReady = false; }
      }
      if (state.stocked.includes(pos)) {
        state.stocked = state.stocked.filter(cell => cell !== pos); salvage(2, '补给箱');
      } else if (depots.includes(pos) && has('cache')) salvage(1, '夹层货箱');
      const hits = state.enemies.filter(unit => unit.pos === pos).length;
      if (hits) { state.hp = Math.max(0, state.hp - hits); notes.push('接触损伤 −' + hits); }
      record(); if (!state.hp) break;
    }
    if (bonusReady) notes.push('押线未经过弩炮，补射落空');
    if (state.hp && state.round % 3 === 0) {
      const hits = Math.ceil(state.enemies.length / 2); state.hp = Math.max(0, state.hp - hits);
      notes.push(hits ? '尸潮冲击：残敌 ' + state.enemies.length + '，生命 −' + hits : '区域清空，无尸潮损伤');
      if (state.hp && state.round < LIMIT) {
        state.enemies.forEach(unit => { unit.pos = wrap(unit.pos + unit.dir); });
        const count = {3: 3, 6: 5, 9: 8}[state.round];
        for (const pos of [4,7,1,6,9,5,3,0,8,2]) {
          if (state.enemies.length >= count) break;
          if (!state.enemies.some(unit => unit.pos === pos))
            state.enemies.push({ pos, hp: state.round === 9 ? 4 : state.round === 6 ? 3 : 2, dir: pos % 2 ? -1 : 1 });
        }
        state.stocked = depots.slice(); notes.push('感染体补至 ' + count + ' 只；补给刷新');
      }
    }
    if (!state.hp) state.phase = 'lost';
    else if (state.round === LIMIT) state.phase = 'won';
    else {
      state.round++; state.built = false; state.healed = false; state.die = 0;
      if (state.bag) {
        state.lockedDir = 0;
        if (!state.bag.length) state.bag = [1,2,3,4];
      }
      state.phase = state.round % 2 ? 'draft' : 'plan';
      if (state.phase === 'draft') { draw(state); state.redrawn = false; }
    }
    return { frames, notes };
  }
  const api = { start, build, canBuild, roll, move, pick, reroll, cards, route, tile, wrap, depots, COST, LIMIT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Circuit = api;
})(globalThis);
