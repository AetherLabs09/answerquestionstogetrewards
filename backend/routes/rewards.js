module.exports = (db) => {
    const router = require('express').Router();

    router.get('/activity/:activityId', (req, res) => {
        try {
            const rewards = db.prepare(`
                SELECT * FROM reward_rules 
                WHERE activity_id = ?
                ORDER BY created_at DESC
            `).all(req.params.activityId);
            res.json(rewards);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.get('/:id', (req, res) => {
        try {
            const reward = db.prepare('SELECT * FROM reward_rules WHERE id = ?').get(req.params.id);
            if (!reward) {
                return res.status(404).json({ error: '奖励规则不存在' });
            }
            res.json(reward);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/', (req, res) => {
        try {
            const { activity_id, name, reward_type, condition_type, condition_value, reward_value, description } = req.body;
            const stmt = db.prepare(`
                INSERT INTO reward_rules (activity_id, name, reward_type, condition_type, condition_value, reward_value, description)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            const result = stmt.run(activity_id, name, reward_type, condition_type, condition_value, reward_value, description);
            res.json({ id: result.lastInsertRowid, message: '奖励规则创建成功' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.put('/:id', (req, res) => {
        try {
            const { name, reward_type, condition_type, condition_value, reward_value, description, status } = req.body;
            const stmt = db.prepare(`
                UPDATE reward_rules 
                SET name = ?, reward_type = ?, condition_type = ?, condition_value = ?, 
                    reward_value = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `);
            stmt.run(name, reward_type, condition_type, condition_value, reward_value, description, status, req.params.id);
            res.json({ message: '奖励规则更新成功' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.delete('/:id', (req, res) => {
        try {
            db.prepare('DELETE FROM reward_rules WHERE id = ?').run(req.params.id);
            res.json({ message: '奖励规则删除成功' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/claim', (req, res) => {
        try {
            const { user_id, session_id } = req.body;
            
            const session = db.prepare(`
                SELECT qs.*, a.name as activity_name
                FROM quiz_sessions qs
                JOIN activities a ON qs.activity_id = a.id
                WHERE qs.id = ? AND qs.user_id = ?
            `).get(session_id, user_id);

            if (!session) {
                return res.status(404).json({ error: '答题记录不存在' });
            }

            if (session.status !== 'completed') {
                return res.status(400).json({ error: '答题未完成' });
            }

            const rules = db.prepare(`
                SELECT * FROM reward_rules 
                WHERE activity_id = ? AND status = 'active'
            `).all(session.activity_id);

            const claimedRewards = [];
            const insertReward = db.prepare(`
                INSERT INTO user_rewards (user_id, activity_id, reward_rule_id, session_id, status)
                VALUES (?, ?, ?, ?, 'claimed')
            `);

            for (const rule of rules) {
                let shouldReward = false;

                if (rule.condition_type === 'pass' && session.total_score >= rule.condition_value) {
                    shouldReward = true;
                } else if (rule.condition_type === 'full_score' && session.accuracy === 100) {
                    shouldReward = true;
                } else if (rule.condition_type === 'score' && session.total_score >= rule.condition_value) {
                    shouldReward = true;
                }

                if (shouldReward) {
                    insertReward.run(user_id, session.activity_id, rule.id, session_id);
                    claimedRewards.push(rule);
                }
            }

            res.json({ 
                message: '奖励领取成功',
                rewards: claimedRewards
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.get('/user/:userId', (req, res) => {
        try {
            const rewards = db.prepare(`
                SELECT ur.*, rr.name, rr.reward_type, rr.reward_value, a.name as activity_name
                FROM user_rewards ur
                JOIN reward_rules rr ON ur.reward_rule_id = rr.id
                JOIN activities a ON ur.activity_id = a.id
                WHERE ur.user_id = ?
                ORDER BY ur.created_at DESC
            `).all(req.params.userId);
            res.json(rewards);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};
