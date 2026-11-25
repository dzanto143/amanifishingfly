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
// ============================================================
// AMANI FISHING WHOLESALE
// VERCEL ADMIN API
//
// This file runs SERVER-SIDE.
// NEVER put SUPABASE_SERVICE_ROLE_KEY in frontend JavaScript.
// ============================================================

const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const COOKIE_NAME = "amani_admin_session";

function json(res, status, data) {
  res.status(status).json(data);
}

function safeEqual(a, b) {
  const aBuffer = Buffer.from(String(a));
  const bBuffer = Buffer.from(String(b));

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function createSession() {
  const payload = {
    email: ADMIN_EMAIL,
    exp: Date.now() + 1000 * 60 * 60 * 24
  };

  const encoded = Buffer
    .from(JSON.stringify(payload))
    .toString("base64url");

  const signature = crypto
    .createHmac("sha256", process.env.ADMIN_SESSION_SECRET)
    .update(encoded)
    .digest("base64url");

  return `${encoded}.${signature}`;
}

function verifySession(req) {
  const cookieHeader = req.headers.cookie || "";

  const cookies = {};

  cookieHeader.split(";").forEach(cookie => {
    const index = cookie.indexOf("=");

    if (index === -1) return;

    const name = cookie.slice(0, index).trim();
    const value = cookie.slice(index + 1).trim();

    cookies[name] = decodeURIComponent(value);
  });

  const session = cookies[COOKIE_NAME];

  if (!session) {
    return false;
  }

  const parts = session.split(".");

  if (parts.length !== 2) {
    return false;
  }

  const encoded = parts[0];
  const signature = parts[1];

  const expected = crypto
    .createHmac("sha256", process.env.ADMIN_SESSION_SECRET)
    .update(encoded)
    .digest("base64url");

  if (!safeEqual(signature, expected)) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString()
    );

    if (payload.exp < Date.now()) {
      return false;
    }

    return payload.email === ADMIN_EMAIL;
  } catch {
    return false;
  }
}

function requireAdmin(req, res) {
  if (!verifySession(req)) {
    json(res, 401, {
      success: false,
      message: "Administrator login required."
    });

    return false;
  }

  return true;
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", chunk => {
      body += chunk;
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON."));
      }
    });

    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {

  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate"
  );

  // ============================================================
  // LOGIN
  // ============================================================

  if (req.method === "POST" && req.query.action === "login") {

    try {

      const body = await readBody(req);

      const email = String(body.email || "").trim();
      const password = String(body.password || "");

      if (!email || !password) {
        return json(res, 400, {
          success: false,
          message: "Email and password are required."
        });
      }

      const emailCorrect = safeEqual(
        email.toLowerCase(),
        String(ADMIN_EMAIL).toLowerCase()
      );

      const passwordCorrect = safeEqual(
        password,
        ADMIN_PASSWORD
      );

      if (!emailCorrect || !passwordCorrect) {
        return json(res, 401, {
          success: false,
          message: "Invalid administrator email or password."
        });
      }

      const session = createSession();

      res.setHeader(
        "Set-Cookie",
        `${COOKIE_NAME}=${encodeURIComponent(session)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`
      );

      return json(res, 200, {
        success: true,
        message: "Login successful."
      });

    } catch (error) {

      console.error(error);

      return json(res, 500, {
        success: false,
        message: "Login failed."
      });
    }
  }

  // ============================================================
  // LOGOUT
  // ============================================================

  if (
    req.method === "POST" &&
    req.query.action === "logout"
  ) {

    res.setHeader(
      "Set-Cookie",
      `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
    );

    return json(res, 200, {
      success: true
    });
  }

  // ============================================================
  // CHECK LOGIN
  // ============================================================

  if (
    req.method === "GET" &&
    req.query.action === "session"
  ) {

    return json(res, 200, {
      loggedIn: verifySession(req)
    });
  }

  // Everything below requires admin
  if (!requireAdmin(req, res)) {
    return;
  }

  // ============================================================
  // GET ALL DATA
  // ============================================================

  if (
    req.method === "GET" &&
    req.query.action === "data"
  ) {

    const [
      categoriesResult,
      productsResult,
      ordersResult
    ] = await Promise.all([

      supabase
        .from("categories")
        .select("*")
        .order("created_at", {
          ascending: false
        }),

      supabase
        .from("products")
        .select("*")
        .order("created_at", {
          ascending: false
        }),

      supabase
        .from("orders")
        .select("*")
        .order("created_at", {
          ascending: false
        })

    ]);

    if (categoriesResult.error) {
      return json(res, 500, {
        success: false,
        message: categoriesResult.error.message
      });
    }

    if (productsResult.error) {
      return json(res, 500, {
        success: false,
        message: productsResult.error.message
      });
    }

    if (ordersResult.error) {
      return json(res, 500, {
        success: false,
        message: ordersResult.error.message
      });
    }

    return json(res, 200, {
      success: true,
      categories: categoriesResult.data,
      products: productsResult.data,
      orders: ordersResult.data
    });
  }

  // ============================================================
  // ADD CATEGORY
  // ============================================================

  if (
    req.method === "POST" &&
    req.query.action === "add-category"
  ) {

    const body = await readBody(req);

    const {
      name,
      slug,
      description,
      image_url
    } = body;

    if (!name || !slug) {
      return json(res, 400, {
        success: false,
        message: "Category name and slug are required."
      });
    }

    const { data, error } = await supabase
      .from("categories")
      .insert({
        name,
        slug,
        description: description || "",
        image_url: image_url || ""
      })
      .select()
      .single();

    if (error) {
      return json(res, 400, {
        success: false,
        message: error.message
      });
    }

    return json(res, 200, {
      success: true,
      category: data
    });
  }

  // ============================================================
  // UPDATE CATEGORY
  // ============================================================

  if (
    req.method === "POST" &&
    req.query.action === "update-category"
  ) {

    const body = await readBody(req);

    if (!body.id) {
      return json(res, 400, {
        success: false,
        message: "Category ID is required."
      });
    }

    const { data, error } = await supabase
      .from("categories")
      .update({
        name: body.name,
        slug: body.slug,
        description: body.description || "",
        image_url: body.image_url || ""
      })
      .eq("id", body.id)
      .select()
      .single();

    if (error) {
      return json(res, 400, {
        success: false,
        message: error.message
      });
    }

    return json(res, 200, {
      success: true,
      category: data
    });
  }

  // ============================================================
  // DELETE CATEGORY
  // ============================================================

  if (
    req.method === "POST" &&
    req.query.action === "delete-category"
  ) {

    const body = await readBody(req);

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", body.id);

    if (error) {
      return json(res, 400, {
        success: false,
        message: error.message
      });
    }

    return json(res, 200, {
      success: true
    });
  }

  // ============================================================
  // ADD PRODUCT
  // ============================================================

  if (
    req.method === "POST" &&
    req.query.action === "add-product"
  ) {

    const body = await readBody(req);

    if (!body.name) {
      return json(res, 400, {
        success: false,
        message: "Product name is required."
      });
    }

    const { data, error } = await supabase
      .from("products")
      .insert({
        name: body.name,
        category_id: body.category_id || null,
        price: Number(body.price || 0),
        image_url: body.image_url || "",
        sizes: body.sizes || "",
        description: body.description || "",
        stock: Number(body.stock || 0),
        featured: Boolean(body.featured)
      })
      .select()
      .single();

    if (error) {
      return json(res, 400, {
        success: false,
        message: error.message
      });
    }

    return json(res, 200, {
      success: true,
      product: data
    });
  }

  // ============================================================
  // UPDATE PRODUCT
  // ============================================================

  if (
    req.method === "POST" &&
    req.query.action === "update-product"
  ) {

    const body = await readBody(req);

    if (!body.id) {
      return json(res, 400, {
        success: false,
        message: "Product ID is required."
      });
    }

    const { data, error } = await supabase
      .from("products")
      .update({
        name: body.name,
        category_id: body.category_id || null,
        price: Number(body.price || 0),
        image_url: body.image_url || "",
        sizes: body.sizes || "",
        description: body.description || "",
        stock: Number(body.stock || 0),
        featured: Boolean(body.featured)
      })
      .eq("id", body.id)
      .select()
      .single();

    if (error) {
      return json(res, 400, {
        success: false,
        message: error.message
      });
    }

    return json(res, 200, {
      success: true,
      product: data
    });
  }

  // ============================================================
  // DELETE PRODUCT
  // ============================================================

  if (
    req.method === "POST" &&
    req.query.action === "delete-product"
  ) {

    const body = await readBody(req);

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", body.id);

    if (error) {
      return json(res, 400, {
        success: false,
        message: error.message
      });
    }

    return json(res, 200, {
      success: true
    });
  }

  // ============================================================
  // UPDATE ORDER STATUS
  // ============================================================

  if (
    req.method === "POST" &&
    req.query.action === "update-order"
  ) {

    const body = await readBody(req);

    const { data, error } = await supabase
      .from("orders")
      .update({
        status: body.status
      })
      .eq("id", body.id)
      .select()
      .single();

    if (error) {
      return json(res, 400, {
        success: false,
        message: error.message
      });
    }

    return json(res, 200, {
      success: true,
      order: data
    });
  }

  // ============================================================
  // UPLOAD IMAGE
  // ============================================================

  if (
    req.method === "POST" &&
    req.query.action === "upload-image"
  ) {

    const body = await readBody(req);

    if (!body.filename || !body.base64) {
      return json(res, 400, {
        success: false,
        message: "Image filename and image data are required."
      });
    }

    const cleanBase64 = body.base64.replace(
      /^data:[^;]+;base64,/,
      ""
    );

    const buffer = Buffer.from(
      cleanBase64,
      "base64"
    );

    const extension =
      String(body.filename)
        .split(".")
        .pop()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "jpg";

    const fileName =
      `admin/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage
      .from("product-images")
      .upload(
        fileName,
        buffer,
        {
          contentType:
            body.contentType || "image/jpeg",
          upsert: false
        }
      );

    if (error) {
      return json(res, 400, {
        success: false,
        message: error.message
      });
    }

    const {
      data: publicUrl
    } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName);

    return json(res, 200, {
      success: true,
      url: publicUrl.publicUrl
    });
  }

  return json(res, 404, {
    success: false,
    message: "Unknown admin action."
  });
};