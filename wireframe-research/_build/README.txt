Jay CVS: page builder (design preview, now kept in wireframe-research/)

The website's HTML pages are generated from these sources so the header, footer,
menu and shared pieces (packages, order card, payment section) stay identical.

  python _build/assemble.py      -> rebuilds the public pages (index, services, pricing, ...)
  python _build/admin_build.py   -> rebuilds the admin mock screens in /admin
  python _build/gen_images.py    -> re-renders the sample CV images (needs Microsoft Edge)

Edit page content in _build/pages/*.html (homepage: _build/index-original.html),
then run the matching script. Don't edit the generated .html files directly; they are overwritten.
