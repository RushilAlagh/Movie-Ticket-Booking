const express = require("express");
const cors = require("cors");
require("dotenv").config();
const redisClient = require("./redisClient");
const { pool } = require("./db");
const amqp = require("amqplib");
const routes = require("./routes");

const app = express();
const PORT = process.env.PORT || 4000;
let channel;

const corsOptions = {
    origin: 'http://localhost:3000', // Replace with your frontend URL
    methods: ['GET', 'POST'],
  };
  
  app.use(cors(corsOptions));
const connectWithRetry = async (fn, serviceName, retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      await fn();
      console.log(`✅ Connected to ${serviceName}`);
      return;
    } catch (error) {
      console.error(`❌ ${serviceName} connection failed (attempt ${i + 1}/${retries}):`, error.message);
      if (i === retries - 1) throw error;
      await new Promise(res => setTimeout(res, 2000 * (i + 1)));
    }
  }
};

const initializeRabbitMQ = async () => {
  const conn = await amqp.connect(process.env.RABBITMQ_URL);
  channel = await conn.createChannel();

  await channel.assertExchange("dead_letter", "direct", { durable: true });

  await channel.assertQueue("booking_queue", {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": "dead_letter",
      "x-dead-letter-routing-key": "booking_queue.dlq",
    },
  });

  await channel.assertQueue("booking_queue.dlq", { durable: true });
  await channel.bindQueue("booking_queue.dlq", "dead_letter", "booking_queue.dlq");

  console.log("📬 RabbitMQ channel & queues ready (DLX configured)");
};

const initializeDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
  } finally {
    client.release();
  }
};

const initializeServices = async () => {
  await connectWithRetry(initializeDatabase, "PostgreSQL");
  await connectWithRetry(initializeRabbitMQ, "RabbitMQ");

  await connectWithRetry(async () => {
    await redisClient.ping();
  }, "Redis");
};

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  if (!channel) {
    return res.status(503).json({
      success: false,
      message: "RabbitMQ channel not ready",
    });
  }
  req.amqpChannel = channel;
  next();
});

app.use("/api", (req, res, next) => {
  console.log(`[API] ${req.method} ${req.originalUrl}`);
  routes(req, res, next);
});

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    await redisClient.ping();
    res.json({ status: "ok", services: ["PostgreSQL", "Redis", "RabbitMQ"] });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

const startServer = async () => {
  try {
    await initializeServices();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("💥 Startup failed:", err);
    process.exit(1);
  }
};

process.on("SIGINT", async () => {
  console.log("\n⏹️ Graceful shutdown...");
  try {
    if (redisClient) await redisClient.quit();
    if (channel) await channel.close();
    await pool.end();
    console.log("✅ Services closed. Bye!");
  } catch (err) {
    console.error("Shutdown error:", err);
  }
  process.exit(0);
});

startServer();
