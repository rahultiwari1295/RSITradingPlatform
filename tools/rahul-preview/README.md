# /rahul preview with invented data

Test every owner screen without signing in and without real holdings. All holdings, prices and balances in
`sample_owner.json` are invented. Open calls, closed calls and News still come from the live public API.

```sh
sh tools/rahul-preview/prepare.sh                 # copies public/ to a temp folder and patches only the copy
python3 tools/rahul-preview/serve.py              # http://localhost:5173/rahul/
```

Run `prepare.sh` again after every edit. Nothing under `public/` is changed. Never commit a patched copy or real owner data.
