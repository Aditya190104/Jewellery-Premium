/* Local demonstration state; never a payment or authentication authority. */
(function(root){
 'use strict';
 const catalog=root.JewelryCatalog||(typeof require!=='undefined'?require('./catalog.js'):null);
 const KEY='jewelry.demo.v1';
 const fresh=()=>({version:1,cart:[],wishlist:[],compare:[],orders:[],reviews:{},profile:{name:'',style:'All'},coupon:'',note:''});
 let memory=fresh(), persistent=true, unsavedMemory=false;
 const cleanText=(v,max=300)=>typeof v==='string'?v.slice(0,max):'';
 const quantity=v=>Number.isFinite(Number(v))?Math.max(1,Math.min(10,Math.trunc(Number(v)))):1;
 function normalize(raw){
  const s=fresh(); if(!raw||typeof raw!=='object')return s;
  for(const key of ['wishlist','compare'])s[key]=[...new Set((Array.isArray(raw[key])?raw[key]:[]).filter(id=>catalog.get(id)))].slice(0,key==='compare'?3:100);
  for(const item of Array.isArray(raw.cart)?raw.cart:[]){
   const p=catalog.get(item?.id);if(!p)continue;
   const size=p.sizes.includes(item.size)?item.size:p.sizes[0];
   const existing=s.cart.find(i=>i.id===p.id&&i.size===size);
   const q=quantity(item.qty);if(existing)existing.qty=Math.min(p.stock,existing.qty+q);else s.cart.push({id:p.id,size,qty:Math.min(q,p.stock)});
  }
  // Each demo stock limit applies across all sizes of that product.
  const used={};s.cart=s.cart.filter(i=>{const p=catalog.get(i.id);i.qty=Math.min(i.qty,p.stock-(used[i.id]||0));used[i.id]=(used[i.id]||0)+i.qty;return i.qty>0;});
  s.coupon=raw.coupon==='WELCOME10'?'WELCOME10':'';s.note=cleanText(raw.note,300);
  s.profile={name:cleanText(raw.profile?.name,60),style:catalog.categories.includes(raw.profile?.style)?raw.profile.style:'All'};
  s.orders=(Array.isArray(raw.orders)?raw.orders:[]).filter(o=>o&&/^DEMO-[A-Z0-9-]+$/.test(o.id)&&Array.isArray(o.items)&&Number.isFinite(o.total)&&o.total>=0&&Number.isFinite(Date.parse(o.date))).slice(0,30).map(o=>({id:o.id,date:o.date,total:o.total,subtotal:Number(o.subtotal)||0,discount:Number(o.discount)||0,shipping:Number(o.shipping)||0,items:o.items.filter(i=>catalog.get(i?.id)).map(i=>({id:i.id,size:cleanText(i.size,30),qty:quantity(i.qty),price:Math.max(0,Number(i.price)||0)}))}));
  for(const [id,reviews]of Object.entries(raw.reviews&&typeof raw.reviews==='object'?raw.reviews:{})){
   if(catalog.get(id)&&Array.isArray(reviews))s.reviews[id]=reviews.filter(r=>r&&typeof r==='object').slice(0,20).map(r=>({name:cleanText(r.name,60),text:cleanText(r.text,600),rating:Math.max(1,Math.min(5,Math.round(Number(r.rating)||5)))}));
  }
  return s;
 }
 function read(force=false){
  if(!unsavedMemory||force){
   try{if(!root.localStorage)throw new Error('No storage');const data=root.localStorage.getItem(KEY);try{memory=data?normalize(JSON.parse(data)):fresh();}catch(e){memory=fresh();}unsavedMemory=false;}
   catch(e){persistent=false;}
  }
  return structuredCloneSafe(memory);
 }
 function structuredCloneSafe(v){return JSON.parse(JSON.stringify(v));}
 function notify(){if(typeof root.dispatchEvent==='function')root.dispatchEvent(new CustomEvent('jewelry:change',{detail:{persistent}}));}
 function write(value){memory=normalize(value);try{if(!root.localStorage)throw new Error('No storage');root.localStorage.setItem(KEY,JSON.stringify(memory));persistent=true;unsavedMemory=false;}catch(e){persistent=false;unsavedMemory=true;}notify();return persistent;}
 function add(id,size,qty=1){const p=catalog.get(id);if(!p||!p.sizes.includes(size))throw new Error('Choose a valid size.');const s=read();const used=s.cart.filter(i=>i.id===id).reduce((n,i)=>n+i.qty,0);const q=quantity(qty);if(used+q>p.stock)throw new Error(`Only ${p.stock} demo pieces are available across all sizes.`);const item=s.cart.find(i=>i.id===id&&i.size===size);if(item)item.qty+=q;else s.cart.push({id,size,qty:q});return write(s);}
 function setQty(id,size,qty){const s=read(),item=s.cart.find(i=>i.id===id&&i.size===size),p=catalog.get(id);if(!item||!p)return;const other=s.cart.filter(i=>i.id===id&&i!==item).reduce((n,i)=>n+i.qty,0);item.qty=Math.min(quantity(qty),p.stock-other);return write(s);}
 function remove(id,size){const s=read();s.cart=s.cart.filter(i=>!(i.id===id&&i.size===size));return write(s);}
 function toggle(list,id){if(!['wishlist','compare'].includes(list)||!catalog.get(id))return;const s=read();if(s[list].includes(id))s[list]=s[list].filter(x=>x!==id);else {if(list==='compare'&&s.compare.length>=3)throw new Error('Compare up to 3 pieces. Remove one to add another.');s[list].push(id);}write(s);return s[list].includes(id);}
 function totals(state=read()){const subtotal=state.cart.reduce((n,i)=>n+(catalog.get(i.id)?.price||0)*i.qty,0);const discount=state.coupon==='WELCOME10'?Math.round(subtotal*.1):0;const shipping=subtotal===0||subtotal-discount>=5000?0:149;return {subtotal,discount,shipping,total:subtotal-discount+shipping,count:state.cart.reduce((n,i)=>n+i.qty,0)};}
 function validateDelivery(d={}){
  const errors=[];const clean=k=>String(d[k]||'').trim();
  if(clean('name').length<2)errors.push('Enter your full name.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean('email')))errors.push('Enter a valid email address.');
  if(!/^[6-9][0-9]{9}$/.test(clean('phone')))errors.push('Enter a 10-digit Indian mobile number.');
  if(clean('address').length<8)errors.push('Enter an address of at least 8 characters.');
  if(clean('city').length<2)errors.push('Enter your city.');
  if(!clean('state'))errors.push('Choose your state or union territory.');
  if(!/^[1-9][0-9]{5}$/.test(clean('pin')))errors.push('Enter a valid 6-digit PIN code.');
  return errors;
 }
 function order(){
  const s=read();if(!s.cart.length)throw new Error('Your bag is empty.');
  const t=totals(s),o={id:'DEMO-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,6).toUpperCase(),date:new Date().toISOString(),items:s.cart.map(i=>({...i,price:catalog.get(i.id).price})),...t};
  s.orders.unshift(o);s.cart=[];s.coupon='';s.note='';
  const next=normalize(s);
  // Commit first. A quota or permission failure must not empty the bag or announce success.
  try{if(!root.localStorage)throw new Error('No storage');root.localStorage.setItem(KEY,JSON.stringify(next));}
  catch(e){persistent=false;throw new Error('Browser storage is unavailable. No demo order was saved. Your bag has been kept. Please enable storage and try again.');}
  memory=next;persistent=true;unsavedMemory=false;notify();return o;
 }
 const api={KEY,read,write,normalize,add,setQty,remove,toggle,totals,order,quantity,validateDelivery,isPersistent:()=>persistent};
 root.JewelryStore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
