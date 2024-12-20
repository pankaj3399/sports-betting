const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(bodyParser.json());
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS Configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
}));

// Database Connection
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log('Connected to MongoDB');

        app.use('/api/club', require('./routes/ClubTeam'));
        app.use('/api/player', require('./routes/Player'));
        app.use('/api/position', require('./routes/Position'));
        app.use('/api/country', require('./routes/Country'));
        app.use('/api/match', require('./routes/Match')); // Added Match routes

        // Log all registered routes
        console.log('\nRegistered Routes:');
        const listEndpoints = (app) => {
            app._router.stack.forEach((middleware) => {
                if (middleware.route) { // routes registered directly on the app
                    console.log(`${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${middleware.route.path}`);
                } else if (middleware.name === 'router') { // router middleware 
                    const baseRoute = middleware.regexp.toString()
                        .replace('\\/?(?=\\/|$)', '')
                        .replace(/^\^\\/, '')
                        .replace(/\\\/\?\(\?=\\\/\|\$\)$/, '')
                        .replace(/\\\//g, '/');

                    middleware.handle.stack.forEach((handler) => {
                        if (handler.route) {
                            const methods = Object.keys(handler.route.methods).join(', ').toUpperCase();
                            console.log(`${methods} ${baseRoute}${handler.route.path}`);
                        }
                    });
                }
            });
        };

        listEndpoints(app);

        app.listen(PORT, () => {
            console.log(`\nServer is running on port ${PORT}`);
        });
    })