/* Source-level presentation tests. No browser is started or automated. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../Setup/js');
function ui(){
 const document={querySelector(){return null;},querySelectorAll(){return [];},addEventListener(){},body:{dataset:{page:'test'}}};
 const sandbox={console,document,Intl,setTimeout,clearTimeout,addEventListener(){},localStorage:{getItem(){return null;},setItem(){}},matchMedia(){return{matches:true}},requestAnimationFrame(){},CustomEvent:class{}};
 sandbox.window=sandbox;const ctx=vm.createContext(sandbox);
 for(const name of ['catalog.js','store.js','ui.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),ctx);
 return {U:ctx.JewelryUI,C:ctx.JewelryCatalog,S:ctx.JewelryStore};
}
test('presentation escapes untrusted text and attribute delimiters',()=>{const{U}=ui();assert.equal(U.esc('<script>"x" & \'y\'</script>'),'&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;');});
test('every catalogue card has a detail route, real image and named interactive controls',()=>{const{U,C}=ui();for(const p of C.products){const html=U.card(p);assert.ok(html.includes('detail.html?id='+p.id));assert.ok(html.includes('src="'+p.image+'"'));assert.ok(html.includes('data-wish="'+p.id+'"'));assert.ok(html.includes('data-quick="'+p.id+'"'));assert.ok(html.includes('aria-label="Compare '+p.name+'"'));assert.ok(html.includes('Sample rating'));assert.ok(!html.includes('href="#"'));}});
test('product forms expose valid variant choices and quantity bounds',()=>{const{U,C}=ui();for(const p of C.products){const html=U.purchase(p,'detail');for(const size of p.sizes)assert.ok(html.includes('value="'+size+'"'));assert.ok(html.includes('for="detail-qty"'));assert.ok(html.includes('max="'+Math.min(10,p.stock)+'"'));assert.ok(html.includes('type="submit"'));}});
test('untrusted display names cannot inject markup into product cards',()=>{const{U,C}=ui();const html=U.card({...C.products[0],name:'<img src=x onerror=alert(1)>'});assert.ok(!html.includes('<img src=x'));assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));});
test('summary markup discloses demo shipping and reflects computed amounts',()=>{const{U}=ui();const html=U.summary({cart:[{id:'maharani-ring',qty:1,size:'14'}],coupon:'WELCOME10'});assert.ok(html.includes('Demo shipping'));assert.ok(html.includes('5,090'));assert.ok(html.includes('WELCOME10'));assert.ok(html.includes('149'));});
