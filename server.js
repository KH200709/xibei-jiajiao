const express = require('express')
const cors = require('cors')
const sqlite3 = require('sqlite3').verbose()
const bcrypt = require('bcryptjs')
const path = require('path')

const app = express()
const PORT = 3000
const dbPath = path.join(__dirname, 'database.db')

app.use(cors())
app.use(express.json())

const db = new sqlite3.Database(dbPath)

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    createTime DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tutorId INTEGER,
    userId INTEGER,
    name TEXT,
    phone TEXT,
    time TEXT,
    message TEXT,
    status TEXT DEFAULT '待确认',
    createTime DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS demands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    grade TEXT,
    subjects TEXT,
    studentInfo TEXT,
    address TEXT,
    time TEXT,
    budget TEXT,
    phone TEXT,
    createTime DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  )`)
})

// 注册
app.post('/api/register', (req, res) => {
  const { phone, password } = req.body
  if (!phone || !password) {
    return res.status(400).json({ message: '手机号和密码不能为空' })
  }
  const hashedPassword = bcrypt.hashSync(password, 10)
  db.run('INSERT INTO users (phone, password) VALUES (?, ?)', [phone, hashedPassword], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ message: '该手机号已注册' })
      }
      return res.status(500).json({ message: '注册失败' })
    }
    res.json({ message: '注册成功', userId: this.lastID })
  })
})

// 登录
app.post('/api/login', (req, res) => {
  const { phone, password } = req.body
  if (!phone || !password) {
    return res.status(400).json({ message: '手机号和密码不能为空' })
  }
  db.get('SELECT * FROM users WHERE phone = ?', [phone], (err, row) => {
    if (err) return res.status(500).json({ message: '登录失败' })
    if (!row) return res.status(400).json({ message: '账号不存在' })
    if (!bcrypt.compareSync(password, row.password)) {
      return res.status(400).json({ message: '密码错误' })
    }
    res.json({ message: '登录成功', user: { id: row.id, phone: row.phone, role: row.role } })
  })
})

// 发布需求
app.post('/api/demands', (req, res) => {
  const { userId, grade, subjects, studentInfo, address, time, budget, phone } = req.body
  if (!userId || !grade || !subjects || !phone) {
    return res.status(400).json({ message: '请填写必要信息' })
  }
  db.run(
    'INSERT INTO demands (userId, grade, subjects, studentInfo, address, time, budget, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [userId, grade, subjects, studentInfo, address, time, budget, phone],
    function (err) {
      if (err) return res.status(500).json({ message: '发布失败' })
      res.json({ message: '发布成功', demandId: this.lastID })
    },
  )
})

// 获取所有需求
app.get('/api/demands', (_req, res) => {
  db.all('SELECT * FROM demands ORDER BY createTime DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ message: '获取失败' })
    res.json(rows)
  })
})

// 提交预约
app.post('/api/appointments', (req, res) => {
  const { tutorId, userId, name, phone, time, message } = req.body
  if (!tutorId || !userId || !name || !phone) {
    return res.status(400).json({ message: '请填写必要信息' })
  }
  db.run(
    'INSERT INTO appointments (tutorId, userId, name, phone, time, message) VALUES (?, ?, ?, ?, ?, ?)',
    [tutorId, userId, name, phone, time, message || ''],
    function (err) {
      if (err) return res.status(500).json({ message: '预约失败' })
      res.json({ message: '预约成功', appointmentId: this.lastID })
    },
  )
})

// 获取用户预约记录
app.get('/api/appointments', (req, res) => {
  const { userId } = req.query
  if (!userId) return res.status(400).json({ message: '缺少用户ID' })
  db.all('SELECT * FROM appointments WHERE userId = ? ORDER BY createTime DESC', [userId], (err, rows) => {
    if (err) return res.status(500).json({ message: '获取失败' })
    res.json(rows)
  })
})

// 删除预约
app.delete('/api/appointments/:id', (req, res) => {
  db.run('DELETE FROM appointments WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ message: '删除失败' })
    res.json({ message: '已删除' })
  })
})

// 删除需求
app.delete('/api/demands/:id', (req, res) => {
  db.run('DELETE FROM demands WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ message: '删除失败' })
    res.json({ message: '已删除' })
  })
})

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`)
})
