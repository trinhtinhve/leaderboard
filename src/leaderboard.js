const _ = require('lodash');
const Redis = require('ioredis');

const leaderboard = module.exports;

const LEADERBOARD_REDIS_KEY = 'leaderboard';
const BATCH_SIZE = 60000;
const PARALLEL_SIZE = 1000;

let _logger;
let _redis;

const getRedisKey = (seasionId) => {
  return `${LEADERBOARD_REDIS_KEY}_${seasionId}`;
}

leaderboard.init = (redisHost, redisPort, logger) => {
  _redis = new Redis({
    host: redisHost,
    port: redisPort,
    enableAutoPipelining: true,
  });

  _logger = logger;

  _redis.on('error', error => {
    _logger.error('Redis connection error', error);
  });
};

leaderboard.initWithRedis = (ioredis, logger) => {
  _redis = ioredis;
  _logger = logger;
};

leaderboard.setMMR = (mmr, ownerId, seasonId) => {
  try {
    _redis.zadd(getRedisKey(seasonId), mmr, ownerId);
  } catch (error) {
    _logger.error('Error for setMMR', error);
  }
};

leaderboard.setMMRs = (rankings, seasonId) => {
  try {
    _redis.zadd(getRedisKey(seasonId), rankings);
  } catch (error) {
    _logger.error('Error for setMMR', error);
  }
};

leaderboard.getRank = async (ownerId, seasonId) => {
  try {
    const rankIndex = await _redis.zrevrank(getRedisKey(seasonId), ownerId);
    return rankIndex !== null ? rankIndex + 1 : rankIndex;
  } catch (error) {
    _logger.error('Error for getRank', error);
    return null;
  }
};

leaderboard.getScore = async (ownerId, seasonId) => {
  try {
    return _redis.zscore(getRedisKey(seasonId), ownerId);
  } catch (error) {
    _logger.error('Error for getRank', error);
    return null;
  }
};

leaderboard.getTop = async (from = 0, to = -1, seasonId) => {
  try {
    const top = await _redis.zrevrange(getRedisKey(seasonId), from, to, 'WITHSCORES');

    return _.chain(top)
      .chunk(2)
      .map(rankData => {
        return { ownerId: rankData[0], mmr: +rankData[1] };
      })
      .value();
  } catch (error) {
    _logger.error('Error for getTop', error);
    return [];
  }
};

leaderboard.countMembers = async (seasionId) => {
  try {
    return _redis.zcard(getRedisKey(seasionId));
  } catch (error) {
    _logger.error('Error for countMemembers', error);
    return -1;
  }
};

leaderboard.syncAllMMRsToRedis = async (userDB, seasonId, filter = {}) => {
  try {
    const cursor = userDB.find(filter, 'publicAddress mmr').lean().cursor({ batchSize: BATCH_SIZE });
    await cursor.eachAsync(
      docs => {
        _logger.debug('start syncAllMMRsToRedis - docs count', docs.length);

        const syncData = _.flatMap(docs, doc => [doc.mmr, doc.publicAddress]);
        leaderboard.setMMRs(syncData, seasonId);

        _logger.debug('syncAllMMRsToRedis - docs count', docs.length);
      },
      { batchSize: BATCH_SIZE, parallel: PARALLEL_SIZE },
    );

    _logger.info('sync all mmrs successfully');
  } catch (error) {
    _logger.error('Error for syncAllMMRsToRedis', error);
  }
};

leaderboard.deleteAll = async () => {
  const keys = await _redis.keys(`${LEADERBOARD_REDIS_KEY}*`);
  keys.forEach(key => _redis.del(key));
};

leaderboard.delete = (seasonId) => {
  _redis.del(getRedisKey(seasonId));
}
