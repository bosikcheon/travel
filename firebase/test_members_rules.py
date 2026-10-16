"""Realtime Database Emulator only; never sends requests to production."""
import json, urllib.request, urllib.error, urllib.parse
HOST='http://127.0.0.1:9009'
NS='demo-travel-rules-default-rtdb'
def call(method,path,uid=None,value=None):
 headers={'Content-Type':'application/json', 'Authorization':'Bearer owner'}
 override = {'uid':uid,'token':{'email':uid+'@example.com'}} if uid else None
 auth_query = '&auth_variable_override=' + urllib.parse.quote(json.dumps(override))
 req=urllib.request.Request(HOST+'/'+path+'.json?ns='+NS+auth_query,data=json.dumps(value).encode() if value is not None else None,headers=headers,method=method)
 try:
  with urllib.request.urlopen(req) as response: return response.status,json.load(response)
 except urllib.error.HTTPError as error: return error.code,None
count=0
def check(label,method,path,uid,value,allowed):
 global count
 code,result=call(method,path,uid,value)
 assert (code==200)==allowed,(label,code)
 count+=1; print('PASS',label)
 return result
def profile(uid,status='active'):
 return {'name':'Test','email':uid+'@example.com','phone':'01012345678','status':status,'createdAt':{'.sv':'timestamp'},'updatedAt':{'.sv':'timestamp'}}
check('anonymous denied','PUT','members/alice',None,profile('alice'),False)
check('owner create','PUT','members/alice','alice',profile('alice'),True)
check('owner read','GET','members/alice','alice',None,True)
check('other read denied','GET','members/alice','bob',None,False)
check('other write denied','PATCH','members/alice','bob',{'name':'Other','updatedAt':{'.sv':'timestamp'}},False)
check('member list denied','GET','members','alice',None,False)
check('owner update','PATCH','members/alice','alice',{'name':'Changed','updatedAt':{'.sv':'timestamp'}},True)
check('delete denied','DELETE','members/alice','alice',None,False)
check('password field denied','PATCH','members/alice','alice',{'password':'secret','updatedAt':{'.sv':'timestamp'}},False)
check('role field denied','PATCH','members/alice','alice',{'role':'admin','updatedAt':{'.sv':'timestamp'}},False)
check('email spoof denied','PATCH','members/alice','alice',{'email':'other@example.com','updatedAt':{'.sv':'timestamp'}},False)
check('createdAt overwrite denied','PATCH','members/alice','alice',{'createdAt':1,'updatedAt':{'.sv':'timestamp'}},False)
check('invalid name denied','PATCH','members/alice','alice',{'name':42,'updatedAt':{'.sv':'timestamp'}},False)
check('admin list','GET','members','ipvSWG4VEuTCN932Iqo5BilNBqj1',None,True)
check('admin suspend','PATCH','members/alice','ipvSWG4VEuTCN932Iqo5BilNBqj1',{'status':'suspended','updatedAt':{'.sv':'timestamp'}},True)
check('self reactivate denied','PATCH','members/alice','alice',{'status':'active','updatedAt':{'.sv':'timestamp'}},False)
check('suspended delete denied','DELETE','members/alice','alice',None,False)
check('admin read','GET','members/alice','ipvSWG4VEuTCN932Iqo5BilNBqj1',None,True)
check('admin delete denied','DELETE','members/alice','ipvSWG4VEuTCN932Iqo5BilNBqj1',None,False)
check('suspended signup denied','PUT','members/bob','bob',profile('bob','suspended'),False)
print(str(count)+' rule cases passed')
