from test_members_rules import check,call
ADMIN='ipvSWG4VEuTCN932Iqo5BilNBqj1'
stamp={'.sv':'timestamp'}
check('restore active test member','PATCH','members/alice',ADMIN,{'status':'active','updatedAt':stamp},True)
check('owner profile edit','PATCH','members/alice','alice',{'name':'Edited','phone':'01099999999','updatedAt':stamp},True)
import time
start=(int(time.time()*1000)//86400000+2)*86400000
stay={'name':'Test','destinationId':'test','address':'Test','description':'Test','phone':'010','pricePerNight':100,'maxGuests':2,'imageUrl':'https://example.com/a.jpg','status':'active','createdAt':stamp,'updatedAt':stamp}
check('seed withdrawal test stay','PUT','stays/withdrawal-test',ADMIN,stay,True)
reservation={'memberId':'alice','stayId':'withdrawal-test','stayNameAtBooking':'Test','checkIn':start,'checkOut':start+86400000,'guestCount':1,'nightlyPriceAtBooking':100,'totalPrice':100,'status':'requested','createdAt':stamp,'updatedAt':stamp}
check('active member reservation','PUT','reservations/withdrawal-test','alice',reservation,True)
check('owner withdrawal flag','PATCH','members/alice','alice',{'withdrawn':True,'updatedAt':stamp},True)
check('withdrawn flag persists','GET','members/alice',ADMIN,None,True)
assert call('GET','members/alice',ADMIN)[1]['withdrawn'] is True
check('self undo denied','PATCH','members/alice','alice',{'withdrawn':False,'updatedAt':stamp},False)
check('self remove flag denied','PATCH','members/alice','alice',{'withdrawn':None,'updatedAt':stamp},False)
check('withdrawn profile edit denied','PATCH','members/alice','alice',{'name':'Undo','updatedAt':stamp},False)
check('withdrawn reservations query denied','GET','reservations','alice',None,False)
check('admin list withdrawn retained','GET','members',ADMIN,None,True)
print('PASS withdrawal persistence and authority restrictions')

check('withdrawn own reservation read denied','GET','reservations/withdrawal-test','alice',None,False)
check('withdrawn new reservation denied','PUT','reservations/withdrawal-second','alice',reservation,False)
check('admin retains withdrawn reservation','GET','reservations/withdrawal-test',ADMIN,None,True)
