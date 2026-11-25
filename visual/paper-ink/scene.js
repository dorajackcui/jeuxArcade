(() => {
  const color = name => 'var(--pi-' + name + ')';
  const mix = (first, second, amount) => 'color-mix(in srgb,' + color(first) + ' ' + amount + '%,' + color(second) + ')';
  const path = (shape, fill) => '<path d="' + shape + '" fill="' + fill + '"/>';
  const use = (id, left, top, scale = 1) => '<use href="#' + id + '" transform="translate(' + left + ' ' + top + ') scale(' + scale + ')"/>';
  function landscape() {
    return '<circle cx="869" cy="63" r="59" fill="' + mix('signal','paper',70) + '"/>' +
      path('M0 138 83 117 155 120 242 91 339 107 441 72 529 89 624 66 713 80 809 50 873 64 972 41 1080 53V465H0Z', mix('field','paper',52)) +
      path('M0 157 116 147 227 158 359 127 449 138 563 106 694 123 811 87 879 93 999 69 1080 82V465H0Z', color('field')) +
      path('M0 230Q177 189 323 219T642 179Q836 131 1080 165V202Q877 173 699 213T353 248Q178 224 0 264Z', mix('field','water',72)) +
      path('M92 79q26-12 49-5l17 1-11 3-38 2zM668 40q20-8 40-4l21 2-37 3zM954 26l30-6 18 3-25 4z', mix('paper','ink',86));
  }
  function foreground() {
    return '<g style="color:' + mix('field','ink',52) + '">' +
      use('reed',75,273,1.4) + use('reed',104,266,.8) + use('reed',992,238,1.1) + use('reed',965,242,.75) + '</g>' +
      path('M0 358q62 26 95 52 71-4 153 36l102 19H0Z M1080 282q-43 37-52 71-66 7-103 38l-71 5-103 69h329Z', mix('water','ink',54)) +
      '<g style="color:' + color('ink') + '">' + use('reed',30,422,1.9) + use('reed',70,433,1.2) + use('reed',1011,397,1.7) + use('reed',1038,394,1.05) + '</g>' +
      path('M0 395q96 22 135 54 56-6 107 16H0Z M1080 347q-75 24-111 57-62 0-112 39l-76 22h299Z', color('ink'));
  }
  const project = (col, row) => [442 + 114 * col - 80 * row, 104 + 32 * col + 48 * row];
  const polygon = (points, fill) => '<polygon points="' + points.map(point => point.join(',')).join(' ') + '" fill="' + fill + '"/>';
  function mast() {
    const [mastX,mastY] = project(2.1,1.68);
    return {depth:mastY,html:'<g transform="translate(' + mastX + ' ' + mastY + ') scale(.72)">' +
      path('m-20 4 41-13 22 6-43 15z',mix('field','ink',62)) +
      path('m-10 0 7-62 7-2 8 64-5 2-7-43-5 44z',color('ink')) +
      path('m-18-67 30-7 6 8-30 8z',color('ink')) + path('m-7-73 3-12 7-1 4 11z',color('signal')) +
      '<path d="M-13-84q-5 5-3 12m26-19q6 2 8 9" fill="none" stroke="' + color('paper') + '" stroke-width="2.7"/></g>'};
  }
  function tile(col, row, occupied) {
    const corners = [[.015,.015],[.985,.015],[.985,.985],[.015,.985]].map(([horizontal,vertical]) => project(col+horizontal,row+vertical));
    const [back,right,front,left] = corners;
    const down = point => [point[0],point[1]+10];
    const mid = project(col+.5,row+.5);
    const top = occupied ? mix('signal','paper',36) : (row+col)%2 ? mix('paper','field',82) : color('paper');
    const structure = polygon([left,front,down(front),down(left)],mix('water','ink',54)) +
      polygon([front,right,down(right),down(front)],color('ink')) + polygon([back,right,front,left],top).replace('<polygon', '<polygon class="tile-top"');
    return { mid, structure };
  }
  function installDefs(svg) {
    svg.insertAdjacentHTML('afterbegin', `<defs>
          <g id="courier">
            <ellipse cx="2" cy="0" rx="23" ry="7" class="shadow"/>
            <path d="M-12-14l-1 12 10 1 3-15m5 1 3 16 11-2-4-17" fill="var(--pi-ink)"/>
            <path d="m-13-48 24-3 17 36q-17 10-48 3l6-29z" fill="var(--pi-signal)"/>
            <path d="m8-48 18 32-10 4-11-25z" class="goldshade"/>
            <path d="m-19-47 10-24 8-9 15 21 8 12-21 7z" fill="var(--pi-signal)"/>
            <path d="m-15-47 29-8 3 12-15 7-13-3z" fill="var(--pi-ink)"/>
            <path d="m2-47 5-1 1 3-5 1zm9-3 3-1 1 3-3 1z" fill="var(--pi-paper)"/>
            <path d="m-11-38 19 15-4 5-18-17z" class="goldshade"/>
            <path d="m7-28 13-3 3 12-13 3z" fill="var(--pi-water)"/>
          </g>
          <g id="bramble">
            <ellipse cx="0" cy="1" rx="24" ry="6" class="shadow"/>
            <path d="m-15-11-5 11 9 1 4-12m10 0 6 13 7-3-6-13" fill="var(--pi-ink)"/>
            <path d="m-23-12 1-18 10-12-2-13 13 8 7-10 4 14 15-4-5 13 7 10-6 16-20 4z" fill="var(--pi-threat)"/>
            <path d="m-18-26 14 3-3 5-10-2zm22 3 13-6 1 7-12 4z" fill="var(--pi-paper)"/>
            <path d="m-13-24 5 1-1 3-5-1zm19 2 6-3 1 3-6 3z" fill="var(--pi-ink)"/>
          </g>
          <g id="bow">
            <ellipse cx="2" cy="0" rx="25" ry="6" class="shadow"/>
            <path d="m-21-6 20-10 23 9-21 10z" fill="var(--pi-ink)"/>
            <path d="m-13-10 4-22 13-2 9 25-11 5z" fill="var(--pi-water)"/>
            <path d="m-19-38 41 14-4 5-41-13z" fill="var(--pi-ink)"/>
            <path d="m-27-21 6-15 12-13m-18 28 28-5-10-23" fill="none" stroke="var(--pi-ink)" stroke-width="3"/>
            <path d="m-22-40 8 7-3 4-8-7z" fill="var(--pi-paper)"/>
          </g>
          <g id="crate">
            <path d="m-24-21 23-10 26 9-23 12z" fill="var(--pi-paper)"/>
            <path d="m-24-21 26 11 0 18-26-11z" fill="var(--pi-water)"/>
            <path d="m2-10 23-12v20l-23 10z" fill="var(--pi-ink)"/>
            <path d="m-10-27 24 10-5 3-26-11zm19 13 5-3v18l-5 3z" fill="var(--pi-field)"/>
          </g>
          <g id="reed" fill="currentColor">
            <path d="M0 0q-16-21-17-40Q-2-31 0 0m2-1q-4-33 9-51Q17-26 2-1m2 0q10-22 23-29Q21-11 4-1z"/>
          </g>
          <g id="star" fill="var(--pi-paper)"><path d="M0-10 3-3 9 0 3 3 0 11-3 3-9 0-3-3Z"/></g>
          <pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(24)">
            <path d="M0 0v10" stroke="var(--pi-ink)" opacity=".21" stroke-width="2"/>
          </pattern>
          <g id="coil">
            <ellipse cx="1" cy="1" rx="19" ry="5" class="shadow"/>
            <path d="m-14-7 13-5 16 6-14 6zM-4-7v-38l7-4v41z" fill="var(--pi-ink)"/>
            <path d="m-13-33 23-8 5 5-24 9z m0 9 23-8 5 5-24 9z m0 9 23-8 5 5-24 9z" fill="var(--pi-water)"/>
            <circle cy="-47" r="4" fill="var(--pi-signal)"/>
          </g>
        </defs>`);
  }
  window.PaperScene = { color, mix, path, use, project, polygon, landscape, foreground, mast, tile, installDefs };
})();
