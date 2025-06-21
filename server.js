const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Middleware
app.use(express.json());
app.use(express.static('public')); // Serve static files from public directory

// Initialize data file if it doesn't exist
async function initializeDataFile() {
    try {
        await fs.access(DATA_FILE);
    } catch (error) {
        // File doesn't exist, create it with default data
        const defaultData = getDefaultData();
        
        await fs.writeFile(DATA_FILE, JSON.stringify(defaultData, null, 2));
        console.log('Created data.json with default meal plan');
    }
}

function getDefaultData() {
    return {
        // Day 1: Saturday 6/21
        "day1-where": "Fazio house",
        "day1-meal1-title": "Soup & Sandwiches and chips",
        "day1-meal1-shopping": "Fazio",
        "day1-meal1-prep": "Fazio",
        "day1-meal1-eaters": "All but Paul",

        // Day 2: Sunday 6/22
        "day2-where": "Fazio house",
        "day2-meal1-title": "Meat",
        "day2-meal1-shopping": "Fazio",
        "day2-meal1-prep": "Fazio",
        "day2-meal1-eaters": "All but paul",

        // Day 3: Monday 6/23
        "day3-where": "Paul's house",
        "day3-meal1-title": "Pizza",
        "day3-meal1-shopping": "paul",
        "day3-meal1-ingredients": "Black olives, mushrooms, onions, green bell peppers, chicken, pineapple",
        "day3-meal1-prep": "Paul",
        "day3-meal1-eaters": "All",

        // Day 4: Tuesday 6/24
        "day4-context": "(Rachel's birthday)",

        // Day 5: Wednesday 6/25
        "day5-where": "Paul's house",
        "day5-meal1-title": "Breakfast foods",
        "day5-meal1-shopping": "Fazio",
        "day5-meal1-ingredients": "eggs, veg sausage",
        "day5-meal1-prep": "Fazio",
        "day5-meal1-eaters": "all but Sal & Paul",
        "day5-meal2-title": "Breakfast foods",
        "day5-meal2-shopping": "Paul",
        "day5-meal2-ingredients": "waffles, fruit (options: blueberries, strawberries, pineapple, kiwi)",
        "day5-meal2-prep": "Paul",
        "day5-meal2-eaters": "all but Sal",

        // Day 6: Thursday 6/26
        "day6-context": "(With Sarah)",
        "day6-where": "[Eem on N. Williams](https://www.eempdx.com/)",

        // Day 7: Friday 6/27
        "day7-where": "Fazio house",
        "day7-meal1-title": "Pad Thai",
        "day7-meal1-shopping": "Fazio",
        "day7-meal1-prep": "Fazio",
        "day7-meal1-eaters": "Rach, Hailey, Sal",
        "day7-meal2-title": "Bring food",
        "day7-meal2-eaters": "Mom, Dad, Paul",

        // Day 8: Saturday 6/28
        "day8-context": "(Hailey brings leftover Pad Thai)",
        "day8-where": "Restaurant TBD",

        // Day 9: Sunday 6/29
        "day9-context": "(Hailey's birthday)",
        "day9-where": "Fazio house",
        "day9-meal1-title": "Omelettes, grits, fruit, & veggie sausage",
        "day9-meal1-shopping": "Fazio",
        "day9-meal1-prep": "Fazio",
        "day9-meal1-eaters": "All",
        "day9-meal2-title": "Roasted pumpkin Thai risotto / Spiced Pumpkin muffins",
        "day9-meal2-shopping": "Paul",
        "day9-meal2-prep": "Paul",
        "day9-meal2-eaters": "All"
    };
}

// API Routes
app.get('/api/data', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error reading data:', error);
        res.status(500).json({ error: 'Failed to read data' });
    }
});

app.post('/api/data', async (req, res) => {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Error writing data:', error);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
async function startServer() {
    await initializeDataFile();
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
        console.log('Open your browser to start editing the meal plan!');
    });
}

startServer().catch(console.error); 