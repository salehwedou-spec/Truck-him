const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');

let db = [];

app.use(express.static(__dirname));

app.get('/track', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/log', (req, res) => {
    let { uid, lat, lon } = req.query;
    db.push({ uid, lat, lon, time: new Date().toISOString() });
    fs.writeFileSync('logs.json', JSON.stringify(db, null, 2));
    res.send("تم تسجيل الموقع");
});

app.get('/view/:uid', (req, res) => {
    res.sendFile(path.join(__dirname, 'view.html'));
});

app.get('/data/:uid', (req, res) => {
    res.json(db.filter(e => e.uid === req.params.uid));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
