import { test,expect } from '@playwright/test';
test('home, navigation and mobile overflow',async({page})=>{
 await page.goto('/');await expect(page.getByRole('heading',{name:/Boas conexões/})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.getByLabel('Que serviço você está procurando?').fill('Elétrica');await page.getByRole('button',{name:'Encontrar profissionais',exact:true}).click();
 await expect(page).toHaveURL(/profissionais\?q=/);await expect(page.getByRole('heading',{name:'Encontre quem pode ajudar.'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('private routes redirect and signup has no false success',async({page})=>{
 await page.goto('/admin');await expect(page).toHaveURL(/entrar/);await page.goto('/dashboard');await expect(page).toHaveURL(/entrar/);
 await page.goto('/cadastro');await expect(page.getByRole('heading',{name:'Apresente seu talento.'})).toBeVisible();await expect(page.getByRole('button',{name:'Criar minha conta'})).toBeDisabled();
});
test('manifest, safe offline shell and API restrictions',async({request})=>{
 const manifest=await request.get('/manifest.webmanifest');expect(manifest.ok()).toBe(true);expect((await manifest.json()).icons).toHaveLength(3);
 const sw=await request.get('/sw.js');expect(await sw.text()).not.toContain("cache.put(event.request");
 const offline=await request.get('/offline.html');expect(await offline.text()).toContain('Nenhuma informação privada');
 const upload=await request.post('/api/uploads',{data:{name:'a.jpg',size:100,type:'image/jpeg'},headers:{origin:'https://attacker.example'}});expect(upload.status()).toBe(403);
});
test('privacy and terms are transparent about launch readiness',async({page})=>{await page.goto('/privacidade');await expect(page.getByRole('heading',{name:'Privacidade e seus dados'})).toBeVisible();await expect(page.getByText(/Documento em revisão/)).toBeVisible();await page.goto('/termos');await expect(page.getByRole('heading',{name:'Termos de uso',exact:true})).toBeVisible();});
