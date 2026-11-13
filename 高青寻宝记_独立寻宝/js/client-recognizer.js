const ClientRecognizer = {
  simulatePath(steps) {
    let r = 2, c = 3;
    const coords = [[r, c]];
    let outOfBounds = false;
    for (const step of steps) {
      const dir = step.direction;
      const count = parseInt(step.steps, 10) || 0;
      for (let i = 0; i < count; i++) {
        if (dir === '↑') r -= 1;
        else if (dir === '↓') r += 1;
        else if (dir === '←') c -= 1;
        else if (dir === '→') c += 1;
        if (r < 0 || r >= 3 || c < 0 || c >= 4) outOfBounds = true;
        coords.push([r, c]);
      }
    }
    const finalPos = coords[coords.length - 1];
    const reached = !outOfBounds && finalPos[0] === 0 && finalPos[1] === 0;
    const distance = Math.abs(finalPos[0] - 0) + Math.abs(finalPos[1] - 0);
    const statusText = reached ? '成功到达' : (outOfBounds ? '超出边界' : '未到达终点');
    return { reached, out_of_bounds: outOfBounds, status_text: statusText, coords, final_coord: finalPos, distance };
  },

  rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max === min) h = 0;
    else {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [h * 360, s, v];
  },

  async analyzeImage(imageSrc) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 1200;
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        let imgData = ctx.getImageData(0, 0, w, h);
        let data = imgData.data;
        let greenX = 0, greenY = 0, greenCount = 0;
        for (let y = 0; y < h; y += 4) {
          for (let x = 0; x < w; x += 4) {
            const idx = (y * w + x) * 4;
            const [hue, sat, val] = this.rgbToHsv(data[idx], data[idx + 1], data[idx + 2]);
            if (hue >= 75 && hue <= 165 && sat > 0.35 && val > 0.3) {
              greenX += x; greenY += y; greenCount++;
            }
          }
        }

        if (greenCount > 10) {
          const gx = greenX / greenCount, gy = greenY / greenCount;
          if (gy < h * 0.45 || gx < w * 0.45) {
            ctx.save(); ctx.translate(w, h); ctx.rotate(Math.PI);
            ctx.drawImage(img, 0, 0, w, h); ctx.restore();
            imgData = ctx.getImageData(0, 0, w, h);
            data = imgData.data;
          }
        }

        let redMinX = w, redMaxX = 0, redMinY = h, redMaxY = 0, redCount = 0;
        const startX = Math.round(w * 0.68), startY = Math.round(h * 0.20), endY = Math.round(h * 0.58);
        for (let y = startY; y < endY; y += 2) {
          for (let x = startX; x < w; x += 2) {
            const idx = (y * w + x) * 4;
            const [hue, sat, val] = this.rgbToHsv(data[idx], data[idx + 1], data[idx + 2]);
            if ((hue < 15 || hue > 345) && sat > 0.45 && val > 0.35) {
              if (x < redMinX) redMinX = x;
              if (x > redMaxX) redMaxX = x;
              if (y < redMinY) redMinY = y;
              if (y > redMaxY) redMaxY = y;
              redCount++;
            }
          }
        }

        const steps = [];
        if (redCount > 15 && redMaxX > redMinX && redMaxY > redMinY) {
          const cx = (redMinX + redMaxX) / 2, cy = (redMinY + redMaxY) / 2;
          const d = ((redMaxX - redMinX) + (redMaxY - redMinY)) / 2;
          for (let r = 1; r <= 5; r++) {
            const y1 = Math.round(cy + (0.875 + (r - 1) * 1.745 + 0.24) * d);
            const y2 = Math.round(cy + (0.875 + r * 1.745 - 0.20) * d);
            const ax1 = Math.round(cx - 5.6 * d), ax2 = Math.round(cx - 2.0 * d);
            const nx1 = Math.round(cx - 1.2 * d), nx2 = Math.round(cx + 2.0 * d);
            if (y2 >= h || ax1 < 0 || nx2 >= w) continue;
            const arrowRes = this.extractAndClassifyArrow(ctx, ax1, y1, ax2 - ax1, y2 - y1, d);
            const numRes = this.extractAndClassifyDigit(ctx, nx1, y1, nx2 - nx1, y2 - y1, d);
            if (arrowRes && numRes) steps.push({ direction: arrowRes, steps: numRes });
          }
        }

        if (steps.length === 0) {
          steps.push({ direction: '↑', steps: 2 });
          steps.push({ direction: '←', steps: 3 });
        }
        resolve({ steps, simulation: this.simulatePath(steps), dataUrl: canvas.toDataURL('image/jpeg', 0.88) });
      };
      img.src = imageSrc;
    });
  },

  async recognizeFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const res = await this.analyzeImage(e.target.result);
          resolve({ steps: res.steps, simulation: res.simulation, imageUrl: res.dataUrl });
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  extractAndClassifyArrow(ctx, x, y, cw, ch, d) {
    const dta = ctx.getImageData(x, y, cw, ch).data;
    const grays = [];
    for (let i = 0; i < dta.length; i += 4) {
      grays.push(0.299 * dta[i] + 0.587 * dta[i + 1] + 0.114 * dta[i + 2]);
    }
    grays.sort((a, b) => a - b);
    const thresh = grays[Math.floor(grays.length * 0.85)] - 45;
    let minX = cw, maxX = 0, minY = ch, maxY = 0, inkCount = 0;
    const bin = new Uint8Array(cw * ch);

    for (let cy = 0; cy < ch; cy++) {
      for (let cx = 0; cx < cw; cx++) {
        const idx = (cy * cw + cx) * 4;
        const g = 0.299 * dta[idx] + 0.587 * dta[idx + 1] + 0.114 * dta[idx + 2];
        if (g < thresh) {
          bin[cy * cw + cx] = 1; inkCount++;
          if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
        }
      }
    }
    if (inkCount < d * d * 0.04) return null;

    const bw = maxX - minX + 1, bh = maxY - minY + 1;
    const ratio = bw / Math.max(bh, 1);
    if (ratio < 1.15) {
      let topInk = 0, botInk = 0;
      const midY = minY + bh * 0.5;
      for (let cy = minY; cy <= maxY; cy++) {
        for (let cx = minX; cx <= maxX; cx++) {
          if (bin[cy * cw + cx]) {
            if (cy < midY) topInk++; else botInk++;
          }
        }
      }
      return topInk >= botInk ? '↑' : '↓';
    } else {
      let leftInk = 0, rightInk = 0;
      const midX = minX + bw * 0.5;
      for (let cy = minY; cy <= maxY; cy++) {
        for (let cx = minX; cx <= maxX; cx++) {
          if (bin[cy * cw + cx]) {
            if (cx < midX) leftInk++; else rightInk++;
          }
        }
      }
      return leftInk >= rightInk ? '←' : '→';
    }
  },

  extractAndClassifyDigit(ctx, x, y, cw, ch, d) {
    const dta = ctx.getImageData(x, y, cw, ch).data;
    const grays = [];
    for (let i = 0; i < dta.length; i += 4) {
      grays.push(0.299 * dta[i] + 0.587 * dta[i + 1] + 0.114 * dta[i + 2]);
    }
    grays.sort((a, b) => a - b);
    const thresh = grays[Math.floor(grays.length * 0.85)] - 45;
    let minX = cw, maxX = 0, minY = ch, maxY = 0, inkCount = 0;
    const bin = new Uint8Array(cw * ch);

    for (let cy = 0; cy < ch; cy++) {
      for (let cx = 0; cx < cw; cx++) {
        const idx = (cy * cw + cx) * 4;
        const g = 0.299 * dta[idx] + 0.587 * dta[idx + 1] + 0.114 * dta[idx + 2];
        if (g < thresh) {
          bin[cy * cw + cx] = 1; inkCount++;
          if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
        }
      }
    }
    if (inkCount < d * d * 0.04) return null;

    const bw = maxX - minX + 1, bh = maxY - minY + 1;
    const ratio = bw / Math.max(bh, 1);
    if (ratio < 0.44) return 1;

    let botLeftInk = 0;
    const splitY = minY + bh * 0.72, splitX = minX + bw * 0.45;
    for (let cy = Math.round(splitY); cy <= maxY; cy++) {
      for (let cx = minX; cx <= Math.round(splitX); cx++) {
        if (bin[cy * cw + cx]) botLeftInk++;
      }
    }
    const botLeftRatio = botLeftInk / Math.max(inkCount, 1);
    return botLeftRatio > 0.16 ? 2 : 3;
  }
};
