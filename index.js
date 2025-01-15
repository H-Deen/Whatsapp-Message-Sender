import express from "express";
import multer from "multer";
import xlsx from "xlsx";
import pkg from "whatsapp-web.js";
import qrcode from "qrcode"; // Import qrcode library
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const { Client, LocalAuth } = pkg;

// Resolve __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ dest: "uploads/" });

// Initialize WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
});
client.initialize();

let latestQrCode = null;

// Set EJS as the template engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware to serve static files (e.g., CSS, client-side JS)
app.use(express.static(path.join(__dirname, "public")));

// QR Code Event
client.on("qr", async (qr) => {
    console.log("QR Code received.");
    latestQrCode = await qrcode.toDataURL(qr); // Generate Base64 QR Code
});

// Ready Event
client.on("ready", () => {
    console.log("WhatsApp Client is ready!");
});

// Home Route
app.get("/", (req, res) => {
    res.render("index", { qrCode: latestQrCode, success: null, error: null });
});

// Endpoint to upload and process Excel file
app.post("/upload", upload.single("file"), async (req, res) => {
    try {
        const filePath = path.resolve(__dirname, req.file.path);
        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const students = xlsx.utils.sheet_to_json(sheet);

        if (students.length === 0) {
            return res.render("index", { qrCode: latestQrCode, success: null, error: "The file is empty or improperly formatted." });
        }

        const delay = 10000; // 10 seconds
        for (let student of students) {
            const { Name, WhatsAppNumber } = student;
            const message = `Hello ${Name}, congratulations! Your registration is confirmed.`;
            // Check if the number already includes the country code
            const formattedNumber = WhatsAppNumber.startsWith('92') ? WhatsAppNumber : `92${WhatsAppNumber}`;
            await client.sendMessage(`${formattedNumber}@c.us`, message);
            console.log(`Message sent to ${Name}`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }

        await fs.unlink(filePath);
        res.render("index", { qrCode: latestQrCode, success: "Messages sent successfully!", error: null });
    } catch (err) {
        console.error(err);
        res.render("index", { qrCode: latestQrCode, success: null, error: "An error occurred while processing the file." });
    }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));