module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    // Join a room based on user role (admin, driver, or citizen)
    socket.on('join_room', (roomName) => {
      socket.join(roomName);
    });

    // Handle incoming truck location from Driver App
    socket.on('send_location', (data) => {
      // Broadcast only to admins so they see the truck move on the map
      io.to('admins').emit('receive_location', data);
    });
  });
};