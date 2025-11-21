const express = require("express");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use("/downloads", express.static(path.join(__dirname, "downloads")));

// Ensure downloads folder exists
const downloadsFolder = path.join(__dirname, "downloads");
if (!fs.existsSync(downloadsFolder)) fs.mkdirSync(downloadsFolder);

// IMPORTANT FOR CODESPACES
const ytdlp = path.join(__dirname, "yt-dlp");
const cookies = path.join(__dirname, "cookies.txt");

app.post("/download", (req, res) => {
    const { url, format } = req.body;

    if (!url) return res.json({ error: "URL missing" });

    const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");

    const filename = `video_${Date.now()}.${format === "mp3" ? "mp3" : "mp4"}`;
    const output = path.join(downloadsFolder, filename);

    let command;

    // ---------------------------------------------------
    // YOUTUBE
    // ---------------------------------------------------
    if (isYouTube) {
        if (format === "mp3") {
            // MP3 extract
            command =
                `${ytdlp} --cookies "${cookies}" ` +
                `-x --audio-format mp3 -o "${output}" "${url}"`;
        } else {
            // Stable MP4 for Codespaces (works 100%)
            command =
                `${ytdlp} --cookies "${cookies}" ` +
                `-f "mp4" -o "${output}" "${url}"`;
        }
    }

    // ---------------------------------------------------
    // INSTAGRAM / FACEBOOK (unchanged)
    // ---------------------------------------------------
    else {
        command =
            `${ytdlp} --cookies "${cookies}" ` +
            `--user-agent "Mozilla/5.0" ` +
            `-o "${output}" "${url}"`;
    }

    console.log("\nExecuting:", command, "\n");

    exec(command, (err) => {
        if (err) {
            console.log("Download error:", err);
            return res.json({
                error: "Download failed. Invalid URL or cookies required.",
            });
        }

        return res.json({
            success: true,
            downloadUrl: `/downloads/${filename}`,
        });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running: http://localhost:${PORT}`);
});
