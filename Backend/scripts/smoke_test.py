import json,re,urllib.request,urllib.error,http.cookiejar,time,sys,datetime
"""Smoke test Sprint 1 (US01-US08, US12, US15, US21-US23).

Cách dùng (xem README):
  1. python scripts/smtp_stub.py mail.log        # SMTP giả, ghi email (chứa OTP) vào mail.log
  2. chạy backend với SPRING_MAIL_HOST=127.0.0.1 SPRING_MAIL_PORT=2525 SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE=false
  3. python scripts/smoke_test.py mail.log [http://localhost:9090]
Script tạo dữ liệu mẫu (căn hộ A0101, A0202, tài khoản cudan1, nv2...) nên chỉ chạy trên CSDL TRỐNG/dev.
"""
B=sys.argv[2] if len(sys.argv)>2 else "http://localhost:9090"
LOG=sys.argv[1]
res=[]
def call(m,path,body=None,tok=None,cj=None,raw=False):
    h={"Content-Type":"application/json"}
    if tok: h["Authorization"]="Bearer "+tok
    d=json.dumps(body).encode() if body is not None else None
    r=urllib.request.Request(B+path,data=d,headers=h,method=m)
    if cj is not None and cj.get("c"): r.add_header("Cookie",cj["c"])
    op=urllib.request.build_opener()
    try:
        x=op.open(r); code=x.status; t=x.read(); hd=x.headers
    except urllib.error.HTTPError as e: code=e.code; t=e.read(); hd=e.headers
    if cj is not None:
        for sc in hd.get_all("Set-Cookie") or []:
            cj["c"]=sc.split(";")[0]
    if raw: return code,t
    try: return code,json.loads(t)
    except Exception: return code,t.decode('utf-8','replace')
def chk(name,cond,info=""):
    res.append((name,bool(cond))); print(("PASS" if cond else "FAIL"),name,"" if cond else "-> "+str(info)[:200])
def otp_from_log(n=1):
    time.sleep(1.5); s=open(LOG,encoding='utf-8').read()
    ms=re.findall(r"\b(\d{6})\b",s.split("=====END=====")[-2] if "=====END=====" in s else "")
    return ms[-1] if ms else None
def login(u,p):
    c,t=call("POST","/api/auth/login",{"name":u,"password":p}); return c,t
fut=(datetime.date.today()+datetime.timedelta(days=30)).isoformat()
# --- US22 login
c,adm=login("admin","1234567890"); chk("US22 admin login -> JWT",c==200 and isinstance(adm,str) and adm.count(".")==2,(c,adm))
c,t=login("admin","wrongpass"); chk("US22 wrong password rejected",c in (401,403),(c,t))
# --- seed apartments (admin)
for num,fl in [("A0101",1),("A0202",2)]:
    c,t=call("POST","/api/admin/apartment-list/add-apartment",{"apartmentNumber":num,"roomNumber":"3","floor":fl,"area":70.0,"status":"VACANT","type":"STANDARD"},adm)
    chk("US02 add apartment "+num,c in (200,201),(c,t))
c,t=call("GET","/api/admin/apartment-list",tok=adm); chk("US02 list apartments",c==200 and len(t)>=2,(c,str(t)[:100]))
# --- US21 register
cj={}
reg={"name":"cudan1","password":"Passw0rd!x","fullName":"Nguyen Van A","age":30,"phone":"0912345678","email":"cudan1@test.local","apartmentNumbers":["A0101"]}
c,t=call("POST","/api/auth/register",{**reg,"phone":"123"},cj=cj); chk("US21 register invalid phone rejected",c==400,(c,t))
c,t=call("POST","/api/auth/register",reg,cj=cj); chk("US21 register ok (session)",c==200,(c,t))
c,t=call("GET","/api/auth/send-otp",cj=cj); chk("US21 send OTP",c==200,(c,t))
otp=otp_from_log(); chk("US21 OTP email captured",otp is not None,otp)
c,t=call("POST","/api/auth/verify-otp",{"otp":"000000" if otp!="000000" else "111111"},cj=cj); chk("US21 wrong OTP rejected",c==400,(c,t))
c,t=call("POST","/api/auth/resend-otp",cj=cj); chk("US21 resend OTP",c==200,(c,t))
otp=otp_from_log()
c,t=call("POST","/api/auth/verify-otp",{"otp":otp},cj=cj); chk("US21 correct OTP -> account created",c==200,(c,t))
c,res_tok=login("cudan1","Passw0rd!x"); chk("US21 new resident can login",c==200,(c,res_tok))
# expired/no-session OTP
c,t=call("POST","/api/auth/verify-otp",{"otp":"123456"},cj={}); chk("US21 verify without session rejected",c==400,(c,t))
# --- US22 change password
c,t=call("GET","/api/user/change-password",tok=res_tok); uid=t.get("userId") if isinstance(t,dict) else None; chk("US22 get userId",c==200 and uid,(c,t))
c,t=call("POST","/api/user/change-password",{"userId":str(uid),"oldPassword":"bad","newPassword":"Newpassw0rd!y"},res_tok); chk("US22 change pw wrong old rejected",c==400 and login("cudan1","Newpassw0rd!y")[0]!=200,(c,t))
c,t=call("POST","/api/user/change-password",{"userId":str(uid),"oldPassword":"Passw0rd!x","newPassword":"Newpassw0rd!y"},res_tok); chk("US22 change password ok",login("cudan1","Newpassw0rd!y")[0]==200,(c,t))
# forgot / reset
open(LOG,'w').close()
c,t=call("POST","/api/auth/forgot-password",{"username":"cudan1"}); chk("US22 forgot-password sends OTP",c==200,(c,t))
otp=otp_from_log(); chk("US22 reset OTP captured",otp is not None,otp)
c,t=call("POST","/api/auth/reset-password",{"username":"cudan1","email":"cudan1@test.local","otp":"999999" if otp!="999999" else "888888","newPassword":"Resetpassw0rd!z"}); chk("US22 reset with wrong OTP rejected",c==400,(c,t))
c,t=call("POST","/api/auth/reset-password",{"username":"cudan1","email":"cudan1@test.local","otp":otp,"newPassword":"Resetpassw0rd!z"}); chk("US22 reset password ok",c==200 and login("cudan1","Resetpassw0rd!z")[0]==200,(c,t))
c,res_tok=login("cudan1","Resetpassw0rd!z")
# --- US23 admin accounts
c,t=call("GET","/api/admin/users",tok=adm); chk("US23 admin lists users",c==200,(c,str(t)[:120]))
c,t=call("GET","/api/admin/users",tok=res_tok); chk("US23 RESIDENT -> /api/admin/** 403",c==403,(c,t))
c,t=call("GET","/api/admin/users"); chk("US23 no token rejected",c in (401,403),(c,t))
c,t=call("POST","/api/admin/users/add",{"name":"nv2","password":"Passw0rd!x","role":"USER","fullName":"B","email":"b@test.local","apartmentNumbers":["A0202"],"status":"THUONGTRU"},adm); chk("US23 admin add user",c==200,(c,t))

c,t=call("GET","/api/admin/users",tok=adm); users=t
u={x["name"]:x for x in users}; nv2=u["nv2"]["id"]; cd1=u["cudan1"]["id"]
# lock / unlock
c,t=call("POST",f"/api/admin/users/deactivate/{nv2}",tok=adm); chk("US23 deactivate user",c==200,(c,t))
c,t=login("nv2","Passw0rd!x"); chk("US23 locked account cannot login",c in (401,403),(c,t))
c,t=call("POST",f"/api/admin/users/activate/{nv2}",tok=adm); chk("US23 activate user",c==200,(c,t))
c,t=login("nv2","Passw0rd!x"); chk("US23 re-activated can login",c==200,(c,t))
c,t=call("POST",f"/api/admin/users/edit/{nv2}",{"fullName":"Bao Tran","age":28,"phone":"0987654321","role":"ADMIN","apartmentNumbers":["A0202"],"status":"THUONGTRU"},adm); chk("US23 admin changes role",c==200,(c,t))
c,t=call("POST","/api/admin/users/batch/activate",{"ids":[nv2,cd1]},adm); chk("US23 batch activate",c==200,(c,t))
c,t=call("POST","/api/admin/users/add",{"name":"nv3","password":"Passw0rd!x","role":"USER","fullName":"C","email":"c@test.local","apartmentNumbers":["A9999"],"status":"THUONGTRU"},adm); chk("US23 add user with bad apartment rejected",c==400,(c,t))
c,t=call("POST","/api/admin/users/add",{"name":"nv4","password":"short","role":"USER","fullName":"D","email":"d@test.local","apartmentNumbers":[]},adm); chk("US23 add user weak password rejected",c==400,(c,t))
# US01/02/03
c,t=call("GET","/api/residents/admin/filter?fullName=Nguyen",tok=adm); chk("US01 filter residents",c==200 and any("Nguyen" in r.get("fullName","") for r in t),(c,str(t)[:120]))
c,t=call("POST",f"/api/admin/users/edit/{cd1}",{"fullName":"Nguyen Van A2","age":31,"phone":"0912345678","role":"USER","apartmentNumbers":["A0101"],"status":"THUONGTRU"},adm); chk("US01 edit resident",c==200,(c,t))
c,t=call("POST",f"/api/admin/users/edit/{cd1}",{"fullName":"x","role":"BOSS","apartmentNumbers":["A0101"]},adm); chk("US01 edit resident invalid role rejected",c==400,(c,t))
c,t=call("GET","/api/admin/apartment-list",tok=adm); apts={a["apartmentNumber"]:a for a in t}
c,t=call("POST","/api/admin/apartment-list/edit-apartment",{**apts["A0101"],"area":80.0},adm); chk("US02 edit apartment",c==200,(c,t))
c,t=call("POST","/api/admin/apartment-list/add-apartment",{"apartmentNumber":"A0101","roomNumber":"3","floor":1,"area":70.0,"status":"VACANT","type":"STANDARD"},adm); chk("US02 duplicate apartment rejected",c>=400,(c,t))
ids=[apts["A0101"]["id"],apts["A0202"]["id"]]
c,t=call("POST","/api/apartments/batch-update-status",{"ids":ids,"status":"OCCUPIED"},adm); chk("US02 batch update status",c==200,(c,t))
c,t=call("POST","/api/apartments/batch-update-status",{"ids":ids,"status":"BOGUS"},adm); chk("US02 batch invalid status rejected",c==400,(c,t))
c,t=call("POST","/api/apartments/batch-update-status",{"ids":ids,"status":"VACANT"},res_tok); chk("US02 RESIDENT batch update -> 403",c==403,(c,t))
c,t=call("GET","/api/apartments/filter?floors=1&minArea=50&status=OCCUPIED&type=STANDARD",tok=adm); chk("US03 filter floor+area+status+type",c==200 and [a["apartmentNumber"] for a in t]==["A0101"],(c,str(t)[:150]))
c,t=call("GET","/api/admin/apartment-list/residents/%d"%apts["A0101"]["id"],tok=adm); chk("US03 residents of apartment",c==200 and len(t)>=1,(c,str(t)[:120]))
c,t=call("GET","/api/apartments/floors",tok=adm); chk("US03 floors list",c==200,(c,t))
# US05
c,t=call("GET","/api/fee-units",tok=adm); chk("US05 get fee units (no parking fields)",c==200 and "carParkingFeeByHour" not in t and t.get("electricityFeePerKWh")==3500,(c,t))
fee=dict(t); fee["electricityFeePerKWh"]=4000; fee["waterFeePerM3"]=20000
c,t=call("POST","/api/fee-units",fee,adm); chk("US05 save fee units",c==200 and t.get("electricityFeePerKWh")==4000,(c,t))
c,t=call("POST","/api/fee-units",{**fee,"waterFeePerM3":-1},adm); chk("US05 negative fee rejected",c==400,(c,t))
c,t=call("GET","/api/fee-units",tok=res_tok); chk("US05 RESIDENT fee-units -> 403",c==403,(c,t))
# US06
bill={"apartmentNumber":"A0101","billType":"SERVICE_COST","description":"Phi dich vu thang 11","amount":1200000,"dueDate":fut}
c,t=call("POST","/api/admin/bills",bill,adm); chk("US06 create bill",c==200,(c,t))
c,t=call("POST","/api/admin/bills",{**bill,"amount":0},adm); chk("US06 bill amount 0 rejected",c==400,(c,t))
c,t=call("POST","/api/admin/bills",{**bill,"apartmentNumber":"ZZZ"},adm); chk("US06 bill unknown apartment rejected",c==400,(c,t))
c,t=call("POST","/api/admin/bills",{**bill,"apartmentNumber":"A0202","description":"Phi quan ly A0202"},adm)
c,t=call("POST","/api/admin/bills",{**bill,"description":"Phi bao tri"},adm)
c,t=call("GET","/api/admin/bills",tok=adm); bills=t; b1=[b for b in bills if b["apartmentNumber"]=="A0101"][0]; chk("US06 default status UNPAID",b1["status"]=="UNPAID",b1)
c,t=call("PUT",f"/api/admin/bills/edit/{b1['id']}",{**bill,"amount":1500000},adm); chk("US06 edit bill",c==200,(c,t))
c,t=call("GET","/api/bills/filter?apartmentNumber=A0101&status=UNPAID&minAmount=1400000",tok=adm); chk("US06 search bills",c==200 and len(t)==1 and t[0]["amount"]==1500000,(c,str(t)[:150]))
# US07
c,t=call("GET","/api/utility-bills",tok=adm); chk("US07 utility data",c==200 and t.get("electricityFeePerKWh")==4000,(c,str(t)[:150]))
c,t=call("POST","/api/utility-bills/generate",{"dueDate":fut,"formData":{"electricity_A0101":"100","water_A0101":"10","electricity_A0202":"50","water_A0202":""}},adm)
chk("US07 batch create electricity/water",c==200 and t.get("billsCount")==3,(c,str(t)[:200]))
amts=sorted((b["billType"],b["apartmentNumber"],b["amount"]) for b in t["bills"]) if isinstance(t,dict) and "bills" in t else []
chk("US07 amount = usage x unit price",amts==[("ELECTRICITY","A0101",400000.0),("ELECTRICITY","A0202",200000.0),("WATER","A0101",200000.0)],amts)
c,t=call("POST","/api/utility-bills/generate",{"dueDate":"not-a-date","formData":{}},adm); chk("US07 invalid input rejected",c==400,(c,t))
c,t=call("GET","/api/utility-bills",tok=res_tok); chk("US07 RESIDENT utility-bills -> 403",c==403,(c,t))
# US08
c,t=call("GET","/api/user/apartment-detail?apartmentNumber=A0101",tok=res_tok); chk("US08 resident sees own apartment bills",c==200 and len(t["bills"])>=2,(c,str(t)[:150]))
c,t=call("GET","/api/user/apartment-detail?apartmentNumber=A0202",tok=res_tok); chk("US08 resident cannot see other apartment",c==403,(c,t))
c,t=call("GET","/api/bills/list",tok=res_tok); chk("US08 /api/bills/list only own apartment",c==200 and t and all(b["apartmentNumber"]=="A0101" for b in t),(c,str(t)[:150]))
c,t=call("GET","/api/bills/filter",tok=res_tok); chk("US08 /api/bills/filter only own apartment",c==200 and t and all(b["apartmentNumber"]=="A0101" for b in t),(c,str(t)[:150]))
oth=[b for b in call("GET","/api/admin/bills",tok=adm)[1] if b["apartmentNumber"]=="A0202"][0]["id"]
c,t=call("GET",f"/api/bills/{oth}",tok=res_tok); chk("US08 resident cannot open other apartment bill",c==403,(c,t))
# US12
mine=[b for b in call("GET","/api/admin/bills",tok=adm)[1] if b["apartmentNumber"]=="A0101"]
b_a,b_b=mine[0]["id"],mine[1]["id"]
c,t=call("POST",f"/api/admin/bills/{b_a}/confirm-payment",tok=res_tok); chk("US12 RESIDENT confirm-payment -> 403",c==403,(c,t))
c,t=call("POST",f"/api/bills/{b_a}/mark-paid",tok=res_tok); chk("US12 RESIDENT mark-paid -> 403",c==403,(c,t))
c,t=call("POST",f"/api/admin/bills/{b_a}/confirm-payment",tok=adm); chk("US12 ADMIN confirm-payment",c==200 and t.get("status")=="PAID",(c,t))
c,t=call("POST",f"/api/admin/bills/{b_a}/confirm-payment",tok=adm); chk("US12 confirm twice rejected",c==400,(c,t))
c,t=call("POST",f"/api/bills/{b_b}/mark-paid",tok=adm); chk("US12 ADMIN mark-paid",c==200,(c,t))
c,t=call("POST","/api/bills/batch-update-status",{"ids":[b_a,b_b],"status":"UNPAID"},adm); chk("US12 admin batch status",c==200,(c,t))
c,t=call("DELETE",f"/api/bills/{b_b}",tok=res_tok); chk("US06 RESIDENT delete bill -> 403",c==403,(c,t))
c,t=call("DELETE",f"/api/admin/bills/{b_b}",tok=adm); chk("US06 ADMIN delete bill",c in (200,204),(c,t))

# US15
today=datetime.date.today().isoformat()
c,t=call("POST","/api/contribution-types/create",{"name":"Quy tu thien","description":"Dot quyen gop"},adm); chk("US15 create contribution type",c==200,(c,t))
tid=t.get("id") if isinstance(t,dict) else None
c,t=call("POST","/api/contribution-types/create",{"name":"ab"},adm); chk("US15 type too short rejected",c==400,(c,t))
c,t=call("POST","/api/contribution-types/create",{"name":"Quy cua cu dan"},res_tok); chk("US15 RESIDENT create type -> 403",c==403,(c,t))
c,t=call("GET","/api/contribution-types/active",tok=adm); chk("US15 active types",c==200 and len(t)>=1,(c,str(t)[:100]))
cb={"contributionTypeId":tid,"title":"Dong gop xay san choi","description":"Mo ta","startDate":today,"endDate":fut,"targetAmount":50000000}
c,t=call("POST","/api/contributions/admin/create",cb,adm); chk("US15 create contribution drive",c==200,(c,t))
cid=t if isinstance(t,int) else (t.get("id") if isinstance(t,dict) else None)
c,t=call("POST","/api/contributions/admin/create",{**cb,"title":"ab"},adm); chk("US15 invalid drive rejected",c==400,(c,t))
c,t=call("POST","/api/contributions/admin/create",cb,res_tok); chk("US15 RESIDENT create drive -> 403",c==403,(c,t))
c,t=call("GET","/api/contributions/admin",tok=adm); chk("US15 admin list drives",c==200 and len(t["contributions"])>=1,(c,str(t)[:100]))
c,t=call("POST",f"/api/contributions/admin/create-for-all?contributionId={cid}&amount=200000",tok=adm); chk("US15 create for all apartments",c==200,(c,t))
c,t=call("GET",f"/api/contributions/admin/{cid}",tok=adm); chk("US15 drive has per-resident contributions",c==200 and len(t["residentContributions"])>=1,(c,str(t)[:150]))
c,t=call("POST",f"/api/contributions/admin/{cid}/close",tok=adm); chk("US15 close drive",c==200,(c,t))
c,t=call("POST",f"/api/contributions/admin/create-for-all?contributionId={cid}&amount=1",tok=adm); chk("US15 create-for-all on closed drive rejected",c==400,(c,t))
c,t=call("POST",f"/api/contributions/admin/{cid}/reactivate",tok=adm); chk("US15 reopen drive",c==200,(c,t))
c,t=call("POST",f"/api/contributions/admin/{cid}/cancel",tok=adm); chk("US15 cancel drive",c==200,(c,t))
c,t=call("POST",f"/api/contributions/admin/{cid}/reactivate",tok=adm); chk("US15 reopen canceled drive rejected",c==400,(c,t))
c,t=call("GET","/api/admin/export/contributions",tok=adm,raw=True); chk("US15 export contributions xlsx",c==200 and t[:2]==b"PK",(c,t[:20]))
c,t=call("GET","/api/admin/export/resident-contributions",tok=adm,raw=True); chk("US15 export resident-contributions xlsx",c==200 and t[:2]==b"PK",(c,t[:20]))
c,t=call("GET","/api/export/users",tok=adm,raw=True); chk("US23 export users xlsx",c==200 and t[:2]==b"PK",(c,t[:20]))
# resident contribution flow (resident contributes)
c,t=call("GET","/api/contributions/user/stats",tok=res_tok); print("   resident stats probe:",c)
# removed endpoints must not 500
for m,pth in [("GET","/api/invoices"),("GET","/api/qrcode/1"),("POST","/api/webhook/sepay"),("GET","/api/parking-rentals"),("GET","/api/complaints"),("GET","/api/notifications/check"),("GET","/api/admin/notifications"),("GET","/api/admin/export/bills"),("GET","/api/admin/export/invoices")]:
    c1,_=call(m,pth,{} if m=="POST" else None,tok=adm)
    c2,_=call(m,pth,{} if m=="POST" else None)
    chk(f"REMOVED {m} {pth} admin={c1} anon={c2} (no 500)",c1 in (404,405) and c2 in (401,403,404),(c1,c2))

print("TOTAL",len(res),"FAILED",[n for n,ok in res if not ok])

sys.exit(1 if any(not ok for _,ok in res) else 0)
