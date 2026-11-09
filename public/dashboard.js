let page='home', store={}, me=null;
const $=s=>document.querySelector(s), app=$('#app');
async function api(p,opt={}){const r=await fetch(p,{method:opt.method||'GET',headers:{'Content-Type':'application/json'},body:opt.body?JSON.stringify(opt.body):undefined});const j=await r.json().catch(()=>({}));if(r.status===401){location.href='/login';throw new Error('auth');}if(!r.ok)throw new Error(j.error||'Request failed');return j;}
function esc(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function modal(html){$('#modal').innerHTML=`<div class="modal" onclick="if(event.target===this)closeModal()"><div>${html}</div></div>`;}
function closeModal(){$('#modal').innerHTML='';}
function go(p){page=p;document.querySelectorAll('.sidebar a[data-p]').forEach(a=>a.classList.toggle('on',a.dataset.p===p));render();}
function logout(){fetch('/api/auth/logout',{method:'POST'}).then(()=>location.href='/login');}
document.querySelectorAll('.sidebar a[data-p]').forEach(a=>a.onclick=()=>go(a.dataset.p));
async function init(){try{const m=await api('/api/auth/me');me=m.merchant;store=m.store;$('#storeName').textContent=store.name;$('#storeStatus').textContent=store.status+(store.maintenance?' · Maintenance':'');const h=await api('/api/health');$('#botBadge').textContent='Bot: '+h.bot;const n=await api('/api/notifications');$('#notifCount').textContent=n.filter(x=>!x.read).length||'';}catch(e){}render();}
async function render(){
  $('#pageTitle').textContent=page[0].toUpperCase()+page.slice(1).replace(/-/g,' ');
  try{
  if(page==='home')return home();
  if(page==='customers')return customers();
  if(page==='catalog')return catalog();
  if(page==='inventory')return inventory();
  if(page==='orders')return orders();
  if(page==='analytics')return analytics();
  if(page==='settings')return settings();
  if(page==='languages')return languages();
  if(page==='bot-design')return botDesign();
  if(page==='broadcast')return broadcast();
  if(page==='payments')return payments();
  if(page==='transactions')return transactions();
  if(page==='deposit-codes')return depositCodes();
  if(page==='guide')return guide();
  if(page==='notifications')return notifications();
  }catch(e){app.innerHTML='<div class="card">'+esc(e.message)+'</div>';}
}
async function home(){
  const s=await api('/api/stats'), o=await api('/api/orders'), t=await api('/api/transactions');
  app.innerHTML=`<div class="grid g4">
  ${[['Needs attention',s.needsAttention],['Customers',s.customers],['Active',s.active],['Wallet balance',s.walletBalance+' USDT'],['Total spend',s.totalSpend+' USDT'],['Paid sales',s.paidSales],['Deposits to review',s.depositsToReview],['Live products',s.liveProducts]].map(([k,v])=>`<div class="card tile"><span>${k}</span><b>${v}</b></div>`).join('')}
  </div>
  <div class="grid g3"><div class="card"><h3>Channel health</h3><p>Bot: <b>${store.botTokenSet?'Connected':'Disconnected'}</b> · @${esc(store.botUsername||'pixelbuy_bot')}</p><p>Maintenance: <b>${store.maintenance?'On':'Off'}</b></p><p>Payments: <b>${(await api('/api/payment-methods')).filter(m=>m.enabled).length} enabled</b></p><p><a href="/store-preview" target="_blank"><button class="small">Open store preview</button></a> <button class="small ghost" onclick="go('settings')">Bot settings</button></p></div>
  <div class="card"><h3>Attention</h3><p class="muted">${s.depositsToReview? s.depositsToReview+' deposit(s) need review.' : 'Nothing needs attention right now.'} ${s.liveProducts===0?'No live products yet — publish one from Catalog.':''}</p><button class="small" onclick="go('transactions')">Review deposits</button></div>
  <div class="card"><h3>Quick actions</h3><p><button class="small" onclick="go('catalog')">+ New product</button> <button class="small ghost" onclick="go('broadcast')">Broadcast</button> <button class="small ghost" onclick="go('deposit-codes')">Deposit code</button></p></div></div>
  <div class="card"><h3>Recent orders</h3>${o.length?`<table><tr><th>Order</th><th>Customer</th><th>Product</th><th>Total</th><th>Status</th></tr>${o.slice(0,8).map(x=>`<tr><td>${x.id}</td><td>${esc(x.customer)}</td><td>${esc(x.product)}</td><td>${x.total} USDT</td><td><span class="badge">${x.status}</span></td></tr>`).join('')}</table>`:'<p class="muted">No orders yet.</p>'}</div>
  <div class="card"><h3>Transactions — last 30 days</h3>${t.length?`<table><tr><th>ID</th><th>Type</th><th>Customer</th><th>Amount</th><th>Status</th></tr>${t.slice(0,8).map(x=>`<tr><td>${x.id}</td><td>${x.type}</td><td>${esc(x.customer)}</td><td>${x.amount} USDT</td><td>${x.status}</td></tr>`).join('')}</table>`:'<p class="muted">No transactions yet.</p>'}</div>`;
}
async function customers(){
  const list=await api('/api/customers');
  app.innerHTML=`<div class="card"><input id="cq" placeholder="Search customers…" oninput="customersFilter(this.value)"><div class="small muted">${list.length} customers · total balance ${list.reduce((s,c)=>s+c.balance,0).toFixed(2)} USDT</div></div><div class="card"><table><tr><th>Name</th><th>Language</th><th>Balance</th><th>Spend</th><th>Purchases</th><th>Joined</th><th></th></tr>${list.map(c=>`<tr><td>${esc(c.name)}<br><span class="muted small">@${esc(c.username||'')}</span></td><td>${c.language}</td><td>${c.balance} USDT</td><td>${c.totalSpend}</td><td>${c.purchases}</td><td>${c.joined.slice(0,10)}</td><td><button class="small" onclick="custDetail('${c.id}')">Open</button></td></tr>`).join('')}</table></div>`;
  window._cust=list;
}
function customersFilter(q){const l=(_cust||[]).filter(c=>(c.name+(c.username||'')).toLowerCase().includes(q.toLowerCase()));document.querySelector('table').innerHTML=`<tr><th>Name</th><th>Language</th><th>Balance</th><th>Spend</th><th>Purchases</th><th>Joined</th><th></th></tr>${l.map(c=>`<tr><td>${esc(c.name)}</td><td>${c.language}</td><td>${c.balance} USDT</td><td>${c.totalSpend}</td><td>${c.purchases}</td><td>${c.joined.slice(0,10)}</td><td><button class="small" onclick="custDetail('${c.id}')">Open</button></td></tr>`).join('')}`;}
async function custDetail(id){
  const c=await api('/api/customers/'+id);
  modal(`<h3>${esc(c.name)}</h3><p class="muted">@${esc(c.username||'')} · ${c.language} · Joined ${c.joined.slice(0,10)}</p><p>Wallet: <b>${c.balance} USDT</b> · Spend: ${c.totalSpend} USDT · Purchases: ${c.purchases}</p>
  <h4>Adjust balance</h4><input id="adjAmt" type="number" step="0.01" placeholder="+10 or -5"><input id="adjReason" placeholder="Reason"><button onclick="adjustBal('${id}')">Apply adjustment</button>
  <h4>Send message</h4><textarea id="custMsg" maxlength="1000" placeholder="Message (max 1000 chars)"></textarea><button class="ghost" onclick="sendCustMsg('${id}')">Send message</button>
  <h4>Orders</h4>${c.orders.map(o=>`<div class="small">${o.id} — ${o.total} USDT — ${o.status}</div>`).join('')||'<p class="muted">None</p>'}
  <h4>Transactions</h4>${c.transactions.map(t=>`<div class="small">${t.id} — ${t.amount} USDT — ${t.status}</div>`).join('')||'<p class="muted">None</p>'}
  <p><button class="ghost" onclick="closeModal()">Close</button></p>`);
}
async function adjustBal(id){try{await api('/api/customers/'+id+'/adjust',{method:'POST',body:{amount:+$('#adjAmt').value,reason:$('#adjReason').value}});closeModal();render();}catch(e){alert(e.message);}}
async function sendCustMsg(id){try{const j=await api('/api/customers/'+id+'/message',{method:'POST',body:{text:$('#custMsg').value}});alert(j.sentViaBot?'Sent via Telegram bot.':'No bot connected — message logged (test mode).');}catch(e){alert(e.message);}}

async function catalog(){
  const cats=await api('/api/categories'), prods=await api('/api/products'), sup=await api('/api/supplier');
  app.innerHTML=`<div class="tabs"><button class="on">Products</button><button onclick="catalogCats()">Categories (${cats.length})</button><button onclick="go('inventory')">Inventory</button></div>
  <div class="card"><button onclick="newProduct()">+ New product</button> <button class="ghost" onclick="supplierDlg()">Supplier: GGsoma ${sup.connected?'· Connected':'· Not connected'}</button>
  <input id="pq" placeholder="Search products…" oninput="catalogFilter(this.value)"></div>
  <div class="card"><table><tr><th>Product</th><th>Category</th><th>Type</th><th>Status</th><th>Price</th><th>Stock</th><th></th></tr>
  ${prods.map(p=>`<tr><td>${p.emoji} ${esc(p.name)}<br><span class="muted small">${esc(p.slug)}</span></td><td>${esc(cats.find(c=>c.id===p.categoryId)?.name||'')}</td><td>${p.type}</td><td><span class="badge">${p.status}</span></td><td>${p.offers.map(o=>o.price+' USDT').join(', ')||'— no offer'}</td><td>${p.stock}</td><td><button class="small" onclick="editProduct('${p.id}')">Edit</button> <button class="small ghost" onclick="toggleProd('${p.id}','${p.status==='Live'?'Draft':'Live'}')">${p.status==='Live'?'Unpublish':'Publish'}</button></td></tr>`).join('')}</table></div>`;
  window._prods=prods; window._cats=cats;
}
function catalogFilter(q){/* re-render simple: reload with query via api */ api('/api/products?q='+encodeURIComponent(q)).then(list=>{document.querySelectorAll('table')[0].innerHTML=`<tr><th>Product</th><th>Category</th><th>Type</th><th>Status</th><th>Price</th><th>Stock</th><th></th></tr>${list.map(p=>`<tr><td>${p.emoji} ${esc(p.name)}</td><td>${esc((_cats||[]).find(c=>c.id===p.categoryId)?.name||'')}</td><td>${p.type}</td><td>${p.status}</td><td>${p.offers.map(o=>o.price+' USDT').join(', ')}</td><td>${p.stock}</td><td><button class="small" onclick="editProduct('${p.id}')">Edit</button></td></tr>`).join('')}`;});}
async function catalogCats(){
  const cats=await api('/api/categories');
  app.innerHTML=`<div class="tabs"><button onclick="go('catalog')">Products</button><button class="on">Categories (${cats.length})</button></div><div class="card"><button onclick="newCategory()">+ New category</button></div><div class="card"><table><tr><th>Emoji</th><th>Name</th><th>Slug</th><th>Enabled</th><th>Order</th><th></th></tr>${cats.map(c=>`<tr><td>${c.emoji}</td><td>${esc(c.name)}</td><td>${c.slug}</td><td>${c.enabled?'Yes':'No'}</td><td>${c.order}</td><td><button class="small" onclick="editCat('${c.id}','${esc(c.name)}','${c.emoji}')">Edit</button> <button class="small danger" onclick="delCat('${c.id}')">Delete</button></td></tr>`).join('')}</table></div>`;
}
async function newCategory(){modal(`<h3>New category</h3><input id="ncName" placeholder="Name"><input id="ncEmoji" placeholder="Emoji e.g. 🤖"><button onclick="saveCat()">Create</button>`);}
async function saveCat(){await api('/api/categories',{method:'POST',body:{name:$('#ncName').value,emoji:$('#ncEmoji').value||'📦'}});closeModal();catalogCats();}
async function editCat(id,name,emoji){modal(`<h3>Edit category</h3><input id="ecName" value="${esc(name)}"><input id="ecEmoji" value="${emoji}"><label><input type="checkbox" id="ecEn" checked style="width:auto"> Enabled</label><button onclick="saveCatEdit('${id}')">Save</button>`);}
async function saveCatEdit(id){await api('/api/categories/'+id,{method:'PUT',body:{name:$('#ecName').value,emoji:$('#ecEmoji').value,enabled:$('#ecEn').checked}});closeModal();catalogCats();}
async function delCat(id){if(confirm('Delete this category?')){await api('/api/categories/'+id,{method:'DELETE'});catalogCats();}}
async function supplierDlg(){modal(`<h3>GGsoma supplier</h3><p class="muted">Mock supplier for testing. Connect with an API key (stored encrypted at rest in production).</p><input id="supKey" placeholder="API key"><input id="supProfit" type="number" value="20" placeholder="Profit %"><button onclick="connectSup()">Connect account</button><hr><h4>Import product</h4><input id="supName" placeholder="Product name"><input id="supPrice" type="number" placeholder="Base price USDT"><button class="ghost" onclick="importSup()">Import (arrives disabled)</button><div id="supMsg"></div>`);}
async function connectSup(){const j=await api('/api/supplier/connect',{method:'POST',body:{apiKey:$('#supKey').value,profitPercent:+$('#supProfit').value}});$('#supMsg').textContent='Connected. Profit '+j.profitPercent+'%.';}
async function importSup(){try{const j=await api('/api/supplier/import',{method:'POST',body:{name:$('#supName').value,basePrice:+$('#supPrice').value}});$('#supMsg').textContent='Imported as Draft at '+j.price+' USDT.';}catch(e){$('#supMsg').textContent=e.message;}}
function prodForm(p={}){
  const cats=_cats||[];
  return `<label>Name</label><input id="pfName" value="${esc(p.name||'')}">
  <label>Category</label><select id="pfCat">${cats.map(c=>`<option value="${c.id}" ${p.categoryId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select>
  <label>Emoji</label><input id="pfEmoji" value="${esc(p.emoji||'📦')}">
  <label>Type</label><select id="pfType"><option ${p.type==='Instant'?'selected':''}>Instant</option><option ${p.type==='Manual'?'selected':''}>Manual</option></select>
  <label>Status</label><select id="pfStatus"><option ${p.status==='Live'?'selected':''}>Live</option><option ${p.status==='Draft'?'selected':''}>Draft</option><option ${p.status==='Hidden'?'selected':''}>Hidden</option></select>
  <label>Badges (comma separated: Popular, New, Hot, Bestseller, Limited, Discounted)</label><input id="pfBadges" value="${esc((p.badges||[]).join(', '))}">
  <label>Story</label><input id="pfStory" value="${esc(p.story||'')}">
  <label>SKU</label><input id="pfSku" value="${esc(p.sku||'')}">
  <label>Description</label><textarea id="pfDesc">${esc(p.description||'')}</textarea>
  <label>Delivery instructions</label><textarea id="pfDI">${esc(p.deliveryInstructions||'')}</textarea>
  <label>Delivery content type</label><select id="pfDC"><option>Link</option><option>Coupon</option><option>Ready account</option><option>License key</option><option>Invite</option><option>Text</option><option>Custom</option></select>
  <label>Offer price USDT (a product needs at least one offer to be purchasable)</label><input id="pfPrice" type="number" step="0.01" value="${p.offers?.[0]?.price||''}">
  <label>Offer label</label><input id="pfOfferLabel" value="${p.offers?.[0]?.label||'1 month'}">
  <label>Min / Max quantity</label><input id="pfMin" type="number" value="${p.minQty||1}"><input id="pfMax" type="number" value="${p.maxQty||20}">`;
}
async function newProduct(){modal(`<h3>New product — 6-step wizard (basics, delivery, experience, summary, languages, review)</h3>${prodForm()}<p class="muted small">Steps 4–6 are covered by the summary, language and review fields below; saving validates the checklist.</p><button onclick="saveProduct()">Save as draft</button> <button class="ghost" onclick="saveProduct(true)">Publish</button>`);}
async function editProduct(id){const p=await api('/api/products/'+id);modal(`<h3>Edit product</h3>${prodForm(p)}<button onclick="saveProductEdit('${id}')">Save</button> <button class="ghost" onclick="closeModal()">Cancel</button>`);}
function collectProd(){return {name:$('#pfName').value,categoryId:$('#pfCat').value,emoji:$('#pfEmoji').value,type:$('#pfType').value,status:$('#pfStatus').value,badges:$('#pfBadges').value.split(',').map(s=>s.trim()).filter(Boolean),story:$('#pfStory').value,sku:$('#pfSku').value,description:$('#pfDesc').value,deliveryInstructions:$('#pfDI').value,deliveryContentType:$('#pfDC').value,minQty:+$('#pfMin').value,maxQty:+$('#pfMax').value,offers:$('#pfPrice').value?[{label:$('#pfOfferLabel').value,price:+$('#pfPrice').value}]:[]};}
async function saveProduct(pub){try{const b=collectProd();if(pub)b.status='Live';const j=await api('/api/products',{method:'POST',body:b});closeModal();go('catalog');}catch(e){alert(e.message);}}
async function saveProductEdit(id){try{const b=collectProd();await api('/api/products/'+id,{method:'PUT',body:b});if(b.offers.length)await api('/api/products/'+id+'/offers',{method:'POST',body:b.offers[0]});closeModal();go('catalog');}catch(e){alert(e.message);}}
async function toggleProd(id,status){await api('/api/products/'+id,{method:'PUT',body:{status}});go('catalog');}

async function inventory(){
  const inv=await api('/api/inventory'), prods=await api('/api/products');
  app.innerHTML=`<div class="card"><b>Available:</b> ${inv.filter(u=>u.status==='Available').length} · <b>Consumed:</b> ${inv.filter(u=>u.status==='Consumed').length} · <b>Assigned:</b> ${inv.filter(u=>u.status==='Assigned').length}</div>
  <div class="card"><h3>Add units (bulk — one per line)</h3><select id="invProd">${prods.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select><select id="invType"><option>Text</option><option>License key</option><option>Card</option></select><textarea id="invVals" placeholder="CODE-1&#10;CODE-2"></textarea><button onclick="addInv()">Add units</button></div>
  <div class="card"><table><tr><th>Unit</th><th>Product</th><th>Type</th><th>Status</th><th>Order</th></tr>${inv.slice(0,100).map(u=>`<tr><td>${esc(u.value)}</td><td>${esc(u.product)}</td><td>${u.type}</td><td>${u.status}</td><td>${u.orderId||''}</td></tr>`).join('')}</table></div>`;
}
async function addInv(){const j=await api('/api/inventory',{method:'POST',body:{productId:$('#invProd').value,type:$('#invType').value,values:$('#invVals').value}});alert(j.added+' units added');inventory();}

async function orders(){
  const list=await api('/api/orders'), statuses=await api('/api/order-statuses');
  app.innerHTML=`<div class="card"><div class="tabs">${statuses.map(s=>`<button class="small" onclick="ordersFilter('${s}')">${s} (${list.filter(o=>o.status===s).length})</button>`).join('')}</div></div>
  <div class="card"><table><tr><th>Order</th><th>Customer</th><th>Product</th><th>Qty</th><th>Total</th><th>Status</th><th></th></tr>${list.map(o=>`<tr><td>${o.id}</td><td>${esc(o.customer)}</td><td>${esc(o.product)}</td><td>${o.qty}</td><td>${o.total} USDT</td><td><span class="badge">${o.status}</span></td><td><button class="small" onclick="orderDetail('${o.id}')">Open</button></td></tr>`).join('')}</table><p class="muted small">Orders come from the bot / store preview — there is no dashboard create-order button, matching the original.</p></div>`;
}
async function ordersFilter(s){const list=(await api('/api/orders?status='+encodeURIComponent(s)));app.querySelector('table').innerHTML=`<tr><th>Order</th><th>Customer</th><th>Product</th><th>Qty</th><th>Total</th><th>Status</th><th></th></tr>${list.map(o=>`<tr><td>${o.id}</td><td>${esc(o.customer)}</td><td>${esc(o.product)}</td><td>${o.qty}</td><td>${o.total} USDT</td><td>${o.status}</td><td><button class="small" onclick="orderDetail('${o.id}')">Open</button></td></tr>`).join('')}`;}
async function orderDetail(id){const o=await api('/api/orders/'+id);modal(`<h3>${o.id}</h3><p>${esc(o.customer?.name||'')} · ${esc(o.product?.name||'')} · ${o.qty} × ${o.offer?.price} = ${o.total} USDT</p><p>Status: <b>${o.status}</b> · Source: ${o.source} · Queue: ${o.queue}</p><p>Delivered unit: ${esc(o.deliveredUnit||'—')}</p><p><button onclick="orderAction('${id}','approve')">Approve / fulfil</button> <button class="ghost" onclick="orderAction('${id}','refund')">Refund</button> <button class="danger" onclick="orderAction('${id}','cancel')">Cancel</button></p><button class="ghost" onclick="closeModal()">Close</button>`);}
async function orderAction(id,a){await api('/api/orders/'+id+'/action',{method:'POST',body:{action:a}});closeModal();orders();}

async function analytics(period='30d'){
  const a=await api('/api/analytics?period='+period);
  app.innerHTML=`<div class="card"><div class="tabs"><button class="on" onclick="analyticsPeriod('30d')">30d</button><button onclick="analyticsPeriod('7d')">7d</button><button onclick="analyticsPeriod('90d')">90d</button><button onclick="analyticsPeriod('all')">All</button></div>
  <div class="grid g4"><div class="card tile"><span>Sales</span><b>${a.sales} USDT</b></div><div class="card tile"><span>Orders</span><b>${a.orders}</b></div><div class="card tile"><span>Delivered</span><b>${a.delivered}</b></div><div class="card tile"><span>Customers</span><b>${a.customers}</b></div></div>
  <canvas id="chart" width="900" height="220" style="width:100%;background:#12152a;border-radius:10px"></canvas>
  <h3>Top products</h3>${Object.entries(a.topProducts).map(([k,v])=>`<div>${esc(k)} — ${v} USDT</div>`).join('')||'<p class="muted">No sales yet.</p>'}
  <h3>Top customers</h3>${Object.entries(a.topCustomers).map(([k,v])=>`<div>${esc(k)} — ${v} USDT</div>`).join('')||'<p class="muted">No sales yet.</p>'}</div>`;
  const c=document.getElementById('chart'),ctx=c.getContext('2d'),days=Object.entries(a.byDay).sort();
  ctx.strokeStyle='#7c5cff';ctx.lineWidth=2;ctx.beginPath();
  days.forEach(([d,v],i)=>{const x=20+i*40,y=200-Math.min(180,v*2);i?ctx.lineTo(x,y):ctx.moveTo(x,y);ctx.fillStyle='#9aa3c7';ctx.fillText(d.slice(5),x-10,215);});
  ctx.stroke();
}
async function analyticsPeriod(p){analytics(p);}

async function settings(){
  const s=await api('/api/store');
  app.innerHTML=`<div class="card"><h3>General</h3><label>Store name</label><input id="stName" value="${esc(s.name)}"><label>Slug</label><input id="stSlug" value="${esc(s.slug)}"><p class="muted small">Status: ${s.status} — DRAFT stores are not visible to new customers until you publish a product.</p>
  <label><input type="checkbox" id="stMaint" ${s.maintenance?'checked':''} style="width:auto"> Maintenance mode</label><input id="stMaintMsg" value="${esc(s.maintenanceMessage)}" placeholder="Maintenance message">
  <label>Operator Telegram ID</label><input id="stOp" value="${esc(s.operatorTelegramId)}"></div>
  <div class="card"><h3>Bot connection</h3><p>Bot: <b>${s.botTokenSet?'Connected':'Disconnected'}</b> · @${esc(s.botUsername||'')}</p><label>Bot token (from @BotFather — set BOT_TOKEN on the server for the live bot; this field stores a display note only in this replica)</label><input id="stBotUser" value="${esc(s.botUsername)}" placeholder="bot username"><label>Welcome text</label><textarea id="stWelcome">${esc(s.welcomeText)}</textarea>
  <label><input type="checkbox" id="stJoin" ${s.mandatoryJoin?'checked':''} style="width:auto"> Mandatory join</label> <label><input type="checkbox" id="stGroup" ${s.mandatoryGroup?'checked':''} style="width:auto"> Mandatory group</label> <label><input type="checkbox" id="stChannel" ${s.mandatoryChannel?'checked':''} style="width:auto"> Mandatory channel</label>
  <p class="muted small">Verify bot admin and update cycle are handled automatically when a real token is connected.</p></div>
  <div class="card"><h3>Customer experience</h3><label>Help message</label><textarea id="stHelp">${esc(s.helpMessage)}</textarea><label>Policy message</label><textarea id="stPolicy">${esc(s.policyMessage)}</textarea>
  <label>Support username</label><input id="stSup" value="${esc(s.supportUsername)}"></div>
  <div class="card"><h3>Merchant alerts</h3><p class="muted small">Deposit credited, low stock at ${s.alerts.lowStockAt}, out of stock, delivery failed, refund failed, ETA overdue, unit stuck after 24h — all enabled by default. Low-stock threshold:</p><input id="stLow" type="number" value="${s.alerts.lowStockAt}"></div>
  <div class="card"><button onclick="saveSettings()">Save settings</button> <button class="danger" onclick="resetDemo()">Reset demo data</button></div>`;
}
async function saveSettings(){const s=store;await api('/api/store',{method:'PUT',body:{name:$('#stName').value,slug:$('#stSlug').value,maintenance:$('#stMaint').checked,maintenanceMessage:$('#stMaintMsg').value,operatorTelegramId:$('#stOp').value,botUsername:$('#stBotUser').value,welcomeText:$('#stWelcome').value,mandatoryJoin:$('#stJoin').checked,mandatoryGroup:$('#stGroup').checked,mandatoryChannel:$('#stChannel').checked,helpMessage:$('#stHelp').value,policyMessage:$('#stPolicy').value,supportUsername:$('#stSup').value,alerts:{...s.alerts,lowStockAt:+$('#stLow').value}}});alert('Settings saved');init();}
async function resetDemo(){if(confirm('Reset all demo data?')){await api('/api/store/reset-demo',{method:'POST'});location.reload();}}

async function languages(){
  const l=await api('/api/languages');
  app.innerHTML=`<div class="card"><button onclick="exportLang(false)">Export missing</button> <button class="ghost" onclick="exportLang(true)">Export full</button> <button class="ghost" onclick="importLang()">Import translations (JSON)</button></div>
  <div class="card"><table><tr><th>Language</th><th>Code</th><th>Complete</th><th>Status</th><th></th></tr>${l.map(x=>`<tr><td>${esc(x.name)}</td><td>${x.code}</td><td>${x.percent}%</td><td><span class="badge ${x.status==='Attention'?'amber':''}">${x.status}</span></td><td><button class="small" onclick="langManage('${x.code}','${esc(x.name)}')">Manage</button></td></tr>`).join('')}</table></div>`;
}
async function exportLang(full){const j=await api('/api/languages/export?full='+(full?'1':'0'));modal(`<h3>Export</h3><pre>${esc(JSON.stringify(j,null,2))}</pre><button class="ghost" onclick="closeModal()">Close</button>`);}
async function langManage(code,name){modal(`<h3>${esc(name)}</h3><label>Status</label><select id="lgStatus"><option>Live</option><option>Ready</option><option>Attention</option></select><label><input type="checkbox" id="lgPause" style="width:auto"> Pause this language</label><button onclick="saveLang('${code}')">Save</button>`);}
async function saveLang(code){await api('/api/languages/'+code,{method:'PUT',body:{status:$('#lgPause').checked?'Attention':$('#lgStatus').value}});closeModal();languages();}
async function importLang(){modal(`<h3>Import translations</h3><textarea id="impJson" placeholder='[{"code":"fr","name":"French","percent":50,"status":"Attention"}]'></textarea><button onclick="doImportLang()">Import</button>`);}
async function doImportLang(){try{await api('/api/languages/import',{method:'POST',body:JSON.parse($('#impJson').value)});closeModal();languages();}catch(e){alert('Invalid JSON: '+e.message);}}

async function botDesign(){
  const d=await api('/api/bot-design');
  app.innerHTML=`<div class="grid g3"><div class="card"><h3>Menu layout</h3><label>Layout</label><select id="bdLayout"><option ${d.menuLayout==='inline'?'selected':''}>inline</option><option ${d.menuLayout==='reply'?'selected':''}>reply</option></select>
  <p class="muted small">Sections: Main (${d.sections.main.join(', ')}), Wallet, Payment, Profile. Max 3 buttons per row.</p>
  <label>Categories per row</label><input id="bdCpr" type="number" value="${d.browsing.categoriesPerRow}"><label>Products per page</label><input id="bdPpp" type="number" value="${d.browsing.productsPerPage}">
  <label>Welcome message</label><textarea id="bdWelcome">${esc(d.welcomeMessage)}</textarea></div>
  <div class="card"><h3>Button styles (${d.buttons.length} buttons)</h3>${d.buttons.map((b,i)=>`<div class="small">${b.emoji} ${esc(b.label)} — ${b.color} — ${b.visible?'visible':'hidden'} <button class="small ghost" onclick="toggleBtn(${i})">Toggle</button></div>`).join('')}</div>
  <div class="card"><h3>Bot commands</h3>${d.commands.map(c=>`<div class="small">${c.cmd} — ${esc(c.desc)} — ${c.visible?'visible':'hidden'}</div>`).join('')}
  <h3>Preview</h3><div class="phone"><p><b>PixelShop bot</b></p><p>${esc(d.welcomeMessage)}</p><p><button class="small">🛍️ Products</button> <button class="small ghost">👤 Profile</button></p><p><button class="small ghost">👛 Wallet</button> <button class="small ghost">❓ Help</button></p><p class="muted small">Preview phone mockup — language/screen selectors in the full design are represented by the welcome text and buttons above.</p></div></div></div>
  <button onclick="saveBotDesign()">Apply changes</button> <button class="ghost" onclick="botDesign()">Discard</button>`;
  window._bd=d;
}
async function toggleBtn(i){_bd.buttons[i].visible=!_bd.buttons[i].visible;botDesign();}
async function saveBotDesign(){await api('/api/bot-design',{method:'PUT',body:{menuLayout:$('#bdLayout').value,welcomeMessage:$('#bdWelcome').value,browsing:{..._bd.browsing,categoriesPerRow:+$('#bdCpr').value,productsPerPage:+$('#bdPpp').value},buttons:_bd.buttons}});alert('Bot design saved');}

async function broadcast(){
  const list=await api('/api/broadcasts');
  app.innerHTML=`<div class="tabs"><button class="on">Compose</button><button onclick="bcHistory()">History (${list.length})</button></div>
  <div class="card"><label>Format</label><select id="bcFmt"><option>Standard</option><option>Rich</option></select><label>Message</label><textarea id="bcText" placeholder="Your broadcast…"></textarea>
  <label>Image (max 2 MB — upload is simulated in this replica; paste an image URL)</label><input id="bcImg" placeholder="https://…">
  <label>Audience</label><select id="bcAud"><option value="all">All users</option></select><p class="muted small">Estimated recipients: ${(await api('/api/customers')).length}</p>
  <label><input type="checkbox" id="bcPub" style="width:auto"> Also post to public channel</label><br><button onclick="sendBc()">Review and send</button></div>`;
}
async function bcHistory(){const list=await api('/api/broadcasts');app.innerHTML=`<div class="card"><table><tr><th>Text</th><th>Format</th><th>Recipients</th><th>Status</th><th>Created</th></tr>${list.map(b=>`<tr><td>${esc(b.text.slice(0,60))}</td><td>${b.format}</td><td>${b.recipients}</td><td>${b.status}</td><td>${b.createdAt.slice(0,10)}</td></tr>`).join('')}</table></div>`;}
async function sendBc(){const b=await api('/api/broadcasts',{method:'POST',body:{text:$('#bcText').value,format:$('#bcFmt').value,image:$('#bcImg').value,publicChannel:$('#bcPub').checked}});const j=await api('/api/broadcasts/'+b.id+'/send',{method:'POST'});alert(j.note||'Broadcast sent');bcHistory();}

async function payments(){
  const m=await api('/api/payment-methods');
  app.innerHTML=`<div class="tabs"><button class="on">Methods</button><button onclick="binanceTab()">Binance Pay</button></div>
  <div class="card"><button onclick="addMethod()">+ Add method</button></div>
  <div class="card"><table><tr><th>Method</th><th>Provider</th><th>Enabled</th><th></th></tr>${m.map(x=>`<tr><td>${esc(x.type)}</td><td>${esc(x.provider)}</td><td>${x.enabled?'Yes':'No'}</td><td><button class="small" onclick="toggleMethod('${x.id}',${!x.enabled})">${x.enabled?'Disable':'Enable'}</button> <button class="small danger" onclick="delMethod('${x.id}')">Delete</button></td></tr>`).join('')}</table></div>
  <div class="card"><h3>Cryptomus setup</h3><p class="muted small">Hosted crypto checkout. Enter Merchant UUID + API key, set commercial rules, invoice lifetime and fee payer. Customer preview is shown in the store checkout.</p><input id="cmUuid" placeholder="Merchant UUID"><input id="cmKey" placeholder="API key"><label>Min deposit USDT</label><input id="cmMin" type="number" value="1"><label>Max deposit USDT</label><input id="cmMax" type="number" value="10000"><label>Invoice lifetime</label><select id="cmLife"><option>30m</option><option>1h</option><option>2h</option><option>custom</option></select><label>Fee payer</label><select id="cmFee"><option>merchant</option><option>split</option><option>customer</option></select><button onclick="saveCryptomus()">Save Cryptomus</button></div>`;
}
async function binanceTab(){modal(`<h3>Binance Pay</h3><p class="muted">USDC rate is shown after adding Binance Pay. Add it from Methods, then configure its API credentials here in production.</p><button class="ghost" onclick="closeModal()">Close</button>`);}
async function addMethod(){modal(`<h3>Add method</h3><select id="amType"><option>Binance Pay USDT</option><option>Telegram Stars</option><option>Cryptomus hosted crypto</option></select><button onclick="doAddMethod()">Add</button>`);}
async function doAddMethod(){await api('/api/payment-methods',{method:'POST',body:{type:$('#amType').value}});closeModal();payments();}
async function toggleMethod(id,en){await api('/api/payment-methods/'+id,{method:'PUT',body:{enabled:en}});payments();}
async function delMethod(id){if(confirm('Delete method?')){await api('/api/payment-methods/'+id,{method:'DELETE'});payments();}}
async function saveCryptomus(){await api('/api/payment-methods',{method:'POST',body:{type:'Cryptomus hosted crypto',provider:'cryptomus',config:{merchantUuid:$('#cmUuid').value,apiKey:$('#cmKey').value,min:+$('#cmMin').value,max:+$('#cmMax').value,lifetime:$('#cmLife').value,feePayer:$('#cmFee').value}}});alert('Cryptomus method saved');payments();}

async function transactions(){
  const t=await api('/api/transactions');
  const done=t.filter(x=>x.status==='Completed'&&x.type==='deposit'), pend=t.filter(x=>x.status!=='Completed');
  app.innerHTML=`<div class="grid g4"><div class="card tile"><span>Completed volume</span><b>${done.reduce((s,x)=>s+x.amount,0).toFixed(2)} USDT</b></div><div class="card tile"><span>Completed</span><b>${done.length}</b></div><div class="card tile"><span>Pending</span><b>${pend.length}</b></div><div class="card tile"><span>Needs action</span><b>${t.filter(x=>x.status==='Needs action').length}</b></div></div>
  <div class="card"><h3>Record a deposit</h3><select id="txCust">${(await api('/api/customers')).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select><input id="txAmt" type="number" placeholder="Amount USDT"><select id="txMethod"><option>TRC20 USDT</option><option>BEP20 USDT</option><option>Polygon USDT</option><option>Binance Pay</option><option>Telegram Stars</option><option>Deposit code</option></select><button onclick="addTx()">Record (Pending)</button></div>
  <div class="card"><table><tr><th>ID</th><th>Type</th><th>Customer</th><th>Amount</th><th>Method</th><th>Status</th><th></th></tr>${t.map(x=>`<tr><td>${x.id}</td><td>${x.type}</td><td>${esc(x.customer)}</td><td>${x.amount} USDT</td><td>${x.method}</td><td>${x.status}</td><td>${x.status!=='Completed'?`<button class="small" onclick="txAction('${x.id}','approve')">Approve</button> <button class="small danger" onclick="txAction('${x.id}','reject')">Reject</button>`:''}</td></tr>`).join('')}</table><p class="muted small">Methods filter includes BSC, TRON, Polygon, Ethereum, TON, Bitcoin, Solana, Arbitrum, Avalanche, Optimism, Base, Litecoin, Dogecoin, Bitcoin Cash, Dash, Monero, Binance Pay, Stars and Deposit code. Statuses: Needs action, Completed, Pending, Awaiting TxID, Expired, Cancelled, Unprocessed.</p></div>`;
}
async function addTx(){await api('/api/transactions',{method:'POST',body:{customerId:$('#txCust').value,amount:+$('#txAmt').value,method:$('#txMethod').value}});transactions();}
async function txAction(id,a){await api('/api/transactions/'+id+'/action',{method:'POST',body:{action:a}});transactions();}

async function depositCodes(){
  const list=await api('/api/deposit-codes');
  app.innerHTML=`<div class="grid g4">${['UNUSED','USED','EXPIRED','REVOKED'].map(s=>`<div class="card tile"><span>${s}</span><b>${list.filter(c=>c.status===s).length}</b></div>`).join('')}<div class="card tile"><span>Total used</span><b>${list.filter(c=>c.status==='USED').length}</b></div></div>
  <div class="card"><input id="dcAmt" type="number" placeholder="Amount USDT"><input id="dcExp" type="number" placeholder="Expiry hours (optional)"><button onclick="createDc()">Create code</button></div>
  <div class="card"><table><tr><th>Code</th><th>Amount</th><th>Status</th><th>Expires</th><th></th></tr>${list.map(c=>`<tr><td>${c.code}</td><td>${c.amount} USDT</td><td>${c.status}</td><td>${c.expiresAt?c.expiresAt.slice(0,16):'—'}</td><td>${c.status==='UNUSED'?`<button class="small danger" onclick="revokeDc('${c.id}')">Revoke</button>`:''}</td></tr>`).join('')}</table></div>`;
}
async function createDc(){const j=await api('/api/deposit-codes',{method:'POST',body:{amount:+$('#dcAmt').value,expiryHours:+$('#dcExp').value||undefined}});alert('Code created: '+j.code);depositCodes();}
async function revokeDc(id){await api('/api/deposit-codes/'+id+'/revoke',{method:'POST'});depositCodes();}

async function guide(){
  const g=await api('/api/guide');
  const done=g.sections.filter(s=>s.done).length;
  app.innerHTML=`<div class="card"><h3>Store guide — ${done}/${g.sections.length} complete (${Math.round(done/g.sections.length*100)}%)</h3></div>${g.sections.map(s=>`<div class="card"><b>${esc(s.title)}</b><p class="muted">${s.topics.join(' · ')}</p><button class="small" onclick="guideDone('${s.id}')">${s.done?'✓ Completed — undo':'Mark as complete'}</button></div>`).join('')}`;
}
async function guideDone(id){await api('/api/guide/'+id+'/complete',{method:'POST'});guide();}
async function notifications(){
  const n=await api('/api/notifications');
  app.innerHTML=`<div class="card"><div class="tabs"><button class="on">All</button><button onclick="notifFilter('Follow-up')">Follow-up</button><button onclick="notifFilter('Warnings')">Warnings</button><button onclick="notifFilter('Platform')">Platform</button></div>
  ${n.map(x=>`<div class="card"><b>${esc(x.title)}</b> <span class="badge">${x.type}</span> ${x.read?'':'<span class="badge amber">Unread</span>'}<p class="muted">${esc(x.body)}</p><button class="small ghost" onclick="readNotif('${x.id}')">Mark read</button></div>`).join('')||'<p class="muted">No notifications.</p>'}</div>`;
}
async function notifFilter(t){const n=(await api('/api/notifications')).filter(x=>x.type===t);app.innerHTML=`<div class="card">${n.map(x=>`<div><b>${esc(x.title)}</b><p class="muted">${esc(x.body)}</p></div>`).join('')||'None'}</div>`;}
async function readNotif(id){await api('/api/notifications/'+id+'/read',{method:'POST'});notifications();}
init();
