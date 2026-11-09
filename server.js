// PixelShop — original Telegram store dashboard (Express + JSON file DB)
// Inspired by the layout/functionality of GG Builder; all code, copy and
// UI in this repo are original. No GG Builder assets, text or branding copied.
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'pixelshop-dev-secret-change-me';
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const DB_FILE = path.join(__dirname, 'data', 'db.json');
const app = express();
app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const uid = (p='id') => p + '_' + crypto.randomBytes(6).toString('hex');
const now = () => new Date().toISOString();
const money = n => Math.round((+n || 0) * 100) / 100;

// ---------- DB ----------
let db = null;
function seed() {
  const cats = ['ChatGPT','Claude','VPN','QuillBot','Figma','Mails','Manus','Notion','Linkedin','Prime Video','Telegram','YouTube','Capcut','Grok','Eleven Labs','Cursor'];
  const emojis = ['🤖','✨','🛡️','✍️','🎨','📧','🧠','📝','💼','🎬','✈️','▶️','✂️','🌌','🎙️','⌨️'];
  return {
    merchants: [],
    verifyCodes: [], // {phone, code, expiresAt, purpose}
    store: {
      name: 'PixelShop', slug: 'pixelshop', status: 'DRAFT',
      maintenance: false, maintenanceMessage: 'We are back soon.',
      operatorTelegramId: '', welcomeText: 'Welcome! Choose a product from the menu below.',
      botTokenSet: !!BOT_TOKEN, botUsername: BOT_TOKEN ? '' : 'pixelbuy_bot',
      mandatoryJoin: false, mandatoryGroup: false, mandatoryChannel: false,
      helpMessage: 'Need help? Message support and we will reply shortly.',
      policyMessage: 'All sales are final for delivered digital codes.',
      supportEnabled: true, supportUsername: '@pixelshop_support',
      adminEnabled: false, adminUsername: '',
      alerts: { depositCredited:true, lowStock:true, lowStockAt:3, outOfStock:true, deliveryFailed:true, refundFailed:true, etaOverdue:true, unitStuck24h:true },
      groups: [], channels: []
    },
    categories: cats.map((n,i)=>({ id: uid('cat'), name:n, slug:n.toLowerCase().replace(/[^a-z0-9]+/g,'-'), emoji:emojis[i], enabled:true, order:i+1, locales:{en:n} })),
    products: [], offers: [], inventory: [],
    customers: [
      { id:'cust_demo1', telegramId: 1001, name:'Ayesha Rahman', username:'ayesha_r', language:'en', balance: 25.5, totalSpend: 45.5, purchases: 2, joined: '2026-11-01T10:00:00Z', lastActive: now(), notifications: true, country:'BD' },
      { id:'cust_demo2', telegramId: 1002, name:'Tanvir Hasan', username:'tanvir_h', language:'bn', balance: 0, totalSpend: 12, purchases: 1, joined: '2026-11-05T10:00:00Z', lastActive: now(), notifications: true, country:'BD' },
    ],
    orders: [], transactions: [], depositCodes: [], paymentMethods: [
      { id: uid('pm'), type:'Binance Pay', provider:'binance', enabled:false, config:{}, createdAt: now() },
      { id: uid('pm'), type:'Telegram Stars', provider:'stars', enabled:false, config:{}, createdAt: now() },
    ],
    broadcasts: [], notifications: [
      { id: uid('nt'), title:'Welcome to PixelShop', body:'Your store is in DRAFT. Publish a product to go live.', type:'Platform', read:false, createdAt: now() },
      { id: uid('nt'), title:'Low stock warning', body:'ChatGPT Plus 1m has 2 units left.', type:'Warnings', read:false, createdAt: now() },
    ],
    languages: [
      { code:'en', name:'English', percent:100, status:'Live' },
      { code:'ar', name:'Arabic', percent:100, status:'Live' },
      { code:'bn', name:'Bengali', percent:92, status:'Live' },
      { code:'es', name:'Spanish', percent:88, status:'Ready' },
      { code:'fa', name:'Persian', percent:81, status:'Ready' },
      { code:'hi', name:'Hindi', percent:85, status:'Ready' },
      { code:'pt-BR', name:'Portuguese (Brazil)', percent:90, status:'Live' },
      { code:'ru', name:'Russian', percent:87, status:'Ready' },
      { code:'vi', name:'Vietnamese', percent:84, status:'Ready' },
      { code:'zh-CN', name:'Chinese (Simplified)', percent:89, status:'Ready' },
      { code:'am', name:'Amharic', percent:62, status:'Attention' },
    ],
    botDesign: {
      menuLayout:'inline', sections:{ main:['Products','Profile','Wallet'], wallet:['Top up','Deposit code'], payment:['Binance Pay','TRC20 USDT'], profile:['My orders','My deposits','Languages','Notifications'] },
      buttons: [
        {key:'Products',label:'Products',emoji:'🛍️',color:'Default',visible:true},{key:'Profile',label:'Profile',emoji:'👤',color:'Default',visible:true},
        {key:'Wallet',label:'Wallet',emoji:'👛',color:'Default',visible:true},{key:'Help',label:'Help',emoji:'❓',color:'Default',visible:true},
        {key:'Referrals',label:'Referrals',emoji:'🤝',color:'Default',visible:true},{key:'Bot Policy',label:'Bot Policy',emoji:'📜',color:'Default',visible:true},
        {key:'Top up',label:'Top up',emoji:'➕',color:'Green',visible:true},{key:'Deposit code',label:'Deposit code',emoji:'🎟️',color:'Default',visible:true},
        {key:'Binance Pay',label:'Binance Pay',emoji:'🟡',color:'Default',visible:true},{key:'Polygon USDT',label:'Polygon USDT',emoji:'⬟',color:'Default',visible:true},
        {key:'BEP20 USDT',label:'BEP20 USDT',emoji:'🟨',color:'Default',visible:true},{key:'TRC20 USDT',label:'TRC20 USDT',emoji:'🔴',color:'Default',visible:true},
        {key:'Pay with Crypto',label:'Pay with Crypto',emoji:'💱',color:'Blue',visible:true},{key:'Telegram Stars',label:'Telegram Stars',emoji:'⭐',color:'Default',visible:true},
        {key:'My orders',label:'My orders',emoji:'📦',color:'Default',visible:true},{key:'My deposits',label:'My deposits',emoji:'💳',color:'Default',visible:true},
        {key:'Languages',label:'Languages',emoji:'🌐',color:'Default',visible:true},{key:'Notifications',label:'Notifications',emoji:'🔔',color:'Default',visible:true},
        {key:'API',label:'API',emoji:'🔌',color:'Default',visible:true},
      ],
      browsing:{ categoriesFirst:true, categoriesPerRow:2, productsPerPage:12 },
      welcomeMessage:'Welcome! Choose a product from the menu below.',
      commands:[
        {cmd:'/start',desc:'Start the store',visible:true},{cmd:'/language',desc:'Change language',visible:true},
        {cmd:'/profile',desc:'View profile',visible:true},{cmd:'/products',desc:'Browse products',visible:true},
        {cmd:'/api',desc:'API access',visible:true},{cmd:'/deposit',desc:'Deposit funds',visible:true},
        {cmd:'/wallet',desc:'View wallet',visible:true},
      ]
    },
    guide: { sections: [
      {id:'g1',title:'Create your store',topics:['Connect your bot','Name your store'],done:false},
      {id:'g2',title:'Build your catalog',topics:['Add a product','Add inventory'],done:false},
      {id:'g3',title:'Set up payments',topics:['Add a payment method','Test a deposit'],done:false},
      {id:'g4',title:'Invite customers',topics:['Share your bot','First broadcast'],done:false},
      {id:'g5',title:'Fulfil orders',topics:['Instant delivery','Manual orders'],done:false},
      {id:'g6',title:'Manage deposits',topics:['Review deposits','Deposit codes'],done:false},
      {id:'g7',title:'Grow with referrals',topics:['Referral settings'],done:false},
      {id:'g8',title:'Analytics',topics:['Read your sales chart'],done:false},
      {id:'g9',title:'Stay safe',topics:['Bot security','Backups'],done:false},
    ]},
    supplier: { connected:false, name:'GGsoma', apiKeySet:false, profitPercent:20 },
    counters: { order: 1002, tx: 5003 }
  };
}
function save() {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive:true });
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}
function load() {
  try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { db = seed(); save(); }
  // seed demo products/orders once, after categories exist
  if (!db.products.length) {
    const cat = id => db.categories.find(c=>c.slug===id) || db.categories[0];
    const p1 = { id: uid('prod'), name:'ChatGPT Plus 1m', slug:'chatgpt-plus-1m', categoryId: cat('chatgpt').id, emoji:'🤖', type:'Instant', status:'Live', badges:['Popular'], story:'Full ChatGPT Plus access for 1 month.', sku:'GPT-1M', description:'ChatGPT Plus subscription, delivered instantly as an account/code.', deliveryInstructions:'Check your orders after payment.', deliveryContentType:'Ready account', supportContact:'@pixelshop_support', adminContact:'', minQty:1, maxQty:20, createdAt: now() };
    const p2 = { id: uid('prod'), name:'Lovable Pro 12m', slug:'lovable-pro-12m', categoryId: db.categories[0].id, emoji:'💜', type:'Instant', status:'Live', badges:['Bestseller'], story:'Build apps with Lovable Pro for 12 months.', sku:'LOV-12M', description:'Lovable Pro 12 month plan.', deliveryInstructions:'Code is delivered instantly.', deliveryContentType:'License key', supportContact:'@pixelshop_support', adminContact:'', minQty:1, maxQty:20, createdAt: now() };
    const p3 = { id: uid('prod'), name:'Notion Business', slug:'notion-business', categoryId: cat('notion').id, emoji:'📝', type:'Manual', status:'Draft', badges:[], story:'Notion Business workspace.', sku:'NOT-BIZ', description:'Manual delivery within 24h.', deliveryInstructions:'Our team will contact you.', deliveryContentType:'Invite', supportContact:'@pixelshop_support', adminContact:'', minQty:1, maxQty:5, createdAt: now() };
    db.products.push(p1,p2,p3);
    db.offers.push(
      { id: uid('off'), productId:p1.id, label:'1 month', price:12, durationDays:30 },
      { id: uid('off'), productId:p2.id, label:'12 months', price:45.5, durationDays:365 },
      { id: uid('off'), productId:p3.id, label:'1 month', price:9, durationDays:30 },
    );
    for (let i=0;i<3;i++) db.inventory.push({ id: uid('unit'), productId:p1.id, value:'GPT-CODE-'+crypto.randomBytes(3).toString('hex').toUpperCase(), type:'License key', status:'Available', orderId:null, createdAt: now() });
    for (let i=0;i<2;i++) db.inventory.push({ id: uid('unit'), productId:p2.id, value:'LOV-'+crypto.randomBytes(3).toString('hex').toUpperCase(), type:'License key', status:'Available', orderId:null, createdAt: now() });
    const o1 = { id:'ORD-1001', customerId:'cust_demo1', productId:p2.id, offerId:db.offers[1].id, qty:1, total:45.5, status:'Delivered', source:'bot', queue:'instant', createdAt:'2026-11-08T10:00:00Z', deliveredUnit: db.inventory[3].value };
    db.inventory[3].status='Consumed'; db.inventory[3].orderId='ORD-1001';
    const o2 = { id:'ORD-1002', customerId:'cust_demo2', productId:p1.id, offerId:db.offers[0].id, qty:1, total:12, status:'Delivered', source:'bot', queue:'instant', createdAt:'2026-11-07T10:00:00Z', deliveredUnit: db.inventory[0].value };
    db.inventory[0].status='Consumed'; db.inventory[0].orderId='ORD-1002';
    db.orders.push(o1,o2);
    db.transactions.push(
      { id:'TX-5001', type:'deposit', customerId:'cust_demo1', amount:50, method:'TRC20 USDT', network:'TRON', status:'Completed', txid:'tx_demo_1', source:'bot', createdAt:'2026-11-08T09:00:00Z' },
      { id:'TX-5002', type:'purchase', customerId:'cust_demo1', amount:-45.5, method:'Wallet', network:'', status:'Completed', txid:'', source:'bot', createdAt:'2026-11-08T10:00:00Z' },
      { id:'TX-5003', type:'deposit', customerId:'cust_demo2', amount:12, method:'Binance Pay', network:'', status:'Completed', txid:'tx_demo_2', source:'bot', createdAt:'2026-11-07T09:00:00Z' },
    );
    db.depositCodes.push({ id: uid('dc'), code:'PIXEL-10', amount:10, status:'UNUSED', expiresAt:null, usedBy:null, createdAt: now() });
    save();
  }
}
load();

// ---------- helpers ----------
const auth = (req,res,next) => {
  const t = req.cookies?.token || req.headers.authorization?.replace('Bearer ','');
  // cookie parsing (no cookie-parser dep)
  let token = t;
  if (!token && req.headers.cookie) {
    const m = req.headers.cookie.match(/(?:^|;\s*)token=([^;]+)/);
    if (m) token = decodeURIComponent(m[1]);
  }
  if (!token) return res.status(401).json({ error:'Not signed in' });
  try { req.merchant = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error:'Session expired' }); }
};
function ledger(type, customerId, amount, method, status='Completed', extra={}) {
  const tx = { id:'TX-'+(++db.counters.tx), type, customerId, amount: money(amount), method, network: extra.network||'', status, txid: extra.txid||'', source: extra.source||'dashboard', createdAt: now() };
  db.transactions.unshift(tx); return tx;
}
function makeCode() { return String(Math.floor(100000 + Math.random()*900000)); }
async function sendTelegramCode(phone, code) {
  if (!BOT_TOKEN) return false;
  try {
    // Best effort: send to operator if configured; otherwise log only.
    if (!db.store.operatorTelegramId) return false;
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ chat_id: db.store.operatorTelegramId, text: `PixelShop verification code for ${phone}: ${code}` }) });
    return true;
  } catch { return false; }
}
function stats() {
  const live = db.products.filter(p=>p.status==='Live').length;
  const wallet = money(db.customers.reduce((s,c)=>s+c.balance,0));
  const spend = money(db.transactions.filter(t=>t.type==='purchase'&&t.status==='Completed').reduce((s,t)=>s+Math.abs(t.amount),0));
  const sales = db.orders.filter(o=>o.status==='Delivered').length;
  const pendingDeposits = db.transactions.filter(t=>t.type==='deposit'&&t.status!=='Completed').length;
  const attention = db.orders.filter(o=>['Needs inventory','Needs unit','Pending manual','Manual needs approval','Delivery failed','Refund warning'].includes(o.status)).length
    + db.inventory.filter(u=>u.status==='Available').length===0 ? 1 : 0;
  return { needsAttention: attention, customers: db.customers.length, active: db.customers.filter(c=>c.notifications).length, walletBalance: wallet, totalSpend: spend, paidSales: sales, depositsToReview: pendingDeposits, liveProducts: live, totalOrders: db.orders.length };
}
const ORDER_STATUSES = ['Delivered','Insufficient funds','No money','Refunds','Already bought','Awaiting delivery','Cancelled','Delivery failed','Pre-confirmation','Declined','Failed fraud','Pending manual','Archived','Needs inventory','Cancelled by customer','Needs unit','Refund warning','Freely refunded','Bad units','Manual needs approval'];

// ---------- Auth ----------
app.post('/api/auth/register', async (req,res)=>{
  const { phone, password, name } = req.body||{};
  if (!phone || !password || password.length<6) return res.status(400).json({ error:'Phone and a password of at least 6 characters are required' });
  if (db.merchants.find(m=>m.phone===phone)) return res.status(400).json({ error:'Account already exists — please sign in' });
  const m = { id: uid('m'), phone, name: name||'Merchant', passwordHash: await bcrypt.hash(password,10), createdAt: now() };
  db.merchants.push(m); save();
  res.json({ ok:true, message:'Account created. Please sign in.' });
});
app.post('/api/auth/login', async (req,res)=>{
  const { phone, password } = req.body||{};
  const m = db.merchants.find(x=>x.phone===phone);
  if (!m || !(await bcrypt.compare(password||'', m.passwordHash))) return res.status(401).json({ error:'Wrong phone or password' });
  const code = makeCode();
  db.verifyCodes = db.verifyCodes.filter(v=>v.phone!==phone);
  db.verifyCodes.push({ phone, code, expiresAt: Date.now()+5*60*1000, purpose:'login' }); save();
  const sent = await sendTelegramCode(phone, code);
  console.log(`[verify] ${phone} code=${code} sentViaBot=${sent}`);
  // For testing without a bot, the code is returned in a labelled test field.
  res.json({ ok:true, needVerify:true, testCode: BOT_TOKEN ? undefined : code, sentViaBot: sent, message: sent ? 'Code sent to your Telegram bot.' : 'No bot connected — test code shown on the verify page.' });
});
app.post('/api/auth/verify', (req,res)=>{
  const { phone, code } = req.body||{};
  const v = db.verifyCodes.find(x=>x.phone===phone && x.code===String(code));
  if (!v || v.expiresAt < Date.now()) return res.status(400).json({ error:'Code expired or wrong — request a new one' });
  const m = db.merchants.find(x=>x.phone===phone);
  if (!m) return res.status(400).json({ error:'Account not found' });
  db.verifyCodes = db.verifyCodes.filter(x=>x!==v); save();
  const token = jwt.sign({ id:m.id, phone:m.phone, name:m.name }, JWT_SECRET, { expiresIn:'7d' });
  res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Path=/; Max-Age=${7*24*3600}; SameSite=Lax`);
  res.json({ ok:true, token });
});
app.post('/api/auth/forgot', async (req,res)=>{
  const { phone } = req.body||{};
  const m = db.merchants.find(x=>x.phone===phone);
  if (!m) return res.status(400).json({ error:'No account for that phone number' });
  const code = makeCode();
  db.verifyCodes = db.verifyCodes.filter(v=>v.phone!==phone);
  db.verifyCodes.push({ phone, code, expiresAt: Date.now()+5*60*1000, purpose:'reset' }); save();
  const sent = await sendTelegramCode(phone, code);
  console.log(`[reset] ${phone} code=${code} sentViaBot=${sent}`);
  res.json({ ok:true, testCode: BOT_TOKEN ? undefined : code, sentViaBot: sent });
});
app.post('/api/auth/reset', async (req,res)=>{
  const { phone, code, password } = req.body||{};
  const v = db.verifyCodes.find(x=>x.phone===phone && x.code===String(code) && x.purpose==='reset');
  if (!v || v.expiresAt < Date.now()) return res.status(400).json({ error:'Code expired or wrong' });
  const m = db.merchants.find(x=>x.phone===phone);
  m.passwordHash = await bcrypt.hash(password,10);
  db.verifyCodes = db.verifyCodes.filter(x=>x!==v); save();
  res.json({ ok:true });
});
app.get('/api/auth/me', auth, (req,res)=>res.json({ merchant:req.merchant, store: db.store }));
app.post('/api/auth/logout', (req,res)=>{ res.setHeader('Set-Cookie','token=; HttpOnly; Path=/; Max-Age=0'); res.json({ ok:true }); });

// ---------- Store / stats / settings ----------
app.get('/api/stats', auth, (req,res)=>res.json(stats()));
app.get('/api/store', auth, (req,res)=>res.json(db.store));
app.put('/api/store', auth, (req,res)=>{ Object.assign(db.store, req.body||{}); save(); res.json(db.store); });
app.post('/api/store/reset-demo', auth, (req,res)=>{
  try { fs.unlinkSync(DB_FILE); } catch {}
  db = seed(); save(); load();
  res.json({ ok:true, message:'Demo data reset' });
});
app.get('/api/notifications', auth, (req,res)=>res.json(db.notifications));
app.post('/api/notifications/:id/read', auth, (req,res)=>{ const n=db.notifications.find(x=>x.id===req.params.id); if(n) n.read=true; save(); res.json({ok:true}); });
app.get('/api/guide', auth, (req,res)=>res.json(db.guide));
app.post('/api/guide/:id/complete', auth, (req,res)=>{ const s=db.guide.sections.find(x=>x.id===req.params.id); if(s) s.done=!s.done; save(); res.json({ok:true, guide:db.guide}); });

// ---------- Categories ----------
app.get('/api/categories', auth, (req,res)=>res.json(db.categories.slice().sort((a,b)=>a.order-b.order)));
app.post('/api/categories', auth, (req,res)=>{
  const { name, emoji, locales } = req.body||{};
  if (!name) return res.status(400).json({ error:'Name required' });
  const c = { id: uid('cat'), name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g,'-'), emoji: emoji||'📦', enabled:true, order: db.categories.length+1, locales: locales||{en:name} };
  db.categories.push(c); save(); res.json(c);
});
app.put('/api/categories/:id', auth, (req,res)=>{ const c=db.categories.find(x=>x.id===req.params.id); if(!c) return res.status(404).json({error:'Not found'}); Object.assign(c, req.body||{}); save(); res.json(c); });
app.delete('/api/categories/:id', auth, (req,res)=>{ db.categories=db.categories.filter(x=>x.id!==req.params.id); save(); res.json({ok:true}); });

// ---------- Products & offers ----------
app.get('/api/products', auth, (req,res)=>{
  let list = db.products.slice();
  const { q, status, type, category } = req.query;
  if (q) list=list.filter(p=>(p.name+p.slug).toLowerCase().includes(q.toLowerCase()));
  if (status) list=list.filter(p=>p.status===status);
  if (type) list=list.filter(p=>p.type===type);
  if (category) list=list.filter(p=>p.categoryId===category);
  res.json(list.map(p=>({ ...p, offers: db.offers.filter(o=>o.productId===p.id), stock: db.inventory.filter(u=>u.productId===p.id&&u.status==='Available').length })));
});
app.post('/api/products', auth, (req,res)=>{
  const b=req.body||{};
  if (!b.name) return res.status(400).json({ error:'Product name required' });
  const catOk = db.categories.find(c=>c.id===b.categoryId);
  const p = { id: uid('prod'), name:b.name, slug: b.slug || b.name.toLowerCase().replace(/[^a-z0-9]+/g,'-'), categoryId: catOk?b.categoryId:db.categories[0]?.id, emoji:b.emoji||'📦', type:b.type||'Instant', status:b.status||'Draft', badges:b.badges||[], story:b.story||'', sku:b.sku||'', description:b.description||'', deliveryInstructions:b.deliveryInstructions||'', deliveryContentType:b.deliveryContentType||'Text', supportContact:b.supportContact||'', adminContact:b.adminContact||'', minQty:b.minQty||1, maxQty:b.maxQty||20, image:b.image||'', createdAt: now() };
  db.products.push(p);
  if (Array.isArray(b.offers)) b.offers.forEach(o=>{ if(o.price) db.offers.push({ id: uid('off'), productId:p.id, label:o.label||'Standard', price: money(o.price), durationDays:o.durationDays||30 }); });
  save(); res.json(p);
});
app.get('/api/products/:id', auth, (req,res)=>{ const p=db.products.find(x=>x.id===req.params.id); if(!p) return res.status(404).json({error:'Not found'}); res.json({ ...p, offers: db.offers.filter(o=>o.productId===p.id), stock: db.inventory.filter(u=>u.productId===p.id&&u.status==='Available').length }); });
app.put('/api/products/:id', auth, (req,res)=>{ const p=db.products.find(x=>x.id===req.params.id); if(!p) return res.status(404).json({error:'Not found'}); Object.assign(p, req.body||{}); save(); res.json(p); });
app.delete('/api/products/:id', auth, (req,res)=>{ db.products=db.products.filter(x=>x.id!==req.params.id); db.offers=db.offers.filter(o=>o.productId!==req.params.id); save(); res.json({ok:true}); });
app.post('/api/products/:id/offers', auth, (req,res)=>{ const o={ id: uid('off'), productId:req.params.id, label:req.body.label||'Standard', price: money(req.body.price), durationDays:req.body.durationDays||30 }; db.offers.push(o); save(); res.json(o); });
app.delete('/api/offers/:id', auth, (req,res)=>{ db.offers=db.offers.filter(o=>o.id!==req.params.id); save(); res.json({ok:true}); });

// ---------- Inventory ----------
app.get('/api/inventory', auth, (req,res)=>{
  let list=db.inventory.slice();
  const { product, status, type, q } = req.query;
  if (product) list=list.filter(u=>u.productId===product);
  if (status) list=list.filter(u=>u.status===status);
  if (type) list=list.filter(u=>u.type===type);
  if (q) list=list.filter(u=>u.value.toLowerCase().includes(q.toLowerCase()));
  res.json(list.map(u=>({ ...u, product: db.products.find(p=>p.id===u.productId)?.name||'—' })));
});
app.post('/api/inventory', auth, (req,res)=>{
  const { productId, values, type } = req.body||{};
  if (!productId || !values) return res.status(400).json({ error:'Product and units required' });
  const lines = String(values).split('\n').map(s=>s.trim()).filter(Boolean);
  const added = lines.map(v=>({ id: uid('unit'), productId, value:v, type:type||'Text', status:'Available', orderId:null, createdAt: now() }));
  db.inventory.push(...added); save(); res.json({ ok:true, added: added.length });
});

// ---------- Supplier ----------
app.get('/api/supplier', auth, (req,res)=>res.json(db.supplier));
app.post('/api/supplier/connect', auth, (req,res)=>{
  db.supplier.connected=true; db.supplier.apiKeySet=!!req.body.apiKey; db.supplier.profitPercent = req.body.profitPercent ?? db.supplier.profitPercent; save();
  res.json(db.supplier);
});
app.post('/api/supplier/import', auth, (req,res)=>{
  const { name, basePrice } = req.body||{};
  if (!db.supplier.connected) return res.status(400).json({ error:'Connect the supplier first' });
  const price = money((basePrice||10) * (1 + db.supplier.profitPercent/100));
  const p = { id: uid('prod'), name: name||'Supplier product', slug:(name||'supplier-product').toLowerCase().replace(/[^a-z0-9]+/g,'-'), categoryId: db.categories[0]?.id, emoji:'📦', type:'Instant', status:'Draft', badges:[], story:'Imported from supplier — disabled until you enable it.', sku:'SUP-'+uid('').slice(-4), description:'Supplier product.', deliveryInstructions:'', deliveryContentType:'Text', supportContact:'', adminContact:'', minQty:1, maxQty:20, createdAt: now() };
  db.products.push(p); db.offers.push({ id: uid('off'), productId:p.id, label:'Standard', price, durationDays:30 }); save();
  res.json({ ok:true, product:p, price });
});

// ---------- Customers ----------
app.get('/api/customers', auth, (req,res)=>{
  let list=db.customers.slice();
  const { q, language, sort } = req.query;
  if (q) list=list.filter(c=>(c.name+(c.username||'')).toLowerCase().includes(q.toLowerCase()));
  if (language) list=list.filter(c=>c.language===language);
  if (sort==='balance') list.sort((a,b)=>b.balance-a.balance);
  else if (sort==='spend') list.sort((a,b)=>b.totalSpend-a.totalSpend);
  else if (sort==='oldest') list.sort((a,b)=>new Date(a.joined)-new Date(b.joined));
  else list.sort((a,b)=>new Date(b.joined)-new Date(a.joined));
  res.json(list);
});
app.get('/api/customers/:id', auth, (req,res)=>{
  const c=db.customers.find(x=>x.id===req.params.id); if(!c) return res.status(404).json({error:'Not found'});
  res.json({ ...c, orders: db.orders.filter(o=>o.customerId===c.id), transactions: db.transactions.filter(t=>t.customerId===c.id) });
});
app.post('/api/customers/:id/adjust', auth, (req,res)=>{
  const c=db.customers.find(x=>x.id===req.params.id); if(!c) return res.status(404).json({error:'Not found'});
  const amount = money(req.body.amount||0); if (!amount) return res.status(400).json({error:'Amount required'});
  c.balance = money(c.balance + amount);
  ledger('adjustment', c.id, amount, 'Manual adjustment', 'Completed', { source:'dashboard' });
  db.notifications.unshift({ id: uid('nt'), title:'Balance adjusted', body:`${c.name} balance ${amount>0?'+':''}${amount} USDT (${req.body.reason||'manual'})`, type:'Follow-up', read:false, createdAt: now() });
  save(); res.json(c);
});
app.post('/api/customers/:id/message', auth, (req,res)=>{
  const c=db.customers.find(x=>x.id===req.params.id); if(!c) return res.status(404).json({error:'Not found'});
  const text = String(req.body.text||'').slice(0,1000);
  if (!text) return res.status(400).json({error:'Message required'});
  sendBotMessage(c.telegramId, text);
  res.json({ ok:true, sentViaBot: !!BOT_TOKEN, message:'Message queued/sent' });
});

// ---------- Orders ----------
function createOrder(customerId, productId, offerId, qty, source='web') {
  const cust=db.customers.find(c=>c.id===customerId);
  const prod=db.products.find(p=>p.id===productId);
  const offer=db.offers.find(o=>o.id===offerId);
  if (!cust || !prod || !offer) return { error:'Customer, product or offer not found' };
  if (prod.status!=='Live') return { error:'Product is not live' };
  if (qty < (prod.minQty||1) || qty > (prod.maxQty||20)) return { error:`Quantity must be ${prod.minQty||1}–${prod.maxQty||20}` };
  const total = money(offer.price * qty);
  if (cust.balance < total) return { error:'Insufficient funds — top up first' };
  const id='ORD-'+(++db.counters.order);
  let status='Delivered', deliveredUnit=null;
  if (prod.type==='Manual') status='Pending manual';
  else {
    const units = db.inventory.filter(u=>u.productId===productId && u.status==='Available').slice(0, qty);
    if (units.length < qty) status='Needs inventory';
    else { units.forEach(u=>{ u.status='Consumed'; u.orderId=id; }); deliveredUnit = units.map(u=>u.value).join(', '); }
  }
  cust.balance = money(cust.balance - total); cust.totalSpend = money(cust.totalSpend + total); cust.purchases += 1;
  const order = { id, customerId, productId, offerId, qty, total, status, source, queue: prod.type==='Manual'?'manual':'instant', createdAt: now(), deliveredUnit };
  db.orders.unshift(order);
  ledger('purchase', customerId, -total, 'Wallet', 'Completed', { source });
  save(); return { order };
}
app.get('/api/orders', auth, (req,res)=>{
  let list=db.orders.slice();
  const { q, status, source, type, category } = req.query;
  if (status) list=list.filter(o=>o.status===status);
  if (source) list=list.filter(o=>o.source===source);
  if (type) list=list.filter(o=>{ const p=db.products.find(x=>x.id===o.productId); return p?.type===type; });
  if (category) list=list.filter(o=>{ const p=db.products.find(x=>x.id===o.productId); return p?.categoryId===category; });
  if (q) list=list.filter(o=>o.id.toLowerCase().includes(q.toLowerCase()));
  res.json(list.map(o=>({ ...o, customer: db.customers.find(c=>c.id===o.customerId)?.name||'—', product: db.products.find(p=>p.id===o.productId)?.name||'—' })));
});
app.get('/api/orders/:id', auth, (req,res)=>{
  const o=db.orders.find(x=>x.id===req.params.id); if(!o) return res.status(404).json({error:'Not found'});
  res.json({ ...o, customer: db.customers.find(c=>c.id===o.customerId), product: db.products.find(p=>p.id===o.productId), offer: db.offers.find(x=>x.id===o.offerId) });
});
app.post('/api/orders/:id/action', auth, (req,res)=>{
  const o=db.orders.find(x=>x.id===req.params.id); if(!o) return res.status(404).json({error:'Not found'});
  const action=req.body.action;
  if (action==='approve' || action==='fulfill') {
    if (o.status==='Pending manual' || o.status==='Manual needs approval') {
      const units=db.inventory.filter(u=>u.productId===o.productId&&u.status==='Available').slice(0,o.qty);
      if (units.length>=o.qty) { units.forEach(u=>{u.status='Consumed';u.orderId=o.id;}); o.deliveredUnit=units.map(u=>u.value).join(', '); o.status='Delivered'; }
      else o.status='Needs inventory';
    } else if (o.status==='Needs inventory') {
      const units=db.inventory.filter(u=>u.productId===o.productId&&u.status==='Available').slice(0,o.qty);
      if (units.length>=o.qty) { units.forEach(u=>{u.status='Consumed';u.orderId=o.id;}); o.deliveredUnit=units.map(u=>u.value).join(', '); o.status='Delivered'; }
    }
  } else if (action==='refund') {
    const c=db.customers.find(x=>x.id===o.customerId); if(c){ c.balance=money(c.balance+o.total); }
    ledger('refund', o.customerId, o.total, 'Wallet', 'Completed', { source:'dashboard' });
    o.status='Refunds';
  } else if (action==='cancel') { o.status='Cancelled'; }
  else return res.status(400).json({ error:'Unknown action' });
  save(); res.json(o);
});
app.post('/api/orders', auth, (req,res)=>{ // web preview / manual test order (customer must be chosen)
  const r=createOrder(req.body.customerId, req.body.productId, req.body.offerId, req.body.qty||1, req.body.source||'web');
  if (r.error) return res.status(400).json({ error:r.error });
  res.json(r.order);
});

// ---------- Transactions / deposits ----------
app.get('/api/transactions', auth, (req,res)=>{
  let list=db.transactions.slice();
  const { status, method, source, network } = req.query;
  if (status) list=list.filter(t=>t.status===status);
  if (method) list=list.filter(t=>t.method===method);
  if (source) list=list.filter(t=>t.source===source);
  if (network) list=list.filter(t=>t.network===network);
  res.json(list.map(t=>({ ...t, customer: db.customers.find(c=>c.id===t.customerId)?.name||'—' })));
});
app.post('/api/transactions', auth, (req,res)=>{ // merchant records a deposit for a customer
  const { customerId, amount, method, network, txid } = req.body||{};
  if (!customerId || !amount) return res.status(400).json({ error:'Customer and amount required' });
  const tx = ledger('deposit', customerId, amount, method||'TRC20 USDT', 'Pending', { network: network||'TRON', txid: txid||'', source:'dashboard' });
  save(); res.json(tx);
});
app.post('/api/transactions/:id/action', auth, (req,res)=>{
  const t=db.transactions.find(x=>x.id===req.params.id); if(!t) return res.status(404).json({error:'Not found'});
  if (req.body.action==='approve') {
    if (t.status!=='Completed') {
      t.status='Completed';
      const c=db.customers.find(x=>x.id===t.customerId); if(c && t.type==='deposit') c.balance=money(c.balance+t.amount);
    }
  } else if (req.body.action==='reject') t.status='Cancelled';
  else return res.status(400).json({ error:'Unknown action' });
  save(); res.json(t);
});

// ---------- Deposit codes ----------
app.get('/api/deposit-codes', auth, (req,res)=>{
  let list=db.depositCodes.slice();
  if (req.query.status) list=list.filter(c=>c.status===req.query.status);
  if (req.query.q) list=list.filter(c=>c.code.toLowerCase().includes(req.query.q.toLowerCase()));
  res.json(list);
});
app.post('/api/deposit-codes', auth, (req,res)=>{
  const amount=money(req.body.amount||0); if(!amount) return res.status(400).json({error:'Amount required'});
  const code = 'PIXEL-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  const c={ id: uid('dc'), code, amount, status:'UNUSED', expiresAt: req.body.expiryHours ? new Date(Date.now()+req.body.expiryHours*3600*1000).toISOString() : null, usedBy:null, createdAt: now() };
  db.depositCodes.unshift(c); save(); res.json(c);
});
app.post('/api/deposit-codes/:id/revoke', auth, (req,res)=>{ const c=db.depositCodes.find(x=>x.id===req.params.id); if(!c) return res.status(404).json({error:'Not found'}); c.status='REVOKED'; save(); res.json(c); });
function redeemCode(customerId, codeStr) {
  const c=db.depositCodes.find(x=>x.code===String(codeStr).trim().toUpperCase());
  if (!c) return { error:'Code not found' };
  if (c.status!=='UNUSED') return { error:'Code is '+c.status.toLowerCase() };
  if (c.expiresAt && new Date(c.expiresAt)<new Date()) { c.status='EXPIRED'; save(); return { error:'Code expired' }; }
  const cust=db.customers.find(x=>x.id===customerId); if(!cust) return { error:'Customer not found' };
  c.status='USED'; c.usedBy=customerId; cust.balance=money(cust.balance+c.amount);
  ledger('deposit', customerId, c.amount, 'Deposit code', 'Completed', { source:'bot' });
  save(); return { ok:true, amount:c.amount, balance:cust.balance };
}
app.post('/api/deposit-codes/redeem', auth, (req,res)=>{ const r=redeemCode(req.body.customerId, req.body.code); if(r.error) return res.status(400).json({error:r.error}); res.json(r); });

// ---------- Payment methods ----------
app.get('/api/payment-methods', auth, (req,res)=>res.json(db.paymentMethods));
app.post('/api/payment-methods', auth, (req,res)=>{
  const { type, provider, config } = req.body||{};
  if (!type) return res.status(400).json({ error:'Method type required' });
  const m={ id: uid('pm'), type, provider: provider||type.toLowerCase().replace(/\s+/g,'-'), enabled:true, config: config||{}, createdAt: now() };
  db.paymentMethods.push(m); save(); res.json(m);
});
app.put('/api/payment-methods/:id', auth, (req,res)=>{ const m=db.paymentMethods.find(x=>x.id===req.params.id); if(!m) return res.status(404).json({error:'Not found'}); Object.assign(m, req.body||{}); save(); res.json(m); });
app.delete('/api/payment-methods/:id', auth, (req,res)=>{ db.paymentMethods=db.paymentMethods.filter(x=>x.id!==req.params.id); save(); res.json({ok:true}); });

// ---------- Languages ----------
app.get('/api/languages', auth, (req,res)=>res.json(db.languages));
app.put('/api/languages/:code', auth, (req,res)=>{ const l=db.languages.find(x=>x.code===req.params.code); if(!l) return res.status(404).json({error:'Not found'}); Object.assign(l, req.body||{}); save(); res.json(l); });
app.get('/api/languages/export', auth, (req,res)=>{ const full=req.query.full==='1'; res.json(full?db.languages:db.languages.map(l=>({code:l.code,percent:l.percent,status:l.status}))); });
app.post('/api/languages/import', auth, (req,res)=>{
  const arr=Array.isArray(req.body)?req.body:req.body.languages;
  if(!Array.isArray(arr)) return res.status(400).json({error:'Expected a JSON array of languages'});
  arr.forEach(n=>{ const ex=db.languages.find(l=>l.code===n.code); if(ex) Object.assign(ex,n); else db.languages.push({code:n.code,name:n.name||n.code,percent:n.percent||0,status:n.status||'Attention'}); });
  save(); res.json({ok:true,count:arr.length});
});

// ---------- Bot design ----------
app.get('/api/bot-design', auth, (req,res)=>res.json(db.botDesign));
app.put('/api/bot-design', auth, (req,res)=>{ Object.assign(db.botDesign, req.body||{}); save(); res.json(db.botDesign); });

// ---------- Broadcast ----------
app.get('/api/broadcasts', auth, (req,res)=>res.json(db.broadcasts));
app.post('/api/broadcasts', auth, (req,res)=>{
  const b={ id: uid('bc'), text:req.body.text||'', format:req.body.format||'Standard', audience:req.body.audience||'all', recipients: db.customers.length, status:'Queued', image:req.body.image||'', replyButtons:req.body.replyButtons||[], publicChannel:!!req.body.publicChannel, createdAt: now() };
  db.broadcasts.unshift(b); save(); res.json(b);
});
app.post('/api/broadcasts/:id/send', auth, async (req,res)=>{
  const b=db.broadcasts.find(x=>x.id===req.params.id); if(!b) return res.status(404).json({error:'Not found'});
  b.status='Running';
  let sent=0;
  for (const c of db.customers) { if (await sendBotMessage(c.telegramId, b.text)) sent++; }
  b.status = BOT_TOKEN ? 'Completed' : 'Completed'; // without a token, delivery is logged as a test run
  b.sent = sent; save();
  res.json({ ok:true, broadcast:b, sentViaBot: !!BOT_TOKEN, note: BOT_TOKEN ? 'Sent via Telegram.' : 'No BOT_TOKEN — broadcast recorded as a test run; connect a bot to send for real.' });
});

// ---------- Analytics ----------
app.get('/api/analytics', auth, (req,res)=>{
  const days = req.query.period==='7d'?7 : req.query.period==='90d'?90 : req.query.period==='all'?3650 : 30;
  const since = Date.now() - days*24*3600*1000;
  const orders = db.orders.filter(o=>new Date(o.createdAt).getTime()>=since);
  const sales = money(orders.filter(o=>o.status==='Delivered').reduce((s,o)=>s+o.total,0));
  const byDay={}; orders.forEach(o=>{ const d=o.createdAt.slice(0,10); byDay[d]=(byDay[d]||0)+o.total; });
  const topProducts={}; orders.forEach(o=>{ const p=db.products.find(x=>x.id===o.productId)?.name||'—'; topProducts[p]=(topProducts[p]||0)+o.total; });
  const topCustomers={}; orders.forEach(o=>{ const c=db.customers.find(x=>x.id===o.customerId)?.name||'—'; topCustomers[c]=(topCustomers[c]||0)+o.total; });
  res.json({ period: req.query.period||'30d', sales, orders: orders.length, delivered: orders.filter(o=>o.status==='Delivered').length, customers: new Set(orders.map(o=>o.customerId)).size, byDay, topProducts, topCustomers });
});
app.get('/api/order-statuses', auth, (req,res)=>res.json(ORDER_STATUSES));

// ---------- Public store API (used by /store-preview and the bot) ----------
app.get('/api/store/catalog', (req,res)=>{
  res.json({ store:{ name:db.store.name, slug:db.store.slug, maintenance:db.store.maintenance, welcomeText:db.store.welcomeText },
    categories: db.categories.filter(c=>c.enabled),
    products: db.products.filter(p=>p.status==='Live').map(p=>({ ...p, offers: db.offers.filter(o=>o.productId===p.id), stock: db.inventory.filter(u=>u.productId===p.id&&u.status==='Available').length })) });
});
app.post('/api/store/order', (req,res)=>{ // demo customer = first customer unless supplied
  const r=createOrder(req.body.customerId||'cust_demo1', req.body.productId, req.body.offerId, req.body.qty||1, 'web');
  if (r.error) return res.status(400).json({ error:r.error });
  res.json(r.order);
});
app.get('/api/store/customer/:id', (req,res)=>{
  const c=db.customers.find(x=>x.id===req.params.id); if(!c) return res.status(404).json({error:'Not found'});
  res.json({ ...c, orders: db.orders.filter(o=>o.customerId===c.id), transactions: db.transactions.filter(t=>t.customerId===c.id) });
});

// ---------- Telegram store bot (fetch polling, no SDK) ----------
async function tg(method, body) {
  if (!BOT_TOKEN) return null;
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body||{}) });
    const j = await r.json(); return j.ok ? j.result : null;
  } catch { return null; }
}
async function sendBotMessage(chatId, text, replyMarkup) {
  if (!BOT_TOKEN) { console.log(`[bot-test] -> ${chatId}: ${String(text).slice(0,120)}`); return false; }
  const r = await tg('sendMessage', { chat_id: chatId, text, reply_markup: replyMarkup });
  return !!r;
}
function findOrCreateCustomer(tgUser) {
  let c = db.customers.find(x=>x.telegramId===tgUser.id);
  if (!c) {
    c = { id: uid('cust'), telegramId: tgUser.id, name: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ')||'Telegram user', username: tgUser.username||'', language: tgUser.language_code||'en', balance:0, totalSpend:0, purchases:0, joined: now(), lastActive: now(), notifications:true, country:'' };
    db.customers.push(c); save();
  } else c.lastActive = now();
  return c;
}
const botState = new Map(); // telegramId -> {step, productId, offerId, qty}
function kb(rows) { return { inline_keyboard: rows }; }
function mainKb() {
  return kb([[{text:'🛍️ Products',callback_data:'nav_products'},{text:'👤 Profile',callback_data:'nav_profile'}],[{text:'👛 Wallet',callback_data:'nav_wallet'},{text:'❓ Help',callback_data:'nav_help'}]]);
}
async function botHandleUpdate(u) {
  const msg = u.message; const cb = u.callback_query;
  if (cb) {
    const chatId = cb.message.chat.id; const data = cb.callback_data||'';
    const cust = findOrCreateCustomer(cb.from);
    await tg('answerCallbackQuery', { callback_query_id: cb.id });
    if (data==='nav_products') return botShowCategories(chatId);
    if (data==='nav_profile') return botShowProfile(chatId, cust);
    if (data==='nav_wallet') return botShowWallet(chatId, cust);
    if (data==='nav_help') return sendBotMessage(chatId, db.store.helpMessage + '\n\n' + db.store.policyMessage, mainKb());
    if (data.startsWith('cat:')) return botShowProducts(chatId, data.slice(4));
    if (data.startsWith('prod:')) return botShowProduct(chatId, data.slice(5));
    if (data.startsWith('offer:')) { const st=botState.get(chatId)||{}; st.offerId=data.slice(6); st.step='qty'; botState.set(chatId,st); return sendBotMessage(chatId,'Choose quantity:', kb([[{text:'1',callback_data:'qty:1'},{text:'2',callback_data:'qty:2'},{text:'3',callback_data:'qty:3'}],[{text:'Custom amount',callback_data:'qty:custom'}],[{text:'⬅ Back',callback_data:'nav_products'}]])); }
    if (data.startsWith('qty:')) {
      const st=botState.get(chatId)||{};
      if (data==='qty:custom') { st.step='qty_custom'; botState.set(chatId,st); return sendBotMessage(chatId,'Send the quantity as a number (1–20):'); }
      st.qty=parseInt(data.slice(4),10)||1; botState.set(chatId,st); return botReviewOrder(chatId, cust);
    }
    if (data==='confirm_order') return botConfirmOrder(chatId, cust);
    if (data==='cancel_order') { botState.delete(chatId); return sendBotMessage(chatId,'Order cancelled.', mainKb()); }
    if (data==='orders') { const os=db.orders.filter(o=>o.customerId===cust.id).slice(0,10); return sendBotMessage(chatId, os.length? 'My orders:\n'+os.map(o=>`${o.id} — ${db.products.find(p=>p.id===o.productId)?.name||''} — ${o.total} USDT — ${o.status}`).join('\n') : 'No orders yet.', mainKb()); }
    if (data==='deposits') { const ds=db.transactions.filter(t=>t.customerId===cust.id&&t.type==='deposit').slice(0,10); return sendBotMessage(chatId, ds.length? 'My deposits:\n'+ds.map(t=>`${t.id} — ${t.amount} USDT — ${t.method} — ${t.status}`).join('\n') : 'No deposits yet.', mainKb()); }
    if (data==='deposit_code') { const st=botState.get(chatId)||{}; st.step='redeem_code'; botState.set(chatId,st); return sendBotMessage(chatId,'Send your deposit code:'); }
    if (data==='topup') return sendBotMessage(chatId,'Top up with USDT (TRC20/BEP20/Polygon) or Binance Pay. Your deposit is reviewed by the store, then credited to your wallet. Send /deposit to start.', mainKb());
    if (data==='back_main') return sendBotMessage(chatId, db.store.welcomeText, mainKb());
    return;
  }
  if (!msg || !msg.text) return;
  const chatId = msg.chat.id; const text = msg.text.trim();
  const cust = findOrCreateCustomer(msg.from);
  const st = botState.get(chatId);
  if (st?.step==='qty_custom' && /^\d+$/.test(text)) { st.qty=Math.max(1,Math.min(20,parseInt(text,10))); st.step='review'; botState.set(chatId,st); return botReviewOrder(chatId, cust); }
  if (st?.step==='redeem_code') { botState.delete(chatId); const r=redeemCode(cust.id, text); return sendBotMessage(chatId, r.error? 'That code did not work: '+r.error : `✅ ${r.amount} USDT credited. Balance: ${r.balance} USDT.`, mainKb()); }
  if (text==='/start') return sendBotMessage(chatId, db.store.welcomeText, mainKb());
  if (text==='/products') return botShowCategories(chatId);
  if (text==='/profile') return botShowProfile(chatId, cust);
  if (text==='/wallet') return botShowWallet(chatId, cust);
  if (text==='/language') return sendBotMessage(chatId,'Choose your language: English, العربية, বাংলা, Español, हिन्दी, Português, Русский, Tiếng Việt, 中文, فارسی, አማርኛ.\nReply with the language name — the dashboard Languages page manages translations.', mainKb());
  if (text==='/deposit') return sendBotMessage(chatId,'Deposit: choose a method in your Wallet, or send a deposit code with the Deposit code button.', mainKb());
  if (text==='/api') return sendBotMessage(chatId,'API access is managed from the dashboard (Bot Design → API button).', mainKb());
  return sendBotMessage(chatId, db.store.welcomeText, mainKb());
}
async function botShowCategories(chatId) {
  const cats=db.categories.filter(c=>c.enabled);
  const rows=[]; for(let i=0;i<cats.length;i+=2) rows.push(cats.slice(i,i+2).map(c=>({text:`${c.emoji} ${c.name}`,callback_data:'cat:'+c.id})));
  rows.push([{text:'⬅ Back',callback_data:'back_main'}]);
  return sendBotMessage(chatId,'Choose a category:', kb(rows));
}
async function botShowProducts(chatId, catId) {
  const prods=db.products.filter(p=>p.categoryId===catId && p.status==='Live');
  if (!prods.length) return sendBotMessage(chatId,'No live products in this category yet.', kb([[{text:'⬅ Back',callback_data:'nav_products'}]]));
  const rows=prods.map(p=>[{text:`${p.emoji} ${p.name}`,callback_data:'prod:'+p.id}]);
  rows.push([{text:'⬅ Back',callback_data:'nav_products'}]);
  return sendBotMessage(chatId,'Choose a product:', kb(rows));
}
async function botShowProduct(chatId, prodId) {
  const p=db.products.find(x=>x.id===prodId); if(!p) return;
  const offers=db.offers.filter(o=>o.productId===prodId);
  botState.set(chatId,{step:'offer',productId:prodId});
  const rows=offers.map(o=>[{text:`${o.label} — ${o.price} USDT`,callback_data:'offer:'+o.id}]);
  rows.push([{text:'⬅ Back',callback_data:'nav_products'}]);
  return sendBotMessage(chatId, `${p.emoji} ${p.name}\n${p.story||p.description||''}\n${p.deliveryInstructions||''}`, kb(rows));
}
async function botReviewOrder(chatId, cust) {
  const st=botState.get(chatId)||{}; const p=db.products.find(x=>x.id===st.productId); const o=db.offers.find(x=>x.id===st.offerId);
  if(!p||!o) return sendBotMessage(chatId,'Order expired — start again.', mainKb());
  const total=money(o.price*(st.qty||1));
  return sendBotMessage(chatId, `Review order: ${p.name} ${o.label}\nUnit price: ${o.price} USDT\nQuantity: ${st.qty||1}\nTotal: ${total} USDT\nYour balance: ${cust.balance} USDT`, kb([[{text:'✅ Confirm',callback_data:'confirm_order'},{text:'❌ Cancel',callback_data:'cancel_order'}]]));
}
async function botConfirmOrder(chatId, cust) {
  const st=botState.get(chatId)||{}; botState.delete(chatId);
  const r=createOrder(cust.id, st.productId, st.offerId, st.qty||1, 'bot');
  if (r.error) return sendBotMessage(chatId,'Could not place order: '+r.error, mainKb());
  const o=r.order;
  const extra = o.deliveredUnit ? `\n\nDelivered:\n${o.deliveredUnit}` : `\n\nStatus: ${o.status} — the store will fulfil it shortly.`;
  return sendBotMessage(chatId, `✅ Order ${o.id} placed — ${o.total} USDT.${extra}`, mainKb());
}
async function botShowProfile(chatId, cust) {
  return sendBotMessage(chatId, `Your profile:\nName: ${cust.name}\nBalance: ${cust.balance} USDT\nTotal spend: ${cust.totalSpend} USDT\nLanguage: ${cust.language.toUpperCase()}\nNotifications: ${cust.notifications?'On':'Off'}`, kb([[{text:'📦 My orders',callback_data:'orders'},{text:'💳 My deposits',callback_data:'deposits'}],[{text:'🌐 Language',callback_data:'nav_help'},{text:'🔔 Notifications',callback_data:'nav_help'}],[{text:'⬅ Back',callback_data:'back_main'}]]));
}
async function botShowWallet(chatId, cust) {
  return sendBotMessage(chatId, `Wallet balance: ${cust.balance} USDT`, kb([[{text:'➕ Top up',callback_data:'topup'},{text:'🎟️ Deposit code',callback_data:'deposit_code'}],[{text:'⬅ Back',callback_data:'back_main'}]]));
}
let botOffset = 0;
async function botPoll() {
  if (!BOT_TOKEN) return;
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${botOffset}&timeout=20`);
    const j = await r.json();
    if (j.ok) for (const u of j.result||[]) { botOffset = u.update_id+1; botHandleUpdate(u).catch(e=>console.error('[bot]',e)); }
  } catch(e) { console.error('[bot poll]', e.message); }
}
if (BOT_TOKEN) { console.log('[bot] polling enabled'); setInterval(botPoll, 3000); botPoll(); }
else console.log('[bot] no BOT_TOKEN — bot Disconnected, dashboard + store preview still work');

// ---------- Pages ----------
app.get('/', (req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.get('/login', (req,res)=>res.sendFile(path.join(__dirname,'public','login.html')));
app.get('/dashboard', (req,res)=>res.sendFile(path.join(__dirname,'public','dashboard.html')));
app.get('/store-preview', (req,res)=>res.sendFile(path.join(__dirname,'public','store-preview.html')));
app.get('/api/health', (req,res)=>res.json({ ok:true, bot: BOT_TOKEN?'connected':'disconnected', store: db.store.name }));

app.listen(PORT, ()=>console.log(`PixelShop running on port ${PORT} — bot ${BOT_TOKEN?'connected':'disconnected'}`));
