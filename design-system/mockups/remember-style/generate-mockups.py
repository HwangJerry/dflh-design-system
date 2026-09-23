#!/usr/bin/env python3
"""Generate .dc.html artboards for the DFLH Remember-style UI mockup."""
import json, os, datetime

ROOT = os.environ.get("MOCKUP_OUT", os.path.dirname(os.path.abspath(__file__)))
os.makedirs(ROOT, exist_ok=True)

LIGHT = dict(
    name="light",
    bg="#F5F4F0", surface="#FFFFFF", surface2="#FAFAF8",
    border="#E8E5DF", divider="#F0EDE8",
    t1="#1A1A2E", t2="#555555", t3="#888888", t4="#AAAAAA",
    primary="#1A1A2E", onPrimary="#FDFBF4",
    accent="#F59E0B", accentText="#B45309", accentSubtle="#FFFBEB", accentBorder="#FDE7B6",
    onAccent="#1A1A2E",
    error="#DC2626", success="#047857",
    unread="#F59E0B", unreadText="#1A1A2E",
    navSel="#1A1A2E", navIdle="#888888",
    cardShadow="0 1px 3px rgba(0,0,0,0.04)",
)
DARK = dict(
    name="dark",
    bg="#14141C", surface="#1E1E2A", surface2="#262636",
    border="#33333F", divider="#2A2C35",
    t1="#F5F4F0", t2="#B8B8C2", t3="#8A8A96", t4="#6E6E7A",
    primary="#F5F4F0", onPrimary="#14141C",
    accent="#FBBF6A", accentText="#FBBF6A", accentSubtle="#2A2419", accentBorder="#3D3320",
    onAccent="#14141C",
    error="#F87171", success="#34D399",
    unread="#FBBF6A", unreadText="#14141C",
    navSel="#F5F4F0", navIdle="#8A8A96",
    cardShadow="none",
)

ICONS = {
    "search": '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    "bell": '<path d="M6 17v-6a6 6 0 1 1 12 0v6l1.5 2H4.5L6 17Z"/><path d="M10 21h4"/>',
    "plus": '<path d="M12 5v14M5 12h14"/>',
    "pen": '<path d="M4 20h4L18.5 9.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4Z"/>',
    "chevD": '<path d="m6 9 6 6 6-6"/>',
    "chevR": '<path d="m9 6 6 6-6 6"/>',
    "heart": '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
    "comment": '<path d="M4 5h16v11H9l-5 4V5Z"/>',
    "share": '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6"/>',
    "eye": '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    "pin": '<path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6Z"/><path d="M12 14v7"/>',
    "sort": '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    "news": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h6M7 13h10M7 16h10"/>',
    "people": '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 19a6 6 0 0 1 12 0M14 19a4.5 4.5 0 0 1 7 0"/>',
    "msg": '<path d="M4 5h16v11H9l-5 4V5Z"/>',
    "person": '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    "card": '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h5M7 14h3"/>',
    "back": '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    "more": '<circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>',
    "send": '<path d="M21 3 3 10l8 3 3 8 7-18Z"/>',
    "lock": '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    "gear": '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
    "logout": '<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>',
    "shield": '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"/>',
    "link": '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    "phone": '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>',
    "mail": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    "camera": '<path d="M4 8h3l2-3h6l2 3h3v11H4V8Z"/><circle cx="12" cy="13" r="3.5"/>',
    "check": '<path d="m5 12 5 5 9-10"/>',
    "leaf": '<path d="M5 19C5 9 12 4 20 4c0 8-5 15-15 15Z"/><path d="M5 19 13 11"/>',
}

def ic(name, size=24, color="currentColor", sw=1.8, style=""):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" '
            f'stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" '
            f'style="flex-shrink:0;{style}">{ICONS[name]}</svg>')

def icfill(name, size=24, color="currentColor", style=""):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="{color}" stroke="{color}" '
            f'stroke-width="1.8" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0;{style}">{ICONS[name]}</svg>')

def helmet(P):
    return f"""<helmet>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&amp;display=swap" rel="stylesheet">
<style>
body{{margin:0;font-family:'Pretendard Variable',Pretendard,'Noto Sans KR',-apple-system,sans-serif;background:{P['bg']};color:{P['t1']};-webkit-font-smoothing:antialiased}}
a{{color:{P['accentText']};text-decoration:none}}a:hover{{color:{P['t1']}}}
button{{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}}
input{{font:inherit}}
</style>
</helmet>"""

def page(title, P, body, w=390, h=844, props=None, lang="ko"):
    props = props or {}
    props["$preview"] = {"width": w, "height": h}
    pj = json.dumps(props, ensure_ascii=False).replace("&", "&amp;").replace("'", "&#39;")
    return f"""<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
{helmet(P)}
<div style="width: {w}px; height: {h}px; box-sizing: border-box; display: flex; flex-direction: column; background: {P['bg']}; position: relative; overflow: hidden;">
{body}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{pj}'>
class Component extends DCLogic {{
  renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
"""

# ---------- shared pieces ----------
def header(P, title, actions, bg=None):
    bg = bg or P["surface"]
    btns = "".join(
        f'<button type="button" aria-label="{a[1]}" style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 22px; color: {P["t1"]};">{ic(a[0], 24)}</button>'
        for a in actions)
    return f"""<div style="height: 48px; background: {bg}; flex-shrink: 0;"></div>
<div style="height: 56px; padding: 0 12px 0 20px; background: {bg}; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;">
  <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.4px; color: {P['t1']};">{title}</h1>
  <div style="display: flex; align-items: center; gap: 4px;">{btns}</div>
</div>"""

def subheader(P, title, right=None):
    r = right or ""
    return f"""<div style="height: 48px; background: {P['surface']}; flex-shrink: 0;"></div>
<div style="height: 56px; padding: 0 12px 0 8px; background: {P['surface']}; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; border-bottom: 1px solid {P['divider']};">
  <div style="display: flex; align-items: center; gap: 4px;">
    <a href="Main.dc.html" aria-label="뒤로" style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; color: {P['t1']};">{ic('back')}</a>
    <h1 style="margin: 0; font-size: 18px; font-weight: 700; color: {P['t1']};">{title}</h1>
  </div>
  <div style="display: flex; align-items: center; gap: 4px;">{r}</div>
</div>"""

def segtabs(P, items, sel=0):
    cells = []
    for i, t in enumerate(items):
        on = i == sel
        cells.append(
            f'<button type="button" aria-pressed="{"true" if on else "false"}" style="flex: 1 1 0; height: 48px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: {700 if on else 500}; color: {P["t1"] if on else P["t3"]}; border-bottom: 2px solid {P["primary"] if on else "transparent"}; margin-bottom: -1px;">{t}</button>')
    return f'<div style="display: flex; padding: 0 12px; background: {P["surface"]}; border-bottom: 1px solid {P["divider"]}; flex-shrink: 0;">{"".join(cells)}</div>'

def tabbar(P, sel):
    items = [("news", "소식", "Main.dc.html"), ("people", "동문", "Alumni.dc.html"), ("heart", "기부", "Donation.dc.html"),
             ("msg", "쪽지", "Messages.dc.html"), ("person", "내정보", "MyPage.dc.html")]
    cells = []
    for i, (icon, label, href) in enumerate(items):
        on = i == sel
        col = P["navSel"] if on else P["navIdle"]
        badge = (f'<span style="position: absolute; top: 4px; right: 18px; min-width: 18px; height: 18px; padding: 0 5px; box-sizing: border-box; border-radius: 9px; background: {P["accent"]}; color: {P["onAccent"]}; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center;">2</span>'
                 if label == "쪽지" and not on else "")
        svg = icfill(icon, 24, col) if on and icon in ("heart", "person") else ic(icon, 24, col, 2 if on else 1.7)
        cells.append(
            f'<a href="{href}" aria-current="{"page" if on else "false"}" style="flex: 1 1 0; height: 56px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; color: {col}; position: relative;">{svg}<span style="font-size: 11px; font-weight: {700 if on else 500}; letter-spacing: -0.2px;">{label}</span>{badge}</a>')
    return f"""<nav aria-label="주요 탭" style="flex-shrink: 0; background: {P['surface']}; border-top: 1px solid {P['divider']}; padding-bottom: 24px;">
  <div style="display: flex;">{"".join(cells)}</div>
</nav>"""

def fab(P, icon, label, bottom=100):
    return f'<button type="button" aria-label="{label}" style="position: absolute; right: 20px; bottom: {bottom}px; width: 56px; height: 56px; border-radius: 28px; background: {P["accent"]}; color: {P["onAccent"]}; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 16px rgba(245,158,11,0.35);">{ic(icon, 26, P["onAccent"], 2)}</button>'

def chip(P, text, tone="accent"):
    if tone == "accent":
        return f'<span style="display: inline-flex; align-items: center; height: 20px; padding: 0 6px; border-radius: 4px; background: {P["accentSubtle"]}; color: {P["accentText"]}; font-size: 12px; font-weight: 700;">{text}</span>'
    if tone == "outline":
        return f'<span style="display: inline-flex; align-items: center; height: 20px; padding: 0 6px; border-radius: 4px; border: 1px solid {P["border"]}; color: {P["t2"]}; font-size: 12px; font-weight: 600;">{text}</span>'
    if tone == "primary":
        return f'<span style="display: inline-flex; align-items: center; height: 20px; padding: 0 7px; border-radius: 4px; background: {P["primary"]}; color: {P["onPrimary"]}; font-size: 12px; font-weight: 700;">{text}</span>'
    return f'<span style="display: inline-flex; align-items: center; height: 24px; padding: 0 10px; border-radius: 12px; border: 1px solid {P["border"]}; color: {P["t2"]}; font-size: 13px;">{text}</span>'

def avatar(P, initial, size=40, bg=None, fg=None):
    bg = bg or P["primary"]; fg = fg or P["onPrimary"]
    return f'<div aria-hidden="true" style="width: {size}px; height: {size}px; border-radius: {size//2}px; background: {bg}; color: {fg}; font-size: {int(size*0.4)}px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">{initial}</div>'

def bizcard(P, name, company, w=96, h=60):
    return f"""<div aria-hidden="true" style="width: {w}px; height: {h}px; border-radius: 4px; border: 1px solid {P['border']}; background: {P['surface2']}; padding: 7px 8px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; flex-shrink: 0;">
  <div style="display: flex; justify-content: space-between; align-items: baseline;"><span style="font-size: 9px; font-weight: 700; color: {P['t1']};">{name}</span><span style="font-size: 7px; font-weight: 700; color: {P['t3']}; letter-spacing: 0.3px;">{company}</span></div>
  <div style="height: 1px; background: {P['border']};"></div>
  <div style="display: flex; flex-direction: column; gap: 2px;"><span style="width: 44px; height: 3px; border-radius: 2px; background: {P['border']};"></span><span style="width: 62px; height: 3px; border-radius: 2px; background: {P['border']};"></span></div>
</div>"""

# ---------- FEED ----------
def feed_post(P, initial, name, role, when, body, likes, comments, views, liked=False, pinned=False, category=None, link=None, avatar_bg=None):
    pin_row = ""
    if pinned:
        pin_row = f'<div style="display: flex; align-items: center; gap: 6px; padding: 0 20px 10px; color: {P["accentText"]}; font-size: 12px; font-weight: 700;">{ic("pin", 14, P["accentText"], 2)}고정된 공지</div>'
    cat = chip(P, category, "primary") + " " if category else ""
    linkcard = ""
    if link:
        linkcard = f"""<div style="margin: 12px 20px 0; border: 1px solid {P['border']}; border-radius: 8px; overflow: hidden; display: flex; background: {P['surface2']};">
  <div style="width: 96px; height: 80px; background: {P['border']}; display: flex; align-items: center; justify-content: center; color: {P['t3']}; flex-shrink: 0;">{ic('news', 24, P['t3'])}</div>
  <div style="padding: 12px 14px; display: flex; flex-direction: column; justify-content: center; gap: 4px; min-width: 0;">
    <div style="font-size: 14px; font-weight: 700; color: {P['t1']}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{link[0]}</div>
    <div style="font-size: 12px; color: {P['t3']}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{link[1]}</div>
  </div>
</div>"""
    like_col = P["accentText"] if liked else P["t2"]
    like_svg = icfill("heart", 20, P["accentText"]) if liked else ic("heart", 20, P["t2"])
    return f"""<article style="background: {P['surface']}; padding: 16px 0 0; display: flex; flex-direction: column;">
  {pin_row}
  <div style="display: flex; align-items: center; gap: 12px; padding: 0 20px;">
    {avatar(P, initial, 40, avatar_bg)}
    <div style="flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 2px;">
      <div style="display: flex; align-items: center; gap: 6px;"><span style="font-size: 15px; font-weight: 700; color: {P['t1']};">{name}</span><span style="font-size: 12px; color: {P['t3']};">{when}</span></div>
      <div style="font-size: 13px; color: {P['t2']}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{role}</div>
    </div>
    <button type="button" aria-label="더 보기" style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: {P['t3']};">{ic('more', 20)}</button>
  </div>
  <div style="padding: 12px 20px 0; font-size: 16px; line-height: 26px; color: {P['t1']}; letter-spacing: -0.2px;">{cat}{body} <a href="#post" style="color: {P['accentText']}; font-weight: 600;">더보기</a></div>
  {linkcard}
  <div style="padding: 14px 20px 12px; font-size: 13px; color: {P['t2']}; display: flex; gap: 6px; align-items: center;">
    <span>좋아요 {likes}개</span><span style="color: {P['t4']};">·</span><span>댓글 {comments}개</span><span style="color: {P['t4']};">·</span><span>조회 {views}</span>
  </div>
  <div style="margin: 0 20px; height: 1px; background: {P['divider']};"></div>
  <div style="display: flex; height: 48px;">
    <button type="button" style="flex: 1 1 0; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 14px; font-weight: 600; color: {like_col};">{like_svg}좋아요</button>
    <button type="button" style="flex: 1 1 0; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 14px; font-weight: 600; color: {P['t2']};">{ic('comment', 20, P['t2'])}댓글</button>
    <button type="button" style="flex: 1 1 0; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 14px; font-weight: 600; color: {P['t2']};">{ic('share', 20, P['t2'])}공유</button>
  </div>
</article>"""

def feed_board(P):
    body = header(P, "소식", [("search", "검색"), ("bell", "알림")])
    body += segtabs(P, ["전체", "공지", "장학", "동문"], 0)
    body += f"""<div style="flex: 1 1 0; overflow: hidden; display: flex; flex-direction: column; gap: 8px; background: {P['bg']};">
  {feed_post(P, "장", "대일외고 장학회", "장학회 사무국", "9월 8일", "2026 장학증서 수여식에 동문 여러분을 초대합니다. 후배의 새로운 시작을 함께 응원해요.", 38, 12, 99, liked=True, pinned=True, category="공지", link=("2026 장학증서 수여식 안내", "10월 24일(토) 오후 2시 · 본교 대강당"))}
  {feed_post(P, "김", "김하늘", "20기 영어과 · 동문기업 기획팀장", "9월 6일", "후배들의 도전을 응원합니다. 장학생의 새로운 이야기를 만나보세요. 올해도 많은 분들이 함께해 주셨습니다.", 24, 3, 24, avatar_bg="#0D9488")}
</div>"""
    body += tabbar(P, 0)
    return page("소식", P, body)

# ---------- ALUMNI ----------
def alumni_row(P, name, cohort, line2, line3, company_tag, initial=None, avatar_bg=None, me=False):
    right = bizcard(P, name, company_tag) if not initial else avatar(P, initial, 48, avatar_bg)
    tag = chip(P, "본인", "outline") if me else chip(P, cohort, "accent")
    return f"""<a href="AlumniDetail.dc.html" style="display: flex; align-items: center; gap: 12px; padding: 16px 20px; color: inherit; border-bottom: 1px solid {P['divider']};">
  <div style="flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 4px;">
    <div style="display: flex; align-items: center; gap: 6px;"><span style="font-size: 18px; font-weight: 700; color: {P['t1']}; letter-spacing: -0.3px;">{name}</span>{tag}</div>
    <div style="font-size: 14px; color: {P['t2']}; line-height: 20px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{line2}</div>
    <div style="font-size: 14px; color: {P['t2']}; line-height: 20px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{line3}</div>
  </div>
  {right}
</a>"""

def alumni_board(P):
    body = header(P, "동문", [("search", "검색"), ("bell", "알림")])
    body += segtabs(P, ["전체 동문", "같은 기수", "같은 직종"], 0)
    body += f"""<div style="display: flex; align-items: center; justify-content: space-between; padding: 0 20px; height: 44px; background: {P['surface']}; border-bottom: 1px solid {P['divider']}; flex-shrink: 0;">
  <button type="button" style="display: flex; align-items: center; gap: 4px; font-size: 14px; font-weight: 600; color: {P['t1']};">전체 (1,284){ic('chevD', 16, P['t1'], 2)}</button>
  <div style="display: flex; align-items: center; gap: 16px;">
    <button type="button" style="display: flex; align-items: center; gap: 4px; font-size: 14px; color: {P['t1']};">{ic('sort', 16, P['t1'], 2)}기수순</button>
    <button type="button" style="display: flex; align-items: center; gap: 4px; font-size: 14px; color: {P['t1']};">{ic('search', 16, P['t1'], 2)}필터</button>
  </div>
</div>
<div style="flex: 1 1 0; overflow: hidden; background: {P['surface']}; display: flex; flex-direction: column;">
  {alumni_row(P, "김하늘", "20기", "기획팀장 / 영어과", "동문기업", "DFLH", me=True)}
  {alumni_row(P, "우정환", "18기", "Web Engineer / 개발실", "로버트 글로벌 Inc.", "robert.")}
  {alumni_row(P, "김대한", "22기", "AI Lab 연구원 / 중국어과", "MET DATA LAB", "MET")}
  {alumni_row(P, "김희은", "15기", "Senior Marketer / 마케팅팀", "ASANE", "ASANE")}
  {alumni_row(P, "고민찬", "24기", "디자이너 / 일본어과", "EMEBER", "EMEBER", initial="고", avatar_bg="#7C3AED")}
  {alumni_row(P, "김수진", "19기", "Web Engineer / 프랑스어과", "(주)KOKOA", "KOKOA")}
</div>"""
    body += tabbar(P, 1)
    return page("동문", P, body)

# ---------- ALUMNI DETAIL ----------
def kv(P, k, v, private=False):
    badge = f'<span style="font-size: 11px; font-weight: 600; color: {P["t3"]}; border: 1px solid {P["border"]}; border-radius: 4px; padding: 1px 6px;">비공개</span>' if private else ""
    return f'<div style="display: flex; align-items: center; gap: 12px; height: 44px;"><span style="width: 64px; font-size: 14px; color: {P["t3"]}; flex-shrink: 0;">{k}</span><span style="flex: 1 1 0; font-size: 15px; color: {P["t1"]};">{v}</span>{badge}</div>'

def alumni_detail_board(P):
    more = f'<button type="button" aria-label="더 보기" style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; color: {P["t1"]};">{ic("more")}</button>'
    body = subheader(P, "동문 프로필", more)
    body += f"""<div style="flex: 1 1 0; overflow: hidden; display: flex; flex-direction: column; gap: 8px; background: {P['bg']};">
  <section style="background: {P['surface']}; padding: 24px 20px 20px; display: flex; flex-direction: column; align-items: center; gap: 12px;">
    {avatar(P, "우", 80, "#0D9488")}
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <div style="display: flex; align-items: center; gap: 8px;"><span style="font-size: 22px; font-weight: 700; color: {P['t1']}; letter-spacing: -0.4px;">우정환</span>{chip(P, "18기", "accent")}</div>
      <div style="font-size: 15px; color: {P['t2']};">Web Engineer | 개발실</div>
      <div style="font-size: 15px; color: {P['t2']};">로버트 글로벌 Inc.</div>
    </div>
    <div style="display: flex; gap: 8px; width: 100%; margin-top: 4px;">
      <a href="MessageThread.dc.html" style="flex: 1 1 0; height: 44px; border-radius: 8px; background: {P['primary']}; color: {P['onPrimary']}; font-size: 15px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px;">{ic('msg', 18, P['onPrimary'], 2)}쪽지 보내기</a>
      <button type="button" style="flex: 1 1 0; height: 44px; border-radius: 8px; border: 1px solid {P['border']}; color: {P['t1']}; font-size: 15px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px;">{ic('card', 18, P['t1'], 2)}명함 보기</button>
    </div>
  </section>
  <section style="background: {P['surface']}; padding: 16px 20px;">
    <h2 style="margin: 0 0 8px; font-size: 15px; font-weight: 700; color: {P['t1']};">학교</h2>
    {kv(P, "기수", "18기 (2008년 졸업)")}{kv(P, "학과", "영어과")}
  </section>
  <section style="background: {P['surface']}; padding: 16px 20px;">
    <h2 style="margin: 0 0 8px; font-size: 15px; font-weight: 700; color: {P['t1']};">직장</h2>
    {kv(P, "직종", "IT · 개발")}{kv(P, "회사", "로버트 글로벌 Inc.")}{kv(P, "주소", "서울 강남구 테헤란로 134")}
  </section>
  <section style="background: {P['surface']}; padding: 16px 20px;">
    <h2 style="margin: 0 0 8px; font-size: 15px; font-weight: 700; color: {P['t1']};">연락처</h2>
    {kv(P, "휴대폰", "010-••••-••••", private=True)}{kv(P, "이메일", "woo@robert.com")}
  </section>
  <section style="background: {P['surface']}; padding: 16px 20px; display: flex; flex-direction: column; gap: 10px;">
    <h2 style="margin: 0; font-size: 15px; font-weight: 700; color: {P['t1']};">전문분야 · 태그</h2>
    <div style="display: flex; flex-wrap: wrap; gap: 8px;">{chip(P, "#백엔드", "tag")}{chip(P, "#스타트업", "tag")}{chip(P, "#멘토링", "tag")}</div>
  </section>
</div>"""
    return page("동문 프로필", P, body)

# ---------- DONATION ----------
def tree_svg(P, size=120):
    return f"""<svg width="{size}" height="{size}" viewBox="0 0 120 120" aria-hidden="true">
  <ellipse cx="60" cy="108" rx="34" ry="6" fill="rgba(0,0,0,0.08)"/>
  <path d="M40 92h40l-4 18H44z" fill="#C97239"/><path d="M38 86h44v8H38z" fill="#F0AD7A"/>
  <path d="M58 86V56" stroke="#6B4226" stroke-width="6" stroke-linecap="round"/>
  <circle cx="60" cy="44" r="26" fill="#7CBB4E"/><circle cx="44" cy="52" r="16" fill="#5C9438"/><circle cx="74" cy="34" r="16" fill="#B8E68C"/>
  <circle cx="50" cy="36" r="5" fill="#FF8FAE"/><circle cx="70" cy="52" r="5" fill="#FF8FAE"/><circle cx="62" cy="24" r="4" fill="#FFD3E0"/>
</svg>"""

def donation_board(P):
    body = header(P, "기부", [("bell", "알림")])
    body += f"""<div style="flex: 1 1 0; overflow: hidden; display: flex; flex-direction: column; gap: 8px; background: {P['bg']};">
  <section style="background: {P['surface']}; padding: 20px 20px 20px; display: flex; flex-direction: column; gap: 16px;">
    <div style="font-size: 13px; font-weight: 600; color: {P['t3']}; letter-spacing: 0.2px;">장학회 전체 누적 기부</div>
    <div style="display: flex; align-items: baseline; gap: 4px;"><span style="font-size: 34px; font-weight: 700; color: {P['t1']}; letter-spacing: -1px;">128,450,000</span><span style="font-size: 18px; font-weight: 600; color: {P['t2']};">원</span></div>
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <div style="height: 8px; border-radius: 4px; background: {P['divider']}; overflow: hidden;"><div style="width: 64%; height: 100%; border-radius: 4px; background: {P['accent']};"></div></div>
      <div style="display: flex; justify-content: space-between; font-size: 13px; color: {P['t2']};"><span>목표 200,000,000원</span><span style="font-weight: 700; color: {P['accentText']};">64%</span></div>
    </div>
    <div style="display: flex; gap: 8px;">
      <div style="flex: 1 1 0; padding: 12px 14px; border-radius: 8px; background: {P['surface2']}; border: 1px solid {P['border']}; display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 12px; color: {P['t3']};">이번 달 기부액</span><span style="font-size: 18px; font-weight: 700; color: {P['t1']}; letter-spacing: -0.3px;">4,200,000원</span></div>
      <div style="flex: 1 1 0; padding: 12px 14px; border-radius: 8px; background: {P['surface2']}; border: 1px solid {P['border']}; display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 12px; color: {P['t3']};">계좌 잔액</span><span style="font-size: 18px; font-weight: 700; color: {P['t1']}; letter-spacing: -0.3px;">86,120,000원</span></div>
    </div>
    <div style="font-size: 12px; color: {P['t4']};">계좌 잔액 기준일 2026.09.20 · 장학회 관리자 입력</div>
  </section>
  <section style="background: {P['surface']}; padding: 20px; display: flex; align-items: center; gap: 16px;">
    {tree_svg(P, 104)}
    <div style="flex: 1 1 0; display: flex; flex-direction: column; gap: 6px;">
      <div style="display: flex; align-items: center; gap: 6px;"><span style="font-size: 13px; font-weight: 600; color: {P['t3']};">내 나무</span>{chip(P, "5단계 · 개화", "accent")}</div>
      <div style="font-size: 20px; font-weight: 700; color: {P['t1']}; letter-spacing: -0.4px;">꽃이 피었어요</div>
      <div style="font-size: 14px; color: {P['t2']}; line-height: 20px;">나의 누적 기부 1,250,000원<br>다음 단계까지 250,000원</div>
    </div>
  </section>
  <section style="background: {P['surface']}; padding: 16px 20px 20px; display: flex; flex-direction: column; gap: 12px;">
    <button type="button" style="height: 52px; border-radius: 8px; background: {P['primary']}; color: {P['onPrimary']}; font-size: 16px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px;">{ic('heart', 20, P['onPrimary'], 2)}해피나눔에서 기부하기</button>
    <div style="font-size: 12px; color: {P['t3']}; text-align: center; line-height: 18px;">해피나눔 사이트를 기본 브라우저에서 엽니다.<br>앱으로 돌아오면 기부 현황을 다시 확인합니다.</div>
  </section>
</div>"""
    body += tabbar(P, 2)
    return page("기부", P, body)

# ---------- MESSAGES ----------
def convo_row(P, initial, name, preview, when, unread=0, bg=None):
    badge = (f'<span style="min-width: 20px; height: 20px; padding: 0 6px; box-sizing: border-box; border-radius: 10px; background: {P["accent"]}; color: {P["onAccent"]}; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center;">{unread}</span>'
             if unread else "")
    name_w = 700 if unread else 600
    prev_col = P["t1"] if unread else P["t3"]
    return f"""<a href="MessageThread.dc.html" style="display: flex; align-items: center; gap: 14px; padding: 14px 20px; color: inherit; border-bottom: 1px solid {P['divider']};">
  {avatar(P, initial, 48, bg)}
  <div style="flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 4px;">
    <div style="display: flex; align-items: center; justify-content: space-between;"><span style="font-size: 16px; font-weight: {name_w}; color: {P['t1']};">{name}</span><span style="font-size: 12px; color: {P['t3']};">{when}</span></div>
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;"><span style="font-size: 14px; color: {prev_col}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{preview}</span>{badge}</div>
  </div>
</a>"""

def messages_board(P):
    body = header(P, "쪽지", [("search", "검색"), ("bell", "알림")])
    body += segtabs(P, ["전체", "안 읽음"], 0)
    body += f"""<div style="flex: 1 1 0; overflow: hidden; background: {P['surface']}; display: flex; flex-direction: column;">
  {convo_row(P, "김", "김하늘", "행사에서 뵙겠습니다!", "오전 9:32", 1)}
  {convo_row(P, "이", "이서준", "안녕하세요, 동문님.", "어제", 1, "#0D9488")}
  {convo_row(P, "박", "박지우", "좋은 소식 감사합니다.", "어제", 0, "#7C3AED")}
  {convo_row(P, "정", "정다은", "다음 모임도 기대됩니다.", "9월 20일", 0, "#BE185D")}
  {convo_row(P, "최", "최민준", "연락 주셔서 감사합니다.", "9월 18일", 0, "#EA7316")}
</div>"""
    body += fab(P, "pen", "새 쪽지")
    body += tabbar(P, 3)
    return page("쪽지", P, body)

def bubble(P, text, mine, when):
    if mine:
        return f'<div style="display: flex; justify-content: flex-end; align-items: flex-end; gap: 6px;"><span style="font-size: 11px; color: {P["t3"]};">{when}</span><div style="max-width: 260px; padding: 10px 14px; border-radius: 16px 16px 4px 16px; background: {P["primary"]}; color: {P["onPrimary"]}; font-size: 15px; line-height: 22px;">{text}</div></div>'
    return f'<div style="display: flex; justify-content: flex-start; align-items: flex-end; gap: 6px;"><div style="max-width: 260px; padding: 10px 14px; border-radius: 16px 16px 16px 4px; background: {P["surface"]}; border: 1px solid {P["border"]}; color: {P["t1"]}; font-size: 15px; line-height: 22px;">{text}</div><span style="font-size: 11px; color: {P["t3"]};">{when}</span></div>'

def thread_board(P):
    right = f'<button type="button" aria-label="더 보기" style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; color: {P["t1"]};">{ic("more")}</button>'
    body = f"""<div style="height: 48px; background: {P['surface']}; flex-shrink: 0;"></div>
<div style="height: 56px; padding: 0 12px 0 8px; background: {P['surface']}; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; border-bottom: 1px solid {P['divider']};">
  <div style="display: flex; align-items: center; gap: 4px;">
    <a href="Messages.dc.html" aria-label="뒤로" style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; color: {P['t1']};">{ic('back')}</a>
    {avatar(P, "김", 32)}
    <div style="display: flex; flex-direction: column; margin-left: 6px;"><span style="font-size: 16px; font-weight: 700; color: {P['t1']};">김하늘</span><span style="font-size: 12px; color: {P['t3']};">20기 영어과 · 동문기업</span></div>
  </div>
  {right}
</div>
<div style="flex: 1 1 0; overflow: hidden; padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; background: {P['bg']};">
  <div style="align-self: center; font-size: 12px; color: {P['t3']}; background: {P['surface']}; border: 1px solid {P['border']}; border-radius: 12px; padding: 3px 10px; margin-bottom: 6px;">9월 23일 화요일</div>
  {bubble(P, "안녕하세요 하늘 선배님, 이번 수여식에 참석하시나요?", True, "오전 9:12")}
  {bubble(P, "네, 참석합니다. 후배들 얼굴 오래 못 봐서 기대돼요.", False, "오전 9:20")}
  {bubble(P, "혹시 행사 끝나고 시간 되시면 커피 한 잔 어떠세요?", True, "오전 9:25")}
  {bubble(P, "좋아요! 행사에서 뵙겠습니다!", False, "오전 9:32")}
</div>
<div style="flex-shrink: 0; background: {P['surface']}; border-top: 1px solid {P['divider']}; padding: 10px 12px 34px; display: flex; align-items: center; gap: 8px;">
  <label for="compose" style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0);">쪽지 입력</label>
  <input id="compose" type="text" placeholder="쪽지를 입력하세요" style="flex: 1 1 0; height: 44px; border-radius: 22px; border: 1px solid {P['border']}; background: {P['surface2']}; padding: 0 16px; font-size: 15px; color: {P['t1']}; outline: none; box-sizing: border-box;">
  <button type="button" aria-label="보내기" style="width: 44px; height: 44px; border-radius: 22px; background: {P['primary']}; color: {P['onPrimary']}; display: flex; align-items: center; justify-content: center;">{ic('send', 20, P['onPrimary'], 2)}</button>
</div>"""
    return page("쪽지 대화", P, body)

# ---------- MY PAGE ----------
def settings_row(P, icon, label, sub=None, danger=False, last=False):
    col = P["error"] if danger else P["t1"]
    subhtml = f'<span style="font-size: 13px; color: {P["t3"]};">{sub}</span>' if sub else ""
    chev = "" if danger else ic("chevR", 18, P["t4"])
    bb = "" if last else f"border-bottom: 1px solid {P['divider']};"
    return f'<button type="button" style="display: flex; align-items: center; gap: 12px; height: 54px; padding: 0 20px; width: 100%; box-sizing: border-box; text-align: left; {bb}">{ic(icon, 20, col)}<span style="flex: 1 1 0; font-size: 15px; font-weight: 500; color: {col};">{label}</span>{subhtml}{chev}</button>'

def mypage_board(P):
    body = header(P, "내정보", [("bell", "알림"), ("gear", "설정")])
    body += f"""<div style="flex: 1 1 0; overflow: hidden; display: flex; flex-direction: column; gap: 8px; background: {P['bg']};">
  <section style="background: {P['surface']}; padding: 20px 20px 16px; display: flex; flex-direction: column; gap: 16px;">
    <div style="display: flex; align-items: center; gap: 16px;">
      {avatar(P, "김", 64)}
      <div style="flex: 1 1 0; display: flex; flex-direction: column; gap: 3px;">
        <div style="display: flex; align-items: center; gap: 8px;"><span style="font-size: 22px; font-weight: 700; color: {P['t1']}; letter-spacing: -0.4px;">김하늘</span>{chip(P, "20기", "accent")}</div>
        <div style="font-size: 14px; color: {P['t2']};">기획팀장 | 동문기업</div>
        <div style="font-size: 14px; color: {P['t2']};">영어과</div>
      </div>
      <a href="#edit" aria-label="프로필 수정" style="width: 40px; height: 40px; border-radius: 20px; border: 1px solid {P['border']}; display: flex; align-items: center; justify-content: center; color: {P['t1']};">{ic('pen', 18)}</a>
    </div>
    <div style="font-size: 15px; line-height: 22px; color: {P['t1']};">함께 배우고 나누는 동문이 되고 싶어요.</div>
    <div style="display: flex; flex-wrap: wrap; gap: 8px;">{chip(P, "#기획", "tag")}{chip(P, "#교육", "tag")}{chip(P, "#멘토링", "tag")}</div>
  </section>
  <section style="background: {P['surface']};">
    <div style="display: flex; align-items: center; gap: 12px; height: 48px; padding: 0 20px; border-bottom: 1px solid {P['divider']};">{ic('phone', 20, P['t3'])}<span style="flex: 1 1 0; font-size: 15px; color: {P['t1']};">010-0000-0000</span>{chip(P, "비공개", "outline")}</div>
    <div style="display: flex; align-items: center; gap: 12px; height: 48px; padding: 0 20px;">{ic('mail', 20, P['t3'])}<span style="flex: 1 1 0; font-size: 15px; color: {P['t1']};">visual.dflh@local</span>{chip(P, "공개", "outline")}</div>
  </section>
  <section style="background: {P['surface']}; display: flex; flex-direction: column;">
    {settings_row(P, "lock", "비밀번호 변경")}
    {settings_row(P, "link", "로그인 연동", "카카오")}
    {settings_row(P, "bell", "알림 설정")}
    {settings_row(P, "shield", "개인정보 설정")}
    {settings_row(P, "logout", "로그아웃", danger=True, last=True)}
  </section>
  <div style="padding: 8px 20px; font-size: 11px; color: {P['t4']}; text-align: center;">COPYRIGHT ⓒ 대일외국어고등학교 장학회 ALL RIGHT RESERVED.</div>
</div>"""
    body += tabbar(P, 4)
    return page("내정보", P, body)

# ---------- COMPONENTS / PALETTE ----------
def swatch(P, hexv, name, role):
    fg = "#FFFFFF" if hexv.lower() in ("#1a1a2e", "#14141c", "#1e1e2a", "#b45309", "#dc2626", "#047857", "#555555", "#0f1b35") else "#1A1A2E"
    return f"""<div style="display: flex; flex-direction: column; gap: 6px; width: 132px;">
  <div style="height: 64px; border-radius: 8px; background: {hexv}; border: 1px solid #E8E5DF; display: flex; align-items: flex-end; padding: 8px; box-sizing: border-box; color: {fg}; font-size: 11px; font-family: ui-monospace, Menlo, monospace;">{hexv}</div>
  <div style="font-size: 12px; font-weight: 700; color: #1A1A2E;">{name}</div>
  <div style="font-size: 11px; color: #555555; line-height: 15px;">{role}</div>
</div>"""

def components_board(P):
    L = LIGHT
    body = f"""<div style="padding: 40px 48px; display: flex; flex-direction: column; gap: 32px; height: 100%; box-sizing: border-box; overflow: hidden;">
  <div style="display: flex; flex-direction: column; gap: 6px;">
    <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: {L['t1']}; letter-spacing: -0.5px;">브랜드 팔레트 &amp; 시맨틱 토큰</h1>
    <p style="margin: 0; font-size: 14px; color: {L['t2']};">리멤버의 오렌지 자리에 기존 브랜드 앰버를, 검정 자리에 브랜드 네이비를 대입. 값은 <span style="font-family: ui-monospace, Menlo, monospace;">design-tokens.json</span>의 <span style="font-family: ui-monospace, Menlo, monospace;">brand.*</span> 팔레트에서 시맨틱 alias로 참조 → 나중에 팔레트만 바꾸면 전체 반영.</p>
  </div>
  <div style="display: flex; gap: 40px;">
    <div style="display: flex; flex-direction: column; gap: 14px;">
      <div style="font-size: 12px; font-weight: 700; color: {L['t3']}; letter-spacing: 1px;">BRAND PALETTE (라이트)</div>
      <div style="display: flex; gap: 16px;">
        {swatch(L, "#1A1A2E", "brand.primary", "헤더 타이틀, 탭 언더라인, 기본 버튼, 말풍선(내)")}
        {swatch(L, "#F59E0B", "brand.accent", "FAB, 미읽음 뱃지, 진행바, 좋아요 활성")}
        {swatch(L, "#B45309", "brand.accentText", "앰버 텍스트(더보기, 기수 칩 글자) · 대비 4.5:1")}
        {swatch(L, "#FFFBEB", "brand.accentSubtle", "기수 칩 배경, 강조 배경")}
        {swatch(L, "#FFFFFF", "surface", "리스트/카드 면 (리멤버식 화이트)")}
        {swatch(L, "#F5F4F0", "background", "카드 사이 간격 배경")}
        {swatch(L, "#E8E5DF", "border", "썸네일/버튼 외곽선")}
        {swatch(L, "#F0EDE8", "divider", "행 구분선")}
      </div>
    </div>
  </div>
  <div style="display: flex; gap: 40px;">
    <div style="display: flex; flex-direction: column; gap: 14px;">
      <div style="font-size: 12px; font-weight: 700; color: {L['t3']}; letter-spacing: 1px;">TEXT</div>
      <div style="display: flex; gap: 16px;">
        {swatch(L, "#1A1A2E", "text.primary", "이름, 제목, 본문")}
        {swatch(L, "#555555", "text.secondary", "직함/회사, 메타")}
        {swatch(L, "#888888", "text.tertiary", "시간, 비활성 탭")}
        {swatch(L, "#DC2626", "error", "로그아웃, 오류")}
      </div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 14px;">
      <div style="font-size: 12px; font-weight: 700; color: {L['t3']}; letter-spacing: 1px;">DARK SCHEME</div>
      <div style="display: flex; gap: 16px;">
        {swatch(L, "#14141C", "background", "다크 배경")}
        {swatch(L, "#1E1E2A", "surface", "다크 면")}
        {swatch(L, "#FBBF6A", "accent", "다크 앰버 (primary 역할도 겸함)")}
        {swatch(L, "#F5F4F0", "text.primary", "다크 본문")}
      </div>
    </div>
  </div>
  <div style="display: flex; flex-direction: column; gap: 14px;">
    <div style="font-size: 12px; font-weight: 700; color: {L['t3']}; letter-spacing: 1px;">공통 컴포넌트</div>
    <div style="display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap;">
      <div style="width: 390px; border: 1px solid {L['border']}; border-radius: 8px; overflow: hidden; background: {L['surface']};">
        <div style="height: 56px; padding: 0 12px 0 20px; display: flex; align-items: center; justify-content: space-between;"><span style="font-size: 24px; font-weight: 700; color: {L['t1']};">헤더 타이틀</span><div style="display: flex; gap: 4px; color: {L['t1']};"><span style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">{ic('search')}</span><span style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">{ic('bell')}</span></div></div>
        {segtabs(L, ["선택 탭", "탭", "탭"], 0)}
        <div style="padding: 8px 0 0;">{alumni_row(L, "이름 18/700", "20기", "직함 / 학과 14 · secondary", "회사 14 · secondary", "LOGO")}</div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 16px; width: 300px;">
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">{chip(L, "20기", "accent")}{chip(L, "본인", "outline")}{chip(L, "공지", "primary")}{chip(L, "#태그", "tag")}<span style="min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px; background: {L['accent']}; color: {L['onAccent']}; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center;">3</span></div>
        <div style="height: 52px; border-radius: 8px; background: {L['primary']}; color: {L['onPrimary']}; font-size: 16px; font-weight: 700; display: flex; align-items: center; justify-content: center;">Primary 버튼 52 / r8</div>
        <div style="height: 44px; border-radius: 8px; border: 1px solid {L['border']}; color: {L['t1']}; font-size: 15px; font-weight: 600; display: flex; align-items: center; justify-content: center;">Secondary 버튼 44 / r8</div>
        <div style="display: flex; align-items: center; gap: 12px;"><div style="width: 56px; height: 56px; border-radius: 28px; background: {L['accent']}; color: {L['onAccent']}; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 16px rgba(245,158,11,0.35);">{ic('pen', 26, L['onAccent'], 2)}</div><span style="font-size: 13px; color: {L['t2']}; line-height: 18px;">FAB 56 · accent<br>쪽지 새 글 / 동문 명함 등록</span></div>
        <div style="font-size: 13px; color: {L['t2']}; line-height: 20px;">타이포: Pretendard(앱 내장) · 헤더 24/700 · 이름 18/700 · 본문 16/26 · 메타 13~14 · 캡션 11~12<br>라운드: 카드 0(플랫 섹션) · 버튼 8 · 칩 4 · 썸네일 4 · 아바타 full<br>간격: 좌우 20 · 행 상하 14~16 · 섹션 간 8(bg 노출)</div>
      </div>
      <div style="width: 390px; border: 1px solid {L['border']}; border-radius: 8px; overflow: hidden; background: {L['surface']};">{tabbar(L, 0)}</div>
    </div>
  </div>
</div>"""
    return page("팔레트 & 컴포넌트", L, body, w=1280, h=980)

# ---------- write ----------
boards = {
    "Main.dc.html": (feed_board(LIGHT), 0, 0, 390, 844, "소식 (뉴스피드)"),
    "Alumni.dc.html": (alumni_board(LIGHT), 470, 0, 390, 844, "동문 (회원목록)"),
    "Donation.dc.html": (donation_board(LIGHT), 940, 0, 390, 844, "기부"),
    "Messages.dc.html": (messages_board(LIGHT), 1410, 0, 390, 844, "쪽지"),
    "MyPage.dc.html": (mypage_board(LIGHT), 1880, 0, 390, 844, "내정보 (마이페이지)"),
    "AlumniDetail.dc.html": (alumni_detail_board(LIGHT), 0, 964, 390, 844, "동문 프로필 상세"),
    "MessageThread.dc.html": (thread_board(LIGHT), 470, 964, 390, 844, "쪽지 대화"),
    "FeedDark.dc.html": (feed_board(DARK), 1410, 964, 390, 844, "소식 · 다크"),
    "AlumniDark.dc.html": (alumni_board(DARK), 1880, 964, 390, 844, "동문 · 다크"),
    "Components.dc.html": (components_board(LIGHT), 0, 1928, 1280, 980, "팔레트 & 컴포넌트"),
}
for name, (html, *_rest) in boards.items():
    with open(os.path.join(ROOT, name), "w", encoding="utf-8") as f:
        f.write(html)

now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
canvas = {
    "v": 3,
    "createdOnFiles": {"v": 1, "at": now},
    "title": "DFLH 리멤버 스타일 UI",
    "launch": {"view": "canvas"},
    "pages": [],
    "boards": {n: {"x": b[1], "y": b[2], "w": b[3], "h": b[4], "title": b[5], "is_interactive": True} for n, b in boards.items()},
    "order": list(boards.keys()),
    "notes": {
        "row1": {"x": 0, "y": -300, "text": "1. 메인 탭 5개 · 라이트 (리멤버 스타일 적용, 브랜드 컬러 유지)", "kind": "title1", "maxW": 2270},
        "row2": {"x": 0, "y": 664, "text": "2. 서브 화면 (프로필 상세 · 대화) + 다크 모드", "kind": "title1", "maxW": 2270},
        "row3": {"x": 0, "y": 1628, "text": "3. 브랜드 팔레트 · 시맨틱 토큰 · 공통 컴포넌트", "kind": "title1", "maxW": 1280},
        "s2": {"x": 940, "y": 1400, "w": 380, "fill": "blue", "text": "기부 화면 데이터 구성 (확정)\n• 전체 누적 기부 (big number)\n• 목표액 + 달성률 진행바\n• 이번 달 기부액\n• 계좌 잔액 ← 신규. 관리자 페이지에서 수동 입력·저장 → 앱은 기부 요약 API에서 balance / balanceAsOf 필드로 조회. 값이 없으면 카드 숨김.\n• 참여 동문 수는 표시하지 않음"},
        "s1": {"x": 940, "y": 964, "w": 380, "fill": "orange", "text": "리멤버에서 가져온 것\n• 큰 좌측 타이틀 + 우측 아이콘 액션 헤더 (서브타이틀 제거)\n• 텍스트 세그먼트 탭 + 2px 언더라인\n• '전체 (N) ⌄' 필터 행 + 우측 정렬/필터\n• 이름 18 bold + 기수 칩, 직함/학과·회사 2줄, 우측 명함 썸네일\n• 피드: 아바타+이름+시간, 본문, '좋아요 N개 · 댓글 N개', 3분할 액션바\n• 화이트 면 + 8px 배경 간격으로 섹션 구분 (둥근 카드 제거)\n• 앰버 FAB (리멤버 오렌지 카메라 FAB 대응)\n\n유지한 것\n• 네이비 primary / 앰버 accent 브랜드 컬러\n• 5탭 구조와 기능, 기부 나무 일러스트\n• Pretendard 서체, 기존 다크 스킴 값"},
    },
    "designSystems": [],
}
with open(os.path.join(ROOT, "canvas.json"), "w", encoding="utf-8") as f:
    json.dump(canvas, f, ensure_ascii=False, indent=2)
print("wrote", len(boards), "boards to", ROOT)
