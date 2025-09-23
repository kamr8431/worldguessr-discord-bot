const Database = require('better-sqlite3');
const path = require('path');

class QuizDatabase {
    constructor() {
        const dbPath = path.join(__dirname, 'quiz_data.db');
        this.db = new Database(dbPath);
        this.initTables();
    }

    initTables() {
        // User quiz statistics table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS user_stats (
                user_id TEXT NOT NULL,
                category TEXT NOT NULL,
                correct INTEGER DEFAULT 0,
                incorrect INTEGER DEFAULT 0,
                total_attempts INTEGER DEFAULT 0,
                last_attempt DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, category)
            )
        `);

        // Active quiz questions table (for tracking what's currently being asked)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS active_quizzes (
                channel_id TEXT PRIMARY KEY,
                category TEXT NOT NULL,
                question TEXT NOT NULL,
                correct_answer TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Add options column if it doesn't exist (migration)
        try {
            this.db.exec(`ALTER TABLE active_quizzes ADD COLUMN options TEXT`);
            console.log('✅ Added options column to active_quizzes table');
        } catch (error) {
            // Column already exists, ignore
        }


        // Quiz categories configuration
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS quiz_categories (
                category TEXT PRIMARY KEY,
                channel_id TEXT NOT NULL,
                enabled BOOLEAN DEFAULT 1,
                auto_post BOOLEAN DEFAULT 1,
                description TEXT
            )
        `);

        // Insert default TLD quiz category
        const insertCategory = this.db.prepare(`
            INSERT OR IGNORE INTO quiz_categories (category, channel_id, description)
            VALUES (?, ?, ?)
        `);

        insertCategory.run('tld', '1419838438349344829', 'Country TLD (Top Level Domain) Quiz');

        console.log('✅ Database tables initialized successfully');
    }

    // User stats methods
    getUserStats(userId, category = null) {
        if (category) {
            const stmt = this.db.prepare('SELECT * FROM user_stats WHERE user_id = ? AND category = ?');
            return stmt.get(userId, category);
        } else {
            const stmt = this.db.prepare('SELECT * FROM user_stats WHERE user_id = ?');
            return stmt.all(userId);
        }
    }

    updateUserStats(userId, category, isCorrect) {
        const stmt = this.db.prepare(`
            INSERT INTO user_stats (user_id, category, correct, incorrect, total_attempts)
            VALUES (?, ?, ?, ?, 1)
            ON CONFLICT (user_id, category) DO UPDATE SET
                correct = correct + ?,
                incorrect = incorrect + ?,
                total_attempts = total_attempts + 1,
                last_attempt = CURRENT_TIMESTAMP
        `);

        const correctIncrement = isCorrect ? 1 : 0;
        const incorrectIncrement = isCorrect ? 0 : 1;

        stmt.run(userId, category, correctIncrement, incorrectIncrement, correctIncrement, incorrectIncrement);
    }

    // Quiz question methods
    setActiveQuiz(channelId, category, question, correctAnswer, options = null) {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO active_quizzes (channel_id, category, question, correct_answer, options)
            VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(channelId, category, question, correctAnswer, options);
    }

    getActiveQuiz(channelId) {
        const stmt = this.db.prepare('SELECT * FROM active_quizzes WHERE channel_id = ?');
        return stmt.get(channelId);
    }

    clearActiveQuiz(channelId) {
        const stmt = this.db.prepare('DELETE FROM active_quizzes WHERE channel_id = ?');
        stmt.run(channelId);
    }


    // Category methods
    getQuizCategory(channelId) {
        const stmt = this.db.prepare('SELECT * FROM quiz_categories WHERE channel_id = ?');
        return stmt.get(channelId);
    }

    getAllCategories() {
        const stmt = this.db.prepare('SELECT * FROM quiz_categories WHERE enabled = 1');
        return stmt.all();
    }

    // Leaderboard methods
    getLeaderboard(category, limit = 10) {
        const stmt = this.db.prepare(`
            SELECT user_id, correct, incorrect, total_attempts,
                   ROUND((correct * 100.0 / total_attempts), 1) as accuracy
            FROM user_stats
            WHERE category = ? AND total_attempts > 0
            ORDER BY correct DESC, accuracy DESC
            LIMIT ?
        `);
        return stmt.all(category, limit);
    }

    getOverallLeaderboard(limit = 10) {
        const stmt = this.db.prepare(`
            SELECT user_id,
                   SUM(correct) as total_correct,
                   SUM(incorrect) as total_incorrect,
                   SUM(total_attempts) as total_attempts,
                   ROUND((SUM(correct) * 100.0 / SUM(total_attempts)), 1) as accuracy,
                   COUNT(DISTINCT category) as categories_played
            FROM user_stats
            WHERE total_attempts > 0
            GROUP BY user_id
            ORDER BY total_correct DESC, accuracy DESC
            LIMIT ?
        `);
        return stmt.all(limit);
    }

    getUserRank(userId, category) {
        const stmt = this.db.prepare(`
            SELECT COUNT(*) + 1 as rank
            FROM user_stats s1
            WHERE s1.category = ?
            AND (s1.correct > (SELECT correct FROM user_stats WHERE user_id = ? AND category = ?)
                 OR (s1.correct = (SELECT correct FROM user_stats WHERE user_id = ? AND category = ?)
                     AND s1.total_attempts <= (SELECT total_attempts FROM user_stats WHERE user_id = ? AND category = ?)))
        `);
        const result = stmt.get(category, userId, category, userId, category, userId, category);
        return result ? result.rank : null;
    }

    getUserOverallRank(userId) {
        const stmt = this.db.prepare(`
            WITH ranked_users AS (
                SELECT user_id,
                       SUM(correct) as total_correct,
                       SUM(total_attempts) as total_attempts,
                       ROW_NUMBER() OVER (ORDER BY SUM(correct) DESC,
                                         ROUND((SUM(correct) * 100.0 / SUM(total_attempts)), 1) DESC) as rank
                FROM user_stats
                WHERE total_attempts > 0
                GROUP BY user_id
            )
            SELECT rank FROM ranked_users WHERE user_id = ?
        `);
        const result = stmt.get(userId);
        return result ? result.rank : null;
    }

    close() {
        this.db.close();
    }
}

module.exports = QuizDatabase;