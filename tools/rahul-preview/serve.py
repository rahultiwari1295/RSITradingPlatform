"""Local preview server for /rahul. Serves the patched copy made by prepare.sh, falls back to index.html for app paths,
and forwards /api and /lab/api to the live public API (public data only: no owner data is ever fetched)."""
import http.server, os, ssl, sys, tempfile, urllib.request

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(tempfile.gettempdir(), "rahul-preview")
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 5173
SERVER = "https://quantsync-api.duckdns.org:40034"
CTX = ssl.create_default_context()


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def _proxy(s):
        p = s.path.replace("/api/terminal-data", "/api/terminalData", 1)
        url = SERVER + (("/lab/" + p[len("/lab/api/"):]) if p.startswith("/lab/api/") else p)
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"Accept": "application/json"}), timeout=30, context=CTX) as r:
                body = r.read(); s.send_response(r.status); s.send_header("Content-Type", r.headers.get("Content-Type", "application/json"))
        except urllib.error.HTTPError as e:
            body = e.read(); s.send_response(e.code); s.send_header("Content-Type", "application/json")
        except Exception as e:  # noqa: BLE001
            body = str(e).encode(); s.send_response(502); s.send_header("Content-Type", "text/plain")
        s.send_header("Content-Length", str(len(body))); s.end_headers(); s.wfile.write(body)

    def do_GET(s):
        path = s.path.split("?")[0]
        if path == "/config.js":
            b = ('window.QS_ENDPOINTS={server:"%s",lab:"%s"};' % (SERVER, SERVER)).encode()
            s.send_response(200); s.send_header("Content-Type", "application/javascript"); s.send_header("Content-Length", str(len(b))); s.end_headers(); s.wfile.write(b); return
        if path.startswith(("/api/", "/lab/api/")):
            return s._proxy()
        full = os.path.join(ROOT, path.lstrip("/"))
        if not os.path.isfile(full) and not os.path.isfile(os.path.join(full, "index.html")) and "." not in os.path.basename(path):
            for app in ("rahul", "app", "m"):
                if path.startswith("/" + app):
                    s.path = f"/{app}/index.html"; break
        return super().do_GET()

    def end_headers(s):
        s.send_header("Cache-Control", "no-store"); super().end_headers()

    def log_message(s, *a):
        pass


http.server.ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
