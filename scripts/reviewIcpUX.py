from pathlib import Path
import copy,json,re
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright
from onboardingFixtures import workspace,user,draft,now
out=Path('/home/ubuntu/leadloom/.visual-review/icps');out.mkdir(parents=True,exist_ok=True)
url='https://8328-iaiec42qkfqwba07zca38-bcae9ca0.sg2.manus.computer'
def profile(name):return {'name':name,'industries':'B2B SaaS, developer tools','geography':'North America and Europe','companySize':'20–500 employees','roles':'CTO, VP Engineering','keywords':'AI coding agents, code review','signals':'Public evidence of AI-assisted engineering','exclusions':'Solo hobby projects','minScore':70}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);results=[]
 for name,width,height in [('desktop',1440,1000),('mobile',390,844)]:
  page=browser.new_page(viewport={'width':width,'height':height},reduced_motion='reduce');errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  local=copy.deepcopy(draft);local['result']['icps']=[profile('Engineering teams adopting coding agents'),profile('Reliability-sensitive developer infrastructure'),profile('Teams replacing manual review')]
  state={'draft':local,'applies':[],'mode':'owner','workspace':copy.deepcopy(workspace)}
  def success(payload):return {'result':{'data':{'json':payload}}}
  def intercept(route):
   req=route.request;u=urlparse(req.url);paths=u.path.split('/api/trpc/')[-1].split(',');batched=parse_qs(u.query).get('batch',[''])[0]=='1'
   raw=req.post_data if req.method=='POST' else parse_qs(u.query).get('input',['{}'])[0];inp=json.loads(raw or '{}');responses=[]
   for index,path in enumerate(paths):
    arg=(inp.get(str(index),{}) if batched else inp).get('json',{})
    if path=='auth.me':payload=user
    elif path=='workspace.get':payload={**state['workspace'],'role':state['mode']}
    elif path=='analysis.history':payload=[state['draft']]
    elif path=='analysis.applyCompany':
     state['applies'].append(copy.deepcopy(arg));state['draft']['appliedAt']=now;state['draft']['result']['icps']=arg['icps'];state['workspace']['company']['onboardingCompletedAt']=now;payload={'success':True}
    elif path=='icps.list':payload=[]
    else:raise AssertionError('Unexpected API call blocked: '+path)
    responses.append(success(payload))
   route.fulfill(status=200,content_type='application/json',body=json.dumps(responses if batched else responses[0]))
  page.route('**/api/trpc/**',intercept)
  page.goto(url+'/app/onboarding',wait_until='domcontentloaded');section=page.get_by_test_id('icp-review');section.wait_for()
  assert section.get_by_role('heading',name='Ideal customer profiles (ICPs)',exact=True).count()==1
  assert section.locator('article').count()==3
  page.evaluate("document.querySelector('[data-testid=icp-review]').scrollIntoView({block:'start'})")
  page.screenshot(path=str(out/f'{name}-collection.png'))
  section.get_by_role('button',name='Add ICP',exact=True).click()
  assert section.locator('article').count()==4
  assert page.evaluate("document.activeElement.id.endsWith('-name')")
  section.get_by_role('button',name='Apply reviewed company profile',exact=True).click()
  assert state['applies']==[]
  assert section.get_by_text('Give this ICP a name (2–120 characters).',exact=True).is_visible()
  assert section.get_by_text('Add targeting keywords (2–2,000 characters).',exact=True).is_visible()
  active=section.locator('article.is-open')
  active.get_by_label('ICP name',exact=False).fill('  Early-stage observability teams  ')
  active.get_by_label('Targeting keywords',exact=False).fill('  observability, on-call workflows  ')
  active.get_by_label('Industries',exact=True).fill('Developer infrastructure')
  active.get_by_label('Decision-maker roles',exact=True).fill('CTO, Head of Engineering')
  page.screenshot(path=str(out/f'{name}-manual-edit.png'))
  section.get_by_role('button',name='Add ICP',exact=True).click()
  active=section.locator('article.is-open')
  active.get_by_label('ICP name',exact=False).fill('Mid-market AI tool builders')
  active.get_by_label('Targeting keywords',exact=False).fill('AI development platforms')
  assert section.locator('article').count()==5
  section.locator('article').nth(1).get_by_role('checkbox',name='Include this ICP',exact=True).uncheck()
  section.locator('article').nth(2).get_by_role('button',name=re.compile('^Remove ICP')).click()
  assert section.locator('article').count()==4
  assert not section.locator('article').nth(1).get_by_role('checkbox').is_checked()
  assert section.locator('article').nth(2).get_by_role('heading',name='Early-stage observability teams',exact=True).count()==1
  section.get_by_role('button',name='Undo removal',exact=True).click()
  assert section.locator('article').count()==5
  assert section.locator('article').nth(2).get_by_role('heading',name='Teams replacing manual review',exact=True).count()==1
  assert not section.locator('article').nth(1).get_by_role('checkbox').is_checked()
  section.locator('article').nth(2).get_by_role('button',name=re.compile('^Remove ICP')).click()
  page.evaluate("document.querySelector('[data-testid=icp-review]').scrollIntoView({block:'start'})")
  page.screenshot(path=str(out/f'{name}-removed.png'))
  section.get_by_role('button',name='Apply reviewed company profile',exact=True).click()
  section.get_by_role('button',name='Company profile applied',exact=True).wait_for()
  assert len(state['applies'])==1
  payload=state['applies'][0]
  assert [x['name'] for x in payload['icps']]==['Engineering teams adopting coding agents','Early-stage observability teams','Mid-market AI tool builders']
  assert payload['icps'][1]['keywords']=='observability, on-call workflows'
  assert section.get_by_role('button',name='Add ICP',exact=True).is_disabled()
  assert section.get_by_role('button',name=re.compile('^Remove ICP')).first.is_disabled()
  page.evaluate("document.querySelector('[data-testid=icp-review]').scrollIntoView({block:'start'})")
  page.screenshot(path=str(out/f'{name}-applied.png'))
  # New fixture view: zero profiles is an intentional, valid review state.
  state['draft']=copy.deepcopy(local);state['draft']['appliedAt']=None;state['draft']['result']['icps']=[profile('First ICP'),profile('Second ICP')];state['applies']=[]
  page.reload(wait_until='domcontentloaded');section.wait_for()
  section.get_by_role('button',name=re.compile('^Remove ICP')).first.click()
  section.get_by_role('button',name=re.compile('^Remove ICP')).first.click()
  assert section.get_by_role('heading',name='No ICPs in this review.',exact=True).is_visible()
  page.evaluate("document.querySelector('[data-testid=icp-review]').scrollIntoView({block:'start'})")
  page.screenshot(path=str(out/f'{name}-empty.png'))
  section.get_by_role('button',name='Undo removal',exact=True).click();assert section.locator('article').count()==1
  section.get_by_role('button',name=re.compile('^Remove ICP')).first.click()
  section.get_by_role('button',name='Apply reviewed company profile',exact=True).click();section.get_by_role('button',name='Company profile applied',exact=True).wait_for()
  assert len(state['applies'])==1 and state['applies'][0]['icps']==[]
  # Read-only member sees the draft but cannot edit, add, remove or include it.
  state['draft']['appliedAt']=None;state['draft']['result']['icps']=[profile('Read-only ICP')];state['mode']='member'
  page.reload(wait_until='domcontentloaded');section.wait_for()
  assert section.get_by_role('button',name='Add ICP',exact=True).is_disabled()
  assert section.get_by_role('button',name=re.compile('^Remove ICP')).is_disabled()
  assert section.get_by_role('checkbox').is_disabled()
  section.get_by_role('button',name='View criteria',exact=True).click()
  assert section.get_by_label('ICP name',exact=False).is_disabled()
  results.append({'viewport':name,'pageErrors':errors,'horizontalOverflow':page.evaluate('document.documentElement.scrollWidth>innerWidth'),'manualBeyondThree':True,'removalPreservesSelection':True,'undo':True,'selectedPayload':True,'zeroProfiles':True,'readOnlyProtected':True,'backendRequestsForwarded':0})
  page.close()
 browser.close()
(out/'results.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(results,indent=2));print('Mock-only ICP screenshots:',out)
