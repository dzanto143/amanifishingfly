document.addEventListener('DOMContentLoaded',()=>{
  const box=document.querySelector('#checkoutItems'); if(!box)return;
  renderCheckout();
  document.querySelector('#checkoutForm').onsubmit=submitOrder;
});
function renderCheckout(){
  const c=AMANI.cart(), box=document.querySelector('#checkoutItems');
  box.innerHTML=c.length?c.map(x=>`<div class="cart-item"><img src="${x.image_url||AMANI.placeholder(x.name)}"><div><strong>${AMANI.esc(x.name)}</strong><div>${AMANI.money(x.price)} × ${x.qty}</div></div><strong>${AMANI.money(x.price*x.qty)}</strong></div>`).join(''):'<div class="empty">Your cart is empty. <a href="shop.html">Shop now</a></div>';
  document.querySelector('#checkoutTotal').textContent=AMANI.money(AMANI.total());
}
async function submitOrder(e){
  e.preventDefault();
  const c=AMANI.cart(); if(!c.length){alert('Your cart is empty.');return;}
  const f=new FormData(e.target);
  const order={customer_name:f.get('customer_name'),phone:f.get('phone'),email:f.get('email'),address:f.get('address'),notes:f.get('notes'),items:c,total:AMANI.total(),status:'pending'};
  const {error}=await AMANI.sb.from('orders').insert(order);
  if(error){document.querySelector('#orderMsg').innerHTML=`<div class="notice error">${AMANI.esc(error.message)}</div>`;return;}
  localStorage.removeItem('amani_cart'); AMANI.updateCartCount();
  e.target.reset(); document.querySelector('#orderMsg').innerHTML='<div class="notice success">Order received successfully. We will contact you to confirm payment and delivery.</div>'; renderCheckout();
}
