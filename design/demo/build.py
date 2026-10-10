#!/usr/bin/env python3
"""Assemble index.html. The launch film in locked/ is verified against locked/MANIFEST.sha256 first:
if anyone edits it, the build stops. Run `python3 lock_intro.py --update` only on purpose."""
import hashlib,sys,os
D=os.path.dirname(os.path.abspath(__file__))
def rd(p):return open(os.path.join(D,p),encoding="utf-8").read()
def sha(p):return hashlib.sha256(open(os.path.join(D,p),"rb").read()).hexdigest()
man={}
for l in rd("locked/MANIFEST.sha256").split("\n"):
    if l.strip():h,n=l.split();man[n]=h
for n,h in man.items():
    if sha("locked/"+n)!=h:sys.exit("LOCKED INTRO CHANGED: "+n+". Restore it from git, or deliberately re-lock.")
out=rd("src/head.html")+"<style>\n"+rd("src/app.css")+"</style>\n"
out+='<template id="film-tpl"><style>\n'+rd("locked/intro.css")+'</style>\n'+rd("locked/intro.html")+'</template>\n<div id="film-host"></div>\n'
out+=rd("src/shell.html")+"<script>\n"+rd("src/app.js")+"</script>\n<script>\n"+rd("locked/intro.js")+"</script>\n"
open(os.path.join(D,"index.html"),"w",encoding="utf-8").write(out)
print("built index.html",len(out),"bytes; intro verified")
