#!/usr/bin/env python3
"""Export the canonical Hall laurel SVGs to native tintable assets."""
import argparse
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
ANDROID = 'http://schemas.android.com/apk/res/android'
ET.register_namespace('android', ANDROID)


def android_vector(svg):
    def attributes(**values):
        return {f'{{{ANDROID}}}{key}': str(value) for key, value in values.items()}

    def convert(node):
        tag = node.tag.rsplit('}', 1)[-1]
        if tag == 'g':
            transform = node.get('transform')
            if transform not in (None, 'translate(64 0) scale(-1 1)'):
                raise ValueError(f'Unsupported transform: {transform}')
            group = ET.Element('group', attributes(translateX=64, scaleX=-1) if transform else {})
            group.extend(convert(child) for child in node)
            return group
        if tag != 'path':
            raise ValueError(f'Unsupported SVG element: {tag}')
        values = dict(pathData=node.attrib['d'], fillColor='@android:color/white')
        if node.get('fill') == 'none':
            values['fillColor'] = '@android:color/transparent'
        if node.get('stroke'):
            values.update(strokeColor='@android:color/white', strokeWidth=node.attrib['stroke-width'],
                          strokeLineCap=node.attrib['stroke-linecap'])
        return ET.Element('path', attributes(**values))

    root = ET.fromstring(svg)
    assert root.attrib['viewBox'] == '0 0 64 56'
    vector = ET.Element('vector', attributes(width='64dp', height='56dp', viewportWidth=64, viewportHeight=56))
    vector.extend(convert(child) for child in root)
    ET.indent(vector, space='    ')
    return ET.tostring(vector, encoding='unicode') + '\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--only', choices=['ios', 'android'])
    args = parser.parse_args()
    for variant in ('hero', 'card'):
        svg = (ROOT / f'design-system/assets/hall-laurel/{variant}.svg').read_text()
        name = f'HallLaurel{variant.title()}'
        exports = {
            'ios': (ROOT / f'dflh-saf-v2-swift/Sources/App/Resources/Assets.xcassets/{name}.imageset/{name}.svg', svg),
            'android': (ROOT / f'dflh-saf-v2-kotlin/app/src/main/res/drawable/hall_{variant}.xml', android_vector(svg)),
        }
        for platform, (path, content) in exports.items():
            if args.only and args.only != platform:
                continue
            if args.check:
                if path.read_text() != content:
                    raise SystemExit(f'Stale laurel asset: {path.relative_to(ROOT)}')
            else:
                path.write_text(content)
    print('Hall laurel assets verified' if args.check else 'Hall laurel assets exported')


if __name__ == '__main__':
    main()
