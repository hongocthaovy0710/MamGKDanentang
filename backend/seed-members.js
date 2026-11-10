require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const demoPassword = 'ThanhVien123!';
const backendDirectory = path.dirname(process.argv[1]);
const members = [
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
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  matkhau: { type: String, required: true },
  hoten: { type: String, required: true, trim: true },
  hinhanh: { type: String, default: '' },
}, { versionKey: false });

const Member = mongoose.model('Member', memberSchema, 'members');

async function seed() {
  if (!process.env.MONGODB_URI || /[<>]/.test(process.env.MONGODB_URI)) {
    throw new Error('MONGODB_URI trong backend/.env đang thiếu hoặc còn placeholder. Hãy sửa file .env, không phải .env.example.');
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  const operations = members.map((member) => {
    const imagePath = path.resolve(backendDirectory, '..', 'assets', member.image);
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Không tìm thấy ảnh: ${imagePath}`);
    }
    const hinhanh = `data:image/jpeg;base64,${fs.readFileSync(imagePath).toString('base64')}`;
    return {
      updateOne: {
        filter: { email: member.email },
        update: {
          $setOnInsert: {
            email: member.email,
            matkhau: passwordHash,
            hoten: member.hoten,
            hinhanh,
          },
        },
        upsert: true,
      },
    };
  });

  const result = await Member.bulkWrite(operations, { ordered: true });
  console.log(`Đã thêm ${result.upsertedCount} hồ sơ mới.`);
  console.log(`${result.matchedCount} email đã có sẵn nên được giữ nguyên.`);
  console.log(`Mật khẩu mẫu cho các hồ sơ vừa thêm: ${demoPassword}`);
}

seed()
  .catch((error) => {
    console.error('Không nạp được dữ liệu thành viên:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
