let uploadedList = [];

function compressImage(file, maxWidth = 1600, quality = 0.85) {
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      return resolve(file);
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxWidth || h > maxWidth) {
          if (w > h) {
            h = Math.round((h * maxWidth) / w);
            w = maxWidth;
          } else {
            w = Math.round((w * maxWidth) / h);
            h = maxWidth;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          if (!blob) return resolve(file);
          const compressed = new File([blob], file.name, { type: 'image/jpeg' });
          resolve(compressed);
        }, 'image/jpeg', quality);
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

function handleFileSelect(e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;
  uploadFiles(Array.from(files));
  e.target.value = '';
}

async function uploadFiles(files) {
  const progressBox = document.getElementById('upload-progress-box');
  const progressBar = document.getElementById('upload-progress-bar');
  const progressText = document.getElementById('upload-progress-text');
  const nameInput = document.getElementById('child-name-input');
  const baseName = nameInput.value.trim();

  progressBox.style.display = 'block';

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const percent = Math.round(((i + 1) / files.length) * 100);
    progressBar.style.width = `${percent}%`;
    progressText.textContent = `正在识别上传第 ${i + 1} / ${files.length} 张...`;

    let childName = '';
    if (files.length === 1 && baseName) {
      childName = baseName;
    } else if (baseName) {
      childName = `${baseName} (${i + 1})`;
    } else {
      childName = `宝贝 ${uploadedList.length + i + 1}号`;
    }

    try {
      const compressedFile = await compressImage(file);
      const res = await API.uploadWork(compressedFile, childName);
      uploadedList.unshift(res);
      renderMobileList();
    } catch (err) {
      alert(`上传失败: ${err.message}`);
    }
  }

  nameInput.value = '';
  progressText.textContent = '全部上传并识别成功！一体机屏幕已同步刷新！';
  setTimeout(() => {
    progressBox.style.display = 'none';
  }, 2500);
}

function renderMobileList() {
  const listEl = document.getElementById('mobile-works-list');
  if (uploadedList.length === 0) {
    listEl.innerHTML = '<div style="text-align:center; padding: 20px; color:#A0AEC0;">暂无本次上传记录</div>';
    return;
  }
  listEl.innerHTML = uploadedList.map(w => `
    <div class="mobile-work-item">
      <img src="${w.image_url}" alt="${w.name}" class="mobile-thumb">
      <div class="mobile-info">
        <div class="mobile-name-row">
          <span style="font-weight:700; font-size:16px;">${w.name}</span>
          <span class="badge ${w.simulation.reached ? 'badge-success' : 'badge-danger'}">
            ${w.simulation.reached ? '🎉 成功' : '🧭 探索中'}
          </span>
        </div>
        <div style="font-size:13px; color:#718096; margin-top:4px;">
          路线：${w.steps.map(s => `${s.direction}${s.steps}`).join(' ')}
        </div>
      </div>
    </div>
  `).join('');
}

window.addEventListener('DOMContentLoaded', () => {
  const cameraInput = document.getElementById('camera-input');
  const albumInput = document.getElementById('album-input');
  if (cameraInput) cameraInput.addEventListener('change', handleFileSelect);
  if (albumInput) albumInput.addEventListener('change', handleFileSelect);
  renderMobileList();
});
