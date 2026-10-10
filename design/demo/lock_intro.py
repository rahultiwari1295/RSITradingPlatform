#!/usr/bin/env python3
import hashlib,os,stat,sys
D=os.path.join(os.path.dirname(os.path.abspath(__file__)),"locked")
names=["intro.css","intro.html","intro.js"]
for n in names:
    p=os.path.join(D,n)
    if os.path.exists(p): os.chmod(p,0o644)
open(os.path.join(D,"MANIFEST.sha256"),"w").write("".join(hashlib.sha256(open(os.path.join(D,n),"rb").read()).hexdigest()+"  "+n+"\n" for n in names))
for n in names+["MANIFEST.sha256"]: os.chmod(os.path.join(D,n),0o444)
print("locked",names)
