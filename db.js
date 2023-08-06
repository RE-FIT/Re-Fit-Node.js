const mongoose = require('mongoose');
require('dotenv').config()

const connectDB = async () => {
    try {

        await mongoose.connect(process.env.MONGO_DB, {useNewUrlParser: true, useUnifiedTopology: true});

        const db = mongoose.connection;
        db.on('error', console.error.bind(console, 'connection error:'));
        db.once('open', function() {
            console.log("Connected to MongoDB!");
        });

    } catch (error) {
        console.error('Could not connect to MongoDB!', error);
        process.exit(1);
    }
};

module.exports = connectDB;