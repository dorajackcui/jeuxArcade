(() => {
  const { color, mix, path, use, project, polygon, landscape, foreground, tile, mast, installDefs } = window.PaperScene;
  installDefs(document.getElementById('scene'));
  function board() {
    const cells = [[1,2,3,4],[10,0,0,5],[9,8,7,6]];
    const sprites = {2:'bramble',3:'bow',4:'crate',6:'courier',7:'bow',8:'bramble',9:'crate'};
    let art = polygon([[438,130],[936,262],[687,425],[193,287]], mix('field','ink',71));
    const terrain = [], actors = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const id = cells[row][col];
        if (!id) continue;
        const { mid, structure } = tile(col, row, id === 6);
        terrain.push({ depth:mid[1], html:structure });
        const [leftPos,topPos] = project(col+.21,row+.76);
        let figure = '<text class="tile-number" x="' + leftPos + '" y="' + topPos + '" transform="rotate(16 ' + leftPos + ' ' + topPos + ')">' + String(id).padStart(2,'0') + '</text>';
        if (sprites[id]) figure += '<g opacity="' + (id === 9 ? '.5' : '1') + '">' + use(sprites[id],mid[0],mid[1]+3,id===6?1.18:1.03) + '</g>';
        actors.push({depth:mid[1],html:figure});
      }
    }
    actors.push(mast());
    const sort = items => items.sort((first,second) => first.depth-second.depth).map(item => item.html).join('');
    art += sort(terrain) + sort(actors);
    return landscape() + art + foreground();
  }
  function platform() {
    const ledge = (shape, edge) => path(shape,color('water')) + path(shape,'url(#hatch)') + path(edge,color('field'));
    return landscape() +
      ledge('M0 278 200 278 224 250 440 250 427 300 394 322 407 378 375 465H0Z','M0 269h190l26-30 225 1-1 10H223l-23 29H0Z') +
      ledge('M592 219 801 219 784 244 733 256 696 296 657 290 621 260Z','M589 208 802 207 801 219H592Z') +
      ledge('M891 175 1080 175V465H831l46-83-4-119Z','M894 164 1080 162v13H890Z') +
      path('M0 350 109 349 122 333 180 332 148 356 0 364Z M280 276l68-1-15 7h-49z M662 240l45-2-12 6h-34z',color('ink')) +
      use('courier',389,240,1.42) + use('bramble',746,207,1.08) +
      use('star',476,161,.8) + use('star',515,145,1.15) + use('star',561,148,.8) +
      '<g transform="translate(963 162)">' + path('M-25 0h9v-65l21-10L17-60V0h9v-64L8-88l-33 13Z',color('ink')) +
      path('M-16-65 3-74l3 6-22 9z',color('signal')) + '</g>' + foreground();
  }
  const scenes = {board,platform};
  function select(mode) {
    const ring = mode === 'board';
    document.getElementById('art').innerHTML = scenes[mode]();
    document.getElementById('name').textContent = ring ? '夜巡环线' : '渡风口';
    document.getElementById('stats').textContent = ring ? '回合 6 / 12　 生命 6 / 7' : '关卡 02　 火种 3 / 6';
    document.getElementById('scene-title').textContent = ring ? '巡夜人位于 06 格，感染体位于 02、08 格' : '背包信使面向断崖，空中火种通向下一座平台';
    document.querySelectorAll('[data-scene]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.scene === mode)));
  }
  document.querySelectorAll('[data-scene]').forEach(button => button.addEventListener('click', () => select(button.dataset.scene)));
  const grain = document.getElementById('grain');
  grain.value = Math.round(Number(getComputedStyle(document.documentElement).getPropertyValue('--pi-grain')) * 100);
  function adjust() {
    document.querySelector('.pi-print').style.setProperty('--pi-grain', Number(grain.value)/100);
    document.querySelector('output').value = grain.value + '%';
  }
  grain.addEventListener('input', adjust);
  adjust(); select('board');
})();
