const { Schema, model } = require('mongoose'); 

const taskSchema = new Schema({
    name: String,
    description: String,
    subject: String,
    date: String,
    done: Boolean,
    sended: Boolean,
    user: String
});

module.exports = model('Task', taskSchema);