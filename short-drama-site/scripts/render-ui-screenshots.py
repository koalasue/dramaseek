from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import math

OUT = Path("outputs")
OUT.mkdir(exist_ok=True)

BG = "#f4f3ef"
SURFACE = "#fbfaf7"
STRONG = "#ebe9e2"
INK = "#171816"
MUTED = "#666861"
LINE = "#d8d6ce"
ACCENT = "#c84f42"
WHITE = "#fffaf5"
RED = "#b63129"

def font(size, bold=False):
    candidates = [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size, index=1 if bold and path.endswith(".ttc") else 0)
        except Exception:
            pass
    return ImageFont.load_default()

F = {k: font(*v) for k, v in {
    "xs": (11, False), "sm": (12, False), "base": (14, False), "md": (16, False),
    "lg": (18, True), "xl": (22, True), "title": (28, True), "bold": (14, True), "small_bold": (12, True)
}.items()}

dramas = [
    ("The Double Life of My Billionaire Husband", "ReelShort", "Romance", "50 Episodes", 96, "↑ Rising"),
    ("My Mafia Husband", "ReelShort", "Mafia", "80 Episodes", 94, "↑ Rising"),
    ("Never Divorce a Secret Billionaire Heiress", "DramaBox", "CEO", "72 Episodes", 91, "Stable"),
    ("Fated to My Forbidden Alpha", "NetShort", "Werewolf", "63 Episodes", 89, "↑ Rising"),
    ("The CEO's Mute Bride", "ShortMax", "Marriage", "61 Episodes", 86, "Stable"),
    ("Goodbye, My CEO", "GoodShort", "Revenge", "45 Episodes", 82, "↓ Cooling"),
    ("Contract Marriage With The Billionaire", "FlexTV", "Billionaire", "70 Episodes", 80, "Stable"),
    ("Hidden Heiress Returns", "DramaBox", "Revenge", "58 Episodes", 78, "↑ Rising"),
]

def rr(draw, box, r=12, fill=SURFACE, outline=LINE, width=1):
    draw.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)

def text(draw, xy, s, f="base", fill=INK, max_w=None):
    if max_w is None:
        draw.text(xy, s, font=F[f], fill=fill)
        return draw.textbbox(xy, s, font=F[f])[3]
    x, y = xy
    words = s.split(" ")
    line = ""
    lines = []
    for w in words:
        test = (line + " " + w).strip()
        if draw.textlength(test, font=F[f]) <= max_w or not line:
            line = test
        else:
            lines.append(line)
            line = w
        if len(lines) == 2:
            break
    if line and len(lines) < 2:
        lines.append(line)
    for i, line in enumerate(lines[:2]):
        if i == 1 and len(words) > len(" ".join(lines).split(" ")):
            while draw.textlength(line + "…", font=F[f]) > max_w and len(line) > 3:
                line = line[:-1]
            line += "…"
        draw.text((x, y + i * (F[f].size + 4)), line, font=F[f], fill=fill)
    return y + len(lines[:2]) * (F[f].size + 4)

def cover(draw, box, i, title):
    x1, y1, x2, y2 = box
    colors = [("#2f1f1b","#c84f42"),("#182033","#6478b8"),("#241a2d","#b665a2"),("#1f2a22","#d6a857"),("#2b2029","#e26b5e"),("#17232c","#73a7b8")]
    c1, c2 = colors[i % len(colors)]
    # vertical simple gradient
    h = y2-y1
    for yy in range(y1, y2):
        t = (yy-y1)/max(1,h)
        def mix(a,b):
            return int(int(a,16)*(1-t)+int(b,16)*t)
        col = "#" + "".join(f"{mix(c1[j:j+2], c2[j:j+2]):02x}" for j in (1,3,5))
        draw.line((x1, yy, x2, yy), fill=col)
    draw.rounded_rectangle(box, radius=9, outline=None)
    draw.ellipse((x2-42, y1+12, x2+12, y1+66), fill=(255,255,255,45))
    draw.rounded_rectangle((x1+10,y1+18,x1+48,y1+76), radius=10, fill=(255,255,255,36))
    short = " ".join(title.split()[:2])
    text(draw, (x1+8, y2-42), short, "small_bold", WHITE, max_w=(x2-x1)-16)
    draw.text((x1+8, y2-18), "SHORT DRAMA", font=F["xs"], fill="#efe8df")

def pill(draw, x, y, label, active=False):
    w = int(draw.textlength(label, font=F["xs"])) + 16
    rr(draw, (x,y,x+w,y+22), 6, ACCENT if active else STRONG, None)
    draw.text((x+8,y+5), label, font=F["xs"], fill=WHITE if active else MUTED)
    return x+w+6

def header(draw, W, margin):
    draw.line((0,54,W,54), fill=LINE)
    rr(draw, (margin,11,margin+32,43), 8, ACCENT, None)
    draw.text((margin+10,17), "⌕", font=F["md"], fill=WHITE)
    draw.text((margin+42,18), "短剧寻址", font=F["bold"], fill=INK)
    if W > 700:
        x = W - margin - 345
        for item in ["搜索","排行榜","提交资源","授权下载","收录原则"]:
            draw.text((x,20), item, font=F["sm"], fill=MUTED)
            x += int(draw.textlength(item, font=F["sm"])) + 24

def actions(draw, W, margin, y, active=0):
    gap = 8
    card_w = (W - margin*2 - gap*2)//3
    labels = [("搜索海外短剧","实时查找正片来源","⌕"),("平台短剧排行榜","按平台发现热门短剧","▥"),("授权内容下载","保存自有媒体文件","⇩")]
    for i,(label,detail,icon) in enumerate(labels):
        x = margin + i*(card_w+gap)
        rr(draw, (x,y,x+card_w,y+58), 12, ACCENT if i==active else SURFACE, None if i==active else LINE)
        rr(draw, (x+8,y+11,x+44,y+47), 9, (255,255,255,38) if i==active else STRONG, None)
        draw.text((x+20,y+18), icon, font=F["sm"], fill=WHITE if i==active else INK)
        draw.text((x+52,y+12), label, font=F["small_bold"], fill=WHITE if i==active else INK)
        if card_w > 115:
            draw.text((x+52,y+34), detail, font=F["xs"], fill="#f2d8d2" if i==active else MUTED)

def search_ui(draw, W, margin, y):
    rr(draw, (margin,y,W-margin,y+44), 12, SURFACE, LINE)
    draw.text((margin+12,y+12), "⌕", font=F["base"], fill=MUTED)
    draw.text((margin+36,y+13), "输入剧名、英文名、关键词或类型", font=F["base"], fill="#8c8d86")
    y += 56
    x = margin
    for i,label in enumerate(["全部 (24)","ReelShort (8)","DramaBox (6)","NetShort (4)","ShortMax (3)"]):
        x = pill(draw, x, y, label, i==0)
    return y+36

def card(draw, x, y, w, drama, i):
    rr(draw, (x,y,x+w,y+124), 12, SURFACE, LINE)
    cover(draw, (x+10,y+12,x+80,y+112), i, drama[0])
    tx = x + 92
    mx = pill(draw, tx, y+12, drama[1])
    draw.text((mx, y+17), f"{drama[2]} · {drama[3]}", font=F["xs"], fill=MUTED)
    text(draw, (tx, y+40), drama[0], "bold", INK, max_w=w-105)
    draw.text((tx, y+82), "Verified official source with compact metadata.", font=F["xs"], fill=MUTED)
    draw.text((tx, y+100), f"🔥{drama[4]}   信 {88+i%8}   {drama[5]}", font=F["xs"], fill=RED)
    return y+132

def home(W, H, name):
    img = Image.new("RGB", (W,H), BG)
    d = ImageDraw.Draw(img, "RGBA")
    margin = 8 if W <= 430 else max(24, (W-1200)//2)
    header(d,W,margin)
    y = 70
    actions(d,W,margin,y,0)
    y += 78
    draw_title = "搜索海外短剧"
    d.text((margin,y), draw_title, font=F["xl"] if W>700 else F["lg"], fill=INK)
    y += 30
    d.text((margin,y), "输入剧名、关键词或类型，快速查看真实正片来源。", font=F["base"], fill=MUTED)
    y += 28
    y = search_ui(d,W,margin,y)
    d.text((margin,y), "Trending Now", font=F["lg"], fill=INK)
    d.text((W-margin-70,y+4), name, font=F["xs"], fill=MUTED)
    y += 28
    if W > 900:
        col_gap = 10
        col_w = (W - margin*2 - col_gap)//2
        for idx,dr in enumerate(dramas[:8]):
            cx = margin + (idx%2)*(col_w+col_gap)
            cy = y + (idx//2)*132
            card(d,cx,cy,col_w,dr,idx)
    else:
        for idx,dr in enumerate(dramas[:6]):
            y = card(d,margin,y,W-margin*2,dr,idx)
    img.save(OUT / name)

def rankings_detail(W, H, name):
    img = Image.new("RGB", (W,H), BG)
    d = ImageDraw.Draw(img, "RGBA")
    margin = max(24, (W-1200)//2)
    header(d,W,margin)
    y=76
    rr(d,(margin,y,W-margin,y+620),12,SURFACE,LINE)
    d.text((margin+16,y+16),"Global Trending TOP100",font=F["lg"],fill=INK)
    d.text((margin+16,y+42),"官方平台、真实封面、明确集数和高可信度资源。",font=F["sm"],fill=MUTED)
    y += 78
    for i,dr in enumerate(dramas[:6]):
        row_y = y+i*86
        if i: d.line((margin,row_y,W-margin,row_y),fill=LINE)
        rr(d,(margin+14,row_y+25,margin+48,row_y+59),8,ACCENT if i<3 else STRONG,None)
        d.text((margin+21,row_y+34),f"#{i+1}",font=F["xs"],fill=WHITE if i<3 else INK)
        cover(d,(margin+60,row_y+10,margin+116,row_y+76),i,dr[0])
        d.text((margin+130,row_y+14),dr[0],font=F["bold"],fill=INK)
        d.text((margin+130,row_y+40),f"{dr[1]} · {dr[2]} · {dr[3]}",font=F["xs"],fill=MUTED)
        d.text((W-margin-180,row_y+30),f"🔥{dr[4]}",font=F["bold"],fill=RED)
        d.text((W-margin-95,row_y+31),dr[5],font=F["xs"],fill=MUTED)
    img.save(OUT / name)

def detail(W,H,name):
    img=Image.new("RGB",(W,H),BG)
    d=ImageDraw.Draw(img,"RGBA")
    margin=max(24,(W-1200)//2)
    header(d,W,margin)
    y=80
    d.text((margin,y),"返回搜索",font=F["sm"],fill=MUTED)
    y+=30
    cover(d,(margin,y,margin+220,y+315),0,dramas[0][0])
    x=margin+244
    pill(d,x,y,"正版来源")
    d.text((x+80,y+5),"50 集 · EN / ZH",font=F["xs"],fill=MUTED)
    d.text((x,y+38),dramas[0][0],font=F["title"],fill=INK)
    d.text((x,y+76),"亿万富翁丈夫的双面人生",font=F["base"],fill=MUTED)
    text(d,(x,y+108),"一场仓促的婚姻，让两个隐藏身份的人被迫重新认识彼此。页面聚合官方观看入口、平台信息、集数、热度和相关推荐，保持信息型布局。","base",MUTED,max_w=650)
    d.text((x,y+185),"官方观看入口",font=F["lg"],fill=INK)
    ry=y+218
    for p in ["ReelShort","YouTube","DramaBox"]:
        rr(d,(x,ry,x+650,ry+62),12,SURFACE,LINE)
        d.text((x+14,ry+12),p,font=F["bold"],fill=INK)
        d.text((x+14,ry+34),"Global / EN · 检查于 2026/7/9",font=F["xs"],fill=MUTED)
        rr(d,(x+548,ry+14,x+632,ry+48),8,ACCENT,None)
        d.text((x+562,ry+24),"官方观看 ↗",font=F["xs"],fill=WHITE)
        ry+=72
    img.save(OUT/name)

home(390,844,"dramaseek-iphone-390-home.png")
home(1440,900,"dramaseek-macbook-1440-home.png")
detail(1200,900,"dramaseek-drama-detail.png")
print("written", OUT)
