const express = require("express");
const router = express.Router();

// const router = require("./router");
router.use("/subscribed", require("./subscribed"));

module.exports = router;
