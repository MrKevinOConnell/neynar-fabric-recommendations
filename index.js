const express = require("express");

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

//connect app to router in ./api
app.use("/api", require("./api"));

//listen
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
