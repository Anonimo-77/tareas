const express = require('express');
const app = express();
const path = require('path');
const server = require('http').Server(app);
const io = require('socket.io').listen(server);
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const expSession = require('express-session');
const sharedSession = require('express-socket.io-session');
const fs = require('fs');
const timeout = require('connect-timeout');


// Importar variables de entorno locales
require('dotenv').config({
    path: 'variables.env'
});
const DB_URL = (app.get('env') == "development") ? process.env.DB_URL : "mongodb+srv://root:Manucanal77@cluster0.rc5bq.mongodb.net/test?retryWrites=true&w=majority"; 


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
let session = expSession({
    secret: 'keyboard cat',
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: 8*60*60*1000,
        secure: true
    }
})
app.use(session);
app.use(haltOnTimedout);

function haltOnTimedout (req, res, next) {
    if (!req.timedout) next()
} 

mongoose.connect(DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: true
}, (db) => {
    console.log('DB is connected');
});

const Task = require('./models/Task');
const User = require('./models/User');



io.use(sharedSession(session));

io.sockets.on('connection', (socket) => {
    console.log('new user connected');
    Task.find({}, (err,tasks) => {
        if (err) throw err;
        if (tasks) {
            socket.emit('tasks', JSON.stringify(tasks));
        }
    });
    socket.on('updateDone', (id,checked) => {
        Task.findOneAndUpdate({ _id: mongoose.Types.ObjectId(id) }, { done: checked }, (err,doc) => {
            if (err) throw err;
            socket.emit('reload');
        });
    });
    socket.on('updateSended', (id,checked) => {
        Task.findOneAndUpdate({ _id: mongoose.Types.ObjectId(id) }, { sended: checked }, (err,doc) => {
            if (err) throw err;
            socket.emit('reload');
        });
    });
    socket.on('delete', (id) => {
        Task.findOneAndDelete({_id: mongoose.Types.ObjectId(id)}, (err,doc) => {
            if (err) throw err;
            socket.emit('reload');
        });
    });
    socket.on('getYear', (id) => {
        User.findOne({_id: new mongoose.Types.ObjectId(id)}, (err, user) => {
            if (err) throw err;
            if (user) {
                socket.emit('rgetYear', user.year.toString());
            }
        });
    });
});

app.get('/bootstrap.min.css', (req,res) => {
    res.sendFile(path.resolve(__dirname, '../node_modules', 'bootstrap', 'dist','css','bootstrap.min.css'));
});

app.get('/font-awesome.min.js', (req,res) => {
    res.sendFile(path.resolve(__dirname, 'views', 'font-awesome.min.js'));
});

app.get('/', async (req,res) => {
        res.redirect('/register');
});

app.post('/session/:id', (req,res) => {
    req.method = "get";

    const { name, description, subject, date } = req.body;
    let newTask = new Task({
        name: name,
        description: description,
        subject: subject,
        date: date.toString(),
        done: false,
        sended: false,
        user: req.params.id
    });
    newTask.save();
    res.redirect('/session/'+req.params.id);
});
app.get('/login', (req,res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});
app.post('/login', (req,res) => {
    const { name, pass } = req.body;
    User.findOne({ username: name }, (err,user) => {
        if (bcrypt.compareSync(pass, user.password)) {
            res.redirect('/session/'+user._id.toString());
            
        } else {
            res.redirect('/login');
        }
    });
});
app.get('/register', (req,res) => {
    res.sendFile(path.resolve(__dirname, 'views', 'register.html'));
});
app.post('/register', (req,res) => {
    console.log('post');
    let { name, pass, rpass, year } = req.body;
    console.log(name);
    User.findOne({ username: name }, function (err, existsuser) {
        if (err) throw err;
        if (existsuser) {
            res.redirect('/register');
        } else {
            if (pass == rpass) {
                bcrypt.genSalt(10, (err,salt) => {
                    if (err) throw err;
                    if (salt) {
                        bcrypt.hash(pass, salt, (err, hash) => {
                            if (err) throw err;
                            if (hash) {
                                console.log(hash);
                                year = Number(year);
                                let newUser = new User({
                                    username: name,
                                    password: hash,
                                    year: year
                                });
                                newUser.save();
                                res.redirect('/login');
                            }
                        });
                    }
                });
            }
        }
    });
});


app.get('/session/:id', (req,res) => {
    let txt = fs.readFileSync(path.join(__dirname, 'views','index.html'),{ encoding: 'utf-8' });
    txt = txt.replace('<script>',`<script>var user = "${req.params.id.toString()}"`);
    res.send(txt);
});

// Leer localhost de variables y puerto
const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || 3000;

server.listen(port, host, () => {
    console.log('server on port', port);
});
/* 
    AGREGAR ABAJO UNA TABLA CON LAS MATERIAS, LA CANTIDAD
    DE TAREAS, LA CANTIDAD DE TAREAS HECHAS,
    LA CANTIDAD DE TAREAS SIN HACER,
    Y LA CANTIDAD DE TAREAS ATRASADAS
*/
