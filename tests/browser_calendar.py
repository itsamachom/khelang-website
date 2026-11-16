"""Calendar browser smoke test with Google's iframe response mocked.
Run `npm run build` then `python3 tests/browser_calendar.py`.
Requires Playwright and Chromium; never writes to Google Calendar or GitHub.
"""
import base64, json
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
config=json.loads((root/'content/settings/calendar.json').read_text())
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(root/'dist'),**kw)
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
Thread(target=server.serve_forever,daemon=True).start()
base='http://127.0.0.1:'+str(server.server_port)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 def external(route):
  url=route.request.url
  if url.startswith(base):return route.continue_()
  if url.startswith('https://calendar.google.com/calendar/embed'):
   return route.fulfill(content_type='text/html',body='<html lang="th"><body>Google Calendar test frame</body></html>')
  if 'cdn.tailwindcss.com' in url:return route.fulfill(content_type='text/javascript',body='window.tailwind={};')
  return route.fulfill(body='')
 page=browser.new_page(viewport={'width':1280,'height':900})
 page.route('**/*',external)
 page.goto(base+'/calendar.html')
 frame=page.locator('iframe.google-calendar');frame.wait_for()
 params=parse_qs(urlparse(frame.get_attribute('src')).query)
 assert params['src']==[config['calendar_id']]
 assert params['mode']==['MONTH'] and params['ctz']==['Asia/Bangkok']
 page.get_by_role('button',name='รายการกำหนดการ',exact=True).click()
 assert 'mode=AGENDA' in frame.get_attribute('src')
 page.get_by_role('button',name='รายเดือน',exact=True).click()
 assert page.get_by_role('button',name='รายเดือน',exact=True).get_attribute('aria-pressed')=='true'
 follow=page.get_by_role('link',name='ติดตามปฏิทินบนมือถือ',exact=True).get_attribute('href')
 assert base64.b64decode(parse_qs(urlparse(follow).query)['cid'][0]).decode()==config['calendar_id']
 page.screenshot(path='/tmp/khelang-calendar-desktop.png',full_page=True)
 page.goto(base+'/index.html')
 page.locator('#recent-events-container article').nth(5).wait_for()
 assert page.locator('#recent-events-container article').count()==6
 assert 'mode=AGENDA' in page.locator('iframe.google-calendar').get_attribute('src')
 mobile=browser.new_page(viewport={'width':390,'height':844})
 mobile.route('**/*',external);mobile.goto(base+'/calendar.html')
 mobile.locator('iframe.google-calendar').wait_for()
 assert 'mode=AGENDA' in mobile.locator('iframe.google-calendar').get_attribute('src')
 assert mobile.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
 mobile.screenshot(path='/tmp/khelang-calendar-mobile.png',full_page=True)
 # Calendar settings accept the exact share-link format provided by the user.
 share='https://calendar.google.com/calendar/u/5?cid='+base64.b64encode(config['calendar_id'].encode()).decode().rstrip('=')
 page.route('**/content/settings/calendar.json',lambda route:route.fulfill(json={**config,'calendar_id':share}))
 page.goto(base+'/calendar.html');page.locator('iframe.google-calendar').wait_for()
 assert parse_qs(urlparse(page.locator('iframe').get_attribute('src')).query)['src']==[config['calendar_id']]
 page.unroute('**/content/settings/calendar.json')
 page.route('**/content/settings/calendar.json',lambda route:route.fulfill(json={**config,'calendar_id':''}))
 page.goto(base+'/calendar.html');page.get_by_text('กำหนดการกิจกรรมอยู่ระหว่างจัดเตรียม',exact=False).wait_for()
 assert page.locator('iframe').count()==0
 page.unroute('**/content/settings/calendar.json')
 page.route('**/content/settings/calendar.json',lambda route:route.fulfill(json={**config,'calendar_id':'https://malicious.example/?src=bad'}))
 page.goto(base+'/calendar.html');page.get_by_role('button',name='ลองอีกครั้ง',exact=True).wait_for()
 assert page.locator('iframe').count()==0
 page.unroute('**/content/settings/calendar.json');page.get_by_role('button',name='ลองอีกครั้ง',exact=True).click()
 page.locator('iframe.google-calendar').wait_for()
 browser.close()
server.shutdown()
print('PASS: calendar ID, Thai timezone, views, mobile layout, subscribe, six homepage cards, shared links, unset/invalid settings and retry. Google access/public permissions were not tested.')
