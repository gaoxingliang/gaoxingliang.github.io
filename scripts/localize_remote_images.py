#!/usr/bin/env python3
"""
Find remote image URLs in _posts/*.md, download to assets/images/posts/<slug>/,
replace with {{ '/assets/...' | relative_url }}.

Slug = filename without extension after YYYY-MM-DD- prefix.
Also fixes nested [![alt](url)](url2) when both are image URLs.
"""
from __future__ import annotations

import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
POSTS = REPO / "_posts"
IMAGES = REPO / "assets" / "images" / "posts"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "*/*",
}


def post_slug_from_path(path: Path) -> str:
    stem = path.stem
    m = re.match(r"^\d{4}-\d{2}-\d{2}-(.+)$", stem)
    return m.group(1) if m else stem


def http_get_bytes(url: str, *, referer: str | None = None) -> bytes:
    h = dict(HEADERS)
    if referer:
        h["Referer"] = referer
    req = urllib.request.Request(url, headers=h)
    with urllib.request.urlopen(req, timeout=45) as resp:
        return resp.read()


def strip_md_title_suffix(dest: str) -> str:
    dest = dest.strip()
    # Trailing space + "title" in markdown image/link
    if ' "' in dest:
        i = dest.index(' "')
        dest = dest[:i].rstrip()
    return dest


def is_probably_image_url(url: str) -> bool:
    u = url.strip().split("?")[0].lower()
    if "/wiki/file:" in u or "/wiki/image:" in u:
        return True
    if any(u.endswith(ext) for ext in (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico")):
        return True
    host = urllib.parse.urlparse(url).netloc.lower()
    if any(x in host for x in ("csdnimg", "csdn.net", "blog.csdn", "pic", "img", "image", "static", "upload")):
        return True
    if "cnitblog.com" in host or "cnblogs.com" in host:
        return True
    return False


def wikipedia_file_to_special(url: str) -> str:
    m = re.match(r"(https?://[^/]+)/wiki/File:(.+)$", url, re.I)
    if m:
        base, fn = m.group(1), urllib.parse.unquote(m.group(2))
        fn = fn.split("#")[0]
        return f"{base}/wiki/Special:FilePath/{fn}"
    return url


def pick_ext(url: str, content_type: str | None) -> str:
    path = urllib.parse.urlparse(url).path.lower()
    for ext in (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"):
        if path.endswith(ext):
            return ext
    if content_type:
        ct = content_type.split(";")[0].strip().lower()
        if "jpeg" in ct or "jpg" in ct:
            return ".jpg"
        if "png" in ct:
            return ".png"
        if "gif" in ct:
            return ".gif"
        if "webp" in ct:
            return ".webp"
        if "svg" in ct:
            return ".svg"
    return ".bin"


def next_image_index(dest_dir: Path) -> int:
    if not dest_dir.exists():
        return 0
    mx = 0
    for p in dest_dir.glob("img-*.*"):
        m = re.match(r"img-(\d+)", p.stem)
        if m:
            mx = max(mx, int(m.group(1)))
    return mx


def _fetch_image_bytes(fetch_url: str, referer: str | None) -> tuple[bytes, str, str | None] | None:
    h = dict(HEADERS)
    if referer:
        h["Referer"] = referer
    req = urllib.request.Request(fetch_url, headers=h)
    with urllib.request.urlopen(req, timeout=45) as resp:
        return resp.read(), resp.geturl(), resp.headers.get("Content-Type")


def download_image(url: str, dest_dir: Path, referer: str) -> tuple[str, str] | None:
    dest_dir.mkdir(parents=True, exist_ok=True)
    fetch_url = wikipedia_file_to_special(url)
    parsed = urllib.parse.urlparse(fetch_url)
    same_site_ref = f"{parsed.scheme}://{parsed.netloc}/"

    data: bytes | None = None
    final_url = ""
    ctype: str | None = None
    for ref in (referer, same_site_ref, None):
        try:
            data, final_url, ctype = _fetch_image_bytes(fetch_url, ref)
            break
        except (urllib.error.HTTPError, urllib.error.URLError, OSError, TimeoutError):
            continue
    if data is None:
        return None

    if len(data) < 80:
        return None
    if ctype and "text/html" in ctype.lower() and not final_url.lower().endswith(
        (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg")
    ):
        return None

    idx = next_image_index(dest_dir) + 1
    ext = pick_ext(final_url, ctype)
    if ext == ".bin":
        ext = ".png"
    fname = f"img-{idx:03d}{ext}"
    out = dest_dir / fname
    out.write_bytes(data)
    liquid = "{{ '" + f"/assets/images/posts/{dest_dir.name}/{fname}" + "' | relative_url }}"
    return fname, liquid


def split_front_matter(text: str) -> tuple[str, str]:
    if not text.startswith("---"):
        return "", text
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.DOTALL)
    if not m:
        return "", text
    fm_block = text[: m.end()]
    body = text[m.end() :]
    return fm_block, body


def process_file(path: Path, csdn_url: str | None) -> int:
    text = path.read_text(encoding="utf-8")
    slug = post_slug_from_path(path)
    dest_dir = IMAGES / slug
    referer = csdn_url or "https://blog.csdn.net/"

    fm_block, body = split_front_matter(text)
    if not fm_block:
        body = text

    original_body = body
    downloads = [0]

    def repl_nested(m: re.Match[str]) -> str:
        alt_i, inner_dest, outer_dest = m.group(1), m.group(2), m.group(3)
        inner_url = strip_md_title_suffix(inner_dest)
        outer_url = strip_md_title_suffix(outer_dest)
        new_inner, new_outer = inner_dest, outer_dest
        if inner_url.startswith("http") and is_probably_image_url(inner_url):
            got = download_image(inner_url, dest_dir, referer)
            time.sleep(0.12)
            if got:
                new_inner = got[1]
                downloads[0] += 1
        if outer_url.startswith("http") and is_probably_image_url(outer_url):
            got = download_image(outer_url, dest_dir, referer)
            time.sleep(0.12)
            if got:
                new_outer = got[1]
                downloads[0] += 1
        return f"[![{alt_i}]({new_inner})]({new_outer})"

    nested_re = re.compile(r"\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)")
    body = nested_re.sub(repl_nested, body)

    # Plain ![alt](url)
    plain = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")

    def repl_plain(m: re.Match[str]) -> str:
        alt, dest = m.group(1), m.group(2)
        url = strip_md_title_suffix(dest)
        if not url.startswith("http"):
            return m.group(0)
        if "{{" in url and "relative_url" in url:
            return m.group(0)
        if not is_probably_image_url(url):
            return m.group(0)
        got = download_image(url, dest_dir, referer)
        time.sleep(0.12)
        if not got:
            return m.group(0)
        downloads[0] += 1
        return f"![{alt}]({got[1]})"

    body = plain.sub(repl_plain, body)

    if body != original_body:
        new_text = (fm_block + body) if fm_block else body
        path.write_text(new_text, encoding="utf-8")

    return downloads[0]


def extract_csdn_url(text: str) -> str | None:
    m = re.search(r"^csdn_url:\s*\"([^\"]+)\"\s*$", text, re.M)
    return m.group(1) if m else None


def main() -> None:
    total = 0
    for path in sorted(POSTS.glob("*.md")):
        raw = path.read_text(encoding="utf-8")
        csdn = extract_csdn_url(raw)
        try:
            n = process_file(path, csdn)
        except Exception as e:
            print(f"ERR {path.name}: {e}")
            continue
        if n:
            print(f"{path.name}: downloaded {n} image(s)")
            total += n
    print(f"Total new downloads: {total}")


if __name__ == "__main__":
    main()
