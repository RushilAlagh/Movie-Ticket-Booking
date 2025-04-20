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

const connectWithRetry = async (fn, serviceName, retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      await fn();
      console.log(`Connected to ${serviceName}`);
      return;
    } catch (error) {
      console.error(`${serviceName} connection failed (attempt ${i + 1}/${retries}):`, error.message);
      
      if (i === retries - 1) throw error;
      await new Promise(res => setTimeout(res, 2000 * (i + 1)));
    }
  }
};

const initializeRabbitMQ = async () => {
  const conn = await amqp.connect(process.env.RABBITMQ_URL);
  channel = await conn.createChannel();
  
  // Declare dead letter exchange first
  await channel.assertExchange('dead_letter', 'direct', { durable: true });
  
  // Main queue with DLX configuration
  await channel.assertQueue("booking_queue", {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': 'dead_letter',
      'x-dead-letter-routing-key': 'booking_queue.dlq'
    }
  });

  // Dead letter queue setup
  await channel.assertQueue("booking_queue.dlq", { durable: true });
  await channel.bindQueue("booking_queue.dlq", "dead_letter", "booking_queue.dlq");

  console.log("RabbitMQ channel and queues initialized with DLX");
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
  try {
    // PostgreSQL with retry
    await connectWithRetry(
      async () => {
        const client = await pool.connect();
        client.release();
      },
      "PostgreSQL",
      5
    );

    // RabbitMQ with retry and DLX setup
    await connectWithRetry(initializeRabbitMQ, "RabbitMQ", 5);

    // Redis connection verification
    await redisClient.ping();
    console.log("Redis verified");

  } catch (error) {
    console.error("Service initialization failed:", error);
    process.exit(1);
  }
};

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  if (!channel) {
    return res.status(503).json({ 
      success: false,
      error: "Service temporarily unavailable",
      details: "Message queue is initializing"
    });
  }
  req.amqpChannel = channel;
  next();
});
app.use("/api", (req, res, next) => {
    console.log(`[API Gateway] ${req.method} ${req.originalUrl}`);
    routes(req, res, next);
  });

const startServer = async () => {
  try {
    await initializeServices();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log("Connected services:");
      console.log("- PostgreSQL ✅");
      console.log("- Redis ✅"); 
      console.log("- RabbitMQ ✅");
      console.log("  - booking_queue ✅");
      console.log("  - booking_queue.dlq ✅");
      console.log("  - dead_letter exchange ✅");
    });
  } catch (error) {
    console.error("💥 Critical startup failure:", error);
    process.exit(1);
  }
};

process.on("SIGINT", async () => {
  console.log("\n🔻 Shutting down gracefully...");
  try {
    await redisClient.quit();
    await pool.end();
    if (channel) await channel.close();
    console.log("👋 All connections closed");
  } catch (error) {
    console.error("Shutdown error:", error);
  }
  process.exit(0);
});

startServer();
