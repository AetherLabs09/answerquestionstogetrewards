module.exports = (db) => {
    const router = require('express').Router();

    router.get('/', (req, res) => {
        try {
            const activities = db.prepare(`
                SELECT a.*, 
                       (SELECT COUNT(*) FROM questions WHERE activity_id = a.id) as question_count
                FROM activities a
                ORDER BY a.created_at DESC
            `).all();
            res.json(activities);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.get('/:id', (req, res) => {
        try {
            const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id);
            if (!activity) {
                return res.status(404).json({ error: '活动不存在' });
            }
            res.json(activity);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/', (req, res) => {
        try {
            const { name, start_time, end_time, target_audience, rules, cover_image } = req.body;
            const stmt = db.prepare(`
                INSERT INTO activities (name, start_time, end_time, target_audience, rules, cover_image)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            const result = stmt.run(name, start_time, end_time, target_audience, rules, cover_image);
            res.json({ id: result.lastInsertRowid, message: '活动创建成功' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.put('/:id', (req, res) => {
        try {
            const { name, start_time, end_time, target_audience, rules, cover_image, status } = req.body;
            const stmt = db.prepare(`
                UPDATE activities 
                SET name = ?, start_time = ?, end_time = ?, target_audience = ?, 
                    rules = ?, cover_image = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `);
            stmt.run(name, start_time, end_time, target_audience, rules, cover_image, status, req.params.id);
            res.json({ message: '活动更新成功' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.delete('/:id', (req, res) => {
        try {
            db.prepare('DELETE FROM activities WHERE id = ?').run(req.params.id);
            res.json({ message: '活动删除成功' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};
