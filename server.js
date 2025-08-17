import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// Ensure upload directories exist
if (!fs.existsSync("uploads/images")) fs.mkdirSync("uploads/images", { recursive: true });
if (!fs.existsSync("uploads/sources")) fs.mkdirSync("uploads/sources", { recursive: true });

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            if (file.fieldname === "image") cb(null, "uploads/images");
            else cb(null, "uploads/sources");
        },
        filename: (req, file, cb) => {
            cb(null, Date.now() + "-" + file.originalname);
        }
    })
});

// Load existing data
let data = [];
if (fs.existsSync("data.json")) {
    try {
        data = JSON.parse(fs.readFileSync("data.json"));
    } catch {
        data = [];
    }
}

// ✅ Login API
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    if (username === "shoaib" && password === "shoaib123@") {
        res.json({ success: true });
    } else {
        res.status(403).json({ error: "Invalid credentials" });
    }
});

// ✅ Upload item
app.post("/upload", upload.fields([{ name: "image" }, { name: "source" }]), (req, res) => {
    const { title, description } = req.body;

    const imagePath = req.files["image"] ? "/uploads/images/" + req.files["image"][0].filename : "";
    const sourcePath = req.files["source"] ? "/uploads/sources/" + req.files["source"][0].filename : "";

    const newItem = {
        id: Date.now(),
        title,
        description,
        image: imagePath,
        source: sourcePath
    };

    data.push(newItem);
    fs.writeFileSync("data.json", JSON.stringify(data, null, 2));

    res.json({ success: true, item: newItem });
});

// ✅ Get all items
app.get("/items", (req, res) => {
    res.json(data);
});

// ✅ Delete item + files
app.delete("/items/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const item = data.find(i => i.id === id);

    if (!item) {
        return res.status(404).json({ error: "Item not found" });
    }

    // Delete image file
    if (item.image) {
        const imgPath = path.join("public", item.image);
        const imgPathAlt = path.join(".", item.image);
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        else if (fs.existsSync(imgPathAlt)) fs.unlinkSync(imgPathAlt);
    }

    // Delete source file
    if (item.source) {
        const srcPath = path.join("public", item.source);
        const srcPathAlt = path.join(".", item.source);
        if (fs.existsSync(srcPath)) fs.unlinkSync(srcPath);
        else if (fs.existsSync(srcPathAlt)) fs.unlinkSync(srcPathAlt);
    }

    // Remove from data array
    data = data.filter(i => i.id !== id);
    fs.writeFileSync("data.json", JSON.stringify(data, null, 2));

    res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
