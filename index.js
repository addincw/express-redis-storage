const express = require('express')
const expressLayouts = require('express-ejs-layouts')
const session = require('express-session')
const flash = require('connect-flash')
const methodOverride = require('method-override')
const redis = require('redis')

const User = require('./models/User')

//create connection to Redis
const redisClient = redis.createClient()
redisClient.on('connect', function() {
    console.log('connected on redis..')
})

const app = express()
//handle request
app.use(express.urlencoded({ extended: false }))
app.use(methodOverride('_method'))
//using flash to implement flash message (need express session)
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false
}))
app.use(flash())
app.use((request, response, next) => {
    const [error] = request.flash('error')
    let [notification] = request.flash('notification')

    if(error) {
        notification = {
            type: 'danger',
            message: error
        }
    }

    response.locals.notification = notification
    next()
})
//set template engine
app.use(expressLayouts)
app.set('view engine', 'ejs')
//routes
app.get('/', (request, response) => {
    response.render('index')
})
app.post('/', (request, response) => {
    const { username } = request.body

    redisClient.hgetall(username, function (error, user) {
        if(!user) {
            request.flash('notification', {
                type: 'danger',
                message: 'username not found'
            })
        
            response.redirect('/')
            return
        }

        response.render('detail', { user })
    })
    
})
app.get('/register', (request, response) => {
    response.render('register')
})
app.post('/register', (request, response) => {
    const data = request.body
    const params = [
        "username", data.username,
        "name", data.name,
        "email", data.email,
    ]

    let errors = {}

    for (var key in data) {
        if(!data[key]) errors[key] = `${key} cannot empty`
    }

    if(Object.keys(errors).length !== 0) {
        response.render('register', { errors, data })
        return
    }

    redisClient.hmset(data.username, params, function (error, done) {
        if(error) {
            response.render('register', { data })
            return
        }

        request.flash('notification', {
            type: 'success',
            message: 'Register success'
        })

        response.redirect('/')
    })
})
app.delete('/:username', (request, response) => {
    const { username } = request.params

    redisClient.del(username)

    request.flash('notification', {
        type: 'danger',
        message: `username @${username}, is no longer exist`
    })

    response.redirect('/')
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running on port : ${PORT}`))