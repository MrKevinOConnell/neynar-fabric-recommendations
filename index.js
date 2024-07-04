const express = require("express");
const redis = require("redis");

const app = express();
const port = process.env.PORT || 3000;

// Initialize Redis client
const redis_client = redis.createClient();

redis_client.on("error", (err) => {
  console.error("Redis error:", err);
});

// Middleware to parse JSON bodies
app.use(express.json());

//connect app to router in ./api
app.use("/api", require("./api"));

//listen
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
