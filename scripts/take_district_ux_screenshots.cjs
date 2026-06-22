const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const turf = require('@turf/turf');

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// Helper to generate circular district polygons for mock state
function makeCirclePolygon(lat, lng, radiusMeters) {
  const pt = turf.point([lng, lat]);
  const buffered = turf.buffer(pt, radiusMeters / 1000, { units: 'kilometers' });
  // Simplify slightly to look like region-growing shape
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
  
  // Clean console logs redirection for debugging script
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

  // ----------------------------------------------------
  // SCENARIO 1: Hacienda en construcción (borde discontinuo)
  // ----------------------------------------------------
  console.log("Scenario 1: Hacienda in construction...");
  const mockState1 = {
    resources: { gold: 4000, wood: 1800 },
    cabildoLevel: 1,
    cityId: 'port_001',
    customDistricts: [
      {
        id: 'dist_001',
        type: 'hacienda',
        name: 'Hacienda Agrícola',
        polygon: makeCirclePolygon(10.42, -75.54, 150), // center, ~70k m2
        mainBuildingPoint: [10.42, -75.54],
        areaM2: 70000,
        targetWorkers: 90,
        workersRequired: 90,
        assignedWorkers: 90,
        level: 1,
        status: 'constructing',
        createdAt: Date.now(),
        constructionEndsAt: Date.now() + 30000,
        cost: { gold: 500, wood: 150 },
        expansions: []
      }
    ]
  };

  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0' });
  
  // Inject mock state 1
  await page.evaluate((state) => {
    localStorage.setItem('naval_game_clean_state', JSON.stringify(state));
  }, mockState1);
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(2000); // Allow tiles to load

  // Center map on the district programmatically
  await page.evaluate(() => {
    if (window.map) {
      window.map.setView([10.42, -75.54], 15);
    }
  });
  await wait(1000);

  await page.screenshot({ path: path.join(outDir, '01_hacienda_construida.png') });
  console.log("Saved: 01_hacienda_construida.png");

  // ----------------------------------------------------
  // SCENARIO 2: Varias haciendas y gremios con etiquetas compactas
  // ----------------------------------------------------
  console.log("Scenario 2: Multiple districts with compact labels...");
  const mockState2 = {
    resources: { gold: 3500, wood: 1500 },
    cabildoLevel: 1,
    cityId: 'port_001',
    customDistricts: [
      {
        id: 'dist_001',
        type: 'hacienda',
        name: 'Hacienda Agrícola',
        polygon: makeCirclePolygon(10.422, -75.542, 100), // ~31k m2
        mainBuildingPoint: [10.422, -75.542],
        areaM2: 31400,
        targetWorkers: 60,
        workersRequired: 60,
        assignedWorkers: 60,
        level: 1,
        status: 'operational',
        createdAt: Date.now() - 60000,
        cost: { gold: 400, wood: 120 },
        expansions: []
      },
      {
        id: 'dist_002',
        type: 'hacienda',
        name: 'Hacienda Agrícola',
        polygon: makeCirclePolygon(10.418, -75.538, 70), // small
        mainBuildingPoint: [10.418, -75.538],
        areaM2: 15300,
        targetWorkers: 30,
        workersRequired: 30,
        assignedWorkers: 30,
        level: 1,
        status: 'operational',
        createdAt: Date.now() - 60000,
        cost: { gold: 300, wood: 90 },
        expansions: []
      },
      {
        id: 'dist_003',
        type: 'gremio',
        name: 'Gremio de Artesanos',
        polygon: makeCirclePolygon(10.415, -75.543, 85),
        mainBuildingPoint: [10.415, -75.543],
        areaM2: 22600,
        targetWorkers: 45,
        workersRequired: 45,
        assignedWorkers: 45,
        level: 1,
        status: 'operational',
        createdAt: Date.now() - 60000,
        cost: { gold: 450, wood: 100 },
        expansions: []
      }
    ]
  };

  await page.evaluate((state) => {
    localStorage.setItem('naval_game_clean_state', JSON.stringify(state));
  }, mockState2);
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(1500);

  await page.evaluate(() => {
    if (window.map) {
      window.map.setView([10.419, -75.540], 14); // Medium zoom
    }
  });
  await wait(1000);

  await page.screenshot({ path: path.join(outDir, '02_varias_haciendas.png') });
  console.log("Saved: 02_varias_haciendas.png");

  // ----------------------------------------------------
  // SCENARIO 3: Zoom bajo con etiquetas reducidas
  // ----------------------------------------------------
  console.log("Scenario 3: Low zoom compact tooltips...");
  await page.evaluate(() => {
    if (window.map) {
      window.map.setZoom(13);
    }
  });
  await wait(1000);
  await page.screenshot({ path: path.join(outDir, '03_zoom_bajo.png') });
  console.log("Saved: 03_zoom_bajo.png");

  // ----------------------------------------------------
  // SCENARIO 4: Zoom alto con etiquetas completas
  // ----------------------------------------------------
  console.log("Scenario 4: High zoom detailed tooltips...");
  await page.evaluate(() => {
    if (window.map) {
      window.map.setView([10.422, -75.542], 16);
    }
  });
  await wait(1000);
  await page.screenshot({ path: path.join(outDir, '04_zoom_alto.png') });
  console.log("Saved: 04_zoom_alto.png");

  // Reset zoom back to 14 for list panel actions
  await page.evaluate(() => {
    if (window.map) {
      window.map.setView([10.419, -75.540], 14);
    }
  });
  await wait(500);

  // ----------------------------------------------------
  // SCENARIO 6: Lista de distritos
  // ----------------------------------------------------
  console.log("Scenario 6: Display District List panel...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const distsBtn = btns.find(b => b.innerText.includes('Distritos'));
    if (distsBtn) distsBtn.click();
  });
  await wait(500);
  await page.screenshot({ path: path.join(outDir, '06_lista_distritos.png') });
  console.log("Saved: 06_lista_distritos.png");

  // ----------------------------------------------------
  // SCENARIO 7 & 5: Centrar desde lista & Popup Hacienda
  // ----------------------------------------------------
  console.log("Scenario 7 & 5: Center district from list & show popup...");
  // Click first district row in the panel list
  await page.evaluate(() => {
    // Locate the first district card/row in the list panel
    const rows = Array.from(document.querySelectorAll('div'));
    const targetRow = rows.find(d => d.innerText.includes('Hacienda Agrícola II') || d.innerText.includes('Hacienda Agrícola'));
    if (targetRow) targetRow.click();
  });
  await wait(1200); // Wait for map flyTo animation to finish

  // Take map centered screenshot
  await page.screenshot({ path: path.join(outDir, '07_mapa_centrado.png') });
  console.log("Saved: 07_mapa_centrado.png");

  // The popup is now open! Take screenshot of it
  await page.screenshot({ path: path.join(outDir, '05_popup_hacienda.png') });
  console.log("Saved: 05_popup_hacienda.png");

  // ----------------------------------------------------
  // SCENARIO 8: Modo Ampliar Hacienda (selección de +10/+30/+80)
  // ----------------------------------------------------
  console.log("Scenario 8: Enter Expansion Mode...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const expandBtn = btns.find(b => b.innerText.includes('Ampliar'));
    if (expandBtn) expandBtn.click();
  });
  await wait(1000); // Allow expansion proposal calculations to finish

  await page.screenshot({ path: path.join(outDir, '08_modo_ampliar.png') });
  console.log("Saved: 08_modo_ampliar.png");

  // ----------------------------------------------------
  // SCENARIO 9: Previsualización de ampliación válida (tierra seca)
  // ----------------------------------------------------
  console.log("Scenario 9: Valid expansion preview...");
  // Default is +30 workers, which resolves to valid green preview on dry land.
  await page.screenshot({ path: path.join(outDir, '09_ampliacion_valida.png') });
  console.log("Saved: 09_ampliacion_valida.png");

  // ----------------------------------------------------
  // SCENARIO 12: Confirmar ampliación y guardar
  // ----------------------------------------------------
  console.log("Scenario 12: Confirm expansion...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const confirmBtn = btns.find(b => b.innerText.includes('Confirmar ampliación'));
    if (confirmBtn) confirmBtn.click();
  });
  await wait(1500); // Wait for combine & safe building point recalculation

  await page.screenshot({ path: path.join(outDir, '12_distrito_ampliado_guardado.png') });
  console.log("Saved: 12_distrito_ampliado_guardado.png");

  // ----------------------------------------------------
  // SCENARIO 13: JSON de distritos con expansions array
  // ----------------------------------------------------
  console.log("Scenario 13: JSON debugger overlay...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const jsonBtn = btns.find(b => b.innerText.includes('JSON'));
    if (jsonBtn) jsonBtn.click();
  });
  await wait(500);
  await page.screenshot({ path: path.join(outDir, '13_json_expansions.png') });
  console.log("Saved: 13_json_expansions.png");

  // Close JSON modal
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const closeBtn = btns.find(b => b.innerText === '×' && b.style.color === 'rgb(255, 255, 255)');
    if (closeBtn) closeBtn.click();
  });
  await wait(200);

  // ----------------------------------------------------
  // SCENARIO 14: Demolición (Confirmación de reembolso)
  // ----------------------------------------------------
  console.log("Scenario 14: Demolish confirmation screen...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const demoBtn = btns.find(b => b.innerText.includes('Demoler'));
    if (demoBtn) demoBtn.click();
  });
  await wait(500);
  await page.screenshot({ path: path.join(outDir, '14_demoler_confirmacion.png') });
  console.log("Saved: 14_demoler_confirmacion.png");

  // Confirm demolition to check refund persistence
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const confirmDemo = btns.find(b => b.innerText === 'Confirmar Demoler');
    if (confirmDemo) confirmDemo.click();
  });
  await wait(500);

  // ----------------------------------------------------
  // SCENARIO 15: Persistencia tras recarga
  // ----------------------------------------------------
  console.log("Scenario 15: Reloading and checking persistence...");
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(2000);
  await page.screenshot({ path: path.join(outDir, '15_persistencia.png') });
  console.log("Saved: 15_persistencia.png");

  // ----------------------------------------------------
  // SCENARIO 10 & 11: Ampliación inválida hacia agua & mensaje
  // ----------------------------------------------------
  console.log("Scenario 10 & 11: Invalid expansion towards water...");
  // Let's reload the page with a district placed right at the shoreline of the bay
  const mockStateWater = {
    resources: { gold: 3000, wood: 1000 },
    cabildoLevel: 1,
    cityId: 'port_001',
    customDistricts: [
      {
        id: 'dist_water',
        type: 'hacienda',
        name: 'Hacienda Costera',
        polygon: makeCirclePolygon(10.423, -75.547, 60), // Next to water
        mainBuildingPoint: [10.423, -75.547],
        areaM2: 12000,
        targetWorkers: 30,
        workersRequired: 30,
        assignedWorkers: 30,
        level: 1,
        status: 'operational',
        createdAt: Date.now() - 60000,
        cost: { gold: 200, wood: 50 },
        expansions: []
      }
    ]
  };

  await page.evaluate((state) => {
    localStorage.setItem('naval_game_clean_state', JSON.stringify(state));
  }, mockStateWater);
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(1500);

  // Center on water district
  await page.evaluate(() => {
    if (window.map) {
      window.map.setView([10.423, -75.547], 15);
    }
  });
  await wait(500);

  // Click on the district icon or row from list to select it
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const distsBtn = btns.find(b => b.innerText.includes('Distritos'));
    if (distsBtn) distsBtn.click();
  });
  await wait(500);

  await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('div'));
    const targetRow = rows.find(d => d.innerText.includes('Hacienda Costera'));
    if (targetRow) targetRow.click();
  });
  await wait(1000);

  // Trigger expansion
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const expandBtn = btns.find(b => b.innerText.includes('Ampliar'));
    if (expandBtn) expandBtn.click();
  });
  await wait(500);

  // Select +80 workers to force it to grow deep into the water/wetland
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const inc80Btn = btns.find(b => b.innerText.includes('+80 Trab.'));
    if (inc80Btn) inc80Btn.click();
  });
  await wait(1500); // Allow expansion proposals and water validator tile fetches to run

  // Take invalid proposed preview (red outline/fill) screenshot
  await page.screenshot({ path: path.join(outDir, '10_ampliacion_invalida.png') });
  console.log("Saved: 10_ampliacion_invalida.png");

  // Take error message screenshot
  await page.screenshot({ path: path.join(outDir, '11_mensaje_agua_humedal.png') });
  console.log("Saved: 11_mensaje_agua_humedal.png");

  console.log("All screenshots captured successfully!");
  await browser.close();
}

run().catch(console.error);
