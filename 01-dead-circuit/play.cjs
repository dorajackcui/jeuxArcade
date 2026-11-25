const game = require('./game.js');
const args = process.argv.slice(2);
const mode = args[0] === '--bag' ? (args.shift(), 'bag') : 'classic';
const [seed = '17', ...actions] = args;
const state = game.start(Number(seed), mode);
function report() {
  console.log('回合', state.round, state.phase, '位置', game.tile(state.pos), 'HP', state.hp, '零件', state.scrap, '带电', state.charged, '单步实伤峰值', state.peak, '峰值轮', state.peakRound, '击杀', state.kills, '构筑', state.deck.join('+'));
  if (state.phase === 'draft') console.log('三选一', state.offer.map(card => card + ' ' + game.cards[card].join(' / ')).join('\n'));
  console.log('设施', Object.entries(state.devices).map(([pos, kind]) => game.tile(Number(pos)) + ':' + kind).join(' '),
    '补给', state.stocked.map(game.tile), '敌人', state.enemies.map(unit => game.tile(unit.pos) + '(' + unit.hp + 'HP,潮后' + game.tile(game.wrap(unit.pos + unit.dir)) + ')').join(' '));
  if (state.die && state.phase === 'move') console.log('骰', state.die, '顺', game.route(state,1).map(game.tile), '逆', game.route(state,-1).map(game.tile));
  if (state.bag) console.log('袋中剩余:', state.bag.join(' ') || '已抽空', '上一走向:', state.lastDir || '无');
}
for (const action of actions) {
  if (action === 'redraw') game.reroll(state);
  else if (action.startsWith('pick:')) game.pick(state, action.slice(5));
  else if (action === 'roll') game.roll(state);
  else if (['+', '-', 'bet+', 'bet-'].includes(action)) {
    const dir = action.endsWith('+') ? 1 : -1;
    if (action.startsWith('bet')) console.log('押前袋', state.bag?.join('/'), '锁向', dir, '揭点', game.roll(state, dir));
    const result = game.move(state, dir);
    console.log('R' + (result.frames[0].state.round), action, result.frames.map(frame => game.tile(frame.pos) + ':' + frame.notes.join('，')).join(' / '), result.notes.join('，'));
  } else {
    const [kind, cell] = action.split(':'); game.build(state, kind, Number(cell) - 1);
  }
}
report();
