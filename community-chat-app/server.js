import { resolve } from 'node:path';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import formatMessage from './utils/messages.js';
import { userJoin, getCurrentUser, userLeave, getRoomUsers } from './utils/users.js';

const app = express();
const server = createServer(app);
const io = new Server(server);

// Set static folder
app.use(express.static(resolve('public')));

const botName = 'Communtiy Bot ';

// Run when client connects
io.on('connection', socket => {
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome current user
    socket.emit('message', formatMessage(botName, `Welcome to ${room} Community!`));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    // Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });
  });

  // Listen for chatMessage
  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit('message', formatMessage(user.username, msg));
  });

  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }
  });
});

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`server running at http://localhost:${PORT}`);
});
