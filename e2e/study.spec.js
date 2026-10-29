import { test, expect } from '@playwright/test';
test('study answers lock, bookmarks persist, and sessions resume after reload', async ({page}) => {
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto('./'); await expect(page.getByRole('heading',{name:'Build a practice session'})).toBeVisible();
 await page.getByLabel('Shuffle questions',{exact:true}).uncheck();
 await page.getByRole('button',{name:'Start mixed practice'}).click();
 await page.getByRole('button',{name:'Bookmark',exact:true}).click();
 await page.locator('.answer-option').first().click(); await page.getByRole('button',{name:'Check answer',exact:true}).click();
 await expect(page.locator('.answer-option').first()).toBeDisabled();
 await page.getByRole('button',{name:'Next question'}).click(); await page.getByRole('button',{name:'Previous'}).click();
 await expect(page.locator('.answer-option').first()).toBeDisabled();
 await page.reload(); await expect(page.getByRole('button',{name:'Bookmarked',exact:true})).toBeVisible();
 await expect(page.locator('.answer-option').first()).toBeDisabled();
 await page.screenshot({path:'/tmp/mcqer-study-desktop.png'});
 expect(errors).toEqual([]);
});
test('native dialogs close with Escape and personal courses survive reload and backup',async({page})=>{
 await page.goto('./'); await expect(page.locator('.sidebar .course-list')).toBeVisible();
 await page.getByRole('button',{name:'Create course',exact:true}).last().click();
 await page.getByLabel('Course code').fill('QA101'); await page.getByLabel('Course title').fill('Browser QA');
 await page.getByRole('button',{name:'Create course',exact:true}).last().click();
 await page.reload(); await expect(page.getByRole('button',{name:/Browser QA/}).last()).toBeVisible();
 await page.getByRole('button',{name:/Browser QA/}).last().click();
 await page.getByRole('button',{name:'Add chapter',exact:true}).first().click();
 await page.keyboard.press('Escape'); await expect(page.locator('dialog.modal')).toHaveCount(0);
 await page.getByRole('button',{name:'Add chapter',exact:true}).first().click();
 await page.getByLabel('Chapter title').fill('QA chapter'); await page.locator('dialog').getByRole('button',{name:'Add chapter',exact:true}).click();
 await page.getByRole('button',{name:'Add question',exact:true}).click();
 await page.getByLabel('Question',{exact:true}).fill('A persisted question?');
 for (const id of ['A','B','C','D']) await page.getByLabel('Option '+id,{exact:true}).fill('Choice '+id);
 await page.getByLabel('Explanation',{exact:true}).fill('An explanation.');
 await page.locator('dialog.modal').getByRole('button',{name:'Add question',exact:true}).click();
 await expect(page.locator('.question-total')).toHaveText('1 question'); await page.reload();
 await page.getByRole('button',{name:/Browser QA/}).last().click(); await expect(page.locator('.question-total')).toHaveText('1 question');
 const downloadPromise=page.waitForEvent('download'); await page.getByRole('button',{name:'Download backup'}).last().click();
 const download=await downloadPromise; await download.saveAs('/tmp/mcqer-e2e-backup.json');
 await page.locator('input[type=file]').nth(1).setInputFiles('/tmp/mcqer-e2e-backup.json');
 await expect(page.getByRole('status').filter({hasText:'Backup merged'})).toBeVisible();
});
test('production app and questions load offline at mobile width',async({page,context})=>{
 await page.setViewportSize({width:390,height:844}); await page.goto('./');
 await expect(page.getByText('Available offline',{exact:true})).toBeVisible();
 await page.reload(); await expect(page.getByRole('heading',{name:'Build a practice session'})).toBeVisible();
 await context.setOffline(true); await page.reload();
 await expect(page.getByRole('button',{name:'Start mixed practice'})).toBeEnabled();
 await page.getByRole('button',{name:'Start mixed practice'}).click(); await expect(page.locator('.answer-option').first()).toBeVisible();
 await page.screenshot({path:'/tmp/mcqer-study-mobile.png'});
});
test('service worker update preserves the active practice session', async ({page}) => {
 const { readFile, writeFile } = await import('node:fs/promises');
 await page.goto('./'); await expect(page.getByText('Available offline',{exact:true})).toBeVisible();
 await page.reload(); await page.getByRole('button',{name:'Start mixed practice'}).click();
 await page.locator('.answer-option').first().click(); await page.getByRole('button',{name:'Check answer',exact:true}).click();
 const question = await page.locator('.question-panel h2').textContent();
 const original = await readFile('dist/sw.js','utf8');
 try {
  await writeFile('dist/sw.js', original + '\n// Browser regression update ' + Date.now());
  await page.evaluate(async () => { const registration = await navigator.serviceWorker.ready; await registration.update(); });
  await expect(page.getByRole('button',{name:'Reload to update'})).toBeVisible({timeout:15000});
  await page.getByRole('button',{name:'Reload to update'}).click();
  await expect(page.locator('.question-panel h2')).toHaveText(question);
  await expect(page.locator('.answer-option').first()).toBeDisabled();
 } finally { await writeFile('dist/sw.js',original); }
});
test('search and bookmark filters lead to practice and mistakes can be retried', async ({page}) => {
 await page.goto('./'); await expect(page.getByRole('heading',{name:'Build a practice session'})).toBeVisible();
 await page.getByLabel('Shuffle questions',{exact:true}).uncheck();
 await page.getByRole('button',{name:'Start mixed practice'}).click();
 const stem = await page.locator('.question-panel h2').textContent();
 await page.getByRole('button',{name:'Bookmark',exact:true}).click();
 await page.locator('.answer-option').first().click(); await page.getByRole('button',{name:'Check answer',exact:true}).click();
 await page.getByRole('button',{name:/Back to /}).first().click();
 await page.getByLabel('Bookmarked only').check(); await page.getByLabel('Search questions').fill(stem);
 await expect(page.locator('.search-results li')).toHaveCount(1);
 await page.locator('.search-results button').click();
 await expect(page.locator('.question-panel h2')).toHaveText(stem);
 const options = await page.locator('.answer-option').count();
 // Try every option in a fresh attempt, guaranteeing at least one mistake.
 for(let i=0;i<options;i++) {
  await page.locator('.answer-option').nth(i).click(); await page.getByRole('button',{name:'Check answer',exact:true}).click();
  await page.getByRole('button',{name:'View results'}).click(); await page.getByRole('button',{name:'Try again'}).click();
 }
 await page.getByRole('button',{name:/Back to /}).first().click();
 await page.getByRole('button',{name:'Review mistakes'}).click(); await expect(page.locator('.question-panel h2')).toHaveText(stem);
});
test('one failed course leaves healthy courses available and retry recovers',async({browser})=>{
 const context=await browser.newContext({serviceWorkers:'block'}); const page=await context.newPage();
 await page.route('**/questions/ac3302-ac2206.json',route=>route.fulfill({status:503,body:'Unavailable'}));
 await page.goto('http://127.0.0.1:4174/mcqer/');
 await expect(page.getByRole('button',{name:'Retry shared courses'})).toBeVisible();
 await expect(page.locator('.sidebar .course-item')).toHaveCount(4);
 await page.unroute('**/questions/ac3302-ac2206.json'); await page.getByRole('button',{name:'Retry shared courses'}).click();
 await expect(page.locator('.sidebar .course-item')).toHaveCount(5); await context.close();
});
