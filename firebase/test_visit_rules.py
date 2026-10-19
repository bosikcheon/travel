from test_members_rules import check, call, HOST, NS
import json,urllib.request
stamp={'.sv':'timestamp'}
ADMIN='ipvSWG4VEuTCN932Iqo5BilNBqj1'
# Explicit emulator-only Admin SDK equivalent fixture (bypasses browser rules).
def seed(path,value):
 req=urllib.request.Request(HOST+'/'+path+'.json?ns='+NS,data=json.dumps(value).encode(),headers={'Authorization':'Bearer owner','Content-Type':'application/json'},method='PUT')
 with urllib.request.urlopen(req) as r: assert r.status==200
seed('visitSummary',{'totalVisitCount':4,'dailyCounts':{'2026-10-19':2}})
seed('visitStatistics',{'totalVisitCount':4,'daily':{'2026-10-19':{'visitCount':2}}})
check('anonymous aggregate read','GET','visitSummary',None,None,True)
check('anonymous aggregate write blocked','PATCH','visitSummary',None,{'totalVisitCount':999},False)
check('member aggregate write blocked','PATCH','visitSummary','alice',{'totalVisitCount':999},False)
check('admin aggregate write blocked','PATCH','visitSummary',ADMIN,{'totalVisitCount':999},False)
check('private history read blocked','GET','visitStatistics',ADMIN,None,False)
check('private history write blocked','PUT','visitStatistics','alice',{'totalVisitCount':999},False)
check('restore active member','PATCH','members/alice',ADMIN,{'status':'active','updatedAt':stamp},True)
seed('members/alice/visitCount',3);seed('members/alice/lastVisitedAt',123456789)
check('owner stats tamper blocked','PATCH','members/alice','alice',{'visitCount':999,'updatedAt':stamp},False)
check('admin stats tamper blocked','PATCH','members/alice',ADMIN,{'lastVisitedAt':999,'updatedAt':stamp},False)
check('stats deletion blocked','PATCH','members/alice','alice',{'visitCount':None,'updatedAt':stamp},False)
check('normal profile edit preserves statistics','PATCH','members/alice','alice',{'name':'Updated','updatedAt':stamp},True)
check('admin reads member stats','GET','members/alice',ADMIN,None,True)
print('PASS Firebase visitor statistics rules')
