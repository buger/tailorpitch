from pathlib import Path
import json,re
from datetime import datetime,timezone
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright
out=Path('/home/ubuntu/leadloom/.visual-review/operations');out.mkdir(parents=True,exist_ok=True)
url='https://8328-iaiec42qkfqwba07zca38-bcae9ca0.sg2.manus.computer'
now=datetime.now(timezone.utc).isoformat()
brand={'offer':'Software assurance for engineering teams.','voice':'Precise, evidence-led and direct.','websiteInstructions':'Paper, ink, thin rules and serif hierarchy.','outreachInstructions':'A sourced observation and a modest ask.','approvedClaims':'Use source-supported claims only.','bookingUrl':'https://example.com/contact','logoUrl':'','primaryColor':'#24302a','backgroundColor':'#f3f0e9','accentColor':'#7fa34e','inspiration':[]}
company={'id':9001,'name':'Proof','website':'https://example.com','ownerEmail':'fixture@example.com','brand':brand,'onboardingCompletedAt':None,'publicOrigin':None,'createdAt':now}
workspace={'company':company,'role':'owner','assets':[],'recent':[],'stats':{'leads':0,'qualified':0,'pages':0,'outreach':0,'submissions':0}}
user={'id':9002,'openId':'ui-fixture-not-a-session','name':'UI fixture','email':'fixture@example.com','role':'user','loginMethod':'google','createdAt':now,'updatedAt':now,'lastSignedIn':now}
draft={'id':9901,'companyId':9001,'kind':'company','url':'https://example.com','result':{'companyName':'Example Company','website':'https://example.com','brand':brand,'icps':[],'summary':'Review this source-grounded company suggestion.','styleNotes':'Observed CSS cues, not a screenshot audit.','unknowns':[]},'evidence':{'sources':[{'url':'https://example.com','text':'Public company copy fixture.'}],'copyExamples':[{'sourceUrl':'https://example.com','text':'Software assurance for teams.','kind':'heading'}],'logos':[],'styleClues':['Warm paper and ink.'],'links':[]},'baseSignature':'fixture','appliedAt':None,'createdAt':now}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 results=[]
 for name,width,height in [('desktop',1440,1000),('mobile',390,844)]:
  page=browser.new_page(viewport={'width':width,'height':height},reduced_motion='reduce')
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  state={'stage':0,'id':None,'held':[],'calls':0}
  def rpc_response(payload):return {'result':{'data':{'json':payload}}}
  def intercept(route):
   request=route.request;u=urlparse(request.url);paths=u.path.split('/api/trpc/')[-1].split(',');batched=parse_qs(u.query).get('batch',[''])[0]=='1'
   raw=request.post_data if request.method=='POST' else parse_qs(u.query).get('input',['{}'])[0]
   inp=json.loads(raw or '{}');responses=[]
   for i,path in enumerate(paths):
    arg=(inp.get(str(i),{}) if batched else inp).get('json',{})
    if path=='analysis.company':
     state['calls']+=1;state['id']=arg.get('operationId');assert state['id'];state['held'].append((route,batched));return
    if path=='auth.me': payload=user
    elif path=='workspace.get':payload=workspace
    elif path=='analysis.history':payload=[]
    elif path=='operations.get':
     payload=None if not state['id'] else {'id':state['id'],'companyId':9001,'userId':9002,'kind':'company_analysis','status':'running','stage':state['stage'],'detail':['Reading public company pages.','Read 3 source pages and collected 5 copy snippets. Preparing brand, voice and ICP suggestions.','Checking suggestions against observed sources.','Saving the editable review draft.'][state['stage']],'startedAt':now,'updatedAt':now,'completedAt':None}
    elif path in ['icps.list','leads.list','pages.list','outreach.list','runs.list']:payload=[]
    elif path=='pipeline.get':payload={'pipeline':None,'jobs':[],'leads':[]}
    elif path=='intake.get':payload={'sourcingEnabled':True,'syncEnabled':True}
    else:raise AssertionError('Unexpected API request blocked: '+path)
    responses.append(rpc_response(payload))
   route.fulfill(status=200,content_type='application/json',body=json.dumps(responses if batched else responses[0]))
  page.route('**/api/trpc/**',intercept)
  page.goto(url+'/app/onboarding',wait_until='domcontentloaded')
  page.get_by_role('button',name='Analyze website',exact=True).wait_for()
  page.locator('form input[type=url]').first.fill('https://example.com')
  page.get_by_role('button',name='Analyze website',exact=True).click()
  dialog=page.get_by_role('dialog',name='Analyzing your company website',exact=True)
  dialog.wait_for();assert state['calls']==1
  page.screenshot(path=str(out/f'{name}-starting.png'))
  state['stage']=1
  page.wait_for_function("document.querySelectorAll('.operation-window__step--complete').length === 1",timeout=12000)
  page.screenshot(path=str(out/f'{name}-analysis-progress.png'))
  assert page.locator('.operation-window__step--waiting').count()==2
  # Focus remains inside the modal; Escape means minimize, not cancel/restart.
  for _ in range(6):page.keyboard.press('Tab')
  assert page.evaluate("Boolean(document.activeElement.closest('[role=dialog]'))")
  page.keyboard.press('Escape');dialog.wait_for(state='hidden')
  restore=page.get_by_role('button',name=re.compile('Restore Analyzing your company website'))
  assert restore.is_visible();assert state['calls']==1
  page.screenshot(path=str(out/f'{name}-minimized.png'))
  restore.click();dialog.wait_for()
  state['stage']=2
  page.wait_for_function("document.querySelectorAll('.operation-window__step--complete').length === 2",timeout=12000)
  # Resolve only the held fixture mutation; no real server request was forwarded.
  held,batched=state['held'].pop();held.fulfill(status=200,content_type='application/json',body=json.dumps([rpc_response(draft)] if batched else rpc_response(draft)))
  page.get_by_role('button',name='Continue to review',exact=True).wait_for(timeout=12000)
  assert page.locator('.operation-window__step--complete').count()==4
  page.screenshot(path=str(out/f'{name}-ready.png'))
  page.get_by_role('button',name='Continue to review',exact=True).click()
  assert page.get_by_role('heading',name='Edit before applying.').is_visible()
  page.get_by_role('button',name='Reanalyze website',exact=True).click();dialog.wait_for()
  state['stage']=1
  page.wait_for_function("document.querySelectorAll('.operation-window__step--complete').length === 1",timeout=12000)
  held,batched=state['held'].pop();failure={'error':{'json':{'message':'The website is unavailable. Check the URL and try again.','code':-32603,'data':{'code':'INTERNAL_SERVER_ERROR','httpStatus':500}}}}
  held.fulfill(status=500,content_type='application/json',body=json.dumps([failure] if batched else failure))
  page.get_by_role('button',name='Back to action',exact=True).wait_for(timeout=12000)
  assert page.locator('.operation-window__step--complete').count()==1
  assert 'Your website analysis is ready to review.' not in dialog.inner_text()
  page.screenshot(path=str(out/f'{name}-error.png'))
  page.get_by_role('button',name='Back to action',exact=True).click()
  assert page.get_by_role('heading',name='Edit before applying.').is_visible()
  assert state['calls']==2
  results.append({'viewport':name,'horizontalOverflow':page.evaluate('document.documentElement.scrollWidth>innerWidth'),'pageErrors':errors,'analysisRequests':state['calls'],'backendRequestsForwarded':0,'focusTrapped':True,'minimizeRestore':True,'reviewReady':True,'errorRetainsDraft':True})
  page.close()
 browser.close()
(out/'results.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2))
print('Mock-only progress screenshots:',out)
