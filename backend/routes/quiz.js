const { v4: uuidv4 } = require('uuid');

module.exports = (db) => {
    const router = require('express').Router();

    router.get('/rules/:activityId', (req, res) => {
        try {
            let rules = db.prepare('SELECT * FROM quiz_rules WHERE activity_id = ?').get(req.params.activityId);
            if (!rules) {
                const stmt = db.prepare(`
                    INSERT INTO quiz_rules (activity_id, question_count, time_limit, daily_attempts, level_count, passing_score)
                    VALUES (?, 10, 600, 3, 1, 60)
                `);
                stmt.run(req.params.activityId);
                rules = db.prepare('SELECT * FROM quiz_rules WHERE activity_id = ?').get(req.params.activityId);
            }
            res.json(rules);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/rules', (req, res) => {
        try {
            const { activity_id, question_count, time_limit, daily_attempts, level_count, passing_score } = req.body;
            const existing = db.prepare('SELECT id FROM quiz_rules WHERE activity_id = ?').get(activity_id);
            
            if (existing) {
                const stmt = db.prepare(`
                    UPDATE quiz_rules 
                    SET question_count = ?, time_limit = ?, daily_attempts = ?, 
                        level_count = ?, passing_score = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE activity_id = ?
                `);
                stmt.run(question_count, time_limit, daily_attempts, level_count, passing_score, activity_id);
            } else {
                const stmt = db.prepare(`
                    INSERT INTO quiz_rules (activity_id, question_count, time_limit, daily_attempts, level_count, passing_score)
                    VALUES (?, ?, ?, ?, ?, ?)
                `);
                stmt.run(activity_id, question_count, time_limit, daily_attempts, level_count, passing_score);
            }
            res.json({ message: '答题规则保存成功' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/start', (req, res) => {
        try {
            const { user_id, activity_id } = req.body;
            
            const rules = db.prepare('SELECT * FROM quiz_rules WHERE activity_id = ?').get(activity_id);
            if (!rules) {
                return res.status(400).json({ error: '活动规则未配置' });
            }

            const today = new Date().toISOString().split('T')[0];
            const attempts = db.prepare(`
                SELECT COUNT(*) as count FROM quiz_sessions 
                WHERE user_id = ? AND activity_id = ? AND date(started_at) = date(?)
            `).get(user_id, activity_id, today);

            if (attempts.count >= rules.daily_attempts) {
                return res.status(400).json({ error: '今日答题次数已用完' });
            }

            const questions = db.prepare(`
                SELECT * FROM questions 
                WHERE activity_id = ? AND status = 'active'
                ORDER BY RANDOM() 
                LIMIT ?
            `).all(activity_id, rules.question_count);

            const sessionStmt = db.prepare(`
                INSERT INTO quiz_sessions (user_id, activity_id, total_questions, level)
                VALUES (?, ?, ?, 1)
            `);
            const result = sessionStmt.run(user_id, activity_id, questions.length);

            res.json({
                session_id: result.lastInsertRowid,
                questions: questions.map(q => ({
                    id: q.id,
                    type: q.type,
                    content: q.content,
                    options: JSON.parse(q.options),
                    score: q.score
                })),
                time_limit: rules.time_limit,
                level: 1
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/submit-answer', (req, res) => {
        try {
            const { session_id, question_id, user_answer, time_spent } = req.body;
            
            const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(question_id);
            if (!question) {
                return res.status(404).json({ error: '题目不存在' });
            }

            const is_correct = question.answer === user_answer ? 1 : 0;
            const score = is_correct ? question.score : 0;

            const stmt = db.prepare(`
                INSERT INTO user_answers (user_id, activity_id, question_id, user_answer, is_correct, score, time_spent)
                SELECT ?, activity_id, ?, ?, ?, ?, ?
                FROM quiz_sessions WHERE id = ?
            `);
            stmt.run(
                db.prepare('SELECT user_id FROM quiz_sessions WHERE id = ?').get(session_id).user_id,
                question_id, user_answer, is_correct, score, time_spent, session_id
            );

            res.json({ is_correct, score, correct_answer: question.answer, explanation: question.explanation });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/submit', (req, res) => {
        try {
            const { session_id } = req.body;
            
            const stats = db.prepare(`
                SELECT 
                    COUNT(*) as total_questions,
                    SUM(is_correct) as correct_count,
                    SUM(score) as total_score
                FROM user_answers
                WHERE rowid IN (
                    SELECT MAX(rowid) FROM user_answers 
                    WHERE user_id = (SELECT user_id FROM quiz_sessions WHERE id = ?)
                    GROUP BY question_id
                )
            `).get(session_id);

            const accuracy = stats.total_questions > 0 
                ? (stats.correct_count / stats.total_questions * 100).toFixed(2) 
                : 0;

            const session = db.prepare('SELECT * FROM quiz_sessions WHERE id = ?').get(session_id);
            const rules = db.prepare('SELECT * FROM quiz_rules WHERE activity_id = ?').get(session.activity_id);

            const passed = stats.total_score >= rules.passing_score;

            db.prepare(`
                UPDATE quiz_sessions 
                SET total_score = ?, correct_count = ?, total_questions = ?, 
                    accuracy = ?, status = 'completed', completed_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(stats.total_score, stats.correct_count, stats.total_questions, accuracy, session_id);

            res.json({
                total_score: stats.total_score,
                correct_count: stats.correct_count,
                total_questions: stats.total_questions,
                accuracy,
                passed,
                passing_score: rules.passing_score
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.get('/history/:userId', (req, res) => {
        try {
            const history = db.prepare(`
                SELECT qs.*, a.name as activity_name
                FROM quiz_sessions qs
                JOIN activities a ON qs.activity_id = a.id
                WHERE qs.user_id = ?
                ORDER BY qs.started_at DESC
            `).all(req.params.userId);
            res.json(history);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};
