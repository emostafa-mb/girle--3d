"""Turn a Flow MP4 into the storefront's scroll-film frames.

Run from the repo root:  python design/flow/video_to_frames.py design/flow/videos/body-wash.mp4 body-wash
Writes public/films/<name>/f001.webp ... and prints the frame count to set in src/brand/films.ts.
Needs ffmpeg on PATH.
"""
import pathlib
import subprocess
import sys

FRAMES = 150  # enough for smooth scrubbing; each 1280px WebP is roughly 10-30 KB

src, name = pathlib.Path(sys.argv[1]), sys.argv[2]
out = pathlib.Path('public/films') / name
out.mkdir(parents=True, exist_ok=True)
for old in out.glob('f*.webp'):
    old.unlink()
duration = float(subprocess.check_output(
    ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(src)], text=True))
subprocess.run([
    'ffmpeg', '-v', 'error', '-i', str(src),
    '-vf', f'fps={FRAMES / duration:.4f},scale=1280:-2:flags=lanczos',
    '-frames:v', str(FRAMES), '-c:v', 'libwebp', '-quality', '80', '-compression_level', '6',
    str(out / 'f%03d.webp'),
], check=True)
frames = sorted(out.glob('f*.webp'))
print(f'{name}: {len(frames)} frames, {sum(f.stat().st_size for f in frames) // 1024} KB')
