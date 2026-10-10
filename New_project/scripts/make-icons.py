# 앱 아이콘 PNG를 외부 라이브러리 없이 그린다. 파란 바탕 위에 겹친 계약서 두 장, 신버전에는 노란 변경 표시.
import struct, sys, zlib

BG = (47, 91, 211)
PAPER = (255, 255, 255)
PAPER_BACK = (205, 216, 245)
LINE = (170, 182, 214)
MARK = (255, 214, 64)


def draw(size):
    s = size / 512
    px = [[BG] * size for _ in range(size)]

    def rect(x0, y0, x1, y1, color):
        for y in range(int(y0 * s), int(y1 * s)):
            row = px[y]
            for x in range(int(x0 * s), int(x1 * s)):
                row[x] = color

    # 마스커블 안전 영역(가운데 80%) 안에만 그린다.
    rect(126, 118, 306, 350, PAPER_BACK)
    for y in (162, 196, 230, 264):
        rect(150, y, 282, y + 12, LINE)
    rect(206, 162, 386, 394, PAPER)
    for y in (206, 240, 274, 308, 342):
        rect(230, y, 362, y + 12, LINE)
    rect(230, 236, 330, 256, MARK)
    return px


def png(px):
    h, w = len(px), len(px[0])
    raw = b''.join(b'\x00' + bytes(c for p in row for c in p) for row in px)
    chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xFFFFFFFF)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')


out = sys.argv[1]
for size, name in ((192, 'icon-192.png'), (512, 'icon-512.png'), (180, 'apple-touch-icon.png')):
    with open(f'{out}/{name}', 'wb') as f:
        f.write(png(draw(size)))
