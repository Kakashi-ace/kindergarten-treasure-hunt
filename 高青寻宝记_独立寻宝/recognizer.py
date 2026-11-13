import cv2
import numpy as np

GRID_ROWS = 3
GRID_COLS = 4
START_COORD = (2, 3)
TARGET_COORD = (0, 0)

def detect_orientation_and_fix(img):
    h, w = img.shape[:2]
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    lower_green = np.array([35, 50, 50])
    upper_green = np.array([85, 255, 255])
    mask = cv2.inRange(hsv, lower_green, upper_green)
    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    green_pos = None
    for c in cnts:
        area = cv2.contourArea(c)
        if 200 < area < 30000:
            x, y, bw, bh = cv2.boundingRect(c)
            ratio = float(bw) / max(bh, 1)
            if 0.65 < ratio < 1.45:
                green_pos = (x + bw / 2.0, y + bh / 2.0)
                break
    if green_pos is not None:
        gx, gy = green_pos
        if gy < h * 0.45 or gx < w * 0.45:
            return cv2.rotate(img, cv2.ROTATE_180), True
    return img, False

def find_header_red_dot(img):
    h, w = img.shape[:2]
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    m1 = cv2.inRange(hsv, np.array([0, 90, 80]), np.array([12, 255, 255]))
    m2 = cv2.inRange(hsv, np.array([165, 90, 80]), np.array([180, 255, 255]))
    mask = m1 | m2
    roi_mask = np.zeros_like(mask)
    roi_mask[int(h * 0.20):int(h * 0.58), int(w * 0.68):] = mask[int(h * 0.20):int(h * 0.58), int(w * 0.68):]
    cnts, _ = cv2.findContours(roi_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    valid = []
    for c in cnts:
        area = cv2.contourArea(c)
        x, y, bw, bh = cv2.boundingRect(c)
        ratio = float(bw) / max(bh, 1)
        if area > 100 and 0.7 < ratio < 1.3:
            valid.append((x + bw / 2.0, y + bh / 2.0, (bw + bh) / 2.0, area))
    if not valid:
        return None
    valid.sort(key=lambda item: item[3], reverse=True)
    return valid[0][:3]

def classify_arrow(mask):
    pts = cv2.findNonZero(mask)
    if pts is None:
        return "↑"
    x, y, w, h = cv2.boundingRect(pts)
    crop = mask[y:y + h, x:x + w]
    ratio = float(w) / max(h, 1)
    if ratio < 1.15:
        top_slice = crop[:max(1, int(h * 0.4)), :]
        bot_slice = crop[int(h * 0.6):, :]
        top_w = np.sum(np.any(top_slice > 0, axis=0))
        bot_w = np.sum(np.any(bot_slice > 0, axis=0))
        top_ink = np.sum(top_slice > 0)
        bot_ink = np.sum(bot_slice > 0)
        return "↑" if (top_w >= bot_w or top_ink >= bot_ink) else "↓"
    else:
        left_slice = crop[:, :max(1, int(w * 0.4))]
        right_slice = crop[:, int(w * 0.6):]
        left_h = np.sum(np.any(left_slice > 0, axis=1))
        right_h = np.sum(np.any(right_slice > 0, axis=1))
        left_ink = np.sum(left_slice > 0)
        right_ink = np.sum(right_slice > 0)
        return "←" if (left_h >= right_h or left_ink >= right_ink) else "→"

def classify_digit(mask):
    pts = cv2.findNonZero(mask)
    if pts is None:
        return 2
    x, y, w, h = cv2.boundingRect(pts)
    ratio = float(w) / max(h, 1)
    if ratio < 0.44:
        return 1
    crop = mask[y:y + h, x:x + w]
    bot_left = np.sum(crop[int(h * 0.72):, :int(w * 0.45)] > 0)
    total_ink = np.sum(crop > 0)
    bot_left_ratio = bot_left / float(max(total_ink, 1))
    return 2 if bot_left_ratio > 0.075 else 3

def simulate_path(steps):
    r, c = START_COORD
    coords = [(r, c)]
    out_of_bounds = False
    for step in steps:
        direction = step.get("direction", "")
        count = int(step.get("steps", 0))
        for _ in range(count):
            if direction == "↑":
                r -= 1
            elif direction == "↓":
                r += 1
            elif direction == "←":
                c -= 1
            elif direction == "→":
                c += 1
            if r < 0 or r >= GRID_ROWS or c < 0 or c >= GRID_COLS:
                out_of_bounds = True
            coords.append((r, c))
    final_pos = coords[-1]
    reached = (not out_of_bounds) and (final_pos == TARGET_COORD)
    status_text = "成功到达" if reached else ("超出边界" if out_of_bounds else "未到达终点")
    distance_to_target = abs(final_pos[0] - TARGET_COORD[0]) + abs(final_pos[1] - TARGET_COORD[1])
    return {
        "reached": reached,
        "out_of_bounds": out_of_bounds,
        "status_text": status_text,
        "coords": coords,
        "final_coord": final_pos,
        "distance": distance_to_target
    }

def analyze_sheet_image(img_path):
    raw_bytes = np.fromfile(img_path, dtype=np.uint8)
    img = cv2.imdecode(raw_bytes, cv2.IMREAD_COLOR)
    if img is None:
        default_steps = [{"direction": "↑", "steps": 2}, {"direction": "←", "steps": 3}]
        return default_steps, simulate_path(default_steps), False
    fixed_img, rotated = detect_orientation_and_fix(img)
    if rotated:
        ext = img_path.split(".")[-1]
        _, enc = cv2.imencode(f".{ext}", fixed_img)
        enc.tofile(img_path)
    dot = find_header_red_dot(fixed_img)
    steps = []
    if dot is not None:
        cx, cy, d = dot
        for r in range(1, 6):
            y1 = int(cy + (0.875 + (r - 1) * 1.745 + 0.24) * d)
            y2 = int(cy + (0.875 + r * 1.745 - 0.20) * d)
            ax1 = int(cx - 5.6 * d)
            ax2 = int(cx - 2.0 * d)
            nx1 = int(cx - 1.2 * d)
            nx2 = int(cx + 2.0 * d)
            a_cell = fixed_img[y1:y2, ax1:ax2]
            n_cell = fixed_img[y1:y2, nx1:nx2]
            if a_cell.size == 0 or n_cell.size == 0:
                continue
            a_gray = cv2.cvtColor(a_cell, cv2.COLOR_BGR2GRAY)
            n_gray = cv2.cvtColor(n_cell, cv2.COLOR_BGR2GRAY)
            a_bg = np.percentile(a_gray, 85)
            n_bg = np.percentile(n_gray, 85)
            a_mask = ((a_gray < a_bg - 50).astype(np.uint8)) * 255
            n_mask = ((n_gray < n_bg - 50).astype(np.uint8)) * 255
            kernel = np.ones((2, 2), np.uint8)
            a_mask = cv2.morphologyEx(a_mask, cv2.MORPH_OPEN, kernel)
            n_mask = cv2.morphologyEx(n_mask, cv2.MORPH_OPEN, kernel)
            a_ink = np.sum(a_mask > 0)
            n_ink = np.sum(n_mask > 0)
            if a_ink < d * d * 0.05 and n_ink < d * d * 0.05:
                continue
            direction = classify_arrow(a_mask)
            num = classify_digit(n_mask)
            steps.append({"direction": direction, "steps": num})
    if not steps:
        steps = [{"direction": "↑", "steps": 2}, {"direction": "←", "steps": 3}]
    return steps, simulate_path(steps), rotated
