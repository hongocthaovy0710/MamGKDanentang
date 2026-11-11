require('dotenv').config();

const fs = require('node:fs/promises');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const seedMembers = [
  { email: 'an@example.com', hoten: 'An Nguyễn', image: 'an.jpg' },
  { email: 'duy@example.com', hoten: 'Duy Trần', image: 'duy.jpg' },
  { email: 'khiem@example.com', hoten: 'Khiêm Lê', image: 'khiem.jpg' },
  { email: 'linh@example.com', hoten: 'Linh Phạm', image: 'linh.jpg' },
  { email: 'mai@example.com', hoten: 'Mai Hoàng', image: 'mai.jpg' },
  { email: 'minhanh@example.com', hoten: 'Minh Anh Võ', image: 'minhanh.jpg' },
  { email: 'phuc@example.com', hoten: 'Phúc Đặng', image: 'phuc.jpg' },
  { email: 'thuy@example.com', hoten: 'Thúy Bùi', image: 'thuy.jpg' },
  { email: 'tu@example.com', hoten: 'Tú Nguyễn', image: 'tu.jpg' },
  { email: 'vy@example.com', hoten: 'Vy Trần', image: 'vy.jpg' },
];

const memberSchema = new mongoose.Schema({
  email: String,
  matkhau: String,
  hoten: String,
  hinhanh: { type: String, default: '' },
}, { versionKey: false, collection: 'members' });

const Member = mongoose.model('Member', memberSchema);

function sqlValue(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "''").replace(/\0/g, '\\0')}'`;
}

async function main() {
  let members;
  if (process.argv.includes('--seed')) {
    const passwordHash = await bcrypt.hash('ThanhVien123!', 10);
    members = await Promise.all(seedMembers.map(async (member, index) => ({
      _id: (index + 1).toString(16).padStart(24, '0'),
      email: member.email,
      matkhau: passwordHash,
      hoten: member.hoten,
      hinhanh: `data:image/jpeg;base64,${(await fs.readFile(path.join(__dirname, '..', 'assets', member.image))).toString('base64')}`,
    })));
  } else {
    if (!process.env.MONGODB_URI || /[<>]/.test(process.env.MONGODB_URI)) {
      throw new Error('MONGODB_URI trong backend/.env đang thiếu hoặc còn placeholder.');
    }
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    members = await Member.find().sort({ hoten: 1 }).lean();
  }
  const exportDirectory = path.join(__dirname, 'exports');
  await fs.mkdir(exportDirectory, { recursive: true });

  const json = JSON.stringify(members.map((member) => ({
    _id: String(member._id),
    email: member.email,
    matkhau: member.matkhau,
    hoten: member.hoten,
    hinhanh: member.hinhanh || '',
  })), null, 2);
  const sql = [
    '-- MongoDB members export. SQL schema uses MySQL-compatible types.',
    'CREATE TABLE IF NOT EXISTS `members` (',
    '  `_id` CHAR(24) NOT NULL PRIMARY KEY,',
    '  `email` VARCHAR(320) NOT NULL UNIQUE,',
    '  `matkhau` VARCHAR(255) NOT NULL,',
    '  `hoten` VARCHAR(255) NOT NULL,',
    '  `hinhanh` LONGTEXT NOT NULL',
    ') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;',
    '',
    ...members.map((member) => `INSERT INTO \`members\` (\`_id\`, \`email\`, \`matkhau\`, \`hoten\`, \`hinhanh\`) VALUES (${[
      String(member._id), member.email, member.matkhau, member.hoten, member.hinhanh || '',
    ].map(sqlValue).join(', ')});`),
    '',
  ].join('\n');

  await Promise.all([
    fs.writeFile(path.join(exportDirectory, 'members.json'), `${json}\n`, 'utf8'),
    fs.writeFile(path.join(exportDirectory, 'members.sql'), sql, 'utf8'),
  ]);
  console.log(`Đã xuất ${members.length} ${process.argv.includes('--seed') ? 'thành viên mẫu' : 'thành viên từ MongoDB'} vào backend/exports/members.json và members.sql.`);
}

main()
  .catch((error) => {
    console.error(`Không thể xuất dữ liệu: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
