"""Redraw the README diagrams with modelviz (github.com/ghanemja/visme).

    python3 docs/diagrams/build.py            # visme checked out next to this repo
    VISME_DIR=/path/to/visme python3 docs/diagrams/build.py

Each *.json here is a modelviz spec (blocks + `inputs` edges); style.json holds
the colours. Output: docs/diagrams/<name>.svg, committed so GitHub shows them.
"""
import os, re, sys, json, pathlib

HERE = pathlib.Path(__file__).resolve().parent
VISME = pathlib.Path(os.environ.get("VISME_DIR", HERE.parents[2] / "visme"))
if not (VISME / "modelviz").is_dir():
    sys.exit(f"modelviz not found at {VISME} — clone github.com/ghanemja/visme next to this repo or set VISME_DIR")
sys.path.insert(0, str(VISME))
from modelviz import from_spec, render_svg              # noqa: E402
from modelviz.render import load_style_file              # noqa: E402
from dataclasses import replace                         # noqa: E402

base = load_style_file(str(HERE / "style.json"))
for spec in sorted(HERE.glob("*.json")):
    if spec.name == "style.json":
        continue
    g = from_spec(json.loads(spec.read_text()))
    svg = render_svg(g, replace(base, show_params=False))
    # modelviz heads every diagram "N layers · N params" (it's built for neural nets) — not meaningful here
    svg = re.sub(r'<text[^>]*>\d+ layers · [^<]* params</text>', '', svg)
    out = spec.with_suffix(".svg")
    out.write_text(svg)
    print("wrote", out.relative_to(HERE.parents[1]))
