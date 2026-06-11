const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const size = 128;
const repoRoot = path.join(__dirname, '..');
const outputDir = path.join(repoRoot, 'src', 'renderer', 'assets', 'pets', 'ice-slime');
const sideSourceJpg = '/Users/kellen/Library/Containers/com.tencent.xinWeChat/Data/Documents/app_data/xwechat_files/wxid_sowp8uas08sl22_ec3e/temp/RWTemp/2026-06/9e20f478899dc29eb19741386f9343c8/98436e34c6ebaa5da9bc71b1809e8821.jpg';
const frontSourceJpg = '/Users/kellen/Library/Containers/com.tencent.xinWeChat/Data/Documents/app_data/xwechat_files/wxid_sowp8uas08sl22_ec3e/temp/RWTemp/2026-06/9e20f478899dc29eb19741386f9343c8/2062d1061173bd56d5a07c0738d638c2.jpg';

const idleFrames = [
  { scaleX: 1.0, scaleY: 1.0, delay: 72 },
  { scaleX: 1.006, scaleY: 0.99, delay: 60 },
  { scaleX: 1.014, scaleY: 0.976, delay: 60 },
  { scaleX: 1.024, scaleY: 0.954, delay: 60 },
  { scaleX: 1.034, scaleY: 0.934, delay: 60 },
  { scaleX: 1.042, scaleY: 0.915, delay: 75 },
  { scaleX: 1.026, scaleY: 0.946, delay: 60 },
  { scaleX: 1.02, scaleY: 0.968, delay: 60 },
  { scaleX: 1.016, scaleY: 0.984, delay: 64 },
  { scaleX: 0.996, scaleY: 1.018, delay: 60 },
  { scaleX: 0.986, scaleY: 1.04, delay: 64 },
  { scaleX: 0.978, scaleY: 1.058, delay: 78 },
  { scaleX: 0.982, scaleY: 1.052, delay: 60 },
  { scaleX: 0.994, scaleY: 1.026, delay: 60 },
  { scaleX: 1.002, scaleY: 1.012, delay: 64 },
  { scaleX: 1.008, scaleY: 1.004, delay: 78 },
];

const walkFrames = [
  { scaleX: 0.9, scaleY: 1.02, delay: 70 },
  { scaleX: 0.92, scaleY: 0.99, delay: 70 },
  { scaleX: 0.96, scaleY: 0.95, delay: 70 },
  { scaleX: 0.99, scaleY: 0.92, delay: 70 },
  { scaleX: 0.95, scaleY: 0.96, delay: 70 },
  { scaleX: 0.9, scaleY: 1.02, delay: 70 },
  { scaleX: 0.86, scaleY: 1.07, delay: 70 },
  { scaleX: 0.88, scaleY: 1.04, delay: 70 },
];

function ensureSource() {
  for (const source of [frontSourceJpg, sideSourceJpg]) {
    if (!fs.existsSync(source)) {
      throw new Error(`Missing source image: ${source}`);
    }
  }
}

function runPython() {
  const script = String.raw`
from PIL import Image
from pathlib import Path
import json

size = ${size}
front_source = Path(${JSON.stringify(frontSourceJpg)})
side_source = Path(${JSON.stringify(sideSourceJpg)})
output_dir = Path(${JSON.stringify(outputDir)})
idle_frames = json.loads(${JSON.stringify(JSON.stringify(idleFrames))})
walk_frames = json.loads(${JSON.stringify(JSON.stringify(walkFrames))})

def is_subject_pixel(pixel):
    r, g, b, a = pixel
    mx = max(r, g, b)
    mn = min(r, g, b)

    if mx < 42:
        return False

    is_blue_or_cyan = b > r + 18 or (g > r + 18 and b > r + 12)
    is_colored = mx - mn > 26
    return is_blue_or_cyan and is_colored

def dilate_mask(mask, width, height, iterations=2):
    current = mask
    for _ in range(iterations):
        expanded = bytearray(current)
        for y in range(height):
            row = y * width
            for x in range(width):
                if not current[row + x]:
                    continue
                for ny in range(max(0, y - 1), min(height, y + 2)):
                    offset = ny * width
                    for nx in range(max(0, x - 1), min(width, x + 2)):
                        expanded[offset + nx] = 1
        current = expanded
    return current

def largest_component(mask, width, height):
    seen = bytearray(width * height)
    largest = []

    for start in range(width * height):
        if seen[start] or not mask[start]:
            continue

        queue = [start]
        seen[start] = 1
        component = []
        cursor = 0

        while cursor < len(queue):
            index = queue[cursor]
            cursor += 1
            component.append(index)
            x = index % width
            y = index // width

            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < width and 0 <= ny < height:
                    next_index = ny * width + nx
                    if mask[next_index] and not seen[next_index]:
                        seen[next_index] = 1
                        queue.append(next_index)

        if len(component) > len(largest):
            largest = component

    result = bytearray(width * height)
    for index in largest:
        result[index] = 1
    return result

def remove_outside_closed_outline(image):
    image = image.convert("RGBA")
    width, height = image.size
    pixels = image.load()

    barrier = bytearray(width * height)
    for y in range(height):
        row = y * width
        for x in range(width):
            if is_subject_pixel(pixels[x, y]):
                barrier[row + x] = 1

    barrier = dilate_mask(barrier, width, height, iterations=2)
    outside = bytearray(width * height)
    queue = []

    def push(x, y):
        if 0 <= x < width and 0 <= y < height:
            index = y * width + x
            if not outside[index] and not barrier[index]:
                outside[index] = 1
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

    enclosed = bytearray(width * height)
    for index in range(width * height):
        if not outside[index]:
            enclosed[index] = 1

    enclosed = largest_component(enclosed, width, height)

    alpha = Image.new("L", image.size, 255)
    alpha_pixels = alpha.load()
    for y in range(height):
        row = y * width
        for x in range(width):
            if not enclosed[row + x]:
                alpha_pixels[x, y] = 0

    image.putalpha(alpha)
    return image

def fit_to_canvas(image, max_width=124, max_height=118, y_offset=5):
    box = image.getbbox()
    if box is None:
        raise RuntimeError("source image has no visible pixels")

    pad = 8
    box = (
        max(0, box[0] - pad),
        max(0, box[1] - pad),
        min(image.width, box[2] + pad),
        min(image.height, box[3] + pad),
    )
    subject = image.crop(box)
    ratio = min(max_width / subject.width, max_height / subject.height)
    resized = subject.resize(
        (max(1, round(subject.width * ratio)), max(1, round(subject.height * ratio))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((size - resized.width) // 2, (size - resized.height) // 2 + y_offset))
    return canvas

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
        width = max(1, round(subject_width * spec["scaleX"]))
        height = max(1, round(subject_height * spec["scaleY"]))
        source_frame = subject.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if flip else subject
        resized = source_frame.resize((width, height), Image.Resampling.BICUBIC)
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))

        x = round(center_x - width / 2)
        y = round(baseline - height)
        canvas.alpha_composite(resized, (x, y))
        canvas.save(frames_dir / f"{action}-{index}.png")
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

output_dir.mkdir(parents=True, exist_ok=True)
idle_base = fit_to_canvas(remove_outside_closed_outline(Image.open(front_source)))
walk_base = fit_to_canvas(
    remove_outside_closed_outline(Image.open(side_source)),
    max_width=112,
    max_height=96,
    y_offset=3,
)

render_sequence(idle_base, idle_frames, "idle")
render_sequence(walk_base, walk_frames, "walk-left")
render_sequence(walk_base, walk_frames, "walk-right", flip=True)
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
    id: 'ice-slime',
    name: '冰史莱姆',
    builtIn: true,
    canvasSize: 128,
    animations: {
      idle: 'idle/idle.apng',
      'walk-left': 'walk-left/walk-left.apng',
      'walk-right': 'walk-right/walk-right.apng',
    },
  }, null, 2)}\n`,
);
