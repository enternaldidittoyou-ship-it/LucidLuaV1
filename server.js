require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");
const cors = require("cors");

const Key = require("./models/Key");
const User = require("./models/User");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(console.error);

/* 🔐 ENCRYPT */
function encrypt(text) {
  return crypto.createHmac("sha256", process.env.SECRET)
    .update(text)
    .digest("hex");
}

/* 🔒 SECURE LUA AUTH */
app.get("/secure", async (req, res) => {
  const { hwid, key } = req.query;

  if (!hwid || !key) return res.send("DENIED");

  const found = await Key.findOne({ key });

  if (!found || found.revoked) return res.send("DENIED");
  if (new Date() > found.expiresAt) return res.send("EXPIRED");

  if (!found.hwid) {
    found.hwid = hwid;
    await found.save();
  } else if (found.hwid !== hwid) {
    return res.send("HWID_MISMATCH");
  }

  return res.send(encrypt(found.key + hwid));
});

/* 🌐 WEBSITE AUTH */
app.post("/redeem", async (req, res) => {
  const { key, hwid } = req.body;

  const found = await Key.findOne({ key });

  if (!found) return res.json({ success:false, msg:"Invalid key" });
  if (found.revoked) return res.json({ success:false, msg:"Revoked" });
  if (new Date() > found.expiresAt)
    return res.json({ success:false, msg:"Expired" });

  if (!found.hwid) {
    found.hwid = hwid;
    await found.save();
  } else if (found.hwid !== hwid) {
    return res.json({ success:false, msg:"HWID locked" });
  }

  res.json({ success:true });
});

/* 🔑 ADMIN GENERATE */
app.post("/generate", async (req, res) => {
  const { password, duration } = req.body;

  if (password !== process.env.ADMIN_PASS)
    return res.status(403).send("Unauthorized");

  const key = genKey();
  const expiresAt = getExpire(duration);

  await Key.create({ key, expiresAt, createdBy:"admin" });

  res.json({ key });
});

/* 👥 LOGIN */
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username, password });

  if (!user) return res.json({ success:false });

  res.json({
    success:true,
    username:user.username,
    role:user.role,
    balance:user.balance
  });
});

/* 🔑 USER GENERATE */
app.post("/user-generate", async (req, res) => {
  const { username, duration } = req.body;

  const user = await User.findOne({ username });

  if (!user || (user.role !== "reseller" && user.role !== "admin"))
    return res.send("No permission");

  if (user.balance <= 0)
    return res.send("No balance");

  user.balance--;
  await user.save();

  const key = genKey();
  const expiresAt = getExpire(duration);

  await Key.create({ key, expiresAt, createdBy: username });

  res.json({ key });
});

/* 💰 ADD BALANCE */
app.post("/add-balance", async (req, res) => {
  const { password, username, amount } = req.body;

  if (password !== process.env.ADMIN_PASS)
    return res.send("Unauthorized");

  const user = await User.findOne({ username });
  if (!user) return res.send("User not found");

  user.balance += amount;
  await user.save();

  res.send("Balance added");
});

/* 🔄 RESET HWID */
app.post("/reset-hwid", async (req, res) => {
  const { password, key } = req.body;

  if (password !== process.env.ADMIN_PASS)
    return res.send("Unauthorized");

  const found = await Key.findOne({ key });
  if (!found) return res.send("Not found");

  found.hwid = null;
  await found.save();

  res.send("Reset");
});

/* ❌ REVOKE */
app.post("/revoke", async (req, res) => {
  const { password, key } = req.body;

  if (password !== process.env.ADMIN_PASS)
    return res.send("Unauthorized");

  await Key.updateOne({ key }, { revoked:true });
  res.send("Revoked");
});

/* 📊 ADMIN VIEW */
app.get("/admin", async (req, res) => {
  if (req.query.pass !== process.env.ADMIN_PASS)
    return res.send("Unauthorized");

  const keys = await Key.find();
  res.json(keys);
});

/* 🧰 HELPERS */
function genKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const part = () =>
    Array.from({ length:5 })
      .map(() => chars[Math.floor(Math.random()*chars.length)])
      .join("");

  return `LucidLua-${part()}-${part()}-${part()}`;
}

function getExpire(duration) {
  if (duration === "lifetime")
    return new Date("2999-01-01");

  return new Date(Date.now() + parseInt(duration)*86400000);
}

app.listen(3000, () => console.log("Server running"));