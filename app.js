/* =========================================================
   app.js · carga data.json y dibuja los gráficos (Chart.js)
   Estética Apple: tipografía del sistema, grises sutiles.
   ========================================================= */
const INK = '#1d1d1f', INK2 = '#6e6e73', LINE = '#e5e5ea';
const BLUE = '#0071e3', COPPER = '#c9712d', GREEN = '#34c759', RED = '#ff3b30';
const PALETTE = ['#0071e3', '#c9712d', '#34c759', '#5e5ce6', '#ff9f0a', '#64d2ff', '#bf5af2'];

Chart.defaults.font.family = '-apple-system,BlinkMacSystemFont,"SF Pro Text","Inter",sans-serif';
Chart.defaults.font.size = 12.5;
Chart.defaults.color = INK2;
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.boxWidth = 8;

const OE = [
  ['OE1', 'Propiedades de las series', 'Estacionariedad, volatilidad y quiebres estructurales. Define el orden de integración I(0)/I(1).'],
  ['OE2', 'Sensibilidad macro-financiera', 'Magnitud y signo del efecto de cada factor; contraste global vs local.'],
  ['OE3', 'Equilibrio de largo plazo', 'Cointegración (ARDL/Johansen) y mecanismo de corrección de error (VECM).'],
  ['OE4', 'Dinámica de shocks', 'Impulso-respuesta y descomposición de varianza ante perturbaciones macro.'],
  ['OE5', 'Estabilidad por ciclo', 'Sensibilidad condicional a las fases de expansión/contracción del cobre.'],
  ['OE6', 'Comparación de mercados', 'Transmisión del shock en el mercado internacional frente al chileno.'],
];

function renderOE() {
  const g = document.getElementById('oe-grid');
  g.innerHTML = OE.map(([n, t, d]) =>
    `<div class="card reveal"><div class="num">${n}</div><h3>${t}</h3><p>${d}</p></div>`).join('');
}

const HIP = [
  ['H1', 'El precio del cobre afecta positivamente los retornos', 'ok',
   'β cobre +0,57*** ; robusto a corrección FDR y a subperíodos.'],
  ['H2', 'El tipo de cambio incide en los retornos (signo a determinar)', 'ok',
   'ΔTC −1,57*** ; capta el canal de competitividad y de riesgo.'],
  ['H3', 'Las tasas de interés afectan negativamente los retornos', 'no',
   'Tasa local y externa no significativas en esta especificación.'],
  ['H4', 'El riesgo global (VIX) afecta negativamente los retornos', 'ok',
   'VIX negativo y significativo; mayor efecto estandarizado (−0,31σ).'],
  ['H5', 'Existe relación de cointegración de largo plazo', 'ok',
   'Confirmada con quiebre estructural en 2008 (Gregory-Hansen).'],
  ['H6', 'Los factores globales dominan a los locales', 'ok',
   'FEVD: global ≈ 32% vs local ≈ 5%; betas estandarizados.'],
  ['H7', 'El mercado internacional transmite el shock más completamente', 'ok',
   'Interacción d_cobre × global = +0,25 (p = 0,01), prueba formal.'],
];

function renderHip() {
  const g = document.getElementById('hip-grid');
  if (!g) return;
  const label = { ok: 'Respaldada', no: 'No respaldada', mid: 'Parcial' };
  g.innerHTML = HIP.map(([h, t, st, ev]) =>
    `<div class="card reveal"><div class="hip-top"><span class="num">${h}</span>
      <span class="hip-badge ${st}">${label[st]}</span></div>
      <h3 style="font-size:17px">${t}</h3><p>${ev}</p></div>`).join('');
}

async function main() {
  renderOE();
  renderHip();
  let d;
  try { d = await (await fetch('data.json')).json(); }
  catch (e) { console.error('No se pudo cargar data.json', e); return; }

  /* ---- 1. Ciclo del cobre (línea con bandas de fase) ---- */
  const cc = d.ciclo_cobre;
  const phaseBands = {
    id: 'phaseBands',
    beforeDraw(chart) {
      const { ctx, chartArea: a, scales: { x } } = chart;
      if (!a) return;
      ctx.save();
      cc.fase.forEach((f, i) => {
        ctx.fillStyle = f === 'expansion' ? 'rgba(52,199,89,.08)' : 'rgba(255,59,48,.07)';
        const x0 = x.getPixelForValue(i), x1 = x.getPixelForValue(i + 1);
        ctx.fillRect(x0, a.top, (x1 - x0) || 2, a.bottom - a.top);
      });
      ctx.restore();
    }
  };
  new Chart('cycleChart', {
    type: 'line',
    data: {
      labels: cc.fechas,
      datasets: [{
        data: cc.precio, borderColor: COPPER, borderWidth: 2,
        pointRadius: 0, tension: .3, fill: true,
        backgroundColor: 'rgba(201,113,45,.06)'
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { intersect: false, mode: 'index' } },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 8, color: INK2 } },
        y: { grid: { color: LINE }, ticks: { color: INK2 }, title: { display: true, text: 'USD/tonelada' } }
      }
    },
    plugins: [phaseBands]
  });

  /* ---- 2 & 3. Coeficientes y FEVD CONMUTABLES por muestra (B/A/C) ---- */
  let coefChart, fevdChart;
  function buildCoef(s) {
    const cf = (d.coeficientes && d.coeficientes[s]) || d.coeficientes_B;
    const data = {
      labels: cf.map(x => x.factor),
      datasets: [{
        data: cf.map(x => x.coef),
        backgroundColor: cf.map(x => {
          const base = x.coef >= 0 ? GREEN : RED;
          return x.sig ? base : (x.coef >= 0 ? 'rgba(52,199,89,.35)' : 'rgba(255,59,48,.35)');
        }),
        borderRadius: 6
      }]
    };
    if (coefChart) { coefChart.data = data; coefChart.update(); return; }
    coefChart = new Chart('coefChart', {
      type: 'bar', data,
      options: {
        indexAxis: 'y', maintainAspectRatio: false,
        animation: { duration: 650, easing: 'easeOutQuart' },
        plugins: { legend: { display: false },
          tooltip: { callbacks: { label: c => ` coef: ${(+c.parsed.x).toFixed(3)}` } } },
        scales: { x: { grid: { color: LINE }, ticks: { color: INK2 } },
          y: { grid: { display: false }, ticks: { color: INK } } }
      }
    });
  }
  function buildFevd(s) {
    const fv = (d.fevd && d.fevd[s]) || d.fevd_B;
    const labels = Object.keys(fv).map(k => k === 'retorno_cartera' ? 'Propio (idiosincrático)' : k);
    const data = { labels, datasets: [{ data: Object.values(fv).map(v => +(v * 100).toFixed(1)),
      backgroundColor: PALETTE, borderColor: '#fff', borderWidth: 2 }] };
    if (fevdChart) { fevdChart.data = data; fevdChart.update(); return; }
    fevdChart = new Chart('fevdChart', {
      type: 'doughnut', data,
      options: { maintainAspectRatio: false, cutout: '62%',
        animation: { animateRotate: true, duration: 750 },
        plugins: { legend: { position: 'right' },
          tooltip: { callbacks: { label: c => ` ${c.label}: ${c.parsed}%` } } } }
    });
  }
  buildCoef('B'); buildFevd('B');
  document.querySelectorAll('.seg').forEach(seg => {
    const target = seg.dataset.target;
    seg.querySelectorAll('.seg-btn').forEach(btn => btn.addEventListener('click', () => {
      seg.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (target === 'coef') buildCoef(btn.dataset.s); else if (target === 'fevd') buildFevd(btn.dataset.s);
    }));
  });

  /* ---- 4. β del cobre por muestra (barras) ---- */
  const tri = d.triangulacion;
  new Chart('triBetaChart', {
    type: 'bar',
    data: {
      labels: tri.map(x => x.muestra),
      datasets: [{ data: tri.map(x => x.beta_cobre),
        backgroundColor: [BLUE, COPPER, '#ff9f0a'], borderRadius: 8 }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => ` β cobre: ${c.parsed.y}` } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: INK } },
        y: { grid: { color: LINE }, ticks: { color: INK2 }, beginAtZero: true }
      }
    }
  });

  /* ---- 5. Radar comparativo (normalizado) ---- */
  const maxBeta = Math.max(...tri.map(x => x.beta_cobre));
  const maxR2 = Math.max(...tri.map(x => x.r2));
  const maxF = Math.max(...tri.map(x => x.fevd_global));
  new Chart('radarChart', {
    type: 'radar',
    data: {
      labels: ['Sensibilidad cobre', 'Ajuste R²', 'Varianza global'],
      datasets: tri.map((x, i) => ({
        label: x.muestra,
        data: [x.beta_cobre / maxBeta, x.r2 / maxR2, x.fevd_global / maxF],
        borderColor: PALETTE[i], backgroundColor: PALETTE[i] + '22',
        borderWidth: 2, pointRadius: 3
      }))
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: { r: { suggestedMin: 0, suggestedMax: 1, grid: { color: LINE },
        angleLines: { color: LINE }, pointLabels: { color: INK, font: { size: 12 } },
        ticks: { display: false } } }
    }
  });

  /* ---- Hallazgos avanzados (tarjetas + 2 gráficos) ---- */
  const av = d.avanzado;
  if (av) {
    const cards = [
      ['Dependencia de sección cruzada', `CD-Pesaran = ${av.cd_pesaran.stat}`,
        `p = ${av.cd_pesaran.p} · valida el uso de errores Driscoll-Kraay.`],
      ['Cointegración con quiebre', `Quiebre en ${av.gregory_hansen.fecha_quiebre}`,
        `Gregory-Hansen ADF* = ${av.gregory_hansen.gh_adf_stat} < ${av.gregory_hansen.cv_5pct}: relación de largo plazo confirmada (se reconfigura con la crisis de 2008).`],
      ['Volatilidad condicional (GARCH)', `Persistencia = ${av.garch.persistencia}`,
        `α=${av.garch.alpha}, β=${av.garch.beta}; efectos ARCH significativos (p=${av.garch.arch_lm_p}). Agrupamiento de volatilidad.`],
      ['Estabilidad por ciclo (OE5)', `Interacción p = ${av.oe5_interaccion.p_interaccion}`,
        `La sensibilidad al cobre no difiere de forma significativa entre expansión y contracción.`],
    ];
    document.getElementById('adv-grid').innerHTML = cards.map(([t, big, sub]) =>
      `<div class="card reveal"><h3>${t}</h3>
        <div style="font-size:28px;font-weight:700;color:#0071e3;margin:6px 0">${big}</div>
        <p>${sub}</p></div>`).join('');

    if (av.irf) {
      new Chart('irfChart', {
        type: 'line',
        data: { labels: av.irf.h, datasets: [
          { data: av.irf.resp, borderColor: COPPER, borderWidth: 2, pointRadius: 2, tension: .3, fill: false },
          { data: av.irf.hi, borderColor: 'rgba(201,113,45,.25)', borderWidth: 1, pointRadius: 0, fill: '+1' },
          { data: av.irf.lo, borderColor: 'rgba(201,113,45,.25)', borderWidth: 1, pointRadius: 0,
            backgroundColor: 'rgba(201,113,45,.10)', fill: false } ] },
        options: { maintainAspectRatio: false, plugins: { legend: { display: false } },
          scales: { x: { grid: { display: false }, title: { display: true, text: 'Meses' } },
            y: { grid: { color: LINE } } } }
      });
    }
    const rb = av.robustez_beta_cobre || {};
    new Chart('robChart', {
      type: 'bar',
      data: { labels: Object.keys(rb), datasets: [{ data: Object.values(rb),
        backgroundColor: [BLUE, COPPER], borderRadius: 8 }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => ` β cobre: ${c.parsed.y}` } } },
        scales: { x: { grid: { display: false } }, y: { grid: { color: LINE }, beginAtZero: true } } }
    });

    // Betas estandarizados (barra horizontal, ordenados por |efecto|)
    if (av.betas_estandarizados) {
      const bs = av.betas_estandarizados.slice().sort((a, b) => Math.abs(b.beta_std) - Math.abs(a.beta_std));
      new Chart('betasChart', {
        type: 'bar',
        data: { labels: bs.map(x => x.factor), datasets: [{ data: bs.map(x => x.beta_std),
          backgroundColor: bs.map(x => x.beta_std >= 0 ? '#34c759' : '#ff3b30'), borderRadius: 6 }] },
        options: { indexAxis: 'y', maintainAspectRatio: false,
          plugins: { legend: { display: false },
            tooltip: { callbacks: { label: c => ` ${(+c.parsed.x).toFixed(2)} σ` } } },
          scales: { x: { grid: { color: LINE }, title: { display: true, text: 'Efecto en desviaciones estándar' } },
            y: { grid: { display: false } } } }
      });
    }
    // Local Projections (línea con banda IC95%)
    if (av.local_projections) {
      const lp = av.local_projections;
      new Chart('lpChart', {
        type: 'line',
        data: { labels: lp.h, datasets: [
          { data: lp.resp, borderColor: BLUE, borderWidth: 2, pointRadius: 2, tension: .3, fill: false },
          { data: lp.hi, borderColor: 'rgba(0,113,227,.2)', borderWidth: 1, pointRadius: 0, fill: '+1' },
          { data: lp.lo, borderColor: 'rgba(0,113,227,.2)', borderWidth: 1, pointRadius: 0,
            backgroundColor: 'rgba(0,113,227,.08)', fill: false } ] },
        options: { maintainAspectRatio: false, plugins: { legend: { display: false } },
          scales: { x: { grid: { display: false }, title: { display: true, text: 'Horizonte (meses)' } },
            y: { grid: { color: LINE } } } }
      });
    }
  }

  /* ---- 6. Tabla de estacionariedad ---- */
  const st = d.estacionariedad;
  const t = document.getElementById('statTable');
  t.innerHTML = '<thead><tr><th>Variable</th><th>ADF (p)</th><th>KPSS (p)</th><th>Orden</th></tr></thead><tbody>'
    + st.map(r => {
      const cls = r.orden.startsWith('I(0)') ? 'i0' : 'i1';
      return `<tr><td>${r.variable}</td><td class="mono">${r.adf_p}</td>
        <td class="mono">${r.kpss_p}</td><td><span class="badge ${cls}">${r.orden}</span></td></tr>`;
    }).join('') + '</tbody>';

  /* ---- Predictor interactivo (datos en predictor.json) ---- */
  try {
    const pd = await (await fetch('predictor.json')).json();
    const state = {};
    pd.features.forEach(f => state[f.key] = f.actual);
    const fmtPct = v => (v >= 0 ? '+' : '') + (v * 100).toFixed(2) + '%';

    function predict() {
      let r = pd.intercepto;
      pd.features.forEach(f => r += f.coef * state[f.key]);
      const price = pd.ultimo_precio * Math.exp(r);
      const elR = document.getElementById('pred-ret');
      elR.textContent = fmtPct(r);
      elR.style.color = r >= 0 ? '#1a7f37' : '#c4351c';
      document.getElementById('pred-price').textContent =
        price.toLocaleString('es-CL', { maximumFractionDigits: 0 }) + ' USD/t';
    }
    const cont = document.getElementById('pred-sliders');
    cont.innerHTML = pd.features.map((f, i) => {
      const min = Math.min(f.p05, f.actual), max = Math.max(f.p95, f.actual);
      const step = (max - min) / 100 || 0.001;
      return `<div class="slider-row">
        <label>${f.label}<span class="sval" id="sv-${i}">${(+f.actual).toFixed(3)}</span></label>
        <input type="range" id="sl-${i}" min="${min}" max="${max}" step="${step}" value="${f.actual}">
      </div>`;
    }).join('');
    pd.features.forEach((f, i) => {
      const sl = document.getElementById('sl-' + i);
      sl.addEventListener('input', () => {
        state[f.key] = parseFloat(sl.value);
        document.getElementById('sv-' + i).textContent = state[f.key].toFixed(3);
        predict();
      });
    });
    document.getElementById('pred-reset').addEventListener('click', () => {
      pd.features.forEach((f, i) => {
        state[f.key] = f.actual;
        document.getElementById('sl-' + i).value = f.actual;
        document.getElementById('sv-' + i).textContent = (+f.actual).toFixed(3);
      });
      predict();
    });
    predict();

    // tabla de modelos
    const m = pd.metricas_oos;
    const rows = Object.entries(m).map(([name, v]) =>
      `<tr><td>${name}</td><td class="mono">${v.r2_oos >= 0 ? '+' : ''}${v.r2_oos}</td>
       <td class="mono">${(v.acierto_direccional * 100).toFixed(0)}%</td>
       <td class="mono">${v.rmse}</td></tr>`).join('');
    document.getElementById('pred-table').innerHTML =
      '<thead><tr><th>Modelo</th><th>R² OOS</th><th>Acierto dir.</th><th>RMSE</th></tr></thead><tbody>'
      + rows + '</tbody>';
    document.getElementById('pred-insight').innerHTML =
      '<strong>Lectura:</strong> el R² fuera de muestra es cercano a cero o negativo en todos los ' +
      'modelos: los factores macro <strong>explican</strong> el retorno contemporáneo del cobre ' +
      '(ver Resultados) pero apenas lo <strong>anticipan</strong> a un mes — coherente con la ' +
      'hipótesis de eficiencia de mercado. El mejor predictor simple es el momentum (AR(1)).';
  } catch (e) { console.warn('predictor.json no disponible', e); }

  /* ---- reveal on scroll ---- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  /* ---- scroll-spy: resalta el enlace de la sección visible ---- */
  const navLinks = [...document.querySelectorAll('.nav .links a')];
  const byId = id => navLinks.find(a => a.getAttribute('href') === '#' + id);
  const spy = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) {
      navLinks.forEach(a => a.classList.remove('active'));
      const link = byId(e.target.id);
      if (link) link.classList.add('active');
    }
  }), { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('section[id]').forEach(s => spy.observe(s));
}

main();
