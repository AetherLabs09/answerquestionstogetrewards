const { v4: uuidv4 } = require('uuid');

module.exports = (db) => {
    const router = require('express').Router();

    router.get('/activity/:activityId', (req, res) => {
        try {
            const questions = db.prepare(`
                SELECT * FROM questions 
                WHERE activity_id = ?
                ORDER BY created_at DESC
            `).all(req.params.activityId);
            res.json(questions);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.get('/:id', (req, res) => {
        try {
            const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
            if (!question) {
                return res.status(404).json({ error: '题目不存在' });
            }
            res.json(question);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/', (req, res) => {
        try {
            const { activity_id, category, type, content, options, answer, explanation, score } = req.body;
            const stmt = db.prepare(`
                INSERT INTO questions (activity_id, category, type, content, options, answer, explanation, score)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            const result = stmt.run(
                activity_id, category, type, content, 
                JSON.stringify(options), answer, explanation, score
            );
            res.json({ id: result.lastInsertRowid, message: '题目创建成功' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/batch', (req, res) => {
        try {
            const { activity_id, questions } = req.body;
            const stmt = db.prepare(`
                INSERT INTO questions (activity_id, category, type, content, options, answer, explanation, score)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            const insertMany = db.transaction((items) => {
                for (const q of items) {
                    stmt.run(
                        activity_id, q.category, q.type, q.content,
                        JSON.stringify(q.options), q.answer, q.explanation, q.score || 10
                    );
                }
            });
            
            insertMany(questions);
            res.json({ message: '批量导入成功', count: questions.length });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.put('/:id', (req, res) => {
        try {
            const { category, type, content, options, answer, explanation, score, status } = req.body;
            const stmt = db.prepare(`
                UPDATE questions 
                SET category = ?, type = ?, content = ?, options = ?, 
                    answer = ?, explanation = ?, score = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `);
            stmt.run(category, type, content, JSON.stringify(options), answer, explanation, score, status, req.params.id);
            res.json({ message: '题目更新成功' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.delete('/:id', (req, res) => {
        try {
            db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
            res.json({ message: '题目删除成功' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.get('/check-duplicate/:activityId', (req, res) => {
        try {
            const duplicates = db.prepare(`
                SELECT content, COUNT(*) as count
                FROM questions
                WHERE activity_id = ?
                GROUP BY content
                HAVING count > 1
            `).all(req.params.activityId);
            res.json(duplicates);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};
