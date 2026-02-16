// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" } // Allow your Dashboard and Mobile App to connect
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // When a driver sends their location
  socket.on('update_location', (data) => {
    // data = { driverId: 1, lat: 8.48, lng: 124.64 }
    
    // Broadcast this only to the Admin Dashboard
    io.emit('location_changed', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(5000, () => console.log('Server running on port 5000'));