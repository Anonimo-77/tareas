const { Schema, model } = require('mongoose');

const userSchema = Schema({
    username: String,
    password: String,
    year: Number
});

module.exports = model('User', userSchema);