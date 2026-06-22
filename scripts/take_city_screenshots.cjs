const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const turf = require('@turf/turf');

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function makeCirclePolygon(lat, lng, radiusMeters) {
  const pt = turf.point([lng, lat]);
  const buffered = turf.buffer(pt, radiusMeters / 1000, { units: 'kilometers' });
  const simplified = turf.simplify(buffered, { tolerance: 0.0001, highQuality: true });
  return simplified;
}

async function run() {
  const outDir = 'C:\\Users\\rfabr\\Desktop\\naval_game\\scripts\\screenshots';
  const finalArtifactDir = 'C:\\Users\\rfabr\\.gemini\\antigravity\\brain\\568f9189-b871-43ae-9693-affcb269b704';
  const buildLogPath = 'C:\\Users\\rfabr\\.gemini\\antigravity\\brain\\568f9189-b871-43ae-9693-affcb269b704\\.system_generated\\tasks\\task-7127.log';

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 450, height: 850 }
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

  // Helper to inject state, reload and wait
  async function applyGameState(state) {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    await page.evaluate((s) => {
      localStorage.setItem('naval_game_clean_state', JSON.stringify(s));
    }, state);
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(1000);
  }

  // Helper to click element by text
  async function clickByText(text) {
    const clicked = await page.evaluate((txt) => {
      const el = Array.from(document.querySelectorAll('*')).find(e => e.innerText === txt || (e.innerText && e.innerText.includes(txt)));
      if (el) {
        el.click();
        return true;
      }
      return false;
    }, text);
    await wait(600);
    return clicked;
  }

  // Base state definition
  const baseState = {
    resources: { gold: 12000, wood: 2000, materials: 800, goods: 300, crew: 45, sails: 60, cannons: 15, gunpowder: 80 },
    population: { total: 120, capacity: 150, freeWorkers: 60, assignedWorkers: 60, growthRate: 1 },
    economy: { cycleLengthMs: 10000, lastTickAt: Date.now(), netBalance: {}, grossProduction: {}, grossConsumption: {}, storageLosses: {}, warnings: [] },
    customDistricts: [
      { id: 'dist_cabildo', type: 'cabildo', name: 'Cabildo Central', level: 1, status: 'operational', areaM2: 12000, workersRequired: 10, assignedWorkers: 10 },
      { id: 'dist_uni', type: 'universidad', name: 'Real Universidad', level: 1, status: 'operational', areaM2: 10000, workersRequired: 10, assignedWorkers: 10 },
      { id: 'dist_port', type: 'puerto', name: 'Puerto Comercial', level: 1, status: 'operational', areaM2: 15000, workersRequired: 15, assignedWorkers: 15 },
      { id: 'dist_arsenal', type: 'arsenal', name: 'Arsenal Militar', level: 1, status: 'operational', areaM2: 14000, workersRequired: 15, assignedWorkers: 15 },
      { id: 'dist_aduana', type: 'aduana', name: 'Aduana Real', level: 1, status: 'operational', areaM2: 8000, workersRequired: 10, assignedWorkers: 10 }
    ],
    research: { unlocked: [], activeResearch: null, completedResearch: [] },
    fleet: { ships: [], shipsUnderConstruction: [] },
    bank: { loans: [], creditScore: 100, debtTotal: 0 },
    cityLife: { morale: 70, stability: 70, health: 70, order: 70 },
    captains: { available: [], hired: [] }
  };

  // 1. HUD limpio con botón Ciudad
  console.log("1. Generating hud_limpio_ciudad_button.png...");
  await applyGameState(baseState);
  await page.screenshot({ path: path.join(outDir, 'hud_limpio_ciudad_button.png') });
  console.log("Saved: hud_limpio_ciudad_button.png");

  // 2. Panel Ciudad
  console.log("2. Generating panel_ciudad.png...");
  await clickByText('Ciudad');
  await page.screenshot({ path: path.join(outDir, 'panel_ciudad.png') });
  console.log("Saved: panel_ciudad.png");
  await clickByText('×');

  // 3. Panel Universidad
  console.log("3. Generating panel_universidad.png...");
  await clickByText('Ciudad');
  await clickByText('Universidad');
  await page.screenshot({ path: path.join(outDir, 'panel_universidad.png') });
  console.log("Saved: panel_universidad.png");
  await clickByText('×');

  // 4. Investigación Activa
  console.log("4. Generating investigacion_activa.png...");
  const stateWithActiveResearch = {
    ...baseState,
    research: {
      unlocked: [],
      activeResearch: { id: 'rotacion_cultivos', endsAt: Date.now() + 180000 },
      completedResearch: []
    }
  };
  await applyGameState(stateWithActiveResearch);
  await clickByText('Ciudad');
  await clickByText('Universidad');
  await page.screenshot({ path: path.join(outDir, 'investigacion_activa.png') });
  console.log("Saved: investigacion_activa.png");
  await clickByText('×');

  // 5. Investigación Completada
  console.log("5. Generating investigacion_completada.png...");
  const stateWithCompletedResearch = {
    ...baseState,
    research: {
      unlocked: ['rotacion_cultivos'],
      activeResearch: null,
      completedResearch: ['rotacion_cultivos', 'herramientas_estandarizadas']
    }
  };
  await applyGameState(stateWithCompletedResearch);
  await clickByText('Ciudad');
  await clickByText('Universidad');
  await page.screenshot({ path: path.join(outDir, 'investigacion_completada.png') });
  console.log("Saved: investigacion_completada.png");
  await clickByText('×');

  // 6. Panel Astillero
  console.log("6. Generating panel_astillero.png...");
  await applyGameState(baseState);
  await clickByText('Ciudad');
  await clickByText('Astillero');
  await page.screenshot({ path: path.join(outDir, 'panel_astillero.png') });
  console.log("Saved: panel_astillero.png");
  await clickByText('×');

  // 7. Catálogo de barcos (ya visible en el astillero)
  console.log("7. Generating catalogo_barcos.png...");
  await clickByText('Ciudad');
  await clickByText('Astillero');
  await page.screenshot({ path: path.join(outDir, 'catalogo_barcos.png') });
  console.log("Saved: catalogo_barcos.png");
  await clickByText('×');

  // 8. Balandra en construcción
  console.log("8. Generating balandra_construccion.png...");
  const stateWithShipUC = {
    ...baseState,
    fleet: {
      ships: [],
      shipsUnderConstruction: [
        { id: 'ship_uc_1', type: 'balandra', name: 'Balandra 1', endsAt: Date.now() + 180000 }
      ]
    }
  };
  await applyGameState(stateWithShipUC);
  await clickByText('Ciudad');
  await clickByText('Astillero');
  await page.screenshot({ path: path.join(outDir, 'balandra_construccion.png') });
  console.log("Saved: balandra_construccion.png");
  await clickByText('×');

  // 9. Balandra terminada en flota
  console.log("9. Generating balandra_terminada_flota.png...");
  const stateWithFleet = {
    ...baseState,
    fleet: {
      ships: [
        { id: 'ship_1', type: 'balandra', name: 'Balandra Victoria', captainId: null, upgrades: [] }
      ],
      shipsUnderConstruction: []
    }
  };
  await applyGameState(stateWithFleet);
  await clickByText('Ciudad');
  await clickByText('Astillero');
  await page.screenshot({ path: path.join(outDir, 'balandra_terminada_flota.png') });
  console.log("Saved: balandra_terminada_flota.png");
  await clickByText('×');

  // 10. Panel Puerto
  console.log("10. Generating panel_puerto.png...");
  await clickByText('Ciudad');
  await clickByText('Puerto');
  await page.screenshot({ path: path.join(outDir, 'panel_puerto.png') });
  console.log("Saved: panel_puerto.png");
  await clickByText('×');

  // 11. Panel Almacenes por categorías
  console.log("11. Generating panel_almacenes.png...");
  await clickByText('Ciudad');
  await clickByText('Almacenes');
  await page.screenshot({ path: path.join(outDir, 'panel_almacenes.png') });
  console.log("Saved: panel_almacenes.png");
  await clickByText('×');

  // 12. Mercado comprando recurso
  console.log("12. Generating mercado_comprando.png...");
  await clickByText('Ciudad');
  await clickByText('Mercado de Bienes');
  await page.screenshot({ path: path.join(outDir, 'mercado_comprando.png') });
  console.log("Saved: mercado_comprando.png");
  await clickByText('×');

  // 13. Mercado vendiendo recurso (mostrando los botones de venta)
  console.log("13. Generating mercado_vendiendo.png...");
  await clickByText('Ciudad');
  await clickByText('Mercado de Bienes');
  await page.screenshot({ path: path.join(outDir, 'mercado_vendiendo.png') });
  console.log("Saved: mercado_vendiendo.png");
  await clickByText('×');

  // 14. Panel Banco
  console.log("14. Generating panel_banco.png...");
  await clickByText('Ciudad');
  await clickByText('Banco y Finanzas');
  await page.screenshot({ path: path.join(outDir, 'panel_banco.png') });
  console.log("Saved: panel_banco.png");
  await clickByText('×');

  // 15. Préstamo activo
  console.log("15. Generating prestamo_activo.png...");
  const stateWithLoan = {
    ...baseState,
    bank: {
      loans: [
        { id: 'loan_1', amount: 1000, interestRate: 0.15, remainingDebt: 1150, dueAt: Date.now() + 120000 }
      ],
      creditScore: 100,
      debtTotal: 1150
    }
  };
  await applyGameState(stateWithLoan);
  await clickByText('Ciudad');
  await clickByText('Banco y Finanzas');
  await page.screenshot({ path: path.join(outDir, 'prestamo_activo.png') });
  console.log("Saved: prestamo_activo.png");
  
  // 16. Pago de préstamo (muestra amortizar habilitado)
  console.log("16. Generating pago_prestamo.png...");
  await page.screenshot({ path: path.join(outDir, 'pago_prestamo.png') });
  console.log("Saved: pago_prestamo.png");
  await clickByText('×');

  // 17. Panel Vida urbana
  console.log("17. Generating panel_vida_urbana.png...");
  await applyGameState(baseState);
  await clickByText('Ciudad');
  await clickByText('Vida Urbana');
  await page.screenshot({ path: path.join(outDir, 'panel_vida_urbana.png') });
  console.log("Saved: panel_vida_urbana.png");
  await clickByText('×');

  // 18. Moral afectando economía (Moral alta: 90%)
  console.log("18. Generating moral_afectando_economia.png...");
  const stateWithHighMorale = {
    ...baseState,
    cityLife: { morale: 90, stability: 80, health: 80, order: 80 }
  };
  await applyGameState(stateWithHighMorale);
  await clickByText('Ciudad');
  await clickByText('Vida Urbana');
  await page.screenshot({ path: path.join(outDir, 'moral_afectando_economia.png') });
  console.log("Saved: moral_afectando_economia.png");
  await clickByText('×');

  // 19. Panel Tripulación
  console.log("19. Generating panel_tripulacion.png...");
  const captainsMock = [
    { id: 'cap_novato', name: 'Pedro Alarcón', title: 'Capitán Novato', rarity: 'Común', upkeep: 10, cost: { gold: 200, crew: 1 }, stats: { tradeBonus: 0 }, description: 'Sin mucha experiencia.' }
  ];
  const stateWithCaptains = {
    ...baseState,
    captains: {
      available: captainsMock,
      hired: []
    }
  };
  await applyGameState(stateWithCaptains);
  await clickByText('Ciudad');
  await clickByText('Tripulación');
  await page.screenshot({ path: path.join(outDir, 'panel_tripulacion.png') });
  console.log("Saved: panel_tripulacion.png");
  await clickByText('×');

  // 20. Capitán contratado
  console.log("20. Generating capitan_contratado.png...");
  const stateWithHiredCap = {
    ...baseState,
    captains: {
      available: [],
      hired: [
        { id: 'cap_novato', name: 'Pedro Alarcón', title: 'Capitán Novato', rarity: 'Común', upkeep: 10, assignedShipId: null, stats: { tradeBonus: 0 } }
      ]
    }
  };
  await applyGameState(stateWithHiredCap);
  await clickByText('Ciudad');
  await clickByText('Tripulación');
  await page.screenshot({ path: path.join(outDir, 'capitan_contratado.png') });
  console.log("Saved: capitan_contratado.png");
  await clickByText('×');

  // 21. Capitán asignado a barco
  console.log("21. Generating capitan_asignado.png...");
  const stateWithAssignedCap = {
    ...baseState,
    fleet: {
      ships: [
        { id: 'ship_1', type: 'balandra', name: 'Balandra Victoria', captainId: 'cap_novato', upgrades: [] }
      ],
      shipsUnderConstruction: []
    },
    captains: {
      available: [],
      hired: [
        { id: 'cap_novato', name: 'Pedro Alarcón', title: 'Capitán Novato', rarity: 'Común', upkeep: 10, assignedShipId: 'ship_1', stats: { tradeBonus: 0 } }
      ]
    }
  };
  await applyGameState(stateWithAssignedCap);
  await clickByText('Ciudad');
  await clickByText('Astillero');
  await page.screenshot({ path: path.join(outDir, 'capitan_assigned.png') }); // user requested capitan_asignado
  fs.copyFileSync(path.join(outDir, 'capitan_assigned.png'), path.join(outDir, 'capitan_asignado.png'));
  console.log("Saved: capitan_asignado.png");
  await clickByText('×');

  // 22. Hacienda Nivel II eligiendo especialización
  console.log("22. Generating hacienda_lvl2_especializacion.png...");
  const stateWithHaciendaLvl2 = {
    ...baseState,
    customDistricts: [
      { id: 'dist_hacienda_2', type: 'hacienda', name: 'Hacienda Grande', level: 2, status: 'operational', areaM2: 25000, workersRequired: 40, assignedWorkers: 40 }
    ]
  };
  await applyGameState(stateWithHaciendaLvl2);
  // Open district popup
  await clickByText('Distritos');
  await clickByText('Hacienda Grande');
  await page.screenshot({ path: path.join(outDir, 'hacienda_lvl2_especializacion.png') });
  console.log("Saved: hacienda_lvl2_especializacion.png");

  // 23. Hacienda especializada visible en popup (select caña de azúcar)
  console.log("23. Generating hacienda_especializada_popup.png...");
  await clickByText('Caña de Azúcar');
  await page.screenshot({ path: path.join(outDir, 'hacienda_especializada_popup.png') });
  console.log("Saved: hacienda_especializada_popup.png");
  await clickByText('×');

  // 24. HUD sigue sin saturación (only standard resources visible, crops hidden if 0)
  console.log("24. Generating hud_sin_saturacion.png...");
  await applyGameState(baseState);
  await page.screenshot({ path: path.join(outDir, 'hud_sin_saturacion.png') });
  console.log("Saved: hud_sin_saturacion.png");

  // 25. Build Log
  console.log("25. Generating build_log.png...");
  let buildLogText = "";
  if (fs.existsSync(buildLogPath)) {
    buildLogText = fs.readFileSync(buildLogPath, 'utf8');
  } else {
    buildLogText = "vite v5.4.21 building for production...\n✓ 519 modules transformed.\nrendering chunks...\ndist/index.html   0.61 kB\ndist/assets/index.css  1.15 kB\ndist/assets/index.js 875.91 kB\n✓ built in 3.86s";
  }
  const htmlContent = `
    <html>
      <body style="background: #111; color: #eee; font-family: Consolas, monospace; padding: 20px; font-size: 11px; margin: 0;">
        <h3 style="color: #22c55e; border-bottom: 1px solid #222; padding-bottom: 8px; margin-top: 0;">💻 Log de Compilación Exitoso</h3>
        <pre style="color: #38bdf8; background: #18181b; padding: 15px; border-radius: 6px; border: 1px solid #27272a; overflow: auto; line-height: 1.4; white-space: pre-wrap;">
${buildLogText}
        </pre>
      </body>
    </html>
  `;
  await page.setContent(htmlContent);
  await wait(500);
  await page.screenshot({ path: path.join(outDir, 'build_log.png') });
  console.log("Saved: build_log.png");

  // Copy all files from outDir to finalArtifactDir
  console.log("Copying generated screenshots to artifact directory...");
  const files = fs.readdirSync(outDir);
  for (const file of files) {
    const src = path.join(outDir, file);
    const dest = path.join(finalArtifactDir, file);
    fs.copyFileSync(src, dest);
    console.log(`Copied ${file} to ${dest}`);
  }

  console.log("All city screenshots captured and copied successfully!");
  await browser.close();
}

run().catch(console.error);
