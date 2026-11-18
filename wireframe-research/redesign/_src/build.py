"""
Jay CVS redesign: wraps each page body in _src/pages/ with the shared shell (head, icon sprite,
header, footer) and writes it to redesign/<name>.html, so every page has the same nav and footer.

    python _src/build.py            builds every page in _src/pages/
    python _src/build.py job.html   builds one

A page body starts with three comment lines (title, desc, nav), then an optional <style> block,
then the page content. index.html and jobs.html were written by hand before this existed.
"""
import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.dirname(HERE)
read = lambda *p: io.open(os.path.join(HERE, *p), encoding='utf-8').read()

NAV = [('jobs.html', 'Find a job'), ('services.html', 'Services'), ('how-it-works.html', 'How it works'),
       ('pricing.html', 'Pricing'), ('samples.html', 'Samples'), ('blog.html', 'Career tips'), ('about.html', 'About')]


def build(name):
    src = read('pages', name)
    meta = dict(re.findall(r'<!--\s*(title|desc|nav):\s*(.*?)\s*-->', src))
    body = re.sub(r'<!--\s*(title|desc|nav):.*?-->\n?', '', src)
    style = ''
    m = re.match(r'\s*(<style>.*?</style>)\s*', body, re.S)
    if m:
        style, body = m.group(1), body[m.end():]
    nav = '\n'.join(
        f'      <a href="{h}"{" aria-current=\"page\"" if h == meta.get("nav") else ""}>{t}</a>' for h, t in NAV)
    html = read('shell.html')
    for k, v in {'TITLE': meta['title'], 'DESC': meta['desc'], 'STYLE': style, 'NAV': nav,
                 'SPRITE': read('sprite.html'), 'BODY': body.rstrip()}.items():
        html = html.replace('{{' + k + '}}', v)
    io.open(os.path.join(OUT, name), 'w', encoding='utf-8').write(html)
    print('built', name)


names = sys.argv[1:] or sorted(os.listdir(os.path.join(HERE, 'pages')))
for n in names:
    build(n)
