"""Convert single-page PDFs to SVG with text turned into outlines, so fonts can never fall back.

    python -I scripts/pdf_to_svg.py in1.pdf out1.svg [in2.pdf out2.svg ...]

Called by scripts/export-screens.ts. Needs PyMuPDF (`pip install pymupdf`).
"""
import sys

import fitz

PX_PER_PT = 96 / 72  # Chromium writes PDFs at 96 CSS px per 72 pt; scale back so 1 SVG unit = 1 CSS px.


def main(args: list[str]) -> None:
    for src, dst in zip(args[0::2], args[1::2]):
        doc = fitz.open(src)
        svg = doc[0].get_svg_image(matrix=fitz.Matrix(PX_PER_PT, PX_PER_PT), text_as_path=True)
        with open(dst, "w", encoding="utf-8") as f:
            f.write(svg)
        doc.close()


if __name__ == "__main__":
    main(sys.argv[1:])
