require('dotenv').config();

const bcrypt = require('bcryptjs');
const cors = require('cors');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();
const port = Number(process.env.PORT) || 3000;
const jwtSecret = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json({ limit: '3mb' }));

const memberSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  matkhau: { type: String, required: true },
  hoten: { type: String, required: true, trim: true },
  hinhanh: { type: String, default: '' },
}, { versionKey: false });

const Member = mongoose.model('Member', memberSchema);

function publicMember(member) {
  return {
    _id: member._id,
    email: member.email,
    matkhau: '',
    hoten: member.hoten,
    hinhanh: member.hinhanh || '',
  };
}

function requireAdmin(request, response, next) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !jwtSecret) return response.status(401).json({ error: 'Vui lòng đăng nhập admin.' });
  try {
    jwt.verify(token, jwtSecret);
    next();
  } catch {
    response.status(401).json({ error: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' });
  }
}

app.get('/health', (_request, response) => {
  const connected = mongoose.connection.readyState === 1;
  response.status(connected ? 200 : 503).json({
    api: 'ok',
    database: connected ? 'connected' : 'disconnected',
  });
});

app.post('/api/auth/login', (request, response) => {
  const { email, password } = request.body || {};
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || !jwtSecret) {
    return response.status(503).json({ error: 'Thiếu cấu hình admin trong backend/.env.' });
  }
  const valid = email?.trim().toLowerCase() === process.env.ADMIN_EMAIL.trim().toLowerCase()
    && password === process.env.ADMIN_PASSWORD;
  if (!valid) return response.status(401).json({ error: 'Email hoặc mật khẩu admin chưa đúng.' });
  const token = jwt.sign({ role: 'admin' }, jwtSecret, { expiresIn: '8h' });
  return response.json({ token, email: process.env.ADMIN_EMAIL });
});

app.get('/api/users', requireAdmin, async (_request, response) => {
  try {
    const members = await Member.find().sort({ hoten: 1 }).lean();
    response.json(members.map(publicMember));
  } catch {
    response.status(500).json({ error: 'Không tải được danh sách thành viên.' });
  }
});

app.post('/api/users', requireAdmin, async (request, response) => {
  try {
    const { email, matkhau, hoten, hinhanh = '' } = request.body || {};
    if (!email?.trim() || !matkhau || !hoten?.trim()) {
      return response.status(400).json({ error: 'Vui lòng nhập email, mật khẩu và họ tên.' });
    }
    const member = await Member.create({
      email: email.trim().toLowerCase(),
      matkhau: await bcrypt.hash(matkhau, 10),
      hoten: hoten.trim(),
      hinhanh,
    });
    response.status(201).json(publicMember(member));
  } catch (error) {
    response.status(error.code === 11000 ? 409 : 400).json({
      error: error.code === 11000 ? 'Email này đã có trong danh sách.' : 'Không thể thêm thành viên.',
    });
  }
});

app.put('/api/users/:id', requireAdmin, async (request, response) => {
  try {
    const { email, matkhau, hoten, hinhanh = '' } = request.body || {};
    if (!email?.trim() || !hoten?.trim()) {
      return response.status(400).json({ error: 'Email và họ tên không được để trống.' });
    }
    const update = {
      email: email.trim().toLowerCase(),
      hoten: hoten.trim(),
      hinhanh,
    };
    if (matkhau) update.matkhau = await bcrypt.hash(matkhau, 10);
    const member = await Member.findByIdAndUpdate(request.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!member) return response.status(404).json({ error: 'Không tìm thấy thành viên.' });
    response.json(publicMember(member));
  } catch (error) {
    response.status(error.code === 11000 ? 409 : 400).json({
      error: error.code === 11000 ? 'Email này đã có trong danh sách.' : 'Không thể cập nhật thành viên.',
    });
  }
});

app.delete('/api/users/:id', requireAdmin, async (request, response) => {
  try {
    const member = await Member.findByIdAndDelete(request.params.id);
    if (!member) return response.status(404).json({ error: 'Không tìm thấy thành viên.' });
    response.status(204).end();
  } catch {
    response.status(400).json({ error: 'Không thể xóa thành viên.' });
  }
});

async function start() {
  if (!process.env.MONGODB_URI || /[<>]/.test(process.env.MONGODB_URI)) {
    console.error('MONGODB_URI in backend/.env is missing or still has placeholders. Edit .env, not .env.example.');
    process.exit(1);
  }
  if (!jwtSecret || jwtSecret.includes('replace-this')) {
    console.error('Set a private JWT_SECRET in backend/.env before starting the API.');
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    console.log('Connected to MongoDB.');
    app.listen(port, '0.0.0.0', () => console.log(`API listening on http://0.0.0.0:${port}`));
  } catch (error) {
    console.error('Could not connect to MongoDB:', error.message);
    process.exit(1);
  }
}

start();
