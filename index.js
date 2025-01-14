import express from "express";
import multer from "multer";
import xlsx from "xlsx";
import { Client } from "whatsapp-web.js";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

// Utility to resolve __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express and Multer
const app = express();
const upload = multer({ dest: "uploads/" });

// Initialize WhatsApp Client
const client = new Client();
client.initialize();

// QR Code Event
client.on("qr", (qr) => {
    console.log("Scan this QR code with WhatsApp:");
    console.log(qr); // Display QR code in terminal
});

// Ready Event
client.on("ready", () => {
    console.log("WhatsApp Client is ready!");
});

// Function to send messages
const sendMessages = async (students, delay) => {
    for (let student of students) {
        try {
            const { Name, WhatsAppNumber } = student;
            const message = `Hello ${Name}, congratulations! Your registration is confirmed.`;
            await client.sendMessage(`${WhatsAppNumber}@c.us`, message);
            console.log(`Message sent to ${Name}`);
        } catch (error) {
            console.error(`Failed to send message to ${student.Name}:`, error.message);
        }

        // Wait for the specified delay between messages
        await new Promise((resolve) => setTimeout(resolve, delay));
    }
};

// Endpoint to upload and process Excel file
app.post("/upload", upload.single("file"), async (req, res) => {
    try {
        const filePath = path.resolve(__dirname, req.file.path);
        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const students = xlsx.utils.sheet_to_json(sheet);

        if (students.length === 0) {
            return res.status(400).json({ error: "The file is empty or improperly formatted." });
        }

        // Send messages (adjust delay as needed)
        const delay = 2000; // 2 seconds
        await sendMessages(students, delay);

        // Delete the uploaded file
        await fs.unlink(filePath);

        res.json({ message: "Messages sent successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "An error occurred while processing the file." });
    }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));