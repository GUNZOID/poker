import React, { useState, useEffect } from 'react';
import {
  ActionLogEntry,
  ActionType,
  ChatMessage,
  PublicTableState,
  TableSettings,
} from '../shared/types.js';
import { getStoredPlayerInfo, saveStoredPlayerName, socket } from './socket.js';
import { LandingPage } from './components/LandingPage.js';
import { Header } from './components/Header.js';
import { Lobby } from './components/Lobby.js';
import { PokerTable } from './components/PokerTable.js';
import { ChatAndLogs } from './components/ChatAndLogs.js';

export const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [tableState, setTableState] = useState<PublicTableState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [actionLogs, setActionLogs] = useState<ActionLogEntry[]>([]);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [initialRoomCode, setInitialRoomCode] = useState<string>('');

  // 1. Initial setup from URL and storage
  useEffect(() => {
    const { id, name } = getStoredPlayerInfo();
    setCurrentUserId(id);
    setPlayerName(name);

    // Read room query param e.g. ?room=XYZ
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setInitialRoomCode(roomParam.toUpperCase());
    }
  }, []);

  // 2. Socket listeners
  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    const handleTableState = (state: PublicTableState) => {
      setTableState(state);
    };

    const handleChatMessage = (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
    };

    const handleActionLog = (entry: ActionLogEntry) => {
      setActionLogs((prev) => [entry, ...prev]);
    };

    const handleAlert = (message: string) => {
      setErrorToast(message);
      setTimeout(() => setErrorToast(null), 4000);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('table:state', handleTableState);
    socket.on('chat:message', handleChatMessage);
    socket.on('log:action', handleActionLog);
    socket.on('game:alert', handleAlert);
    socket.on('error', handleAlert);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('table:state', handleTableState);
      socket.off('chat:message', handleChatMessage);
      socket.off('log:action', handleActionLog);
      socket.off('game:alert', handleAlert);
      socket.off('error', handleAlert);
    };
  }, []);

  // Set URL room param without reloading
  const updateUrlRoomParam = (roomId: string | null) => {
    const url = new URL(window.location.href);
    if (roomId) {
      url.searchParams.set('room', roomId);
    } else {
      url.searchParams.delete('room');
    }
    window.history.replaceState({}, '', url.toString());
  };

  // 3. User actions
  const handleCreateRoom = (name: string, settings: Partial<TableSettings>) => {
    saveStoredPlayerName(name);
    setPlayerName(name);

    socket.emit('room:create', { playerName: name, settings }, (res) => {
      if (res.success && res.roomId && res.playerId) {
        setCurrentUserId(res.playerId);
        updateUrlRoomParam(res.roomId);
      } else {
        setErrorToast(res.error || 'Failed to create room.');
        setTimeout(() => setErrorToast(null), 4000);
      }
    });
  };

  const handleJoinRoom = (name: string, roomId: string) => {
    saveStoredPlayerName(name);
    setPlayerName(name);

    socket.emit('room:join', { roomId, playerName: name, playerId: currentUserId }, (res) => {
      if (res.success && res.playerId) {
        setCurrentUserId(res.playerId);
        updateUrlRoomParam(roomId);
      } else {
        setErrorToast(res.error || 'Failed to join room.');
        setTimeout(() => setErrorToast(null), 4000);
      }
    });
  };

  const handleStartGame = () => {
    socket.emit('game:start', (res) => {
      if (!res.success) {
        setErrorToast(res.error || 'Failed to start game.');
        setTimeout(() => setErrorToast(null), 4000);
      }
    });
  };

  const handleAction = (action: ActionType, amount?: number) => {
    socket.emit('game:action', { action, amount }, (res) => {
      if (!res.success) {
        setErrorToast(res.error || 'Illegal action.');
        setTimeout(() => setErrorToast(null), 4000);
      }
    });
  };

  const handleSit = (seatIndex: number) => {
    socket.emit('table:sit', { seatIndex }, (res) => {
      if (!res.success) {
        setErrorToast(res.error || 'Could not sit.');
        setTimeout(() => setErrorToast(null), 4000);
      }
    });
  };

  const handleLeaveTable = () => {
    socket.emit('table:leave', () => {
      setTableState(null);
      setChatMessages([]);
      setActionLogs([]);
      updateUrlRoomParam(null);
    });
  };

  const handleSendMessage = (text: string) => {
    socket.emit('chat:send', { text });
  };

  // If not currently in a room
  if (!tableState) {
    return (
      <LandingPage
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        initialRoomId={initialRoomCode}
        defaultPlayerName={playerName}
      />
    );
  }

  // Inside Table / Lobby View
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-discord-darkest text-slate-100">
      {/* Toast notifications */}
      {errorToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-discord-red text-white text-xs font-bold shadow-xl animate-fade-in">
          {errorToast}
        </div>
      )}

      {/* Header */}
      <Header
        roomId={tableState.roomId}
        isConnected={isConnected}
        onLeave={handleLeaveTable}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {tableState.stage === 'waiting' ? (
          <div className="flex-1 overflow-y-auto">
            <Lobby
              tableState={tableState}
              currentUserId={currentUserId}
              onStartGame={handleStartGame}
              onSit={handleSit}
            />
          </div>
        ) : (
          <PokerTable
            tableState={tableState}
            currentUserId={currentUserId}
            onAction={handleAction}
            onSit={handleSit}
          />
        )}

        {/* Chat & Logs Right Pane */}
        <ChatAndLogs
          chatMessages={chatMessages}
          actionLogs={actionLogs}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
};
