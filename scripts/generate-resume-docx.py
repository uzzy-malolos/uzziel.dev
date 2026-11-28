"""Generate ATS-friendly resume DOCX from resume-content.ts data (parsed manually)."""
from __future__ import annotations

import json
import re
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.opc.constants import RELATIONSHIP_TYPE
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[1]
TS_SOURCE = ROOT / "src" / "lib" / "resume-content.ts"
OUT_PORTFOLIO = ROOT / "public" / "downloads" / "uzziel-malolos-resume.docx"
# Optional local copy on the author's Windows machine; skip if the folder is absent.
OUT_DOWNLOADS = Path(r"C:\Users\uzzie\Downloads") / "Malolos Resume.docx"
OUT_TXT = ROOT / "public" / "downloads" / "uzziel-malolos-resume.txt"
OUT_PDF = ROOT / "public" / "downloads" / "uzziel-malolos-resume.pdf"


STR = r"(?:'((?:\\'|[^'])*)'|\"((?:\\\"|[^\"])*)\")"


def _unquote(single: str | None, double: str | None) -> str:
    raw = single if single not in (None, "") else (double or "")
    return raw.replace("\\'", "'").replace('\\"', '"')


def _strings(block: str) -> list[str]:
    return [_unquote(m.group(1), m.group(2)) for m in re.finditer(STR, block)]


def parse_ts_object(source: str, key: str) -> str:
    match = re.search(rf"{key}:\s*{STR}", source)
    if not match:
        raise ValueError(f"Missing key: {key}")
    return _unquote(match.group(1), match.group(2))


def parse_string_array_block(source: str, key: str) -> list[str]:
    block = re.search(rf"{key}:\s*\[(.*?)\]", source, re.S)
    if not block:
        return []
    return _strings(block.group(1))


def parse_skills(source: str) -> list[dict]:
    skills: list[dict] = []
    for group_match in re.finditer(
        rf"group:\s*{STR},\s*items:\s*\[(.*?)\]",
        source,
        re.S,
    ):
        group = _unquote(group_match.group(1), group_match.group(2))
        skills.append({"group": group, "items": _strings(group_match.group(3))})
    return skills


def parse_experience(source: str) -> list[dict]:
    entries: list[dict] = []
    for block in re.finditer(
        rf"role:\s*{STR}.*?org:\s*{STR}.*?period:\s*{STR}.*?bullets:\s*\[(.*?)\]",
        source,
        re.S,
    ):
        entries.append(
            {
                "role": _unquote(block.group(1), block.group(2)),
                "org": _unquote(block.group(3), block.group(4)),
                "period": _unquote(block.group(5), block.group(6)),
                "bullets": _strings(block.group(7)),
            }
        )
    return entries


def parse_projects(source: str) -> list[dict]:
    projects: list[dict] = []
    for block in re.finditer(
        rf"title:\s*{STR},\s*status:\s*{STR},\s*summary:\s*{STR}",
        source,
        re.S,
    ):
        projects.append(
            {
                "title": _unquote(block.group(1), block.group(2)),
                "status": _unquote(block.group(3), block.group(4)),
                "summary": _unquote(block.group(5), block.group(6)),
            }
        )
    return projects


def parse_education(source: str) -> list[dict]:
    entries: list[dict] = []
    for block in re.finditer(
        rf"degree:\s*{STR}.*?school:\s*{STR}.*?year:\s*{STR}.*?note:\s*{STR}",
        source,
        re.S,
    ):
        entries.append(
            {
                "degree": _unquote(block.group(1), block.group(2)),
                "school": _unquote(block.group(3), block.group(4)),
                "year": _unquote(block.group(5), block.group(6)),
                "note": _unquote(block.group(7), block.group(8)),
            }
        )
    return entries


def load_resume_data() -> dict:
    source = TS_SOURCE.read_text(encoding="utf-8")
    return {
        "name": parse_ts_object(source, "name"),
        "tagline": parse_ts_object(source, "tagline"),
        "phone": parse_ts_object(source, "phone"),
        "email": parse_ts_object(source, "email"),
        "location": parse_ts_object(source, "location"),
        "linkedin": parse_ts_object(source, "linkedin"),
        "website": parse_ts_object(source, "website"),
        "github": parse_string_array_block(source, "github"),
        "summary": parse_ts_object(source, "summary"),
        "skills": parse_skills(source),
        "experience": parse_experience(source),
        "projects": parse_projects(source),
        "education": parse_education(source),
        "awards": parse_string_array_block(source, "awards"),
    }


def add_contact_text(paragraph, text: str) -> None:
    run = paragraph.add_run(text)
    run.font.size = Pt(9.5)
    run.font.name = "Calibri"


def add_hyperlink(paragraph, text: str, url: str) -> None:
    # python-docx has no hyperlink API: wrap a styled run in a w:hyperlink element.
    rel_id = paragraph.part.relate_to(url, RELATIONSHIP_TYPE.HYPERLINK, is_external=True)
    link = OxmlElement("w:hyperlink")
    link.set(qn("r:id"), rel_id)
    run = paragraph.add_run(text)
    run.font.size = Pt(9.5)
    run.font.name = "Calibri"
    run.font.underline = True
    run.font.color.rgb = RGBColor(0x1F, 0x4E, 0x79)
    link.append(run._r)
    paragraph._p.append(link)


def short_url(url: str) -> str:
    return re.sub(r"^https?://(www\.)?", "", url).rstrip("/")


def add_heading(doc: Document, text: str) -> None:
    p = doc.add_paragraph()
    run = p.add_run(text.upper())
    run.bold = True
    run.font.size = Pt(11)
    run.font.name = "Calibri"
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(4)


def add_body(doc: Document, text: str, bullet: bool = False) -> None:
    style = "List Bullet" if bullet else None
    p = doc.add_paragraph(text, style=style)
    for run in p.runs:
        run.font.size = Pt(10.5)
        run.font.name = "Calibri"
    p.paragraph_format.space_after = Pt(2)


def build_docx(data: dict) -> Document:
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Inches(0.6)
    section.bottom_margin = Inches(0.6)
    section.left_margin = Inches(0.7)
    section.right_margin = Inches(0.7)

    name = doc.add_paragraph()
    name.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = name.add_run(data["name"])
    run.bold = True
    run.font.size = Pt(16)
    run.font.name = "Calibri"

    tag = doc.add_paragraph()
    tag.alignment = WD_ALIGN_PARAGRAPH.CENTER
    tr = tag.add_run(data["tagline"])
    tr.font.size = Pt(10.5)
    tr.font.name = "Calibri"

    contact = doc.add_paragraph()
    contact.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_contact_text(contact, f"{data['phone']}  •  ")
    add_hyperlink(contact, data["email"], f"mailto:{data['email']}")
    add_contact_text(contact, f"  •  {data['location']}")

    links = doc.add_paragraph()
    links.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_hyperlink(links, short_url(data["website"]), data["website"])
    add_contact_text(links, "  •  ")
    add_hyperlink(links, "LinkedIn", data["linkedin"])
    add_contact_text(links, "  •  GitHub: ")
    for i, url in enumerate(data["github"]):
        if i:
            add_contact_text(links, " | ")
        add_hyperlink(links, url.rstrip("/").split("/")[-1], url)

    add_heading(doc, "Summary")
    add_body(doc, data["summary"])

    add_heading(doc, "Skills")
    for skill in data["skills"]:
        add_body(doc, f"{skill['group']}: {', '.join(skill['items'])}")

    add_heading(doc, "Experience")
    for job in data["experience"]:
        add_body(doc, f"{job['org']}")
        add_body(doc, f"{job['role']}  |  {job['period']}")
        for bullet in job["bullets"]:
            add_body(doc, bullet, bullet=True)

    add_heading(doc, "Projects")
    for project in data["projects"]:
        status = f" ({project['status']})" if project.get("status") else ""
        add_body(doc, f"{project['title']}{status} — {project['summary']}")

    add_heading(doc, "Education")
    for edu in data["education"]:
        add_body(doc, f"{edu['school']}  |  {edu['year']}")
        add_body(doc, f"{edu['degree']}  |  {edu['note']}")

    add_heading(doc, "Awards")
    for award in data["awards"]:
        add_body(doc, award, bullet=True)

    add_body(doc, f"Portfolio and references: {data['website'].replace('https://', '')}")
    return doc


def build_txt(data: dict) -> str:
    lines = [
        data["name"],
        "",
        data["tagline"],
        f"{data['phone']} • {data['email']} • {data['location']}",
        f"{short_url(data['website'])} • LinkedIn: {short_url(data['linkedin'])}",
        f"GitHub: {' | '.join(short_url(url) for url in data['github'])}",
        "",
        "SUMMARY",
        "",
        data["summary"],
        "",
        "SKILLS",
        "",
    ]
    for skill in data["skills"]:
        lines.append(f"{skill['group']}: {', '.join(skill['items'])}")
    lines.extend(["", "EXPERIENCE", ""])
    for job in data["experience"]:
        lines.extend([job["org"], f"{job['role']} | {job['period']}"])
        for bullet in job["bullets"]:
            lines.append(f"- {bullet}")
        lines.append("")
    lines.extend(["PROJECTS", ""])
    for project in data["projects"]:
        lines.append(f"{project['title']} ({project['status']}) — {project['summary']}" if project.get("status") else f"{project['title']} — {project['summary']}")
    lines.extend(["", "EDUCATION", ""])
    for edu in data["education"]:
        lines.extend(
            [
                f"{edu['school']} | {edu['year']}",
                f"{edu['degree']} | {edu['note']}",
                "",
            ]
        )
    lines.extend(["AWARDS", ""])
    for award in data["awards"]:
        lines.append(f"- {award}")
    lines.append("")
    lines.append(f"Portfolio and references: {data['website'].replace('https://', '')}")
    return "\n".join(lines)


def main() -> None:
    data = load_resume_data()
    OUT_PORTFOLIO.parent.mkdir(parents=True, exist_ok=True)
    doc = build_docx(data)
    doc.save(OUT_PORTFOLIO)
    saved_local = None
    if OUT_DOWNLOADS.parent.exists():
        doc.save(OUT_DOWNLOADS)
        saved_local = str(OUT_DOWNLOADS)
    OUT_TXT.write_text(build_txt(data), encoding="utf-8")
    print(json.dumps({"docx": str(OUT_PORTFOLIO), "downloads": saved_local, "txt": str(OUT_TXT)}, indent=2))
    # Count check so a regression cannot silently drop jobs or schools again.
    assert len(data["experience"]) >= 4, data["experience"]
    assert len(data["education"]) >= 2, data["education"]
    assert any("Dean" in a for a in data["awards"]), data["awards"]
    assert any(p["title"].startswith("TIRADOR") or "Worship Center" in p["title"] for p in data["projects"])


if __name__ == "__main__":
    main()
