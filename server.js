const fs = require('fs')
const path = require('path');
//require('https').globalAgent.options.ca = require('ssl-root-cas/latest').create();
const https = require('https');
const url = require('url');
const express = require('express');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
  getUserByName
} = require('./utils/users');
const { EventEmitter } = require('events');

const myEmitter = new EventEmitter()

const app = express();

const server = new https.createServer({
  cert: fs.readFileSync('/etc/letsencrypt/live/gather2poker.com.br-0001/cert.pem'),
  key: fs.readFileSync('/etc/letsencrypt/live/gather2poker.com.br-0001/privkey.pem')
}, app);

const PORT = process.env.PORT || 443;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const io = socketio(server);

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/public/index.html')
})

//app.post('/api/game/:event?/:room?/:player?', function (req, res) {
app.post('/api/game', function (req, res) {
    
  global.context = url.parse(req.url,true).query

  const ctxparam = url.parse(req.url,true).query

  console.log(global.context)

  myEmitter.emit('msgFromGod', ctxparam, res)

  //res.status(200).json(global.context)

})

const botName = 'P2G Websocket Server';


// Run when client connects
io.sockets.on('connection', socket => {
  socket.on('joinRoom', ({ username, privilege, room }) => {
    const user = userJoin(socket.id, username, privilege, room);

    socket.join(user.room);

    // Welcome current user
    socket.emit('message', formatMessage(botName, 'Welcome to P2G!'));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage(botName, `${user.username} has joined the room`)
      );

    // Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });
  });

  // Check if event msgFromGod is already instantiated, if not:
  if( ! myEmitter.eventNames().includes('msgFromGod') ) {

      // create the instance
      // We choose instantiate here inside the io.socket.on('connection')
      //  this way we are able to send msg to all available chosen rooms or chosen players needed
      myEmitter.on('msgFromGod', (ctx, res) => {

        //if(global.context.player) {
        if(ctx.player) {

          /*
          const user = getUserByName(global.context.player)
          // Broadcast when a user connects
          socket.broadcast
          .to(user.id)
          .emit(
            'message',
            formatMessage('backend', `${context.event}`)
          );
          */

          const user = getUserByName(ctx.player)
          // Broadcast to a specific user
          socket.broadcast
          .to(user.id)
          .emit(
            'message',
            formatMessage('backend', `${ctx.event}`)
          );

          res.status(200).json(ctx)
        } else if (ctx.room) {

          /*
          //const user = getUserByName(global.context.room)
          // Broadcast to a specific room
          socket.broadcast
          .to(global.context.room)
          .emit(
            'message',
            formatMessage('backend', `${context.event}`)
          );
          */

          //const user = getUserByName(global.context.room)
          // Broadcast to a specific room

          if ( getRoomUsers(ctx.room) ) {
            socket.broadcast
            .to(ctx.room)
            .emit(
              'message',
              formatMessage('backend', `${ctx.event}`)
            );
  
            res.status(200).json(ctx)
          }

        } else {
          res.status(400).json(ctx)
        }

    });
  }


  // Listen for chatMessage
  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id);
    if(user.privilege === 'manager') {

        io.to(user.room).emit('message', formatMessage(user.username, msg));
    }
  });

  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(botName, `${user.username} has left the room`)
      );

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }
  });
});


