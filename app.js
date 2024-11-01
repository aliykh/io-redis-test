const express = require('express');
const Redis = require('ioredis');

// Configure Redis connection
const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = process.env.REDIS_PORT || 6379;
const redis = new Redis({
  host: redisHost,
  port: redisPort,
});

const app = express();
app.use(express.json());

// Endpoint to set a key
app.post('/set', async (req, res) => {
  const { key, value } = req.body;
  try {
    await redis.set(key, value);
    res.status(200).send({ message: `Key ${key} set successfully` });
  } catch (error) {
    res.status(500).send({ error: 'Error setting key in Redis' });
  }
});

// Endpoint to get a key
app.get('/get/:key', async (req, res) => {
  const { key } = req.params;
  try {
    const value = await redis.get(key);
    if (value) {
      res.status(200).send({ key, value });
    } else {
      res.status(404).send({ error: 'Key not found' });
    }
  } catch (error) {
    res.status(500).send({ error: 'Error retrieving key from Redis' });
  }
});

// Endpoint to unlink (delete) a key
app.delete('/unlink/:key', async (req, res) => {
  const { key } = req.params;
  try {
    await redis.unlink(key);
    res.status(200).send({ message: `Key ${key} unlinked successfully` });
  } catch (error) {
    res.status(500).send({ error: 'Error unlinking key in Redis' });
  }
});


app.delete('/purge/:pattern', async (req, res) => {
    const { pattern } = req.params;
    const ctx = {};  // Add any specific context you need here
    try {
      await purgeCacheByKey(pattern, ctx);
      res.status(200).send({ message: `Purged all cache keys for pattern ${pattern}` });
    } catch (error) {
      res.status(500).send({ error: `Error purging keys for pattern ${pattern}: ${error.message}` });
    }
  });
  


const purgeCacheByKey = (pattern, ctx) => new Promise((resolve, reject) => {
    const stream = redis.scanStream({
      match: `${pattern}*`,
    });
    stream.on('data', keys => {
      if (keys.length) {
        const pipeline = redis.pipeline();
        keys.forEach(key => {
          pipeline.unlink(key);  // Use unlink instead of del
        });
        pipeline.exec();
      }
    });
    stream.on('end', () => {
      console.log(`Purged all cache keys for pattern ${pattern}`);
      return resolve();
    });
    stream.on('error', exec => {
      console.log(`error purging all keys for pattern ${pattern} : ${exec}`, 'error');
      return reject(exec);
    });
  });
  

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`App is running on port ${port}`);
});
