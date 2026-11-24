const ADMIN={
  sb:window.AMANI_SUPABASE,
  user:null,
  async init(){
    if(!this.sb)return;
    const {data}=await this.sb.auth.getSession();
    if(data.session) await this.showAdmin(data.session.user); else this.showLogin();
    this.sb.auth.onAuthStateChange(async(_e,s)=>{if(s)await this.showAdmin(s.user);});
  },
  showLogin(){document.querySelector('#loginView').style.display='block';document.querySelector('#adminView').style.display='none';},
  async showAdmin(user){
    const {data,isAdmin}=await this.checkAdmin(user.id);
    if(!isAdmin){await this.sb.auth.signOut();document.querySelector('#loginMessage').innerHTML='<div class="notice error">This account is not an approved AMANI admin.</div>';return;}
    this.user=user;document.querySelector('#loginView').style.display='none';document.querySelector('#adminView').style.display='block';await this.refresh();
  },
  async checkAdmin(id){const {data,error}=await this.sb.from('admin_users').select('user_id').eq('user_id',id).maybeSingle();return {data,error,isAdmin:!!data};},
  async refresh(){this.categories=await this.getCategories();this.products=await this.getProducts();this.orders=await this.getOrders();this.renderAll();},
  async getCategories(){const {data,error}=await this.sb.from('categories').select('*').order('name');if(error)throw error;return data||[]},
  async getProducts(){const {data,error}=await this.sb.from('products').select('*,categories(name)').order('created_at',{ascending:false});if(error)throw error;return data||[]},
  async getOrders(){const {data,error}=await this.sb.from('orders').select('*').order('created_at',{ascending:false});if(error)throw error;return data||[]},
  async upload(file){
    if(!file)return '';
    const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
    const path=`admin/${this.user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const {error}=await this.sb.storage.from('product-images').upload(path,file,{upsert:false,contentType:file.type||'image/jpeg'});
    if(error)throw error;
    return this.sb.storage.from('product-images').getPublicUrl(path).data.publicUrl;
  },
  renderAll(){
    document.querySelector('#catList').innerHTML=this.categories.map(c=>`<div class="admin-row"><img src="${c.image_url||AMANI.placeholder(c.name)}"><div><strong>${AMANI.esc(c.name)}</strong><div class="muted">${AMANI.esc(c.description||'')}</div></div><div class="actions"><button class="btn btn-light btn-sm" onclick="ADMIN.editCategory('${c.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="ADMIN.deleteCategory('${c.id}')">Delete</button></div></div>`).join('')||'<div class="empty">No categories.</div>';
    document.querySelector('#productList').innerHTML=this.products.map(p=>`<div class="admin-row"><img src="${p.image_url||AMANI.placeholder(p.name)}"><div><strong>${AMANI.esc(p.name)}</strong><div>${AMANI.money(p.price)} · ${AMANI.esc(p.categories?.name||'No category')} · Stock ${p.stock}</div></div><div class="actions"><button class="btn btn-light btn-sm" onclick="ADMIN.editProduct('${p.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="ADMIN.deleteProduct('${p.id}')">Delete</button></div></div>`).join('')||'<div class="empty">No products.</div>';
    document.querySelector('#orderList').innerHTML=this.orders.map(o=>`<div class="card" style="padding:18px"><div style="display:flex;justify-content:space-between;gap:15px"><div><strong>${AMANI.esc(o.customer_name)}</strong><div>${AMANI.esc(o.phone)} · ${AMANI.esc(o.email||'')}</div><div class="muted">${AMANI.esc(o.address)}</div></div><select class="field" style="max-width:180px" onchange="ADMIN.status('${o.id}',this.value)">${['pending','confirmed','paid','shipped','completed','cancelled'].map(s=>`<option ${o.status===s?'selected':''}>${s}</option>`).join('')}</select></div><hr><div>${(o.items||[]).map(i=>`${AMANI.esc(i.name)} × ${i.qty} — ${AMANI.money(i.price*i.qty)}`).join('<br>')}</div><strong>Total: ${AMANI.money(o.total)}</strong></div>`).join('')||'<div class="empty">No orders yet.</div>';
    document.querySelector('#catSelect').innerHTML='<option value="">Select category</option>'+this.categories.map(c=>`<option value="${c.id}">${AMANI.esc(c.name)}</option>`).join('');
    document.querySelector('#statCats').textContent=this.categories.length;document.querySelector('#statProducts').textContent=this.products.length;document.querySelector('#statOrders').textContent=this.orders.length;document.querySelector('#statSales').textContent=AMANI.money(this.orders.reduce((a,o)=>a+Number(o.total||0),0));
  },
  async saveCategory(e){
    e.preventDefault();const f=new FormData(e.target);let image_url=f.get('image_url')||'';if(f.get('image')?.size)image_url=await this.upload(f.get('image'));
    const payload={name:f.get('name'),slug:AMANI.slug(f.get('name')),description:f.get('description'),image_url};
    const id=f.get('id');
    const {error}=id?await this.sb.from('categories').update(payload).eq('id',id):await this.sb.from('categories').insert(payload);
    if(error)alert(error.message);else{e.target.reset();e.target.querySelector('[name=id]').value='';await this.refresh();alert('Category saved.');}
  },
  async saveProduct(e){
    e.preventDefault();const f=new FormData(e.target);let image_url=f.get('image_url')||'';if(f.get('image')?.size)image_url=await this.upload(f.get('image'));
    const payload={name:f.get('name'),category_id:f.get('category_id')||null,price:Number(f.get('price')||0),image_url,sizes:f.get('sizes'),description:f.get('description'),stock:Number(f.get('stock')||0),featured:f.get('featured')==='on'};
    const id=f.get('id');const {error}=id?await this.sb.from('products').update(payload).eq('id',id):await this.sb.from('products').insert(payload);
    if(error)alert(error.message);else{e.target.reset();e.target.querySelector('[name=id]').value='';await this.refresh();alert('Product saved.');}
  },
  async editCategory(id){const c=this.categories.find(x=>x.id===id);const f=document.querySelector('#categoryForm');for(const k of ['id','name','description','image_url'])if(f.elements[k])f.elements[k].value=c[k]||'';f.scrollIntoView({behavior:'smooth'});},
  async editProduct(id){const p=this.products.find(x=>x.id===id);const f=document.querySelector('#productForm');for(const k of ['id','name','category_id','price','image_url','sizes','description','stock'])if(f.elements[k])f.elements[k].value=p[k]??'';f.elements.featured.checked=!!p.featured;f.scrollIntoView({behavior:'smooth'});},
  async deleteCategory(id){if(!confirm('Delete this category?'))return;const {error}=await this.sb.from('categories').delete().eq('id',id);if(error)alert(error.message);else await this.refresh();},
  async deleteProduct(id){if(!confirm('Delete this product?'))return;const {error}=await this.sb.from('products').delete().eq('id',id);if(error)alert(error.message);else await this.refresh();},
  async status(id,status){const {error}=await this.sb.from('orders').update({status}).eq('id',id);if(error)alert(error.message);else await this.refresh();}
};
document.addEventListener('DOMContentLoaded',()=>{
  if(!document.querySelector('#adminView'))return;
  ADMIN.init();
  document.querySelector('#loginForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);const {error}=await ADMIN.sb.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});if(error)document.querySelector('#loginMessage').innerHTML=`<div class="notice error">${AMANI.esc(error.message)}</div>`};
  document.querySelector('#categoryForm').onsubmit=e=>ADMIN.saveCategory(e);
  document.querySelector('#productForm').onsubmit=e=>ADMIN.saveProduct(e);
  document.querySelector('#logout').onclick=()=>ADMIN.sb.auth.signOut();
});
