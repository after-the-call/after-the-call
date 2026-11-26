// 把後台存的 content/ 資料夾整理成網站讀的 data/notices.json、data/updates.json。
// GitHub Actions 每次部署都會跑；本機也可以用 `node scripts/build-data.mjs` 手動跑。
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const entries = dir => {
  const d = path.join(root, dir);
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter(f => f.endsWith('.json')).map(f => ({ id: f.replace(/\.json$/, ''), ...read(path.join(d, f)) }));
};
// 新的在前：依日期由新到舊，同一天依標題
const byDate = (a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(a.title || '').localeCompare(String(b.title || ''));

const settingsFile = path.join(root, 'content/settings.json');
const settings = fs.existsSync(settingsFile) ? read(settingsFile) : {};

const notices = entries('content/notices').filter(n => n.title).sort(byDate).map(n => ({
  id: n.id, title: n.title, status: n.status || '草稿', pinned: !!n.pinned, hot: n.hot !== false,
  type: n.type || '', date: n.date || '', date_text: n.date_text || '', summary: n.summary || '', body: n.body || '',
  images: (n.images || []).filter(i => i && i.src), links: (n.links || []).filter(l => l && l.url),
}));
const updates = entries('content/updates').filter(u => u.title).sort(byDate).map(u => ({
  id: u.id, title: u.title, status: u.status || '草稿', tag: u.tag || '', date: u.date || '', date_text: u.date_text || '', body: u.body || '',
  images: (u.images || []).filter(i => i && i.src), links: (u.links || []).filter(l => l && l.url),
}));

fs.mkdirSync(path.join(root, 'data'), { recursive: true });
fs.writeFileSync(path.join(root, 'data/notices.json'), JSON.stringify({ hot_count: settings.hot_count || 5, notices }, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'data/updates.json'), JSON.stringify({ updates }, null, 2) + '\n');
console.log(`notices: ${notices.length}, updates: ${updates.length}`);
