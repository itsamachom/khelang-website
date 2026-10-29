"""Offline CMS browser smoke test. Requires playwright, PyYAML, Pillow and Chromium.
Usage: python3 tests/browser_upload.py --cms-dist /path/to/decap-cms/package/dist
Use the official decap-cms@3.17.3 package, matching admin/index.html.
"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
from tempfile import TemporaryDirectory
import argparse, json, yaml
from PIL import Image
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser()
parser.add_argument('--cms-dist',type=Path,required=True)
args=parser.parse_args()
cms_dist=args.cms_dist.resolve()
assert (cms_dist/'decap-cms.js').is_file()
root=Path(__file__).resolve().parent.parent
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(root),**kw)
 def do_GET(self):
  if self.path.startswith('/vendor/'):
   p=cms_dist/self.path.split('/vendor/',1)[1].split('?')[0]
   if p.is_file():
    self.send_response(200);self.send_header('Content-Type','text/javascript');self.end_headers();self.wfile.write(p.read_bytes());return
  if self.path.split('?')[0]=='/admin/config.yml':
   c=yaml.safe_load((root/'admin/config.yml').read_text());c['backend']={'name':'test-repo'};c.pop('locale',None)
   self.send_response(200);self.end_headers();self.wfile.write(yaml.safe_dump(c,allow_unicode=True).encode());return
  if self.path in ['/admin/','/admin/index.html']:
   s=(root/'admin/index.html').read_text();import re
   s=re.sub(r'https://unpkg.com/decap-cms@[^/]+/dist/decap-cms.js','/vendor/decap-cms.js',s)
   self.send_response(200);self.end_headers();self.wfile.write(s.encode());return
  return super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
Thread(target=server.serve_forever,daemon=True).start()
base='http://127.0.0.1:'+str(server.server_port)
fixture_dir=TemporaryDirectory()
test_image=Path(fixture_dir.name)/'camera.jpg'
Image.effect_noise((4000,2400),60).convert('RGB').save(test_image,quality=95)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base+'/admin/');page.get_by_role('button',name='Login',exact=True).click()
 page.goto(base+'/admin/#/collections/events/new')
 page.locator('input[type=file]').wait_for()
 page.locator('input[id^=title-field]').fill('Browser upload verification')
 page.locator('input[type=date]').fill('2026-10-29')
 page.locator('textarea').first.fill('Summary of browser upload verification')
 page.locator('[contenteditable=true]').first.fill('Body of browser upload verification')
 page.locator('input[type=file]').set_input_files(str(test_image))
 page.get_by_text('พร้อมบันทึก:',exact=False).wait_for(timeout=15000)
 print(page.get_by_text('พร้อมบันทึก:',exact=False).inner_text())
 assert page.locator('img[alt="รูปกิจกรรม"]').evaluate('(img)=>img.complete && img.naturalWidth>0 && img.naturalWidth<=1920')
 page.get_by_text('Add 6. ภาพบรรยากาศเพิ่มเติม',exact=True).click()
 page.locator('input[type=file]').nth(1).set_input_files(str(test_image))
 page.get_by_text('พร้อมบันทึก:',exact=False).nth(1).wait_for()
 page.wait_for_timeout(300)
 assert page.locator('img[alt="รูปกิจกรรม"]').evaluate_all('(images)=>images.every(img=>img.complete && img.naturalWidth>0)')
 sources=page.locator('img[alt="รูปกิจกรรม"]').evaluate_all('(images)=>images.map(img=>img.src)')
 assert sources[0]==sources[1]
 page.get_by_text('Add 6. ภาพบรรยากาศเพิ่มเติม',exact=True).click()
 page.locator('input[type=file]').nth(2).set_input_files({'name':'camera.jpg','mimeType':'image/png','buffer':(root/'logo.png').read_bytes()})
 page.get_by_text('พร้อมบันทึก:',exact=False).nth(2).wait_for()
 page.get_by_role('button',name='Publish',exact=True).click()
 page.get_by_text('Publish now',exact=True).click()
 page.wait_for_function("document.body.innerText.includes('CHANGES SAVED')")
 assert 'CHANGES SAVED' in page.locator('body').inner_text()
 data=page.evaluate("JSON.parse(Object.values(window.repoFiles.content.events)[0].content)")
 assert data['gallery'][0]==data['thumbnail']
 folder=data['media_key']
 assert data['thumbnail'].startswith('/images/events/'+folder+'/photo-')
 files=page.evaluate("Object.keys(Object.values(window.repoFiles.images.events)[0])")
 assert len(files)==2 # identical pixels reused; different content with the same input name kept separately
 assert data['thumbnail'].split('/')[-1] in files
 assert data['gallery'][1]!=data['thumbnail']
 assert data['gallery'][1].split('/')[-1] in files
 page.locator('input[id^=title-field]').fill('Renamed activity')
 page.get_by_role('button',name='Publish',exact=True).click()
 page.get_by_text('Publish now',exact=True).click()
 page.wait_for_function("document.body.innerText.includes('CHANGES SAVED')")
 assert 'CHANGES SAVED' in page.locator('body').inner_text()
 updated=page.evaluate("JSON.parse(Object.values(window.repoFiles.content.events)[0].content)")
 assert updated['media_key']==folder
 assert not errors,errors
 print('PASS: resize, draft preview, same-name images, content reuse, publish and stable folder after rename')
 b.close()
server.shutdown()
fixture_dir.cleanup()
