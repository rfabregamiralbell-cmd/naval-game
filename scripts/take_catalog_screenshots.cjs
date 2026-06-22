const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const turf = require('@turf/turf');

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// Helper to generate circular district polygons for mock state
function makeCirclePolygon(lat, lng, radiusMeters) {
  const pt = turf.point([lng, lat]);
  const buffered = turf.buffer(pt, radiusMeters / 1000, { units: 'kilometers' });
  const simplified = turf.simplify(buffered, { tolerance: 0.0001, highQuality: true });
  return simplified;
}

async function run() {
  const outDir = 'C:\\Users\\rfabr\\.gemini\\antigravity\\brain\\568f9189-b871-43ae-9693-affcb269b704';
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 400, height: 850 } // Mobile aspect ratio
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await wait(1000);

  // 1. Reset state
  console.log("Resetting game state...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const reset = btns.find(b => b.innerText.includes('Reset'));
    if (reset) reset.click();
  });
  await wait(1000);

  // 2. Open Cabildo & take 01_selector_edificios.png
  console.log("Opening Cabildo selector...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const cab = btns.find(b => b.innerText.includes('Cabildo'));
    if (cab) cab.click();
  });
  await wait(500);
  await page.screenshot({ path: path.join(outDir, '01_selector_edificios.png') });
  console.log("Saved: 01_selector_edificios.png");

  // 3. Build a Hacienda Level I
  console.log("Placing Hacienda Level I...");
  await page.evaluate(() => {
    // Select Hacienda
    const btns = Array.from(document.querySelectorAll('button'));
    const hacienda = btns.find(b => b.innerText.includes('Hacienda Agrícola'));
    if (hacienda) hacienda.click();
  });
  await wait(200);

  // Move slider to targetWorkers = 25 (Hacienda Level I: <= 30)
  await page.evaluate(() => {
    const slider = document.querySelector('input[type="range"]');
    if (slider) {
      slider.value = 25;
      // Trigger react change event
      const event = new Event('input', { bubbles: true });
      slider.dispatchEvent(event);
    }
  });
  await wait(500);

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const place = btns.find(b => b.innerText.includes('Colocar en mapa'));
    if (place) place.click();
  });
  await wait(1000);

  // Confirm placement
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const confirm = btns.find(b => b.innerText.includes('Confirmar construcción'));
    if (confirm) confirm.click();
  });
  await wait(1000);

  // Take screenshot 04_hacienda_lvl1.png
  await page.screenshot({ path: path.join(outDir, '04_hacienda_lvl1.png') });
  console.log("Saved: 04_hacienda_lvl1.png");

  // Set first Hacienda to operational to click it
  await page.evaluate(() => {
    const stateStr = localStorage.getItem('naval_game_clean_state');
    if (stateStr) {
      const state = JSON.parse(stateStr);
      state.customDistricts[0].status = 'operational';
      localStorage.setItem('naval_game_clean_state', JSON.stringify(state));
    }
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(1500);

  // Click the Hacienda to open popup and show Camino warning
  console.log("Opening Hacienda popup to show Camino Interior warning...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const distBtn = btns.find(b => b.innerText.includes('Distritos'));
    if (distBtn) distBtn.click();
  });
  await wait(500);

  await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('div'));
    const targetRow = rows.find(d => d.innerText.includes('Hacienda Agrícola'));
    if (targetRow) targetRow.click();
  });
  await wait(1000);

  // Take screenshot 07_popup_warning_camino.png
  await page.screenshot({ path: path.join(outDir, '07_popup_warning_camino.png') });
  console.log("Saved: 07_popup_warning_camino.png");

  // Close popup
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const close = btns.find(b => b.innerText === '×' && b.style.color === 'rgb(136, 136, 136)');
    if (close) close.click();
  });
  await wait(200);

  // 4. Test expansion blocked by requirements
  // Let's click "Ampliar" on the Hacienda and select +80 workers
  // (Total workers becomes 25 + 80 = 105, which is Level III, requiring Cabildo Level 2.
  // Since Cabildo is Level 1, it should show "⚠️ Bloqueado: Requiere Cabildo Nivel 2"!)
  console.log("Testing expansion blocked by requirements...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const distBtn = btns.find(b => b.innerText.includes('Distritos'));
    if (distBtn) distBtn.click();
  });
  await wait(500);
  await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('div'));
    const targetRow = rows.find(d => d.innerText.includes('Hacienda Agrícola'));
    if (targetRow) targetRow.click();
  });
  await wait(500);
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const expand = btns.find(b => b.innerText.includes('Ampliar'));
    if (expand) expand.click();
  });
  await wait(500);
  // Select +80 workers
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const inc80 = btns.find(b => b.innerText.includes('+80 Trab.'));
    if (inc80) inc80.click();
  });
  await wait(1000);

  // Take screenshot 06_ampliacion_bloqueada.png
  await page.screenshot({ path: path.join(outDir, '06_ampliacion_bloqueada.png') });
  console.log("Saved: 06_ampliacion_bloqueada.png");

  // Cancel expansion
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const cancel = btns.find(b => b.innerText === 'Cancelar' && b.style.background === 'rgb(34, 34, 34)');
    if (cancel) cancel.click();
  });
  await wait(200);
  // Close popup
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const close = btns.find(b => b.innerText === '×' && b.style.color === 'rgb(136, 136, 136)');
    if (close) close.click();
  });
  await wait(200);

  // 5. Upgrade Cabildo to lvl 2 & build Camino Interior lvl 1
  // To verify Hacienda Level II, we can inject a mock state containing:
  // - Cabildo level 2
  // - Operational Camino Interior district
  // - Operational Hacienda district with 55 workers (Level II title "Plantación organizada")
  console.log("Scenario 5: Hacienda Level II via mock upgrade...");
  const mockStateLvl2 = {
    resources: { gold: 8000, wood: 4000 },
    cabildoLevel: 2,
    cityId: 'port_001',
    customDistricts: [
      {
        id: 'dist_hacienda',
        type: 'hacienda',
        name: 'Hacienda Agrícola',
        polygon: makeCirclePolygon(10.422, -75.542, 90), // ~25k m2
        mainBuildingPoint: [10.422, -75.542],
        areaM2: 25000,
        targetWorkers: 55,
        workersRequired: 55,
        assignedWorkers: 55,
        level: 2,
        status: 'operational',
        createdAt: Date.now() - 60000,
        cost: { gold: 500, wood: 150 },
        expansions: [{
          id: 'exp_01',
          areaAddedM2: 5000,
          workersAdded: 30,
          cost: { gold: 100, wood: 50 },
          createdAt: Date.now() - 10000
        }]
      },
      {
        id: 'dist_camino',
        type: 'camino',
        name: 'Camino Interior',
        polygon: makeCirclePolygon(10.418, -75.538, 50),
        mainBuildingPoint: [10.418, -75.538],
        areaM2: 12000,
        targetWorkers: 20,
        workersRequired: 20,
        assignedWorkers: 20,
        level: 1,
        status: 'operational',
        createdAt: Date.now() - 60000,
        cost: { gold: 300, wood: 100 },
        expansions: []
      }
    ]
  };

  await page.evaluate((state) => {
    localStorage.setItem('naval_game_clean_state', JSON.stringify(state));
  }, mockStateLvl2);
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(2000);

  // Click Hacienda
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const distBtn = btns.find(b => b.innerText.includes('Distritos'));
    if (distBtn) distBtn.click();
  });
  await wait(500);
  await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('div'));
    const targetRow = rows.find(d => d.innerText.includes('Plantación organizada') || d.innerText.includes('Hacienda Agrícola II') || d.innerText.includes('Hacienda Agrícola'));
    if (targetRow) targetRow.click();
  });
  await wait(1000);

  // Take screenshot 05_hacienda_lvl2.png (showing "Plantación organizada" and 55/55 workers)
  await page.screenshot({ path: path.join(outDir, '05_hacienda_lvl2.png') });
  console.log("Saved: 05_hacienda_lvl2.png");

  // Close popup
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const close = btns.find(b => b.innerText === '×' && b.style.color === 'rgb(136, 136, 136)');
    if (close) close.click();
  });
  await wait(200);

  // ----------------------------------------------------
  // SCENARIO 8: Place Gremio Nivel I
  // ----------------------------------------------------
  console.log("Scenario 8: Gremio Level I popup...");
  const mockStateAll = {
    resources: { gold: 12000, wood: 5000 },
    cabildoLevel: 3,
    cityId: 'port_001',
    customDistricts: [
      {
        id: 'd_hacienda',
        type: 'hacienda',
        name: 'Hacienda Agrícola',
        polygon: makeCirclePolygon(10.424, -75.541, 70),
        mainBuildingPoint: [10.424, -75.541],
        areaM2: 15000,
        targetWorkers: 25,
        workersRequired: 25,
        assignedWorkers: 25,
        level: 1,
        status: 'operational',
        createdAt: Date.now() - 60000,
        cost: { gold: 300, wood: 100 },
        expansions: []
      },
      {
        id: 'd_gremio',
        type: 'gremio',
        name: 'Gremio de Artesanos',
        polygon: makeCirclePolygon(10.420, -75.540, 70),
        mainBuildingPoint: [10.420, -75.540],
        areaM2: 15000,
        targetWorkers: 25,
        workersRequired: 25,
        assignedWorkers: 25,
        level: 1,
        status: 'operational',
        createdAt: Date.now() - 60000,
        cost: { gold: 300, wood: 100 },
        expansions: []
      },
      {
        id: 'd_almacen',
        type: 'almacen',
        name: 'Almacenes de Depósito',
        polygon: makeCirclePolygon(10.417, -75.537, 70),
        mainBuildingPoint: [10.417, -75.537],
        areaM2: 15000,
        targetWorkers: 25,
        workersRequired: 25,
        assignedWorkers: 25,
        level: 1,
        status: 'operational',
        createdAt: Date.now() - 60000,
        cost: { gold: 300, wood: 100 },
        expansions: []
      },
      {
        id: 'd_puerto',
        type: 'puerto',
        name: 'Puerto Comercial',
        polygon: makeCirclePolygon(10.422, -75.546, 70),
        mainBuildingPoint: [10.422, -75.546],
        areaM2: 15000,
        targetWorkers: 25,
        workersRequired: 25,
        assignedWorkers: 25,
        level: 1,
        status: 'operational',
        createdAt: Date.now() - 60000,
        cost: { gold: 300, wood: 100 },
        expansions: []
      },
      {
        id: 'd_aduana',
        type: 'aduana',
        name: 'Aduana',
        polygon: makeCirclePolygon(10.425, -75.545, 60),
        mainBuildingPoint: [10.425, -75.545],
        areaM2: 12000,
        targetWorkers: 25,
        workersRequired: 25,
        assignedWorkers: 25,
        level: 1,
        status: 'operational',
        createdAt: Date.now() - 60000,
        cost: { gold: 300, wood: 100 },
        expansions: []
      },
      {
        id: 'd_arsenal',
        type: 'arsenal',
        name: 'Arsenal',
        polygon: makeCirclePolygon(10.420, -75.548, 65),
        mainBuildingPoint: [10.420, -75.548],
        areaM2: 13000,
        targetWorkers: 25,
        workersRequired: 25,
        assignedWorkers: 25,
        level: 1,
        status: 'operational',
        createdAt: Date.now() - 60000,
        cost: { gold: 300, wood: 100 },
        expansions: []
      },
      {
        id: 'd_fortaleza',
        type: 'fortaleza',
        name: 'Fortaleza',
        polygon: makeCirclePolygon(10.415, -75.543, 70),
        mainBuildingPoint: [10.415, -75.543],
        areaM2: 15000,
        targetWorkers: 25,
        workersRequired: 25,
        assignedWorkers: 25,
        level: 1,
        status: 'operational',
        createdAt: Date.now() - 60000,
        cost: { gold: 300, wood: 100 },
        expansions: []
      },
      {
        id: 'd_camino',
        type: 'camino',
        name: 'Camino Interior',
        polygon: makeCirclePolygon(10.413, -75.539, 70),
        mainBuildingPoint: [10.413, -75.539],
        areaM2: 15000,
        targetWorkers: 25,
        workersRequired: 25,
        assignedWorkers: 25,
        level: 1,
        status: 'operational',
        createdAt: Date.now() - 60000,
        cost: { gold: 300, wood: 100 },
        expansions: []
      }
    ]
  };

  await page.evaluate((state) => {
    localStorage.setItem('naval_game_clean_state', JSON.stringify(state));
  }, mockStateAll);
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(2000);

  // Click Gremio
  console.log("Opening Gremio popup...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const distBtn = btns.find(b => b.innerText.includes('Distritos'));
    if (distBtn) distBtn.click();
  });
  await wait(500);
  await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('div'));
    const targetRow = rows.find(d => d.innerText.includes('Talleres artesanales') || d.innerText.includes('Gremio de Artesanos'));
    if (targetRow) targetRow.click();
  });
  await wait(800);
  await page.screenshot({ path: path.join(outDir, '08_gremio_lvl1.png') });
  console.log("Saved: 08_gremio_lvl1.png");

  // Close popup
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const close = btns.find(b => b.innerText === '×' && b.style.color === 'rgb(136, 136, 136)');
    if (close) close.click();
  });
  await wait(200);

  // Click Aduana
  console.log("Opening Aduana popup...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const distBtn = btns.find(b => b.innerText.includes('Distritos'));
    if (distBtn) distBtn.click();
  });
  await wait(500);
  await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('div'));
    const targetRow = rows.find(d => d.innerText.includes('Aduana local') || d.innerText.includes('Aduana'));
    if (targetRow) targetRow.click();
  });
  await wait(800);
  await page.screenshot({ path: path.join(outDir, '09_aduana_lvl1.png') });
  console.log("Saved: 09_aduana_lvl1.png");

  // Close popup
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const close = btns.find(b => b.innerText === '×' && b.style.color === 'rgb(136, 136, 136)');
    if (close) close.click();
  });
  await wait(200);

  // Click Puerto
  console.log("Opening Puerto popup...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const distBtn = btns.find(b => b.innerText.includes('Distritos'));
    if (distBtn) distBtn.click();
  });
  await wait(500);
  await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('div'));
    const targetRow = rows.find(d => d.innerText.includes('Muelle pequeño') || d.innerText.includes('Puerto Comercial'));
    if (targetRow) targetRow.click();
  });
  await wait(800);
  await page.screenshot({ path: path.join(outDir, '10_puerto_lvl1.png') });
  console.log("Saved: 10_puerto_lvl1.png");

  // Close popup
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const close = btns.find(b => b.innerText === '×' && b.style.color === 'rgb(136, 136, 136)');
    if (close) close.click();
  });
  await wait(200);

  // Click Arsenal
  console.log("Opening Arsenal popup...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const distBtn = btns.find(b => b.innerText.includes('Distritos'));
    if (distBtn) distBtn.click();
  });
  await wait(500);
  await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('div'));
    const targetRow = rows.find(d => d.innerText.includes('Astillero civil') || d.innerText.includes('Arsenal'));
    if (targetRow) targetRow.click();
  });
  await wait(800);
  await page.screenshot({ path: path.join(outDir, '11_arsenal_lvl1.png') });
  console.log("Saved: 11_arsenal_lvl1.png");

  // Close popup
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const close = btns.find(b => b.innerText === '×' && b.style.color === 'rgb(136, 136, 136)');
    if (close) close.click();
  });
  await wait(200);

  // Click Fortaleza
  console.log("Opening Fortaleza popup...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const distBtn = btns.find(b => b.innerText.includes('Distritos'));
    if (distBtn) distBtn.click();
  });
  await wait(500);
  await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('div'));
    const targetRow = rows.find(d => d.innerText.includes('Batería costera') || d.innerText.includes('Fortaleza'));
    if (targetRow) targetRow.click();
  });
  await wait(800);
  await page.screenshot({ path: path.join(outDir, '12_fortaleza_lvl1.png') });
  console.log("Saved: 12_fortaleza_lvl1.png");

  // Close popup
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const close = btns.find(b => b.innerText === '×' && b.style.color === 'rgb(136, 136, 136)');
    if (close) close.click();
  });
  await wait(200);

  // ----------------------------------------------------
  // SCENARIO 13: Mapa con varios tipos de edificios
  // ----------------------------------------------------
  console.log("Scenario 13: Map view showing all operational districts...");
  // Deselect popups, center map to fit all
  await page.evaluate(() => {
    if (window.map) {
      window.map.setView([10.418, -75.543], 15);
    }
  });
  await wait(1200);
  await page.screenshot({ path: path.join(outDir, '13_mapa_varios.png') });
  console.log("Saved: 13_mapa_varios.png");

  console.log("All catalog screenshots captured successfully!");
  await browser.close();
}

run().catch(console.error);
