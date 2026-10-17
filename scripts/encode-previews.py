"""Encode recorded application frames; requires Pillow. Run after capture-previews.cjs."""
import sys
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parent.parent
destination = root / 'assets' / 'previews'
release = '--release' in sys.argv
names = [name for name in sys.argv[1:] if name != '--release']
source = root / 'dist' / ('release-preview-frames' if release else 'preview-frames')
for name, width in ([('project-spaces', 840), ('file-shelf', 840), ('unified-search', 840), ('pet-performances', 840), ('layered-outfits', 840), ('notch-tools', 660)] if release else [('notch', 620), ('app-tour', 720), ('workbench', 620), ('approvals', 620), ('chat', 620), ('wardrobe', 720), ('app-settings', 720), ('themes', 840), ('usage-dashboard', 620), ('chat-handoff', 620), ('service-companions', 620), ('sound-studio', 840), ('custom-agents', 840)]):
    if names and name not in names:
        continue
    files = sorted((source / name).glob('*.png'))
    frames = [Image.open(file).convert('RGB') for file in files]
    if not frames:
        raise RuntimeError(f'No recorded frames for {name}')
    height = max(frame.height for frame in frames)
    max_width = max(frame.width for frame in frames)
    prepared = []
    for frame in frames:
        canvas = Image.new('RGB', (max_width, height), '#000000')
        canvas.paste(frame, ((max_width-frame.width)//2, 0))
        prepared.append(canvas.resize((width, round(height*width/max_width)), Image.Resampling.LANCZOS))
    palette_source = Image.new('RGB', (width * 6, prepared[0].height))
    for index in range(6):
        palette_source.paste(prepared[round(index*(len(prepared)-1)/5)], (width*index, 0))
    palette = palette_source.quantize(colors=128)
    indexed = [frame.quantize(palette=palette, dither=Image.Dither.NONE) for frame in prepared]
    target = destination / (name + '.gif')
    indexed[0].save(target, save_all=True, append_images=indexed[1:], duration=100, loop=0, optimize=True, disposal=2)
    print(f'{target.name}: {len(indexed)} frames, {target.stat().st_size:,} bytes')
