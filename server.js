const express = require("express");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use("/downloads", express.static(path.join(__dirname, "downloads")));

const downloadsFolder = path.join(__dirname, "downloads");
if (!fs.existsSync(downloadsFolder)) fs.mkdirSync(downloadsFolder);

const ytdlp = path.join(__dirname, "yt-dlp");
const cookies = path.join(__dirname, "cookies.txt");

app.post("/download", (req, res) => {
    const { url, format } = req.body;

    if (!url) return res.json({ error: "URL missing" });

    const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
    const filename = `video_${Date.now()}.${format === "mp3" ? "mp3" : "mp4"}`;
    const output = path.join(downloadsFolder, filename);

    let command;

    // ------------------------------------------
    // YOUTUBE (MP4 / MP3)
    // ------------------------------------------
    if (isYouTube) {
        if (format === "mp3") {
            command = `${ytdlp} --cookies "${cookies}" -x --audio-format mp3 -o "${output}" "${url}"`;
        } else {
            command = `${ytdlp} --cookies "${cookies}" -f "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]" -o "${output}" "${url}"`;
        }
    }

    // ------------------------------------------
    // INSTAGRAM / FACEBOOK
    // ------------------------------------------
    else {
        command = `${ytdlp} --cookies "${cookies}" --user-agent "Mozilla/5.0" -o "${output}" "${url}"`;
    }

    console.log("Executing:", command);

    exec(command, (err) => {
        if (err) {
            console.log("Download error:", err);
            return res.json({ error: "Download failed. Check URL or login required." });
        }

        return res.json({
            success: true,
            downloadUrl: `/downloads/${filename}`,
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running: http://localhost:${PORT}`);
});
 