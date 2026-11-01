"""Dependency-free integrity checks. Run: py -3.11 tests/check_project.py"""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import collections, hashlib, json, re, subprocess, sys
ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'Setup'
errors=[]
class Page(HTMLParser):
    def __init__(self,text):
        super().__init__(convert_charrefs=True);self.tags=[];self.feed(text)
    def handle_starttag(self,tag,attrs):self.tags.append((tag,dict(attrs)))
    def handle_startendtag(self,tag,attrs):self.handle_starttag(tag,attrs)
    def ids(self):return [a['id'] for _,a in self.tags if 'id' in a]
pages={f.name:Page(f.read_text(encoding='utf-8')) for f in SITE.glob('*.html')}
dynamic_ids={'orders','panel-details','panel-care','panel-reviews'}
active_assets=set()
for name,p in pages.items():
    ids=p.ids()
    for ident,n in collections.Counter(ids).items():
        if n>1:errors.append(f'{name}: duplicate ID {ident}')
    if not any(t=='main' for t,_ in p.tags):errors.append(f'{name}: main landmark missing')
    if not any(t=='meta' and a.get('name')=='viewport' for t,a in p.tags):errors.append(f'{name}: viewport missing')
    for tag,a in p.tags:
        for attr in ('href','src'):
            ref=a.get(attr)
            if not ref:continue
            if ref=='#':errors.append(f'{name}: dead # link')
            u=urlsplit(ref)
            if u.scheme or u.netloc:continue
            path=unquote(u.path)
            target=(SITE/path) if path else (SITE/name)
            if not target.exists():errors.append(f'{name}: missing {ref}')
            if u.fragment and (not path or path.endswith('.html')):
                dest=pages.get(path or name)
                if dest and u.fragment not in dest.ids() and u.fragment not in dynamic_ids:errors.append(f'{name}: missing anchor {ref}')
            if tag in ('script','link','img') and path:active_assets.add(path)
        if tag=='img' and 'alt' not in a:errors.append(f'{name}: missing image alternative')
        if tag in ('input','select','textarea') and a.get('type') not in ('hidden','checkbox','radio'):
            ident=a.get('id')
            if not ident or not any(t=='label' and x.get('for')==ident for t,x in p.tags):
                if not a.get('aria-label'):errors.append(f'{name}: unlabelled {tag} {ident}')
for rel in list(active_assets):
    if not rel.endswith('.css'):continue
    f=SITE/rel
    for u in re.findall(r'url\([\"\']?([^\)\"\']+)',f.read_text()):
        if u.startswith(('data:','http')):continue
        target=f.parent/u.split('?')[0].split('#')[0]
        if not target.exists():errors.append(f'{rel}: missing CSS asset {u}')
manifest=json.loads((ROOT/'docs/original-manifest.json').read_text())
for rel,expected in manifest.items():
    f=ROOT/('Original-Setup/'+rel[len('Setup/'):] if rel.startswith('Setup/') else rel)
    if not f.exists() or hashlib.sha256(f.read_bytes()).hexdigest()!=expected:errors.append(f'Original not preserved: {rel}')
# Verify every active JavaScript file parses with Node (optional for Python-only run environments).
try:
    for rel in active_assets:
        if rel.endswith('.js'):
            result=subprocess.run(['node','--check',str(SITE/rel)],capture_output=True,text=True)
            if result.returncode:errors.append(result.stderr)
except FileNotFoundError:print('Node unavailable: skipped JavaScript syntax checks; run node --test separately.')
if errors:
    print('\n'.join(errors));sys.exit(1)
print(f'PASS: {len(pages)} HTML routes; all active local links/assets resolve; no placeholder # links or duplicate page IDs.')
print(f'PASS: basic static labels, landmarks and viewport declarations on all {len(pages)} pages.')
print(f'PASS: {len(manifest)} original files preserved byte-for-byte in Original-Setup, Project Report and Screen shots.')
print('PASS: active JavaScript syntax checks (when Node is installed).')
print('LIMIT: these are source/integrity checks, not browser rendering, accessibility certification or end-to-end UI tests.')
