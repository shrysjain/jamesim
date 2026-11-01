"""Omit hardware shape representations before OpenCascade transfer/meshing.

The source STEP is never modified. Assembly placements and contact structures remain.
"""
import re
from pathlib import Path

source = Path('assets/source/field.step').read_text()
entities = {int(i): value.strip() for i, value in re.findall(r'#(\d+)=(.*?);', source, re.S)}
refs = lambda value: [int(i) for i in re.findall(r'#(\d+)', re.sub(r"'(?:''|[^'])*'", "''", value))]
products = {i: value for i, value in entities.items() if value.startswith('PRODUCT(')}
formations = {i: refs(v)[0] for i, v in entities.items() if v.startswith('PRODUCT_DEFINITION_FORMATION')}
definitions = {i: formations[refs(v)[0]] for i, v in entities.items() if v.startswith('PRODUCT_DEFINITION(')}
product_shapes = {i: definitions[refs(v)[0]] for i, v in entities.items()
                  if v.startswith('PRODUCT_DEFINITION_SHAPE(') and refs(v)[0] in definitions}
representations = {refs(v)[1]: product_shapes[refs(v)[0]] for v in entities.values()
                   if v.startswith('SHAPE_DEFINITION_REPRESENTATION(') and refs(v)[0] in product_shapes}
hardware = re.compile(r'screw|bolt|washer|rivet|\bnut\b|PEM |bearing|pulley|spur gear|REV-|motor|controller|cable tie|chain|wheel intergrated|CIM|Kraken', re.I)
replacements = {}
for value in entities.values():
    if not value.startswith('SHAPE_REPRESENTATION_RELATIONSHIP('):
        continue
    related = refs(value)
    if len(related) != 2 or related[0] not in representations:
        continue
    parent, child = related
    if hardware.search(products[representations[parent]]):
        axis, context = refs(entities[parent])[:2]
        replacements[child] = f"SHAPE_REPRESENTATION('',(#{axis}),#{context})"

def replace(match):
    number = int(match.group(1))
    return f'#{number}={replacements[number]};' if number in replacements else match.group(0)

prepared = re.sub(r'#(\d+)=(.*?);', replace, source, flags=re.S)
Path('assets/intermediate').mkdir(parents=True, exist_ok=True)
Path('assets/intermediate/field-visual.step').write_text(prepared)
print(f'Excluded {len(replacements)} hardware product shapes before tessellation. Original source retained.')
