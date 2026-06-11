/**
 * SocketContext — provides a single, lazily-created Socket.IO instance
 * to the entire component tree.
 *
 * Usage:
 *   const { getSocket, connect, disconnect, connected } = useSocketContext();
 *
 * Call connect() once per "session" (teacher game or student game).
 * The same socket persists across page navigations until disconnect() is called.
 */

import { createContext, useContext, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_API_URL || '';

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return socketRef.current;

    const socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socketRef.current = socket;
    return socket;
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setConnected(false);
  }, []);

  const getSocket = useCallback(() => socketRef.current, []);

  return (
    <SocketContext.Provider value={{ connect, disconnect, getSocket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  return useContext(SocketContext);
}
