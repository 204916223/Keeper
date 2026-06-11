const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const size = 128;
const repoRoot = path.join(__dirname, '..');
const outputDir = path.join(repoRoot, 'src', 'renderer', 'assets', 'pets', 'fire-slime');
const sourcePng = path.join(repoRoot, 'tmp', 'slime_reference_128_smooth.png');
const sideSourceJpg = '/Users/kellen/Library/Containers/com.tencent.xinWeChat/Data/Documents/app_data/xwechat_files/wxid_sowp8uas08sl22_ec3e/temp/RWTemp/2026-06/9e20f478899dc29eb19741386f9343c8/a484f622fa45e9efc8087076da117c53.jpg';
const sidePreviewPng = path.join(repoRoot, 'tmp', 'slime_side_reference_128_smooth.png');

const idleFrames = [
  { scaleX: 1.0, scaleY: 1.0, delay: 72 },
  { scaleX: 1.008, scaleY: 0.988, delay: 60 },
  { scaleX: 1.018, scaleY: 0.97, delay: 60 },
  { scaleX: 1.03, scaleY: 0.945, delay: 60 },
  { scaleX: 1.042, scaleY: 0.918, delay: 60 },
  { scaleX: 1.052, scaleY: 0.892, delay: 75 },
  { scaleX: 1.036, scaleY: 0.932, delay: 60 },
  { scaleX: 1.026, scaleY: 0.962, delay: 60 },
  { scaleX: 1.014, scaleY: 0.986, delay: 64 },
  { scaleX: 0.996, scaleY: 1.018, delay: 60 },
  { scaleX: 0.986, scaleY: 1.044, delay: 64 },
  { scaleX: 0.974, scaleY: 1.074, delay: 78 },
  { scaleX: 0.982, scaleY: 1.056, delay: 60 },
  { scaleX: 0.992, scaleY: 1.032, delay: 60 },
  { scaleX: 1.002, scaleY: 1.012, delay: 64 },
  { scaleX: 1.006, scaleY: 0.998, delay: 78 },
];

const walkFrames = [
  { scaleX: 0.86, scaleY: 1.02, delay: 70 },
  { scaleX: 0.89, scaleY: 0.99, delay: 70 },
  { scaleX: 0.94, scaleY: 0.94, delay: 70 },
  { scaleX: 0.98, scaleY: 0.9, delay: 70 },
  { scaleX: 0.92, scaleY: 0.965, delay: 70 },
  { scaleX: 0.88, scaleY: 1.02, delay: 70 },
  { scaleX: 0.82, scaleY: 1.08, delay: 70 },
  { scaleX: 0.84, scaleY: 1.04, delay: 70 },
];

function ensureSource() {
  if (fs.existsSync(sourcePng)) {
    if (fs.existsSync(sideSourceJpg)) {
      return;
    }
  }

  throw new Error(
    `Missing source image. Need ${sourcePng} and ${sideSourceJpg}.`,
  );
}

function runPython() {
  const script = String.raw`
from PIL import Image
from pathlib import Path
import json

size = ${size}
source = Path(${JSON.stringify(sourcePng)})
side_source = Path(${JSON.stringify(sideSourceJpg)})
side_preview = Path(${JSON.stringify(sidePreviewPng)})
output_dir = Path(${JSON.stringify(outputDir)})
idle_frames = json.loads(${JSON.stringify(JSON.stringify(idleFrames))})
walk_frames = json.loads(${JSON.stringify(JSON.stringify(walkFrames))})

output_dir.mkdir(parents=True, exist_ok=True)
side_preview.parent.mkdir(parents=True, exist_ok=True)

def is_background(pixel):
    r, g, b, a = pixel
    mx = max(r, g, b)
    mn = min(r, g, b)
    return mx > 150 and (mx - mn) < 34

def remove_checker_background(image):
    image = image.convert("RGBA")
    width, height = image.size
    pixels = image.load()
    seen = bytearray(width * height)
    queue = []

    def push(x, y):
        if 0 <= x < width and 0 <= y < height:
            index = y * width + x
            if not seen[index] and is_background(pixels[x, y]):
                seen[index] = 1
                queue.append((x, y))

    for x in range(width):
        push(x, 0)
        push(x, height - 1)
    for y in range(height):
        push(0, y)
        push(width - 1, y)

    cursor = 0
    while cursor < len(queue):
        x, y = queue[cursor]
        cursor += 1
        push(x + 1, y)
        push(x - 1, y)
        push(x, y + 1)
        push(x, y - 1)

    alpha = Image.new("L", image.size, 255)
    alpha_pixels = alpha.load()
    for y in range(height):
        row = y * width
        for x in range(width):
            if seen[row + x]:
                alpha_pixels[x, y] = 0

    image.putalpha(alpha)
    return image

def fit_to_canvas(image):
    box = image.getbbox()
    if box is None:
        raise RuntimeError("source image has no visible pixels")

    pad = 10
    box = (
        max(0, box[0] - pad),
        max(0, box[1] - pad),
        min(image.width, box[2] + pad),
        min(image.height, box[3] + pad),
    )
    subject = image.crop(box)
    ratio = min(122 / subject.width, 108 / subject.height)
    resized = subject.resize(
        (max(1, round(subject.width * ratio)), max(1, round(subject.height * ratio))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((size - resized.width) // 2, (size - resized.height) // 2 + 4))
    return canvas

idle_base = Image.open(source).convert("RGBA")
walk_base = fit_to_canvas(remove_checker_background(Image.open(side_source)))
walk_base.save(side_preview)

def render_sequence(base, frame_specs, action, flip=False):
    action_dir = output_dir / action
    frames_dir = action_dir / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)

    subject_box = base.getbbox()
    if subject_box is None:
        raise RuntimeError("source image has no visible pixels")

    subject = base.crop(subject_box)
    subject_width, subject_height = subject.size
    baseline = subject_box[3]
    center_x = (subject_box[0] + subject_box[2]) / 2
    png_frames = []

    for index, spec in enumerate(frame_specs):
        scale_x = spec["scaleX"]
        scale_y = spec["scaleY"]
        x_offset = spec.get("x", 0)

        width = max(1, round(subject_width * scale_x))
        height = max(1, round(subject_height * scale_y))
        source_frame = subject.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if flip else subject
        resized = source_frame.resize((width, height), Image.Resampling.BICUBIC)
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))

        direction = -1 if flip else 1
        x = round(center_x - width / 2 + x_offset * direction)
        # Fixed bottom baseline: squash changes shape, not floor contact.
        y = round(baseline - height)

        canvas.alpha_composite(resized, (x, y))
        out = frames_dir / f"{action}-{index}.png"
        canvas.save(out)
        png_frames.append(canvas)

    durations = [frame["delay"] for frame in frame_specs]
    png_frames[0].save(
        action_dir / f"{action}.apng",
        save_all=True,
        append_images=png_frames[1:],
        duration=durations,
        loop=0,
        disposal=2,
    )
    png_frames[0].save(
        action_dir / f"{action}.webp",
        save_all=True,
        append_images=png_frames[1:],
        duration=durations,
        loop=0,
        lossless=True,
        method=6,
    )


render_sequence(idle_base, idle_frames, "idle")
render_sequence(walk_base, walk_frames, "walk-right")
render_sequence(walk_base, walk_frames, "walk-left", flip=True)
`;

  execFileSync('python3', ['-c', script], { stdio: 'inherit' });
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

ensureSource();
runPython();

fs.writeFileSync(
  path.join(outputDir, 'pet.json'),
  `${JSON.stringify({
    id: 'fire-slime',
    name: '火史莱姆',
    builtIn: true,
    canvasSize: 128,
    animations: {
      idle: 'idle/idle.apng',
      'walk-left': 'walk-left/walk-left.apng',
      'walk-right': 'walk-right/walk-right.apng',
    },
  }, null, 2)}\n`,
);
