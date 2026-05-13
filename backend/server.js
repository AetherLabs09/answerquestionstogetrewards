const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const dbPath = process.env.DB_PATH || path.join(__dirname, '../db/quiz.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

const initSql = require('fs').readFileSync(path.join(__dirname, 'database/init.sql'), 'utf-8');
db.exec(initSql);

const activityRoutes = require('./routes/activities')(db);
const questionRoutes = require('./routes/questions')(db);
const quizRoutes = require('./routes/quiz')(db);
const rewardRoutes = require('./routes/rewards')(db);

app.use('/api/activities', activityRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/rewards', rewardRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: '服务器内部错误', message: err.message });
});

process.on('SIGINT', () => {
    db.close();
    process.exit(0);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在端口 ${PORT}`);
});
