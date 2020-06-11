const express = require('express');
const app = express();
const mysql = require('mysql');
const bodyparser = require('body-parser');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');

app.set('view-engine', 'ejs');

//app.use(express.urlencoded({ extended: false }));
app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());
app.use(cookieParser());

dotenv.config({ path: './.env' });

//Connection
const database = mysql.createConnection({

    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    port: process.env.PORT,
    database: process.env.DATABASE
});

database.connect((err, res) => {
    if (err) {
        return err;
    }
    else {
        console.log('Connection to database successful');
    }
});

app.get('/login', (req, res) => {
    res.render('login.ejs')
});

app.post('/login', async (req, res) => {
    const query = 'SELECT * FROM data WHERE email=?'
    const display='SELECT name from data join user_state on data.email=user_state.email where user_state.user_state="online"'
    const c=[];
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            console.log("please provide email and password");
            return res.status(400).render('login.ejs');

        }
        database.query(query, [email], async (err, results) => {
            console.log(results);
            if (!results || !(await bcrypt.compare(password, results[0].password))) {
                res.status(401).render('login.ejs');
                console.log("email or password is invalid");
            } else {
                const username = results[0].name;
                const id = results[0].id;

                const token = jwt.sign({ id: id }, process.env.JWT_SECRET, {
                    expiresIn: process.env.JWT_EXPIRES_IN
                });
                console.log("The token is" + token);
                console.log("The name is " + username);
                const token_Query = 'Update user_state set token=?,user_state="online" where email=?'
                database.query(token_Query,[token,email], async (err, res) => {
                    console.log(token_Query)
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("hello")
                        console.log(res);
                    }
                });
                database.query(display,async(err,data)=>{
                    if(err){
                        console.log(err);
                    }
                })
                const cookieoptions = {
                    expiresIn: new Date(
                        Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
                    ),
                    httpOnly: true
                }
                res.cookie('jwt', token, cookieoptions);
                res.status(200).render('welcome.ejs', { username: username });
            }
        });

    } catch (err) {
        console.log(err);
    }
});

app.get('/logout',(req,res)=>{
    res.render('logout.ejs')
});

app.listen(3001);