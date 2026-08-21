import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Record<string, 'online' | 'offline'>;
  newMatch: unknown | null;
  clearNewMatch: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, 'online' | 'offline'>>({});
  const [newMatch, setNewMatch] = useState<unknown | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Connect to socket server — send user ID in auth payload (demo mode bypasses JWT)
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: {
        userId: user.id
      }
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('[Socket] Connected to server.');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('[Socket] Disconnected from server.');
    });

    newSocket.on('online_status', ({ userId, status }: { userId: string; status: 'online' | 'offline' }) => {
      setOnlineUsers((prev) => ({
        ...prev,
        [userId]: status,
      }));
    });

    newSocket.on('new_match', (matchData) => {
      console.log('[Socket] Mutual match generated:', matchData);
      setNewMatch(matchData);
    });

    return () => {
      newSocket.disconnect();
      setIsConnected(false);
    };
  }, [user?.id]);

  const clearNewMatch = () => {
    setNewMatch(null);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUsers,
        newMatch,
        clearNewMatch,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
