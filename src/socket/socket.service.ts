import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  driverSocket: Socket = null;
  passengerSocket: Socket = null;

  afterInit(server: any) {
    console.log('Init gateway');
    this.server.on('connection', (socket) => {
      console.log(socket.id);
    });
  }

  handleConnection(socket: Socket) {
    console.log('A user connected');

    const connectData = {
      status: true,
      message: 'Welcome to the socket.io server!',
      userCount: this.server.engine.clientsCount, // Number of connected clients
    };

    socket.on('passengerRequest', (data) => {
      this.driverSocket = socket;
      console.log('passengerRequest', data);
    });

    socket.on('driverRequest', (data) => {
      this.passengerSocket = socket;
      if (!this.driverSocket) return;
      console.log('driverRequest', data);
      this.driverSocket.emit('driverRequest', data);

      this.passengerSocket.on('passengerDisconnect', () => {
        console.log('passengerDisconnect');
        this.driverSocket.emit('passengerDisconnect');
        this.driverSocket.disconnect();
        this.passengerSocket.disconnect();
      });
    });

    socket.on('acceptPassenger', (data) => {
      if (!this.passengerSocket) return;
      console.log('driverLocation', data);
      this.passengerSocket.emit('acceptPassenger', data);

      this.driverSocket.on('driverDisconnect', () => {
        console.log('driverDisconnect');
        this.passengerSocket.emit('driverDisconnect');
        this.passengerSocket.disconnect();
        this.driverSocket.disconnect();
      });
    });
  }

  handleDisconnect(socket: Socket) {
    console.log('A user disconnected');
  }

  @SubscribeMessage('onNewMessage')
  onNewMessage(@MessageBody() body: any) {
    console.log(body);
  }
}
