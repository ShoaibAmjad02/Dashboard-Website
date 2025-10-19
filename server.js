import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 3000;

// ✅ ESM me __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Ensure directories exist
if (!fs.existsSync(path.join(__dirname, "uploads/images"))) fs.mkdirSync(path.join(__dirname, "uploads/images"), { recursive: true });
if (!fs.existsSync(path.join(__dirname, "uploads/sources"))) fs.mkdirSync(path.join(__dirname, "uploads/sources"), { recursive: true });

// ✅ Multer storage
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.fieldname === "image") cb(null, path.join(__dirname, "uploads/images"));
      else cb(null, path.join(__dirname, "uploads/sources"));
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + "-" + file.originalname);
    },
  }),
});

// ✅ Load users + data
let users = [];
let data = [];

if (fs.existsSync(path.join(__dirname, "users.json"))) {
  try { users = JSON.parse(fs.readFileSync(path.join(__dirname, "users.json"))); } 
  catch { users = []; }
}

if (fs.existsSync(path.join(__dirname, "data.json"))) {
  try { data = JSON.parse(fs.readFileSync(path.join(__dirname, "data.json"))); } 
  catch { data = []; }
}

// ✅ Signup API
app.post("/signup", (req, res) => {
  const { username, email, password, confirmPassword } = req.body;
  if (!username || !email || !password || !confirmPassword)
    return res.status(400).json({ error: "All fields are required" });
  if (password !== confirmPassword)
    return res.status(400).json({ error: "Passwords do not match" });

  const existingUser = users.find(u => u.username === username || u.email === email);
  if (existingUser) return res.status(400).json({ error: "Username or Email already exists" });

  const newUser = { id: Date.now(), username, email, password };
  users.push(newUser);
  fs.writeFileSync(path.join(__dirname, "users.json"), JSON.stringify(users, null, 2));
  res.json({ success: true, message: "Signup successful!" });
});

// ✅ Login API
app.post("/login", (req, res) => {
  const { username, email, password } = req.body;
  const user = users.find(u => (u.username === username || u.email === email) && u.password === password);
  if (!user) return res.status(403).json({ error: "Invalid username/email or password" });
  res.json({ success: true, user });
});

// ✅ Upload API
app.post("/upload", upload.fields([{ name: "image" }, { name: "source" }]), (req, res) => {
  const { title, description, username } = req.body;
  const imagePath = req.files["image"] ? "/uploads/images/" + req.files["image"][0].filename : "";
  const sourcePath = req.files["source"] ? "/uploads/sources/" + req.files["source"][0].filename : "";

  const newItem = { id: Date.now(), title, description, username, image: imagePath, source: sourcePath };
  data.push(newItem);
  fs.writeFileSync(path.join(__dirname, "data.json"), JSON.stringify(data, null, 2));
  res.json({ success: true, item: newItem });
});

// ✅ Fetch all items
app.get("/items", (req, res) => res.json(data));

// ✅ Delete item + files
app.delete("/items/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const item = data.find(i => i.id === id);
  if (!item) return res.status(404).json({ error: "Item not found" });

  if (item.image) {
    const imgPath = path.join(__dirname, item.image);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  }

  if (item.source) {
    const srcPath = path.join(__dirname, item.source);
    if (fs.existsSync(srcPath)) fs.unlinkSync(srcPath);
  }

  data = data.filter(i => i.id !== id);
  fs.writeFileSync(path.join(__dirname, "data.json"), JSON.stringify(data, null, 2));
  res.json({ success: true });
});

// ✅ Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

// ✅ Redirect /dashboard.html only if NOT logged in (check via query)
app.get("/dashboard.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public/dashboard.html"));
});

// ✅ Home page
app.get("/home", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));

app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
