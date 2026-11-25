(() => {
  'use strict';
  const game = window.Circuit;
  const get = id => document.getElementById(id);
  const art = window.PaperScene;
  art.installDefs(get('symbols'));
  const sprite = kind => '<svg aria-hidden="true" class="sprite" viewBox="-29 -55 60 66"><use href="#' + (kind === 'amp' ? 'coil' : 'bow') + '"/></svg>';
  const tint = card => ({ 电弧: 'var(--violet)', 混合: 'var(--aqua)', 回收: 'var(--gold)' })[game.cards[card][1]];
  const positions = [[1,1],[1,2],[1,3],[1,4],[2,4],[3,4],[3,3],[3,2],[3,1],[2,1]];
  const args = new URLSearchParams(location.search);
  const bagMode = args.get('mode') === 'bag';
  let state, logs, kit, busy, inspect, peek, effect;
  function start(seed) {
    state = game.start(seed, bagMode ? 'bag' : 'classic'); logs = []; kit = ''; busy = false; inspect = ''; peek = []; effect = null;
    get('edition-title').textContent = bagMode ? 'B · 明袋暗抽 + 押线' : 'A · 原版独立骰';
    get('compare').href = '?seed=' + state.seed + '&mode=' + (bagMode ? 'classic' : 'bag');
    get('compare').textContent = '同种子打开' + (bagMode ? ' A 原版' : ' B 押线版') + ' ↗';
    if (bagMode) get('movement-rule').textContent = '每袋 1、2、3、4 各一张，剩余公开，随机抽取不放回，空袋下轮补满。先看点数再选路没有加成；抽前押定方向则不能改向，途中经过的第一座弩炮在正常攻击和连锁结算完后重新索敌、再开一枪（照常消耗电荷或弹药）。没经过炮或没有目标，奖励作废。';
    log(1, bagMode ? '实验 B 接通。每四抽换袋，剩余步数公开。押线必须先定方向。' : '环线接通。先从三个随机协议里保留一个，再部署、掷骰、选路。');
    render();
  }
  function log(round, message) { logs.unshift({ round, message }); }
  function loadFieldReport() {
    start(23);
    const turns = [
      ['shunt',null,-1], [null,null,-1], ['dynamo',6,-1], [null,null,-1],
      ['nails',null,-1], [null,null,-1], ['claw',5,-1], [null,null,1], ['relay',null,1]
    ];
    for (const [card, gun, dir] of turns) {
      const round = state.round;
      if (card) { game.pick(state,card); log(round,'Sol 接入：' + game.cards[card][0]); }
      if (gun !== null) { game.build(state,'gun',gun); log(round,'部署弩炮：' + game.tile(gun) + ' 号'); }
      game.roll(state); game.move(state,dir);
    }
    log(10,'Sol 试玩断点：上一轮顺行，06 号有炮。'); render();
  }
  function loadBagDecision() {
    start(23);
    const turns = [['shunt',1,true],[null,1,true],['dynamo',1,true],[null,-1,true],['nails',-1,false]];
    for (const [card, dir, locked] of turns) {
      if (card) game.pick(state,card);
      if (state.round === 1) game.build(state,'gun',6);
      const round = state.round, faces = state.bag.join('/');
      const die = game.roll(state,locked ? dir : 0);
      game.move(state,dir);
      log(round,'Sol · 袋 [' + faces + '] · ' + (locked ? '押线' : '先看') + ' · ' + die + ' 步' + (dir === 1 ? '顺行' : '逆行'));
    }
    log(6,'轮到你了。当前尚未揭点，轮末结算尸潮。'); render();
  }
  function board(view) {
    const svg = get('board');
    const focusedPos = svg.contains(document.activeElement) ? document.activeElement.dataset.pos : null;
    const cells = positions.map(([row, col], pos) => {
      const present = view.pos === pos, device = view.devices[pos], depot = game.depots.includes(pos);
      const enemies = view.enemies.filter(enemy => enemy.pos === pos);
      const label = device === 'amp' ? '电容' : device === 'gun' ? '弩炮' : depot ? (view.stocked.includes(pos) ? '补给 +2' : '空货箱') : '路面';
      const intel = enemies.map(enemy => '感染体 ' + enemy.hp + ' 血，下波移至 ' + game.tile(game.wrap(pos + enemy.dir))).join('；');
      const caption = [game.tile(pos) + ' 号', label, present ? (view.charged ? '你，已充能' : '你') : '', intel].filter(Boolean).join('，');
      const { mid: [left, top], structure } = art.tile(col - 1, row - 1, present);
      const classes = ['cell', present && 'occupied', kit && game.canBuild(state,kit,pos) && 'eligible', peek.includes(pos) && 'preview', effect?.targets.includes(pos) && 'strike'].filter(Boolean).join(' ');
      const items = [device === 'amp' ? 'coil' : device === 'gun' ? 'bow' : depot ? 'crate' : null, enemies.length ? 'bramble' : null, present ? 'courier' : null].filter(Boolean);
      const figures = items.map((id, index) => {
        const offset = (index - (items.length - 1) / 2) * 45;
        const faded = id === 'crate' && !view.stocked.includes(pos);
        return '<g opacity="' + (faded ? '.43' : '1') + '">' + art.use(id, left + offset, top + 4, items.length > 1 ? .82 : 1.05) + '</g>';
      }).join('');
      const badge = enemies.length ? '<text class="enemy-tag" text-anchor="middle" x="' + (left + 12) + '" y="' + (top + 24) + '">' + (enemies.length > 1 ? '×' + enemies.length + ' ' : '') + enemies[0].hp + '♥' + (enemies[0].dir === 1 ? '↻' : '↺') + '</text>' : '';
      const number = '<text class="tile-id" x="' + (left - 57) + '" y="' + (top + 13) + '">' + game.tile(pos) + '</text>';
      const charge = present && view.charged ? '<text class="charge" x="' + (left + 18) + '" y="' + (top - 31) + '">ϟ</text>' : '';
      return { depth:top, html:'<g role="button" tabindex="0" class="' + classes + '" data-pos="' + pos + '" aria-label="' + caption + '"><title>' + caption + '</title>' + structure + figures + '</g>', labels:number + badge + charge };
    });
    cells.push(art.mast());
    svg.innerHTML = art.landscape() + art.polygon([[438,130],[936,262],[687,425],[193,287]], art.mix('field','ink',71)) + cells.sort((first,second) => first.depth - second.depth).map(cell => cell.html).join('') + '<g aria-hidden="true" pointer-events="none">' + art.foreground() + cells.map(cell => cell.labels || '').join('') + '</g>';
    if (focusedPos != null) svg.querySelector('[data-pos="' + focusedPos + '"]')?.focus({preventScroll:true});
    const end = ['won','lost'].includes(view.phase), turns = 3 - ((view.round - 1) % 3);
    get('wave').innerHTML = effect ? '<b>' + effect.damage + ' 伤害</b> · ' + effect.label :
      '<b>' + (end ? (view.phase === 'won' ? '天亮了' : '环线失守') : turns === 1 ? '本轮尸潮' : turns + ' 轮后尸潮') + '</b>' +
      (end ? '' : '　残敌 ' + view.enemies.length + ' · 冲击 ' + Math.ceil(view.enemies.length / 2));
  }
  function render(view = state) {
    const end = ['won','lost'].includes(view.phase), drafting = !busy && view.phase === 'draft';
    board(view);
    get('round').textContent = '回合 ' + view.round + ' / 12';
    get('hp').textContent = view.hp + '/7'; get('scrap').textContent = view.scrap;
    get('hp').classList.toggle('critical', view.hp <= 2);
    get('slots').textContent = view.deck.length; get('metrics').textContent = '击杀 ' + view.kills + ' · 单格最高 ' + view.peak + ' 伤害';
    get('seed').textContent = '种子 ' + view.seed;
    get('bag-tray').hidden = !bagMode || view.phase !== 'plan' || busy;
    if (!get('bag-tray').hidden) {
      get('bag-faces').innerHTML = [1,2,3,4].map(face => '<span class="' + (view.bag.includes(face) ? 'available' : 'spent') + '" aria-label="' + face + ' 点' + (view.bag.includes(face) ? '剩余' : '已出') + '">' + face + '</span>').join('');
      get('bag-status').textContent = view.lastDir && view.deck.includes('dynamo') ? '上轮' + (view.lastDir === 1 ? '顺行 ↻' : '逆行 ↺') : '';
    }
    get('rig').hidden = !view.deck.length;
    get('deck').innerHTML = view.deck.map(card => '<div style="--tint:' + tint(card) + '"><strong>' + game.cards[card][0] + '</strong><p>' + game.cards[card][2] + '</p></div>').join('');
    get('draft').hidden = !drafting;
    if (drafting) get('draft').innerHTML = '<div class="draft-heading"><h2>选择协议</h2><button class="redraw" id="redraw" ' + (view.redrawn || view.scrap < 2 ? 'disabled' : '') + '>' + (view.redrawn ? '已刷新' : '刷新 · 2 零件') + '</button></div>' +
      view.offer.map(card => '<button class="offer" data-pick="' + card + '" style="--tint:' + tint(card) + '"><strong>' + game.cards[card][0] + '</strong><span>' + game.cards[card][2] + '</span></button>').join('');
    document.querySelector('.kits').hidden = busy || view.phase !== 'plan' || view.built;
    document.querySelectorAll('[data-kit]').forEach(button => {
      const kind = button.dataset.kit;
      button.disabled = busy || view.phase !== 'plan' || !positions.some((_,pos) => game.canBuild(view,kind,pos));
      button.classList.toggle('active',kind === kit);
      button.setAttribute('aria-pressed', String(kit === kind));
      button.title = kind === 'amp' ? '电容 · 1 零件 · 经过时充电' : '弩炮 · 2 零件 · 沿走向射击本格及前方两格';
      button.innerHTML = sprite(kind) + (kind === 'amp' ? '电容' : '弩炮') + '<span class="cost">· ' + game.COST[kind] + '</span>';
    });
    get('hint').textContent = inspect || (kit ? '选一个空格建造' + (kit === 'amp' ? '电容' : '弩炮') : '');
    get('hint').hidden = !get('hint').textContent;
    const actions = get('actions');
    actions.hidden = drafting;
    if (busy) actions.innerHTML = '<div class="moving">' + (view.lockedDir ? (view.lockedDir === 1 ? '押顺' : '押逆') : '巡行') + ' · ' + view.die + ' 步</div>';
    else if (end) actions.innerHTML = '<h2>' + (view.phase === 'won' ? '巡夜成功' : '巡夜结束') + '</h2><p>' + get('metrics').textContent + '</p><button id="again" class="primary">再来一局</button>';
    else if (view.phase === 'move') actions.innerHTML = '<h2>走 ' + view.die + ' 步</h2><div class="directions">' +
      [1,-1].map(dir => '<button class="dir" data-dir="' + dir + '">' + (dir === 1 ? '↻ 顺行至 ' : '↺ 逆行至 ') + game.tile(game.wrap(view.pos + dir * view.die)) + '</button>').join('') + '</div>';
    else if (bagMode) actions.innerHTML = '<button id="roll" class="primary">先看点数</button><fieldset><legend>押线 · 首炮连射</legend><div class="directions">' +
      [1,-1].map(dir => {
        const distance = Array.from({ length:4 },(_,index) => index + 1).find(steps => view.devices[game.wrap(view.pos + dir * steps)] === 'gun');
        return '<button class="bet" data-bet="' + dir + '" title="' + (distance ? '距首炮 ' + distance + ' 步' : '四步内无炮') + '">' + (dir === 1 ? '↻ 押顺' : '↺ 押逆') + '</button>';
      }).join('') + '</div></fieldset>';
    else actions.innerHTML = '<button id="roll" class="primary">掷骰</button>';
    get('events').innerHTML = logs.map(entry => '<div class="logrow"><time>R' + String(entry.round).padStart(2,'0') + '</time><span>' + entry.message + '</span></div>').join('');
    get('restart').disabled = busy;
  }
  const wait = ms => new Promise(done => setTimeout(done, matchMedia('(prefers-reduced-motion: reduce)').matches ? 30 : ms));
  function reveal(lock) {
    const faces = state.bag.join(' / ');
    const die = game.roll(state,lock);
    log(state.round, '袋 [' + faces + '] · ' + (lock ? (lock === 1 ? '押顺' : '押逆') : '先看') + ' → 揭开 ' + die + ' 步');
  }
  async function wager(dir) {
    kit = ''; inspect = ''; peek = []; busy = true;
    reveal(dir); render(); await wait(500); await travel(dir);
  }
  async function travel(dir) {
    const round = state.round;
    busy = true; inspect = ''; peek = [];
    const result = game.move(state,dir);
    for (const frame of result.frames) {
      const strikes = frame.notes.filter(note => note.endsWith('伤'));
      if (frame.notes.length) log(round, game.tile(frame.pos) + ' 号｜' + frame.notes.join('　›　') + (strikes.length > 1 ? '　合计 ' + frame.damage + ' 实伤' : ''));
      if (frame.strikes.length > 1) {
        for (const [index, strike] of frame.strikes.entries()) {
          effect = { damage:strike.damage, label:(index + 1) + ' 连击 · ' + strike.source, targets:[strike.pos] };
          render(strike.state); await wait(Math.max(125,330 - index * 20));
        }
      }
      effect = frame.damage ? { damage:frame.damage, label:strikes.length + ' 次命中 · 单格实伤', targets:frame.strikes.map(strike => strike.pos) } : null;
      render(frame.state); await wait(strikes.length > 1 ? 800 : 380);
    }
    if (!result.frames.some(frame => frame.notes.length)) log(round,'巡行至 ' + game.tile(state.pos) + ' 号，沿途无事。');
    for (const note of result.notes) log(round,note);
    effect = null; busy = false; render();
  }
  get('board').addEventListener('keydown', event => {
    if (event.target.matches('[data-pos]') && ['Enter',' '].includes(event.key)) {
      event.preventDefault();
      event.target.dispatchEvent(new MouseEvent('click', { bubbles:true }));
    }
  });
  document.body.addEventListener('click', event => {
    const button = event.target.closest('button, [data-pos]'); if (!button) return;
    if (button.id === 'help') { get('manual').showModal(); return; }
    if (button.classList.contains('close')) { button.closest('dialog').close(); return; }
    if (busy) return;
    if (button.id === 'restart' || button.id === 'again') { get('reset').showModal(); return; }
    if (button.id === 'same' || button.id === 'fresh') {
      get('reset').close(); start(button.id === 'same' ? state.seed : crypto.getRandomValues(new Uint32Array(1))[0]); return;
    }
    if (button.dataset.pick) {
      game.pick(state,button.dataset.pick); log(state.round,'接入协议：' + game.cards[button.dataset.pick][0]); inspect = '';
    } else if (button.id === 'redraw') game.reroll(state);
    else if (button.dataset.kit) { kit = kit === button.dataset.kit ? '' : button.dataset.kit; inspect = ''; }
    else if (button.dataset.pos !== undefined) {
      const pos = Number(button.dataset.pos);
      if (kit && game.canBuild(state,kit,pos)) {
        game.build(state,kit,pos); log(state.round,game.tile(pos) + ' 号架设' + (kit === 'amp' ? '电容' : '弩炮')); kit = ''; inspect = '';
      } else {
        inspect = (kit ? '无法安装。' : '') + button.getAttribute('aria-label');
      }
    } else if (button.dataset.bet) { wager(Number(button.dataset.bet)); return; }
    else if (button.id === 'roll') { kit = ''; inspect = ''; if (bagMode) reveal(0); else game.roll(state); }
    else if (button.dataset.dir) { travel(Number(button.dataset.dir)); return; }
    else return;
    render();
  });
  function preview(event) {
    const button = event.target.closest('[data-dir]');
    if (!button || busy) return;
    peek = ['pointerover','focusin'].includes(event.type) ? game.route(state,Number(button.dataset.dir)) : []; board(state);
  }
  for (const name of ['pointerover','pointerout','focusin','focusout']) get('actions').addEventListener(name,preview);
  if (!bagMode && args.get('sample') === 'sol') loadFieldReport();
  else if (bagMode && args.get('sample') === 'choice') loadBagDecision();
  else start(args.has('seed') && /^\d{1,10}$/.test(args.get('seed')) ? Number(args.get('seed')) >>> 0 : crypto.getRandomValues(new Uint32Array(1))[0]);
})();
