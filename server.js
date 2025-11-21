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

/* ----------------------------------------------------------
   FETCH VIDEO INFO (THUMBNAIL, TITLE)
----------------------------------------------------------- */
app.post("/get-info", (req, res) => {
    const { url } = req.body;

    if (!url) return res.json({ error: "URL missing" });

    const command = `${ytdlp} --cookies "${cookies}" --dump-json "${url}"`;

    exec(command, { maxBuffer: 1024 * 5000 }, (err, stdout) => {
        if (err) {
            console.log("Meta fetch error:", err);
            return res.json({ error: "Could not fetch video info" });
        }

        try {
            const info = JSON.parse(stdout);

            return res.json({
                success: true,
                title: info.title || "No title",
                thumbnail:
                    info.thumbnail ||
                    (info.thumbnails && info.thumbnails.length > 0
                        ? info.thumbnails[0].url
                        : ""),
            });
        } catch (e) {
            return res.json({ error: "Invalid info received" });
        }
    });
});

/* ----------------------------------------------------------
   DOWNLOAD SYSTEM + AUTO DELETE + DYNAMIC FILENAME
----------------------------------------------------------- */
app.post("/download", (req, res) => {
    const { url, format } = req.body;

    if (!url) return res.json({ error: "URL missing" });

    // Detect Platform
    let prefix = "video";

    if (url.includes("instagram.com")) prefix = "insta";
    else if (url.includes("facebook.com") || url.includes("fb.watch")) prefix = "fb";
    else if (url.includes("youtube.com") || url.includes("youtu.be")) prefix = "yt";

    const extension = format === "mp3" ? "mp3" : "mp4";
    const filename = `${prefix}_${Date.now()}.${extension}`;
    const output = path.join(downloadsFolder, filename);

    let command;

    const isYouTube = prefix === "yt";

    // YouTube Logic
    if (isYouTube) {
        if (format === "mp3") {
            command = `${ytdlp} --cookies "${cookies}" -x --audio-format mp3 -o "${output}" "${url}"`;
        } else {
            command = `${ytdlp} --cookies "${cookies}" -f "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]" -o "${output}" "${url}"`;
        }
    }
    // Instagram / Facebook Logic
    else {
        command = `${ytdlp} --cookies "${cookies}" --user-agent "Mozilla/5.0" -o "${output}" "${url}"`;
    }

    console.log("Executing:", command);

    exec(command, (err) => {
        if (err) {
            console.log("Download error:", err);
            return res.json({ error: "Download failed. Check URL or login required." });
        }

        // Send file URL
        res.json({
            success: true,
            downloadUrl: `/downloads/${filename}`,
            filename: filename
        });

        /* ---------------------------------------------------
           AUTO DELETE FILE AFTER 2 MINUTES
        --------------------------------------------------- */
        setTimeout(() => {
            fs.unlink(output, (err) => {
                if (!err) {
                    console.log("🗑️ Auto-deleted:", output);
                } else {
                    console.log("⚠️ Delete failed:", err);
                }
            });
        }, 2 * 60 * 1000); // 2 minutes
    });
});

app.listen(PORT, () => {
    console.log(`Server running: http://localhost:${PORT}`);
});
