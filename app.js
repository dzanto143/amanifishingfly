const AMANI = {
  sb: window.AMANI_SUPABASE,
  money(v){ return `$${Number(v||0).toFixed(2)}`; },
  esc(v=''){ return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); },
  slug(v=''){ return v.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); },
  placeholder(text='AMANI FISHING'){ return `https://placehold.co/900x700/eef3f0/0c4a3c?text=${encodeURIComponent(text)}`; },
  async categories(){ const {data,error}=await this.sb.from('categories').select('*').order('name'); if(error) throw error; return data||[]; },
  async products(){ const {data,error}=await this.sb.from('products').select('*,categories(id,name,slug)').order('created_at',{ascending:false}); if(error) throw error; return data||[]; },
  async product(id){ const {data,error}=await this.sb.from('products').select('*,categories(id,name,slug)').eq('id',id).single(); if(error) throw error; return data; },
  async category(slug){ const {data,error}=await this.sb.from('categories').select('*').eq('slug',slug).single(); if(error) throw error; return data; },
  cart(){ return JSON.parse(localStorage.getItem('amani_cart')||'[]'); },
  saveCart(c){ localStorage.setItem('amani_cart',JSON.stringify(c)); this.updateCartCount(); },
  updateCartCount(){ const n=this.cart().reduce((a,x)=>a+Number(x.qty||1),0); document.querySelectorAll('[data-cart-count]').forEach(e=>e.textContent=n); },
  addCart(p,qty=1){ const c=this.cart(); const old=c.find(x=>x.id===p.id); if(old) old.qty+=qty; else c.push({id:p.id,name:p.name,price:Number(p.price),image_url:p.image_url,qty}); this.saveCart(c); alert(`${p.name} added to cart.`); },
  removeCart(id){ this.saveCart(this.cart().filter(x=>x.id!==id)); },
  total(){ return this.cart().reduce((a,x)=>a+Number(x.price)*Number(x.qty),0); },
  async renderHeader(){
    const el=document.querySelector('#site-header'); if(!el) return;
    el.innerHTML=`<header class="site-header"><div class="container nav">
      <a class="logo" href="index.html">AMANI<span>FISHING WHOLESALE</span></a>
      <nav class="nav-links" id="mainNav">
        <a href="index.html">Home</a><a href="shop.html">Shop</a><a href="about.html">About</a><a href="contact.html">Contact</a>
      </nav>
      <div class="nav-actions"><button class="btn btn-light" id="openCart">Cart (<span data-cart-count>0</span>)</button><button class="menu-btn" id="menuBtn">☰</button></div>
    </div></header>`;
    document.querySelector('#menuBtn').onclick=()=>document.querySelector('#mainNav').classList.toggle('open');
    document.querySelector('#openCart').onclick=()=>this.openCart();
    this.updateCartCount();
  },
  async renderFooter(){
    const el=document.querySelector('#site-footer'); if(!el)return;
    el.innerHTML=`<footer class="footer"><div class="container footer-grid">
      <div><div class="logo" style="color:#fff">AMANI<span style="color:#d7a83e">FISHING WHOLESALE</span></div><p>Quality fishing flies for anglers, guides and wholesale buyers.</p></div>
      <div><h3>Shop</h3><p><a href="shop.html">All Flies</a></p><p><a href="shop.html">Categories</a></p><p><a href="checkout.html">Checkout</a></p></div>
      <div><h3>Contact</h3><p>Replace this section with your phone, WhatsApp and email.</p><p><a href="admin.html">Admin</a></p></div>
    </div><div class="container footer-bottom">© ${new Date().getFullYear()} AMANI Fishing Wholesale. All rights reserved.</div></footer>`;
  },
  cartMarkup(){
    const c=this.cart();
    return `<div class="cart-drawer" id="cartDrawer"><div class="cart-overlay" id="cartOverlay"></div><aside class="cart-panel">
      <div style="display:flex;justify-content:space-between;align-items:center"><h2>Your Cart</h2><button class="close" id="closeCart">×</button></div>
      <div class="cart-items">${c.length?c.map(x=>`<div class="cart-item"><img src="${x.image_url||this.placeholder(x.name)}"><div><strong>${this.esc(x.name)}</strong><div class="muted">${this.money(x.price)} × ${x.qty}</div><button class="btn btn-danger btn-sm remove-cart" data-id="${x.id}">Remove</button></div><strong>${this.money(x.price*x.qty)}</strong></div>`).join(''):`<div class="empty">Your cart is empty.</div>`}</div>
      <div style="border-top:1px solid var(--line);padding-top:18px"><div style="display:flex;justify-content:space-between;font-size:20px;font-weight:900"><span>Total</span><span>${this.money(this.total())}</span></div><a class="btn btn-primary" style="width:100%;margin-top:14px" href="checkout.html">Checkout</a></div>
    </aside></div>`;
  },
  openCart(){
    let d=document.querySelector('#cartDrawer'); if(!d){document.body.insertAdjacentHTML('beforeend',this.cartMarkup());d=document.querySelector('#cartDrawer');}
    d.classList.add('open'); document.querySelector('#closeCart').onclick=()=>d.classList.remove('open'); document.querySelector('#cartOverlay').onclick=()=>d.classList.remove('open');
    document.querySelectorAll('.remove-cart').forEach(b=>b.onclick=()=>{this.removeCart(b.dataset.id);this.openCart();});
  }
};

document.addEventListener('DOMContentLoaded',async()=>{
  if(!AMANI.sb){console.error('Supabase is not configured.');return;}
  await AMANI.renderHeader(); await AMANI.renderFooter();
  if(document.querySelector('[data-home-categories]')) loadHome();
  if(document.querySelector('[data-home-products]')) loadHomeProducts();
  if(document.querySelector('#shopGrid')) loadShop();
  if(document.querySelector('#productDetail')) loadProductPage();
  if(document.querySelector('#categoryPage')) loadCategoryPage();
  AMANI.updateCartCount();
});

async function loadHome(){
  const el=document.querySelector('[data-home-categories]');
  try{
    const cats=await AMANI.categories();
    el.innerHTML=cats.slice(0,8).map(c=>`<a class="card category-card" href="category.html?slug=${encodeURIComponent(c.slug)}"><img src="${c.image_url||AMANI.placeholder(c.name)}"><div class="card-body"><h3>${AMANI.esc(c.name)}</h3><p class="muted">${AMANI.esc(c.description||'Explore this fly collection.')}</p></div></a>`).join('')||'<div class="empty">No categories yet. Add categories from Admin.</div>';
  }catch(e){el.innerHTML=`<div class="notice error">${AMANI.esc(e.message)}</div>`}
}
async function loadHomeProducts(){
  const el=document.querySelector('[data-home-products]');
  try{
    const ps=(await AMANI.products()).filter(p=>p.featured||true).slice(0,8);
    el.innerHTML=ps.map(productCard).join('')||'<div class="empty">No products yet.</div>';
  }catch(e){el.innerHTML=`<div class="notice error">${AMANI.esc(e.message)}</div>`}
}
function productCard(p){
  return `<article class="card product-card"><a href="product.html?id=${p.id}"><img src="${p.image_url||AMANI.placeholder(p.name)}" alt="${AMANI.esc(p.name)}"></a><div class="card-body"><span class="badge">${AMANI.esc(p.categories?.name||'Fishing Fly')}</span><h3>${AMANI.esc(p.name)}</h3><div class="product-meta"><span class="price">${AMANI.money(p.price)}</span><button class="btn btn-primary btn-sm add-product" data-id="${p.id}">Add</button></div></div></article>`;
}
async function loadShop(){
  const grid=document.querySelector('#shopGrid'), search=document.querySelector('#shopSearch'), filter=document.querySelector('#shopCategory');
  const [ps,cats]=await Promise.all([AMANI.products(),AMANI.categories()]);
  filter.innerHTML='<option value="">All categories</option>'+cats.map(c=>`<option value="${c.id}">${AMANI.esc(c.name)}</option>`).join('');
  function draw(){
    const q=search.value.toLowerCase().trim(), cat=filter.value;
    const list=ps.filter(p=>(!q||p.name.toLowerCase().includes(q)||String(p.description||'').toLowerCase().includes(q))&&(!cat||p.category_id===cat));
    grid.innerHTML=list.map(productCard).join('')||'<div class="empty">No matching flies found.</div>';
    grid.querySelectorAll('.add-product').forEach(b=>b.onclick=()=>{const p=ps.find(x=>x.id===b.dataset.id);AMANI.addCart(p)});
  }
  search.oninput=draw;filter.onchange=draw;draw();
}
async function loadProductPage(){
  const box=document.querySelector('#productDetail'), id=new URLSearchParams(location.search).get('id');
  if(!id){box.innerHTML='<div class="notice error">Product not found.</div>';return}
  try{
    const p=await AMANI.product(id);
    box.innerHTML=`<div class="product-detail-image"><img src="${p.image_url||AMANI.placeholder(p.name)}" alt="${AMANI.esc(p.name)}"></div><div><span class="badge">${AMANI.esc(p.categories?.name||'Fishing Fly')}</span><h1>${AMANI.esc(p.name)}</h1><div class="price" style="font-size:28px">${AMANI.money(p.price)}</div><p>${AMANI.esc(p.description||'Quality fishing fly from AMANI Fishing Wholesale.')}</p><p><strong>Sizes:</strong> ${AMANI.esc(p.sizes||'Contact us for available sizes')}</p><p><strong>Stock:</strong> ${p.stock}</p><div class="qty"><button id="minus">−</button><input class="field" id="qty" type="number" min="1" value="1"><button id="plus">+</button></div><button class="btn btn-primary" id="addDetail">Add to Cart</button></div>`;
    const q=document.querySelector('#qty');document.querySelector('#minus').onclick=()=>q.value=Math.max(1,+q.value-1);document.querySelector('#plus').onclick=()=>q.value=+q.value+1;document.querySelector('#addDetail').onclick=()=>AMANI.addCart(p,+q.value);
  }catch(e){box.innerHTML=`<div class="notice error">${AMANI.esc(e.message)}</div>`}
}
async function loadCategoryPage(){
  const box=document.querySelector('#categoryPage'),slug=new URLSearchParams(location.search).get('slug');
  try{
    const [c,ps]=await Promise.all([AMANI.category(slug),AMANI.products()]);
    const list=ps.filter(p=>p.category_id===c.id);
    box.innerHTML=`<div class="section-head"><div><div class="eyebrow">Collection</div><h1>${AMANI.esc(c.name)}</h1><p class="muted">${AMANI.esc(c.description||'')}</p></div></div><div class="grid grid-4">${list.map(productCard).join('')||'<div class="empty">No products in this category yet.</div>'}</div>`;
    box.querySelectorAll('.add-product').forEach(b=>b.onclick=()=>AMANI.addCart(ps.find(x=>x.id===b.dataset.id)));
  }catch(e){box.innerHTML=`<div class="notice error">${AMANI.esc(e.message)}</div>`}
}
