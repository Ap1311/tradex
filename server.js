const express = require('express');
const mysql = require('mysql2/promise');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Aarav@1311',
    database: 'tradex_db'
});

app.use(express.json());
app.use(express.static('public'));
app.use(session({ secret: 'ap1311_secret', resave: false, saveUninitialized: true }));

async function syncWealth() {
    const [comps] = await pool.query("SELECT id, price, history FROM companies");
    const [teams] = await pool.query("SELECT * FROM teams");
    if (!comps.length) return;

    const compMap = Object.fromEntries(comps.map(c => [c.id, c]));
    const currRound = comps[0].history.split(',').length - 1;

    for (const t of teams) {
        const stocks = JSON.parse(t.stocks || '[]');
        let assetVal = 0;
        stocks.forEach((qty, i) => {
            const company = comps[i]; 
            if (company) assetVal += (qty * company.price);
        });

        const totalWealth = parseFloat(t.purse) + assetVal;
        let wH = t.wealth_history.split(',');
        wH[currRound] = totalWealth;

        await pool.query("UPDATE teams SET wealth = ?, wealth_history = ? WHERE id = ?", 
            [totalWealth, wH.join(','), t.id]);
    }
    io.emit('data_update'); 
}

app.get('/api/get_data', async (req, res) => {
    const [settings] = await pool.query("SELECT * FROM settings WHERE id = 1");
    const [companies] = await pool.query("SELECT * FROM companies ORDER BY id ASC");
    const [teams] = await pool.query("SELECT * FROM teams");
    res.json({
        screenState: { activeView: settings[0].active_view, overlayActive: !!settings[0].overlay_active },
        companies: companies.map(c => ({ ...c, history: c.history.split(',').map(Number) })),
        teams: teams.map(t => ({ ...t, stocks: JSON.parse(t.stocks), wealth_history: t.wealth_history.split(',').map(Number) }))
    });
});

app.post('/api/admin/action', async (req, res) => {
    const { action, ...data } = req.body;
    try {
        if (action === 'update_round') {
            for (const [id, delta] of Object.entries(data.delta)) {
                const [rows] = await pool.query("SELECT history FROM companies WHERE id = ?", [id]);
                let h = rows[0].history.split(',').map(Number);
                let prev = h[data.round_id - 1] ?? h[h.length - 1];
                let newPrice = Math.max(0, prev + parseInt(delta));
                h[data.round_id] = newPrice;
                await pool.query("UPDATE companies SET price = ?, history = ? WHERE id = ?", [newPrice, h.join(','), id]);
            }
        } else if (action === 'auction_lock_bids') {
            for (const [tid, bid] of Object.entries(data.bids)) {
                const [team] = await pool.query("SELECT purse FROM teams WHERE id = ?", [tid]);
                const deduction = Math.min(parseFloat(bid || 0), team[0].purse);
                await pool.query("UPDATE teams SET purse = purse - ?, last_bid = ? WHERE id = ?", [deduction, deduction, tid]);
            }
        } else if (action === 'auction_resolve') {
            const [t] = await pool.query("SELECT last_bid FROM teams WHERE id = ?", [data.team_id]);
            const mult = data.status === 'correct' ? 2 : 0.5;
            await pool.query("UPDATE teams SET purse = purse + (? * ?), last_bid = 0 WHERE id = ?", [t[0].last_bid, mult, data.team_id]);
        } else if (action === 'update_portfolio') {
            const stocks = data.stocks.map(v => Math.max(0, parseInt(v)));
            const [team] = await pool.query("SELECT wealth FROM teams WHERE id = ?", [data.team_id]);
            const [comps] = await pool.query("SELECT price FROM companies ORDER BY id ASC");
            let assetVal = 0;
            stocks.forEach((q, i) => assetVal += (q * comps[i].price));
            await pool.query("UPDATE teams SET stocks = ?, purse = ? WHERE id = ?", [JSON.stringify(stocks), (team[0].wealth - assetVal), data.team_id]);
        } else if (action === 'sync_screen') {
            await pool.query("UPDATE settings SET active_view = ?, overlay_active = ? WHERE id = 1", [data.view, data.overlay]);
        } else if (action === 'sell_all') {
            const [t] = await pool.query("SELECT wealth FROM teams WHERE id = ?", [data.team_id]);
            await pool.query("UPDATE teams SET stocks = '[0,0,0,0,0,0,0]', purse = ? WHERE id = ?", [t[0].wealth, data.team_id]);
        } else if (action === 'add_team') {
            await pool.query("INSERT INTO teams (name, stocks, wealth_history, wealth, purse) VALUES (?, '[0,0,0,0,0,0,0]', '10000', 10000, 10000)", [data.team_name]);
        }
        await syncWealth();
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

server.listen(3000, () => console.log('Server running on http://localhost:3000'));
