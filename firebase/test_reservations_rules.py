"""Run with Firebase Database Emulator; includes member permission regression tests."""
from test_members_rules import check, call
import time
ADMIN='ipvSWG4VEuTCN932Iqo5BilNBqj1'
DAY=86400000
start=(int(time.time()*1000)//DAY+2)*DAY
stamp={'.sv':'timestamp'}
destination={'name':'Test','region':'Test','address':'Test','summary':'Test','description':'Test','imageUrl':'https://example.com/a.jpg','status':'published','createdAt':stamp,'updatedAt':stamp}
stay={'name':'Test stay','destinationId':'test','address':'Test','phone':'01012345678','description':'Test','imageUrl':'https://example.com/a.jpg','pricePerNight':100000,'maxGuests':2,'status':'active','createdAt':stamp,'updatedAt':stamp}
check('seed active member','PATCH','members/alice',ADMIN,{'status':'active','updatedAt':stamp},True)
check('seed destination','PUT','destinations/test',ADMIN,destination,True)
check('seed stay','PUT','stays/test',ADMIN,stay,True)
def record(**changes):
 result={'memberId':'alice','stayId':'test','stayNameAtBooking':'Test stay','checkIn':start,'checkOut':start+2*DAY,'guestCount':2,'nightlyPriceAtBooking':100000,'totalPrice':200000,'status':'requested','createdAt':stamp,'updatedAt':stamp}
 result.update(changes);return result
for label,changes in [
 ('cheap total',{'totalPrice':1}),('cheap nightly',{'nightlyPriceAtBooking':1,'totalPrice':2}),('over capacity',{'guestCount':3}),('fraction guests',{'guestCount':1.5}),('same day',{'checkOut':start}),('past date',{'checkIn':start-10*DAY}),('too many nights',{'checkOut':start+31*DAY,'totalPrice':3100000}),('fraction day',{'checkIn':start+1}),('wrong owner',{'memberId':'bob'}),('false confirmed',{'status':'confirmed'}),('fake stay name',{'stayNameAtBooking':'Fake'}),('string date',{'checkIn':'2026-10-20'}),('far future',{'checkIn':start+400*DAY,'checkOut':start+402*DAY}),('extra field',{'role':'admin'}),('fake createdAt',{'createdAt':1})]:
 check(label+' denied','PUT','reservations/invalid','alice',record(**changes),False)
check('anonymous reservation denied','PUT','reservations/anonymous',None,record(),False)
check('valid reservation','PUT','reservations/valid','alice',record(),True)
check('duplicate overwrite denied','PUT','reservations/valid','alice',record(),False)
check('other member read denied','GET','reservations/valid','bob',None,False)
check('member own read','GET','reservations/valid','alice',None,True)
check('admin read','GET','reservations/valid',ADMIN,None,True)
check('member confirm denied','PATCH','reservations/valid','alice',{'status':'confirmed','updatedAt':stamp},False)
check('admin price change denied','PATCH','reservations/valid',ADMIN,{'status':'confirmed','totalPrice':1,'updatedAt':stamp},False)
check('admin confirms','PATCH','reservations/valid',ADMIN,{'status':'confirmed','updatedAt':stamp},True)
check('future completion denied','PATCH','reservations/valid',ADMIN,{'status':'completed','updatedAt':stamp},False)
check('price change after reservation','PATCH','stays/test',ADMIN,{'pricePerNight':150000,'updatedAt':stamp},True)
check('member cancel confirmed snapshot preserved','PATCH','reservations/valid','alice',{'status':'cancel_requested','updatedAt':stamp},True)
check('admin cancel approves','PATCH','reservations/valid',ADMIN,{'status':'canceled','updatedAt':stamp},True)
check('terminal reopen denied','PATCH','reservations/valid',ADMIN,{'status':'confirmed','updatedAt':stamp},False)
check('admin delete reservation denied','DELETE','reservations/valid',ADMIN,None,False)
check('old price denied','PUT','reservations/stale','alice',record(),False)
check('new current price accepted','PUT','reservations/current','alice',record(nightlyPriceAtBooking=150000,totalPrice=300000),True)
check('admin rejects','PATCH','reservations/current',ADMIN,{'status':'rejected','updatedAt':stamp},True)
check('inactive stay seed','PATCH','stays/test',ADMIN,{'status':'inactive','updatedAt':stamp},True)
check('inactive stay denied','PUT','reservations/inactive','alice',record(nightlyPriceAtBooking=150000,totalPrice=300000),False)
print('Reservation security tests passed')
