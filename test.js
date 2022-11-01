const leaderboard = require('./src/leaderboard');

leaderboard.init('18.142.53.238', '6379', console);
// leaderboard.deleteAll();
leaderboard.delete('');