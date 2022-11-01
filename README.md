# PVU-leaderboard
The leaderboard service is to calculate the ranking by mmr, get leaderboard by range and sync all of current MMRs for all users to Redis.
### How to use leaderboard
  Leaderboard depends on Redis, so we need to set host and port of Redis for Leaderboard by:
    leaderboard.init(redisHost, redisPort, logger);
  if we already have a Redis connection, we can use this one instead:
    leaderboard.initWithRedis = (ioredis, logger); // just support for ioreids

### API
#### setMMR
  when user's mmr changed, call this api to update, then call call getRank to get the latest one.
#### setMMRs
  set multiple mmrs with this format: [mmr1, "ownerId1", mmr2, "ownerId2",....]
#### getRank
  get the current user's rank in realtime.
#### getTop
  get leaderboard with the range [0, n], default get ranks of all users.
#### syncAllMMRsToRedis
  this api is to load all of mmrs in mongodb to redis. It's now just supporting with fields: publicAddress, mmr in UserDB.