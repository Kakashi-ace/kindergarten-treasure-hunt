const DEFAULT_PRESETS = [
  { name: '张子轩 (实拍)', steps: [{ direction: '↑', steps: 2 }, { direction: '←', steps: 3 }], file: 'child_01.jpg' },
  { name: '李沐宸', steps: [{ direction: '←', steps: 3 }, { direction: '↑', steps: 2 }], file: 'child_02.jpg' },
  { name: '王梓涵', steps: [{ direction: '↑', steps: 1 }, { direction: '←', steps: 1 }, { direction: '↑', steps: 1 }, { direction: '←', steps: 2 }], file: 'child_03.jpg' },
  { name: '陈思睿', steps: [{ direction: '↑', steps: 2 }, { direction: '←', steps: 3 }], file: 'child_04.jpg' },
  { name: '刘欣怡', steps: [{ direction: '←', steps: 2 }, { direction: '↑', steps: 2 }, { direction: '←', steps: 1 }], file: 'child_05.jpg' },
  { name: '赵子豪', steps: [{ direction: '↑', steps: 2 }, { direction: '←', steps: 2 }], file: 'child_06.jpg' },
  { name: '孙浩然', steps: [{ direction: '←', steps: 3 }, { direction: '↑', steps: 2 }], file: 'child_07.jpg' },
  { name: '周雨桐', steps: [{ direction: '←', steps: 3 }, { direction: '↑', steps: 1 }], file: 'child_08.jpg' },
  { name: '吴若熙', steps: [{ direction: '↑', steps: 1 }, { direction: '←', steps: 3 }, { direction: '↑', steps: 1 }], file: 'child_09.jpg' },
  { name: '徐乐天', steps: [{ direction: '↑', steps: 2 }, { direction: '←', steps: 3 }], file: 'child_10.jpg' },
  { name: '朱浩轩', steps: [{ direction: '←', steps: 3 }, { direction: '↑', steps: 2 }], file: 'child_11.jpg' },
  { name: '胡欣妍', steps: [{ direction: '↑', steps: 2 }, { direction: '←', steps: 3 }], file: 'child_12.jpg' },
  { name: '郭佳琪', steps: [{ direction: '↑', steps: 3 }], file: 'child_13.jpg' },
  { name: '林嘉航', steps: [{ direction: '↑', steps: 2 }, { direction: '←', steps: 3 }], file: 'child_14.jpg' },
  { name: '高博文', steps: [{ direction: '←', steps: 1 }, { direction: '↑', steps: 2 }, { direction: '←', steps: 2 }], file: 'child_15.jpg' },
  { name: '黄梓墨', steps: [{ direction: '↑', steps: 2 }, { direction: '←', steps: 3 }], file: 'child_16.jpg' }
].map((item, idx) => ({
  id: `work_${String(idx + 1).padStart(2, '0')}`,
  name: item.name,
  image_url: `data/presets/${item.file}`,
  steps: item.steps,
  created_at: `10:${String(10 + idx).padStart(2, '0')}:00`,
  is_preset: true
}));
