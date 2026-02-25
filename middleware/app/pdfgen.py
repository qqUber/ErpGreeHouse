from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable


@dataclass(frozen=True)
class ReceiptLine:
    text: str


def _pdf_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def write_simple_receipt_pdf(
    path: str, title: str, lines: Iterable[ReceiptLine]
) -> str:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)

    body_lines = [f"({ _pdf_escape(title) }) Tj"]
    body_lines.append("0 -18 Td")
    body_lines.append(
        f"({ _pdf_escape(datetime.now().strftime('%Y-%m-%d %H:%M:%S')) }) Tj"
    )
    body_lines.append("0 -24 Td")

    for line in lines:
        body_lines.append(f"({ _pdf_escape(line.text) }) Tj")
        body_lines.append("0 -16 Td")

    content_stream = "BT /F1 12 Tf 50 780 Td " + " ".join(body_lines) + " ET"
    content_bytes = content_stream.encode("latin-1", errors="replace")

    objects: list[bytes] = []

    def add(obj: str) -> int:
        objects.append(obj.encode("latin-1"))
        return len(objects)

    add("<< /Type /Catalog /Pages 2 0 R >>")
    add("<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    add(
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>"
    )
    add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    add(
        f"<< /Length {len(content_bytes)} >>\nstream\n{content_bytes.decode('latin-1')}\nendstream"
    )

    offsets = []
    out = bytearray()
    out.extend(b"%PDF-1.4\n")

    for i, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out.extend(f"{i} 0 obj\n".encode("ascii"))
        out.extend(obj)
        out.extend(b"\nendobj\n")

    xref_pos = len(out)
    out.extend(f"xref\n0 {len(objects)+1}\n".encode("ascii"))
    out.extend(b"0000000000 65535 f \n")
    for off in offsets:
        out.extend(f"{off:010d} 00000 n \n".encode("ascii"))

    out.extend(b"trailer\n")
    out.extend(f"<< /Size {len(objects)+1} /Root 1 0 R >>\n".encode("ascii"))
    out.extend(b"startxref\n")
    out.extend(f"{xref_pos}\n".encode("ascii"))
    out.extend(b"%%EOF\n")

    p.write_bytes(out)
    return str(p)
