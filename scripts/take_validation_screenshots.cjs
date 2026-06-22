const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function takeScreenshots() {
  const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 375, height: 812 } });
  const page = await browser.newPage();
  
  // Create output dir if needed
  const outDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  console.log("Loading page...");
  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0' });
  await wait(2000); // Wait for tiles to load
  
  // 1. Cabildo / Open UI
  console.log("Opening Cabildo...");
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    btns.forEach(b => { if (b.innerText.includes('Cabildo')) b.click() });
  });
  await wait(500);

  // 2. Select Hacienda & preview
  console.log("Selecting Hacienda...");
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    btns.forEach(b => { if (b.innerText.includes('Hacienda')) b.click() });
  });
  await wait(200);
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    btns.forEach(b => { if (b.innerText.includes('Colocar en mapa')) b.click() });
  });
  await wait(1000);
  
  await page.screenshot({ path: path.join(outDir, '01_hacienda_preview.png') });
  
  // 3. Move map to land
  console.log("Moving map to land...");
  await page.mouse.move(180, 400);
  await page.mouse.down();
  await page.mouse.move(180, 200, { steps: 5 });
  await page.mouse.up();
  await wait(1500);
  await page.screenshot({ path: path.join(outDir, '02_hacienda_valida_tierra.png') });

  // 4. Move map to water/mangrove
  console.log("Moving map to water...");
  await page.mouse.move(180, 400);
  await page.mouse.down();
  await page.mouse.move(180, 700, { steps: 5 }); // Drag map up to move view down
  await page.mouse.up();
  await wait(1500);
  await page.screenshot({ path: path.join(outDir, '03_hacienda_invalida_agua.png') });

  // 5. Cancel and Select Aduana
  console.log("Canceling and selecting Aduana...");
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    btns.forEach(b => { if (b.innerText.includes('Cancelar')) b.click() });
  });
  await wait(500);
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    btns.forEach(b => { if (b.innerText.includes('Cabildo')) b.click() });
  });
  await wait(500);
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    btns.forEach(b => { if (b.innerText.includes('Aduana')) b.click() });
  });
  await wait(200);
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    btns.forEach(b => { if (b.innerText.includes('Colocar en mapa')) b.click() });
  });
  await wait(1500);

  // Take Aduana near water screenshot
  await page.screenshot({ path: path.join(outDir, '04_aduana_cerca_costa.png') });
  
  // 6. Confirm District
  console.log("Confirming district...");
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    btns.forEach(b => { if (b.innerText.includes('Confirmar construcción')) b.click() });
  });
  await wait(1000);
  await page.screenshot({ path: path.join(outDir, '05_distrito_confirmado.png') });
  
  // 7. Reload and check persistence
  console.log("Reloading...");
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(2000);
  await page.screenshot({ path: path.join(outDir, '06_persistencia_recarga.png') });

  console.log("Done.");
  await browser.close();
}

takeScreenshots().catch(console.error);
