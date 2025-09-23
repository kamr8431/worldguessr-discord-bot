class GenericUtils {
    static getCategoryDisplayName(category) {
        switch(category) {
            case 'tld': return 'Country TLD';
            case 'flags': return 'Country Flags';
            default: return category.toUpperCase();
        }
    }

    static formatAccuracy(correct, total) {
        return ((correct / total) * 100).toFixed(1);
    }

    static async fetchUserSafely(client, userId) {
        try {
            const user = await client.users.fetch(userId);
            return user.displayName || user.username;
        } catch (error) {
            return `User ${userId}`;
        }
    }

    static formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }

    static getRankMedal(position) {
        const medals = ['🥇', '🥈', '🥉'];
        return position < 3 ? medals[position] : `**${position + 1}.**`;
    }
}

module.exports = GenericUtils;