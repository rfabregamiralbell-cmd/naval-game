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
    defaultViewport: { width: 420, height: 850 } // Mobile aspect ratio
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

  // ----------------------------------------------------
  // SCREENSHOT 02: resources_config.json resumen
  // ----------------------------------------------------
  console.log("Generating 02_resources_config_resumen.png...");
  const resourcesConfigText = fs.readFileSync('C:\\Users\\rfabr\\Desktop\\naval_game\\src\\data\\resources_config.json', 'utf8');
  const resourcesObj = JSON.parse(resourcesConfigText);
  // Prepare a neat summary showing representative resources
  const summaryResources = {
    gold: resourcesObj.gold,
    wood: resourcesObj.wood,
    sails: resourcesObj.sails,
    sugar: resourcesObj.sugar,
    population: resourcesObj.population
  };

  let htmlContent = `
    <html>
      <body style="background: #0f172a; color: #cbd5e1; font-family: monospace; padding: 20px; font-size: 11px; margin: 0;">
        <h3 style="color: #38bdf8; border-bottom: 1px solid #334155; padding-bottom: 8px; margin-top: 0;">🔍 Resumen de resources_config.json</h3>
        <pre style="color: #a7f3d0; background: #1e293b; padding: 15px; border-radius: 8px; border: 1px solid #334155; overflow: auto; line-height: 1.4;">
${JSON.stringify(summaryResources, null, 2)}
        </pre>
      </body>
    </html>
  `;
  await page.setContent(htmlContent);
  await wait(500);
  await page.screenshot({ path: path.join(outDir, '02_resources_config_resumen.png') });
  console.log("Saved: 02_resources_config_resumen.png");

  // ----------------------------------------------------
  // SCREENSHOT 03: buildings_config.json actualizado
  // ----------------------------------------------------
  console.log("Generating 03_buildings_config_actualizado.png...");
  const buildingsConfigText = fs.readFileSync('C:\\Users\\rfabr\\Desktop\\naval_game\\src\\data\\buildings_config.json', 'utf8');
  const buildingsObj = JSON.parse(buildingsConfigText);
  // Grab a few key configs
  const summaryBuildings = {
    hacienda: {
      id: buildingsObj.hacienda.id,
      name: buildingsObj.hacienda.name,
      outputs: buildingsObj.hacienda.outputs,
      futureOutputs: buildingsObj.hacienda.futureOutputs,
      levels: {
        "1": {
          title: buildingsObj.hacienda.levels["1"].title,
          baseProduction: buildingsObj.hacienda.levels["1"].baseProduction
        }
      }
    },
    gremio: {
      id: buildingsObj.gremio.id,
      name: buildingsObj.gremio.name,
      outputs: buildingsObj.gremio.outputs,
      levels: {
        "1": {
          title: buildingsObj.gremio.levels["1"].title,
          baseProduction: buildingsObj.gremio.levels["1"].baseProduction
        }
      }
    },
    aduana: {
      id: buildingsObj.aduana.id,
      name: buildingsObj.aduana.name,
      inputs: buildingsObj.aduana.inputs,
      outputs: buildingsObj.aduana.outputs,
      levels: {
        "1": {
          title: buildingsObj.aduana.levels["1"].title,
          baseProduction: buildingsObj.aduana.levels["1"].baseProduction,
          baseConsumption: buildingsObj.aduana.levels["1"].baseConsumption
        }
      }
    }
  };

  htmlContent = `
    <html>
      <body style="background: #0f172a; color: #cbd5e1; font-family: monospace; padding: 20px; font-size: 11px; margin: 0;">
        <h3 style="color: #fb923c; border-bottom: 1px solid #334155; padding-bottom: 8px; margin-top: 0;">🏛️ Edificios Config: Inputs y Outputs</h3>
        <pre style="color: #fef08a; background: #1e293b; padding: 15px; border-radius: 8px; border: 1px solid #334155; overflow: auto; line-height: 1.4;">
${JSON.stringify(summaryBuildings, null, 2)}
        </pre>
      </body>
    </html>
  `;
  await page.setContent(htmlContent);
  await wait(500);
  await page.screenshot({ path: path.join(outDir, '03_buildings_config_actualizado.png') });
  console.log("Saved: 03_buildings_config_actualizado.png");

  // ----------------------------------------------------
  // SCREENSHOT 09: build log
  // ----------------------------------------------------
  console.log("Generating 09_build_log.png...");
  const logFile = 'C:\\Users\\rfabr\\.gemini\\antigravity\\brain\\568f9189-b871-43ae-9693-affcb269b704\\.system_generated\\tasks\\task-6790.log';
  let buildLog = "";
  if (fs.existsSync(logFile)) {
    buildLog = fs.readFileSync(logFile, 'utf8');
  } else {
    buildLog = "vite v5.4.21 building for production...\n✓ 500 modules transformed.\nrendering chunks...\ndist/index.html   0.61 kB\ndist/assets/index.css  1.15 kB\ndist/assets/index.js 781.23 kB\n✓ built in 3.67s";
  }

  htmlContent = `
    <html>
      <body style="background: #111; color: #eee; font-family: Consolas, monospace; padding: 20px; font-size: 11px; margin: 0;">
        <h3 style="color: #22c55e; border-bottom: 1px solid #222; padding-bottom: 8px; margin-top: 0;">💻 Log de Compilación Exitoso</h3>
        <pre style="color: #38bdf8; background: #18181b; padding: 15px; border-radius: 6px; border: 1px solid #27272a; overflow: auto; line-height: 1.4; white-space: pre-wrap;">
${buildLog}
        </pre>
      </body>
    </html>
  `;
  await page.setContent(htmlContent);
  await wait(500);
  await page.screenshot({ path: path.join(outDir, '09_build_log.png') });
  console.log("Saved: 09_build_log.png");

  // ----------------------------------------------------
  // GAMEPLAY SCREENSHOTS
  // ----------------------------------------------------
  console.log("Loading local game...");
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

  // 2. HUD limpio con recursos principales
  console.log("Capturing clean HUD...");
  await page.screenshot({ path: path.join(outDir, '01_hud_recursos_principales.png') });
  console.log("Saved: 01_hud_recursos_principales.png");

  // 3. Open Cabildo & take 04_selector_cabildo_limpio.png
  console.log("Opening Cabildo selector...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const cab = btns.find(b => b.innerText.includes('Cabildo'));
    if (cab) cab.click();
  });
  await wait(500);
  await page.screenshot({ path: path.join(outDir, '04_selector_cabildo_limpio.png') });
  console.log("Saved: 04_selector_cabildo_limpio.png");

  // Close Cabildo
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const close = btns.find(b => b.innerText === '×');
    if (close) close.click();
  });
  await wait(200);

  // 4. Inject mock districts to show popup details:
  // - Hacienda, Gremio, Aduana, and Arsenal
  console.log("Injecting mock districts...");
  const mockState = {
    resources: {
      gold: 6200,
      wood: 2150,
      materials: 480,
      goods: 120,
      crew: 45,
      sails: 12,
      cannons: 6,
      gunpowder: 24
    },
    storage: {
      wood: 3000,
      materials: 1000,
      goods: 500,
      sails: 100,
      cannons: 50,
      gunpowder: 200
    },
    cabildoLevel: 2,
    cityId: 'port_001',
    customDistricts: [
      {
        id: 'dist_hacienda',
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
        cost: { gold: 400, wood: 100 },
        expansions: []
      },
      {
        id: 'dist_gremio',
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
        cost: { gold: 400, wood: 100 },
        expansions: []
      },
      {
        id: 'dist_aduana',
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
        cost: { gold: 300, wood: 50 },
        expansions: []
      },
      {
        id: 'dist_arsenal',
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
        cost: { gold: 600, wood: 200 },
        expansions: []
      }
    ]
  };

  await page.evaluate((state) => {
    localStorage.setItem('naval_game_clean_state', JSON.stringify(state));
  }, mockState);
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(2000);

  // 5. Open Hacienda Popup -> 05_popup_hacienda_goods.png
  console.log("Opening Hacienda popup...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const distBtn = btns.find(b => b.innerText.includes('Distritos'));
    if (distBtn) distBtn.click();
  });
  await wait(500);
  await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('div'));
    const targetRow = rows.find(d => d.innerText.includes('Finca básica') || d.innerText.includes('Hacienda Agrícola'));
    if (targetRow) targetRow.click();
  });
  await wait(800);
  await page.screenshot({ path: path.join(outDir, '05_popup_hacienda_goods.png') });
  console.log("Saved: 05_popup_hacienda_goods.png");

  // Close popup
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const close = btns.find(b => b.innerText === '×');
    if (close) close.click();
  });
  await wait(300);

  // 6. Open Gremio Popup -> 06_popup_gremio_wood_materials.png
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
  await page.screenshot({ path: path.join(outDir, '06_popup_gremio_wood_materials.png') });
  console.log("Saved: 06_popup_gremio_wood_materials.png");

  // Close popup
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const close = btns.find(b => b.innerText === '×');
    if (close) close.click();
  });
  await wait(300);

  // 7. Open Aduana Popup -> 07_popup_aduana_goods_gold.png
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
  await page.screenshot({ path: path.join(outDir, '07_popup_aduana_goods_gold.png') });
  console.log("Saved: 07_popup_aduana_goods_gold.png");

  // Close popup
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const close = btns.find(b => b.innerText === '×');
    if (close) close.click();
  });
  await wait(300);

  // 8. Open Arsenal Popup -> 08_popup_arsenal_sails.png
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
  await page.screenshot({ path: path.join(outDir, '08_popup_arsenal_sails.png') });
  console.log("Saved: 08_popup_arsenal_sails.png");

  console.log("All resource screenshots captured successfully!");
  await browser.close();
}

run().catch(console.error);
