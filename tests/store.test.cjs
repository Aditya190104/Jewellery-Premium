/* Run with Node 18+ from project root: node --test tests/store.test.cjs */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const setup=path.resolve(__dirname,'../Setup');
const catalogSource=fs.readFileSync(path.join(setup,'js/catalog.js'),'utf8');
const storeSource=fs.readFileSync(path.join(setup,'js/store.js'),'utf8');
const plain=x=>JSON.parse(JSON.stringify(x));
function env(shared=new Map()){
 const events=[],mode={readFails:false,writeFails:false};
 const sandbox={console,localStorage:{getItem(k){if(mode.readFails)throw Error('blocked');return shared.get(k)??null;},setItem(k,v){if(mode.writeFails)throw Error('quota');shared.set(k,v);},removeItem(k){shared.delete(k);}},dispatchEvent(e){events.push(e);},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}}};
 const ctx=vm.createContext(sandbox);vm.runInContext(catalogSource,ctx);vm.runInContext(storeSource,ctx);
 return {C:ctx.JewelryCatalog,S:ctx.JewelryStore,shared,mode,events};
}
test('catalogue has unique IDs, real local photos and complete product options',()=>{
 const {C}=env();assert.equal(C.products.length,17);assert.equal(new Set(C.products.map(p=>p.id)).size,17);
 for(const p of C.products){assert.ok(p.price>0);assert.ok(p.sizes.length);assert.ok(p.stock>0);assert.ok(p.rating>=1&&p.rating<=5);assert.ok(!p.oldPrice||p.oldPrice>p.price);for(const img of p.gallery||[p.image])assert.ok(fs.existsSync(path.join(setup,img)),img);}
});
test('category and bridal filters use the correct catalogue attributes',()=>{
 const {C}=env();assert.ok(C.query({category:'Rings'}).every(p=>p.category==='Rings'));assert.equal(C.query({category:'Rings'}).length,7);const bridal=C.query({category:'Bridal Jewellery'});assert.ok(bridal.length>4);assert.ok(bridal.every(p=>p.tags.includes('bridal')));assert.equal(C.query({category:'Missing'}).length,0);
});
test('search works across names, stone colour and finish without changing the source order',()=>{
 const {C}=env();assert.equal(C.query({q:'EMERALD POISE'})[0].id,'emerald-poise');assert.ok(C.query({q:'rose gold'}).length>=2);assert.equal(C.query({q:'nothing-like-this'}).length,0);const before=C.products.map(p=>p.id).join();C.query({sort:'price-asc'});assert.equal(C.products.map(p=>p.id).join(),before);
});
test('combined filters, offers and sorting return only matching pieces',()=>{
 const {C}=env();const p=C.query({category:'Rings',max:'7000',finish:'Gold',sale:true,sort:'price-desc'});assert.ok(p.length);assert.ok(p.every(p=>p.category==='Rings'&&p.price<=7000&&p.oldPrice&&!p.finish.includes('Rose')));assert.ok(p.every((x,i)=>i===0||p[i-1].price>=x.price));const asc=C.query({sort:'price-asc'});assert.ok(asc.every((x,i)=>i===0||asc[i-1].price<=x.price));const newEdit=C.query({edit:'new'});assert.ok(newEdit.every(x=>x.tags.includes('new')));
});
test('adding the same size merges lines; different sizes stay distinct',()=>{
 const {S}=env();S.add('eternal-gold','12',2);S.add('eternal-gold','12',1);S.add('eternal-gold','14',2);const c=S.read().cart;assert.equal(c.length,2);assert.equal(c[0].qty,3);assert.equal(c[1].qty,2);assert.equal(S.totals().total,6490*5);
});
test('invalid products and sizes cannot enter the bag',()=>{const {S}=env();assert.throws(()=>S.add('missing','12'));assert.throws(()=>S.add('eternal-gold','100'));assert.equal(S.read().cart.length,0);});
test('demo stock limits apply across every size of a product',()=>{
 const {S}=env();S.add('emerald-poise','18 inches',5);S.add('emerald-poise','20 inches',3);assert.throws(()=>S.add('emerald-poise','18 inches',1),/Only 8/);S.setQty('emerald-poise','18 inches',10);assert.equal(S.read().cart[0].qty,5);S.remove('emerald-poise','20 inches');S.setQty('emerald-poise','18 inches',8);assert.equal(S.read().cart[0].qty,8);
});
test('invalid, fractional and negative quantities are normalized safely',()=>{
 const {S}=env();assert.equal(S.quantity('oops'),1);assert.equal(S.quantity(-4),1);assert.equal(S.quantity(0),1);assert.equal(S.quantity(2.9),2);assert.equal(S.quantity(10000),10);assert.equal(S.quantity(Infinity),1);
});
test('wishlist persists and toggles without duplicates',()=>{const {S,shared}=env();assert.equal(S.toggle('wishlist','pearl-reverie'),true);assert.equal(env(shared).S.read().wishlist[0],'pearl-reverie');assert.equal(S.toggle('wishlist','pearl-reverie'),false);assert.equal(S.read().wishlist.length,0);});
test('comparison is limited to three pieces and can remove a selected piece',()=>{const {S}=env();['emerald-poise','eternal-gold','sapphire-muse'].forEach(id=>S.toggle('compare',id));assert.throws(()=>S.toggle('compare','rose-serenade'),/up to 3/);S.toggle('compare','sapphire-muse');S.toggle('compare','rose-serenade');assert.equal(S.read().compare.length,3);});
test('shipping and demo discount totals use the discounted merchandise subtotal',()=>{
 const {S}=env();assert.deepEqual(plain(S.totals()),{subtotal:0,discount:0,shipping:0,total:0,count:0});S.add('maharani-ring','14');assert.equal(S.totals().shipping,0);const s=S.read();s.coupon='WELCOME10';S.write(s);assert.deepEqual(plain(S.totals()),{subtotal:5490,discount:549,shipping:149,total:5090,count:1});S.add('celadon-petals','One size');assert.equal(S.totals().shipping,0);
});
test('unknown coupons do not change totals',()=>{const {S}=env();S.add('celadon-petals','One size');const s=S.read();s.coupon='FREE';S.write(s);assert.equal(S.totals().discount,0);assert.equal(S.totals().total,3039);});
test('saved state is normalized, capped and stripped of unknown or sensitive properties',()=>{
 const {S}=env();S.write({cart:[{id:'missing',qty:2},{id:'emerald-poise',size:'fake',qty:99},{id:'emerald-poise',size:'20 inches',qty:5}],wishlist:['missing','eternal-gold','eternal-gold'],compare:['emerald-poise','eternal-gold','sapphire-muse','rose-serenade'],profile:{name:'Guest',password:'secret',email:'private@example.test'},checkout:{address:'not stored'},reviews:{'eternal-gold':[null,{name:'A',text:'x'.repeat(800),rating:100}]}});
 const s=S.read();assert.equal(s.cart.length,1);assert.equal(s.cart[0].size,'18 inches');assert.equal(s.cart[0].qty,8);assert.equal(s.wishlist.length,1);assert.equal(s.compare.length,3);assert.ok(!('checkout'in s));assert.ok(!('password'in s.profile));assert.ok(!('email'in s.profile));assert.equal(s.reviews['eternal-gold'][0].text.length,600);assert.equal(s.reviews['eternal-gold'][0].rating,5);
});
test('bad JSON and malformed saved structures do not crash the application',()=>{
 const {S,shared}=env();shared.set(S.KEY,'{bad json');assert.equal(S.read().cart.length,0);S.add('sapphire-muse','One size');assert.equal(S.read().cart.length,1);shared.set(S.KEY,'{"cart":null,"orders":[null],"reviews":5,"profile":null}');assert.equal(S.read().cart.length,0);
});
test('clearing storage in another tab clears cached normal state',()=>{const {S,shared}=env();S.add('sapphire-muse','One size');shared.delete(S.KEY);assert.equal(S.read().cart.length,0);});
test('unavailable storage retains temporary bag changes and reports the limitation',()=>{
 const {S,mode}=env();mode.readFails=true;mode.writeFails=true;assert.equal(S.add('sapphire-muse','One size'),false);assert.equal(S.read().cart.length,1);assert.equal(S.isPersistent(),false);mode.readFails=false;mode.writeFails=false;assert.equal(S.write(S.read()),true);assert.equal(S.isPersistent(),true);
});
test('demo order creates a durable snapshot, clears the bag and never stores delivery data',()=>{
 const {S,shared}=env();S.add('eternal-gold','14',2);const s=S.read();s.note='Only a local note';s.coupon='WELCOME10';S.write(s);const o=S.order();assert.match(o.id,/^DEMO-/);assert.equal(o.total,11682);assert.equal(S.read().cart.length,0);assert.equal(S.read().coupon,'');assert.equal(S.read().note,'');const stored=env(shared).S.read().orders[0];assert.equal(stored.items[0].price,6490);assert.equal(stored.items[0].qty,2);assert.equal(stored.total,11682);assert.ok(!('email'in stored));assert.ok(!('address'in stored));assert.throws(()=>S.order(),/empty/);
});
test('failed demo-order persistence leaves cart and history untouched and emits no success',()=>{
 const {S,mode,events}=env();S.add('rose-serenade','16 cm');const before=JSON.stringify(S.read());events.length=0;mode.writeFails=true;assert.throws(()=>S.order(),/No demo order was saved/);assert.equal(JSON.stringify(S.read()),before);assert.equal(events.length,0);mode.writeFails=false;assert.ok(S.order().id);assert.equal(S.read().orders.length,1);
});
test('delivery validation accepts sample Indian details and rejects invalid fields',()=>{
 const {S}=env();const d={name:'Demo Shopper',email:'demo@example.test',phone:'9000000000',address:'123 Example Road',city:'Ludhiana',state:'Punjab',pin:'141001'};assert.equal(S.validateDelivery(d).length,0);assert.equal(S.validateDelivery({...d,email:'bad',phone:'12',pin:'012345'}).length,3);assert.equal(S.validateDelivery({...d,name:'   ',address:'  ',city:' ',state:''}).length,4);
});
test('history and reviews stay bounded and existing snapshots survive subsequent orders',()=>{
 const {S}=env();S.add('sapphire-muse','One size');const first=S.order();S.add('eternal-gold','18');S.order();assert.equal(S.read().orders.length,2);assert.equal(S.read().orders[1].id,first.id);const s=S.read();s.reviews['sapphire-muse']=Array.from({length:25},(_,i)=>({name:'Guest '+i,text:'Sample text',rating:4}));S.write(s);assert.equal(S.read().reviews['sapphire-muse'].length,20);
});
