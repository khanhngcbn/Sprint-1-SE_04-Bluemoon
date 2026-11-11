import socketserver,sys
LOG=sys.argv[1]
class H(socketserver.StreamRequestHandler):
    def handle(self):
        w=lambda m:self.wfile.write((m+"\r\n").encode())
        w("220 stub"); data=False; buf=[]
        while True:
            l=self.rfile.readline()
            if not l: break
            t=l.decode('utf-8','replace').rstrip("\r\n")
            if data:
                if t==".":
                    open(LOG,'a',encoding='utf-8').write("\n".join(buf)+"\n=====END=====\n"); buf=[]; data=False; w("250 ok")
                else: buf.append(t)
                continue
            u=t.upper()
            if u.startswith("EHLO"): w("250-stub"); w("250 AUTH PLAIN LOGIN")
            elif u.startswith("AUTH"): w("235 ok")
            elif u.startswith("DATA"): data=True; w("354 go")
            elif u.startswith("QUIT"): w("221 bye"); break
            else: w("250 ok")
socketserver.ThreadingTCPServer.allow_reuse_address=True
socketserver.ThreadingTCPServer(("127.0.0.1",2525),H).serve_forever()
