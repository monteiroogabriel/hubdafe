import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./tests/e2e',fullyParallel:true,retries:0,
 use:{baseURL:process.env.E2E_BASE_URL||'http://localhost:3000',trace:'retain-on-failure',headless:true},
 projects:[{name:'desktop',use:{browserName:'chromium',channel:'chrome',viewport:{width:1440,height:1000}}},{name:'mobile',use:{browserName:'chromium',channel:'chrome',viewport:{width:360,height:800},isMobile:true,hasTouch:true}}],
 reporter:[['list'],['html',{open:'never'}]],
});
