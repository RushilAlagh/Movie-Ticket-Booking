const redis = require("redis");

const client = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    reconnectStrategy: (attempts) => {
      console.log(`Redis reconnect attempt: ${attempts}`);
      return Math.min(attempts * 100, 5000);
    }
  }
});

// Event handlers
client.on("connect", () => console.log("Redis connection established"));
client.on("ready", () => console.log("Redis ready for commands"));
client.on("error", (err) => console.error("Redis error:", err));
client.on("end", () => console.log("Redis connection closed"));
client.on("reconnecting", () => console.log("Redis reconnecting..."));

// Connect immediately when module loads
client.connect()
  .catch(err => console.error("Initial Redis connection failed:", err));

module.exports = client;