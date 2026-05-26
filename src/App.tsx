/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  isFirebaseConfigured, 
  db, 
  auth, 
  handleFirestoreError,
  OperationType 
} from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  updateDoc, 
  onSnapshot, 
  runTransaction,
  deleteDoc
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { Player, Room, Transaction, ViewState, Property } from './types';
import CreateJoinView from './components/CreateJoinView';
import LobbyView from './components/LobbyView';
import GameView from './components/GameView';
import { playCoinSound, playUpgradeSound } from './utils/audio';
import { Landmark, Sparkles, HelpCircle } from 'lucide-react';
import { getInitialProperties, calculateRent } from './utils/monopolyData';

const SESSION_KEY = 'monopoly_banking_session';

export default function App() {
  const [viewState, setViewState] = useState<ViewState>('home');
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [backups, setBackups] = useState<any[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('');
  
  const [isFirebaseReady, setIsFirebaseReady] = useState(isFirebaseConfigured);
  const [loading, setLoading] = useState(true);
  const [urlRoomCode, setUrlRoomCode] = useState<string>('');

  // Refs to prevent state leaks, double subscriptions, and stale closures
  const subCleanupRef = useRef<(() => void) | null>(null);
  const transactionsRef = useRef<Transaction[]>([]);
  const tabSessionIdRef = useRef<string>('sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36).substring(4));

  // Keep transaction ref updated
  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  // Cleanup active subscriptions on unmount
  useEffect(() => {
    return () => {
      subCleanupRef.current?.();
    };
  }, []);

  // 1. Initial mounting checks (parse URL query, parse sessionStorage Session)
  useEffect(() => {
    // Parse invite code in Url e.g., ?room=123456
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get('room');
    if (roomCode && roomCode.length === 6) {
      setUrlRoomCode(roomCode);
    }

    // Recover previous identity session (Disconnect Reconnection mechanism)
    // We only use tab-specific sessionStorage on boot to avoid cross-tab collision/overwrites
    // when a host and guest are tested on the same browser/device.
    const stored = sessionStorage.getItem(SESSION_KEY);

    if (stored) {
      try {
        const { roomId, playerId } = JSON.parse(stored);
        if (roomId && playerId) {
          rejoinSession(roomId, playerId);
          return;
        }
      } catch (e) {
        console.error("Failed to restore session from storage:", e);
      }
    }
    setLoading(false);
  }, []);

  // 2. Auth State Watcher (if Firebase is enabled, manage anonymous auth and online state flags)
  useEffect(() => {
    if (!isFirebaseReady || !auth) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("Authenticated anonymously with Firebase UID:", user.uid);
      }
    });
    return () => unsubscribe();
  }, [isFirebaseReady]);

  // Try to rejoin an existing session automatically
  const rejoinSession = async (roomId: string, playerId: string) => {
    setLoading(true);
    try {
      if (isFirebaseReady && db && auth) {
        // Authenticate silently if available, otherwise grace out
        let currentUser = auth.currentUser;
        if (!currentUser) {
          try {
            const cred = await signInAnonymously(auth);
            currentUser = cred.user;
          } catch (ae) {
            console.warn("Firebase Auth anonymous sign-in failure, resuming with local session ID:", ae);
          }
        }

        // Validate Room exists
        const roomRef = doc(db, 'rooms', roomId);
        const roomSnap = await getDoc(roomRef);
        
        if (roomSnap.exists()) {
          const roomData = roomSnap.data() as Room;
          
          // Validate Player document exists inside that room using rejoining ID
          let actualPlayerId = currentUser ? currentUser.uid : playerId;
          let playerRef = doc(db, 'rooms', roomId, 'players', actualPlayerId);
          let playerSnap = await getDoc(playerRef);

          // If authenticated ID doesn't have player document but stored ID does, use stored ID
          if (!playerSnap.exists() && actualPlayerId !== playerId) {
            playerRef = doc(db, 'rooms', roomId, 'players', playerId);
            playerSnap = await getDoc(playerRef);
            if (playerSnap.exists()) {
              actualPlayerId = playerId;
            }
          }

          if (playerSnap.exists()) {
            setCurrentPlayerId(actualPlayerId);
            setRoom(roomData);
            
            // Mark online
            await updateDoc(playerRef, { isOnline: true, connectionId: tabSessionIdRef.current });
            
            // Initialize Firestore Live Snapshot Syncing
            subscribeToRoom(roomId, actualPlayerId);
            return;
          }
        }
      } else {
        // Local practice mode re-join session recovery
        const localRoomsRaw = localStorage.getItem('local_monopoly_rooms');
        if (localRoomsRaw) {
          const localRooms = JSON.parse(localRoomsRaw);
          const activeRoom = localRooms[roomId];
          if (activeRoom) {
            const playersRaw = localStorage.getItem(`local_players_${roomId}`);
            const txsRaw = localStorage.getItem(`local_txs_${roomId}`);
            
            const localPlayers: Player[] = playersRaw ? JSON.parse(playersRaw) : [];
            const isPlayerIn = localPlayers.some(p => p.id === playerId);
            
            if (isPlayerIn) {
              // Update player online state link
              const updated = localPlayers.map(p => p.id === playerId ? { ...p, isOnline: true, connectionId: tabSessionIdRef.current } : p);
              localStorage.setItem(`local_players_${roomId}`, JSON.stringify(updated));
              
              setRoom(activeRoom);
              setPlayers(updated);
              setTransactions(txsRaw ? JSON.parse(txsRaw) : []);
              
              const localPropsRaw = localStorage.getItem(`local_properties_${roomId}`);
              if (localPropsRaw) {
                setProperties(JSON.parse(localPropsRaw));
              } else {
                const initialProps = getInitialProperties();
                localStorage.setItem(`local_properties_${roomId}`, JSON.stringify(initialProps));
                setProperties(initialProps);
              }

              const localBackupsRaw = localStorage.getItem(`local_backups_${roomId}`) || '[]';
              setBackups(JSON.parse(localBackupsRaw));

              setCurrentPlayerId(playerId);
              setViewState(activeRoom.status === 'lobby' ? 'lobby' : 'game');
              setLoading(false);
              return;
            }
          }
        }
      }
    } catch (err) {
      console.warn("Session expired or cannot find match, returning to login:", err);
    }
    
    // Fallback: Clear corrupted session
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    setLoading(false);
  };

  // 3. Real-time Firebase Sync Subscription
  const subscribeToRoom = (roomId: string, myPlayerId: string) => {
    if (!db) return;

    // Clear any previous active subscriptions before starting new ones to avoid duplicate subscription leaks
    if (subCleanupRef.current) {
      try {
        subCleanupRef.current();
      } catch (err) {
        console.warn("Error cleaning up previous subscription:", err);
      }
    }

    // A. Subscribe to Room State Change
    const roomRef = doc(db, 'rooms', roomId);
    const unsubRoom = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const rData = snapshot.data() as Room;
        setRoom(rData);
        setViewState(rData.status === 'lobby' ? 'lobby' : 'game');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `rooms/${roomId}`);
    });

    // B. Subscribe to Players subcollection
    const playersRef = collection(db, 'rooms', roomId, 'players');
    const unsubPlayers = onSnapshot(playersRef, (snapshot) => {
      const pList: Player[] = [];
      let wasKickedOut = false;
      snapshot.forEach(docSnap => {
        const p = docSnap.data() as Player;
        pList.push(p);
        
        // If our current session has been superseded, trigger expulsion
        if (p.id === myPlayerId && p.isOnline && p.connectionId && p.connectionId !== tabSessionIdRef.current) {
          wasKickedOut = true;
        }
      });

      if (wasKickedOut) {
        // Unsubscribe from active real-time updates immediately to prevent alerts or update loops
        if (subCleanupRef.current) {
          try {
            subCleanupRef.current();
          } catch (e) {
            console.warn("Error cleaning up subscriptions upon replacement:", e);
          }
          subCleanupRef.current = null;
        }

        alert("您的玩家身份已在其他裝置上被「接管登入」！本視窗已自動回到大廳首頁。");
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        setRoom(null);
        setPlayers([]);
        setTransactions([]);
        setCurrentPlayerId('');
        setViewState('home');
        setLoading(false);
        return;
      }

      // Sort players alphabetically or join time so layout stays stable
      pList.sort((a, b) => a.joinedAt - b.joinedAt);
      setPlayers(pList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `rooms/${roomId}/players`);
    });

    // C. Subscribe to Transaction history logs
    const txsRef = collection(db, 'rooms', roomId, 'transactions');
    const unsubTxs = onSnapshot(txsRef, (snapshot) => {
      const txList: Transaction[] = [];
      snapshot.forEach(docSnap => {
        txList.push(docSnap.data() as Transaction);
      });
      // Sort descending by timestamp
      txList.sort((a, b) => b.timestamp - a.timestamp);
      
      // Sound feedback threshold checking using ref to bypass stale React closure bounds
      const currentTxLength = transactionsRef.current.length;
      if (currentTxLength > 0 && txList.length > currentTxLength) {
        const latestTx = txList[0];
        if (latestTx.toId === myPlayerId) {
          playCoinSound();
        }
      }
      setTransactions(txList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `rooms/${roomId}/transactions`);
    });

    // D. Subscribe to properties subcollection
    const propertiesRef = collection(db, 'rooms', roomId, 'properties');
    const unsubProps = onSnapshot(propertiesRef, async (snapshot) => {
      if (snapshot.empty) {
        // Seed default deeds if we are the banker (owner) of the room
        const roomRef = doc(db, 'rooms', roomId);
        const roomSnap = await getDoc(roomRef);
        if (roomSnap.exists()) {
          const roomData = roomSnap.data() as Room;
          if (roomData.bankerPlayerId === myPlayerId) {
            const initialProps = getInitialProperties();
            try {
              // Batch seed properties
              await Promise.all(
                initialProps.map((p) => {
                  const pRef = doc(db, 'rooms', roomId, 'properties', p.id);
                  return setDoc(pRef, p);
                })
              );
            } catch (err) {
              console.error("Failed to seed initial properties:", err);
            }
          }
        }
        return;
      }
      const propList: Property[] = [];
      snapshot.forEach(docSnap => {
        propList.push(docSnap.data() as Property);
      });
      propList.sort((a, b) => a.order - b.order);
      setProperties(propList);
    }, (error) => {
      console.warn("Properties snapshot warning:", error);
    });

    // E. Subscribe to backups subcollection
    const backupsRef = collection(db, 'rooms', roomId, 'backups');
    const unsubBackups = onSnapshot(backupsRef, (snapshot) => {
      const bList: any[] = [];
      snapshot.forEach(docSnap => {
        bList.push(docSnap.data());
      });
      // Sort descending by timestamp
      bList.sort((a, b) => b.timestamp - a.timestamp);
      setBackups(bList);
    }, (error) => {
      console.warn("Backups snapshot warning:", error);
    });

    // Handle offline status mappings
    const handleUnload = () => {
      if (db) {
        const meRef = doc(db, 'rooms', roomId, 'players', myPlayerId);
        updateDoc(meRef, { isOnline: false });
      }
    };
    window.addEventListener('beforeunload', handleUnload);

    // Keep clean ups
    const cleanup = () => {
      unsubRoom();
      unsubPlayers();
      unsubTxs();
      unsubProps();
      unsubBackups();
      window.removeEventListener('beforeunload', handleUnload);
    };

    subCleanupRef.current = cleanup;
    return cleanup;
  };

  // 4. Create Room Event Action
  const handleCreateRoom = async (
    name: string, 
    avatar: string, 
    color: string, 
    roomName: string, 
    initialBalance: number
  ) => {
    setLoading(true);
    // Generate secure randomized 6 digit room visual key
    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      if (isFirebaseReady && db && auth) {
        // Generate a random stable client UID
        let myUid = 'p_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36).substring(4);
        
        // Try anonymous sign-in with a fallback to local uid if restricted
        try {
          const cred = await signInAnonymously(auth);
          if (cred && cred.user) {
            myUid = cred.user.uid;
          }
        } catch (authErr) {
          console.warn("Anonymous sign-in restricted on Firebase project, using secure local player id:", authErr);
        }

        const newRoom: Room = {
          id: pin,
          name: roomName,
          initialBalance,
          status: 'lobby',
          bankerPlayerId: myUid,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        const creatorPlayer: Player = {
          id: myUid,
          name,
          avatar,
          color,
          balance: initialBalance,
          isBanker: true,
          isOnline: true,
          joinedAt: Date.now(),
          connectionId: tabSessionIdRef.current
        };

        // Write to Firestore database
        const roomRef = doc(db, 'rooms', pin);
        const creatorRef = doc(db, 'rooms', pin, 'players', myUid);
        
        await setDoc(roomRef, newRoom);
        await setDoc(creatorRef, creatorPlayer);

        // Record locally (both sessionStorage and localStorage to support separate tabs on same browser/device)
        localStorage.setItem(SESSION_KEY, JSON.stringify({ roomId: pin, playerId: myUid }));
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ roomId: pin, playerId: myUid }));
        setCurrentPlayerId(myUid);
        setRoom(newRoom);
        
        subscribeToRoom(pin, myUid);
      } else {
        // --- LOCAL FALLBACK SANDBOX ENGINE ---
        const newLocalRoom: Room = {
          id: pin,
          name: roomName,
          initialBalance,
          status: 'lobby',
          bankerPlayerId: 'local_banker_id',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        const firstPlayer: Player = {
          id: 'local_banker_id',
          name,
          avatar,
          color,
          balance: initialBalance,
          isBanker: true,
          isOnline: true,
          joinedAt: Date.now(),
          connectionId: tabSessionIdRef.current
        };

        // Add 2 mock players so local practicing is immediate and fun!
        const bauer: Player = {
          id: 'local_player_bauer',
          name: '阿土伯粉碎機',
          avatar: '🦖',
          color: 'from-emerald-500 to-emerald-600',
          balance: initialBalance,
          isBanker: false,
          isOnline: true,
          joinedAt: Date.now() + 1
        };

        const sun: Player = {
          id: 'local_player_sun',
          name: '孫小美金庫',
          avatar: '🦆',
          color: 'from-amber-400 to-amber-500',
          balance: initialBalance,
          isBanker: false,
          isOnline: true,
          joinedAt: Date.now() + 2
        };

        const initPlayers = [firstPlayer, bauer, sun];

        // Store into localStorage to mock DB persistence
        const localRoomsRaw = localStorage.getItem('local_monopoly_rooms') || '{}';
        const localRooms = JSON.parse(localRoomsRaw);
        localRooms[pin] = newLocalRoom;
        
        localStorage.setItem('local_monopoly_rooms', JSON.stringify(localRooms));
        localStorage.setItem(`local_players_${pin}`, JSON.stringify(initPlayers));
        localStorage.setItem(`local_txs_${pin}`, JSON.stringify([]));
        localStorage.setItem(SESSION_KEY, JSON.stringify({ roomId: pin, playerId: firstPlayer.id }));
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ roomId: pin, playerId: firstPlayer.id }));

        setCurrentPlayerId(firstPlayer.id);
        setRoom(newLocalRoom);
        setPlayers(initPlayers);
        setTransactions([]);
        setViewState('lobby');
        setLoading(false);
      }
      playUpgradeSound();
    } catch (err) {
      console.error("Room creation crashed:", err);
      alert("房室創建失敗！請開啟 F12 開發者主控台，或確認您的 Firebase 主機連線規則。");
      setLoading(false);
    }
  };

  // 5. Join Room Action
  const handleJoinRoom = async (
    name: string, 
    avatar: string, 
    color: string, 
    targetRoomId: string
  ) => {
    setLoading(true);
    try {
      if (isFirebaseReady && db && auth) {
        // Check Room document exists
        const roomRef = doc(db, 'rooms', targetRoomId);
        const roomSnap = await getDoc(roomRef);

        if (!roomSnap.exists()) {
          alert(`找不到這間大富翁密碼房 [${targetRoomId}]，請再次確認房主提供的 6 位代碼！`);
          setLoading(false);
          return;
        }

        const roomData = roomSnap.data() as Room;

        // Generate a random stable client UID
        let myUid = 'p_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36).substring(4);

        // Try anonymous sign-in, fall back smoothly if restricted
        try {
          const cred = await signInAnonymously(auth);
          if (cred && cred.user) {
            myUid = cred.user.uid;
          }
        } catch (authErr) {
          console.warn("Anonymous sign-in restricted on peer join, using secure local player id:", authErr);
        }

        const isMeBanker = roomData.bankerPlayerId === myUid;
        const newPlayer: Player = {
          id: myUid,
          name,
          avatar,
          color,
          balance: roomData.initialBalance,
          isBanker: isMeBanker,
          isOnline: true,
          joinedAt: Date.now(),
          connectionId: tabSessionIdRef.current
        };

        // Write document to players collection
        const playerRef = doc(db, 'rooms', targetRoomId, 'players', myUid);
        await setDoc(playerRef, newPlayer);

        localStorage.setItem(SESSION_KEY, JSON.stringify({ roomId: targetRoomId, playerId: myUid }));
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ roomId: targetRoomId, playerId: myUid }));
        setCurrentPlayerId(myUid);
        setRoom(roomData);

        subscribeToRoom(targetRoomId, myUid);
      } else {
        // --- LOCAL FALLBACK SANDBOX ENGINE ---
        const localRoomsRaw = localStorage.getItem('local_monopoly_rooms') || '{}';
        const localRooms = JSON.parse(localRoomsRaw);
        const targetRoom = localRooms[targetRoomId];

        if (!targetRoom) {
          alert(`本地庫中查無 [${targetRoomId}]，請點擊創建房間開始使用。`);
          setLoading(false);
          return;
        }

        const localPlayersRaw = localStorage.getItem(`local_players_${targetRoomId}`) || '[]';
        const localPlayers: Player[] = JSON.parse(localPlayersRaw);

        // Check if player already exists under this name or assign random ID
        const myLocalId = 'local_player_' + Math.random().toString(36).slice(2, 9);
        const newLocalPlayer: Player = {
          id: myLocalId,
          name,
          avatar,
          color,
          balance: targetRoom.initialBalance,
          isBanker: targetRoom.bankerPlayerId === myLocalId,
          isOnline: true,
          joinedAt: Date.now(),
          connectionId: tabSessionIdRef.current
        };

        localPlayers.push(newLocalPlayer);
        localStorage.setItem(`local_players_${targetRoomId}`, JSON.stringify(localPlayers));
        localStorage.setItem(SESSION_KEY, JSON.stringify({ roomId: targetRoomId, playerId: myLocalId }));
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ roomId: targetRoomId, playerId: myLocalId }));

        // Load logs
        const localTxsRaw = localStorage.getItem(`local_txs_${targetRoomId}`) || '[]';
        const localBackupsRaw = localStorage.getItem(`local_backups_${targetRoomId}`) || '[]';

        setCurrentPlayerId(myLocalId);
        setRoom(targetRoom);
        setPlayers(localPlayers);
        setTransactions(JSON.parse(localTxsRaw));
        setBackups(JSON.parse(localBackupsRaw));
        setViewState(targetRoom.status === 'lobby' ? 'lobby' : 'game');
        setLoading(false);
      }
      playUpgradeSound();
    } catch (e) {
      console.error(e);
      alert("載入房間時發生阻礙，請確認網路連線！");
      setLoading(false);
    }
  };

  // 5.5 Player Takeover & Query Helpers
  const getRoomPlayers = async (roomId: string): Promise<Player[]> => {
    if (isFirebaseReady && db) {
      try {
        const playersColl = collection(db, 'rooms', roomId, 'players');
        const snap = await getDocs(playersColl);
        const list: Player[] = [];
        snap.forEach((doc) => {
          list.push(doc.data() as Player);
        });
        return list.sort((a, b) => a.joinedAt - b.joinedAt);
      } catch (err) {
        console.warn("Failed to fetch players for takeover:", err);
        return [];
      }
    } else {
      try {
        const localPlayersRaw = localStorage.getItem(`local_players_${roomId}`) || '[]';
        const list: Player[] = JSON.parse(localPlayersRaw);
        return list.sort((a, b) => a.joinedAt - b.joinedAt);
      } catch (err) {
        return [];
      }
    }
  };

  const handleTakeoverPlayer = async (targetRoomId: string, playerId: string) => {
    setLoading(true);
    try {
      if (isFirebaseReady && db && auth) {
        const roomRef = doc(db, 'rooms', targetRoomId);
        const roomSnap = await getDoc(roomRef);

        if (!roomSnap.exists()) {
          alert(`找不到這間房間 [${targetRoomId}]！`);
          setLoading(false);
          return;
        }

        const roomData = roomSnap.data() as Room;

        const playerRef = doc(db, 'rooms', targetRoomId, 'players', playerId);
        const playerSnap = await getDoc(playerRef);

        if (!playerSnap.exists()) {
          alert(`該玩家資料不存在！`);
          setLoading(false);
          return;
        }

        try {
          if (!auth.currentUser) {
            await signInAnonymously(auth);
          }
        } catch (authErr) {
          console.warn("Auth check on takeover:", authErr);
        }

        // Set player state online
        await updateDoc(playerRef, { isOnline: true, connectionId: tabSessionIdRef.current });

        // Save session identification
        localStorage.setItem(SESSION_KEY, JSON.stringify({ roomId: targetRoomId, playerId: playerId }));
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ roomId: targetRoomId, playerId: playerId }));
        setCurrentPlayerId(playerId);
        setRoom(roomData);

        subscribeToRoom(targetRoomId, playerId);
      } else {
        // --- LOCAL FALLBACK SANDBOX ENGINE ---
        const localRoomsRaw = localStorage.getItem('local_monopoly_rooms') || '{}';
        const localRooms = JSON.parse(localRoomsRaw);
        const targetRoom = localRooms[targetRoomId];

        if (!targetRoom) {
          alert(`查無此本地房室 [${targetRoomId}]`);
          setLoading(false);
          return;
        }

        const localPlayersRaw = localStorage.getItem(`local_players_${targetRoomId}`) || '[]';
        let localPlayers: Player[] = JSON.parse(localPlayersRaw);

        localPlayers = localPlayers.map(p => {
          if (p.id === playerId) {
            return { ...p, isOnline: true, connectionId: tabSessionIdRef.current };
          }
          return p;
        });

        localStorage.setItem(`local_players_${targetRoomId}`, JSON.stringify(localPlayers));
        localStorage.setItem(SESSION_KEY, JSON.stringify({ roomId: targetRoomId, playerId: playerId }));
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ roomId: targetRoomId, playerId: playerId }));

        const localTxsRaw = localStorage.getItem(`local_txs_${targetRoomId}`) || '[]';
        setTransactions(JSON.parse(localTxsRaw));
        
        const localBackupsRaw = localStorage.getItem(`local_backups_${targetRoomId}`) || '[]';
        setBackups(JSON.parse(localBackupsRaw));
        
        const localPropsRaw = localStorage.getItem(`local_properties_${targetRoomId}`);
        if (localPropsRaw) {
          setProperties(JSON.parse(localPropsRaw));
        } else {
          const initialProps = getInitialProperties();
          localStorage.setItem(`local_properties_${targetRoomId}`, JSON.stringify(initialProps));
          setProperties(initialProps);
        }

        setPlayers(localPlayers);

        setCurrentPlayerId(playerId);
        setRoom(targetRoom);
        
        if (targetRoom.status === 'playing') {
          setViewState('game');
        } else {
          setViewState('lobby');
        }
        setLoading(false);
      }
      playUpgradeSound();
    } catch (err) {
      console.error("Takeover failed:", err);
      alert("接續重連失敗，請重新再試一次！");
      setLoading(false);
    }
  };

  // 6. Action: Start Game
  const handleStartGame = async () => {
    if (!room) return;
    try {
      if (isFirebaseReady && db) {
        const roomRef = doc(db, 'rooms', room.id);
        await updateDoc(roomRef, { 
          status: 'playing',
          updatedAt: Date.now()
        });
      } else {
        // Local state
        const localRoomsRaw = localStorage.getItem('local_monopoly_rooms') || '{}';
        const localRooms = JSON.parse(localRoomsRaw);
        if (localRooms[room.id]) {
          localRooms[room.id].status = 'playing';
          localRooms[room.id].updatedAt = Date.now();
          localStorage.setItem('local_monopoly_rooms', JSON.stringify(localRooms));
          
          setRoom(localRooms[room.id]);
          setViewState('game');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 6.5 Real Estate Property Deeds Handlers
  const handleBuyProperty = async (propertyId: string) => {
    if (!room || !currentPlayerId) return;
    const property = properties.find((p) => p.id === propertyId);
    if (!property) return;
    
    const buyer = players.find(p => p.id === currentPlayerId);
    if (!buyer) return;

    await pushBackup(`購買房產：${buyer.name} 買下 [${property.name}]`, players, properties, transactions);

    if (buyer.balance < property.price) {
      if (!confirm(`您的現金不足以購買 [${property.name}] ($${property.price}，您只有 $${buyer.balance})，確定要透支扣款以購買此產權嗎？`)) {
        return;
      }
    }

    try {
      if (isFirebaseReady && db) {
        const roomRefId = room.id;
        await runTransaction(db, async (transaction) => {
          const playerDocRef = doc(db, 'rooms', roomRefId, 'players', currentPlayerId);
          const propDocRef = doc(db, 'rooms', roomRefId, 'properties', propertyId);
          
          const playerSnap = await transaction.get(playerDocRef);
          const propSnap = await transaction.get(propDocRef);

          if (!playerSnap.exists() || !propSnap.exists()) {
            throw new Error("玩家或地產不存在。");
          }

          const playerData = playerSnap.data() as Player;
          const propData = propSnap.data() as Property;

          if (propData.ownerId) {
            throw new Error("此地產已被他人購買！");
          }

          const newBalance = playerData.balance - propData.price;
          transaction.update(playerDocRef, { balance: newBalance });
          transaction.update(propDocRef, { ownerId: currentPlayerId });

          // Log transaction
          const txId = 'tx_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
          const txDocRef = doc(db, 'rooms', roomRefId, 'transactions', txId);
          const newTx: Transaction = {
            id: txId,
            fromId: currentPlayerId,
            fromName: playerData.name,
            toId: 'bank',
            toName: '銀行 (產權置產)',
            amount: propData.price,
            type: 'bank_take',
            timestamp: Date.now()
          };
          transaction.set(txDocRef, newTx);
        });
        playCoinSound();
      } else {
        // Local Mode
        const localPlayersRaw = localStorage.getItem(`local_players_${room.id}`) || '[]';
        const localPlayers: Player[] = JSON.parse(localPlayersRaw);
        const buyerIdx = localPlayers.findIndex(p => p.id === currentPlayerId);
        
        if (buyerIdx !== -1) {
          localPlayers[buyerIdx].balance -= property.price;
        }

        const updatedProps = properties.map(p => {
          if (p.id === propertyId) {
            return { ...p, ownerId: currentPlayerId };
          }
          return p;
        });

        const txId = 'tx_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
        const localTxsRaw = localStorage.getItem(`local_txs_${room.id}`) || '[]';
        const localTxs: Transaction[] = JSON.parse(localTxsRaw);
        const newTx: Transaction = {
          id: txId,
          fromId: currentPlayerId,
          fromName: buyer.name,
          toId: 'bank',
          toName: '銀行 (產權置產)',
          amount: property.price,
          type: 'bank_take',
          timestamp: Date.now()
        };
        localTxs.unshift(newTx);

        localStorage.setItem(`local_players_${room.id}`, JSON.stringify(localPlayers));
        localStorage.setItem(`local_properties_${room.id}`, JSON.stringify(updatedProps));
        localStorage.setItem(`local_txs_${room.id}`, JSON.stringify(localTxs));

        setPlayers(localPlayers);
        setProperties(updatedProps);
        setTransactions(localTxs);
        playCoinSound();
      }
    } catch (err) {
      console.error("Buy property failed:", err);
      alert("購買地產失敗：" + err);
    }
  };

  const handleUpgradeProperty = async (propertyId: string) => {
    if (!room || !currentPlayerId) return;
    const property = properties.find((p) => p.id === propertyId);
    if (!property) return;
    if (property.ownerId !== currentPlayerId) return;

    if (property.houses >= 5) {
      alert("此地產已建設成豪華飯店，無法繼續加蓋囉！");
      return;
    }

    const price = property.houseCost;
    const builder = players.find(p => p.id === currentPlayerId);
    if (!builder) return;

    await pushBackup(`增建房產：${builder.name} 升級 ${property.name} 房屋等級`, players, properties, transactions);

    if (builder.balance < price) {
      if (!confirm(`您的現金不足以增蓋客房 ($${price}，您只有 $${builder.balance})，確定要透支扣款以蓋房嗎？`)) {
        return;
      }
    }

    try {
      if (isFirebaseReady && db) {
        const roomRefId = room.id;
        await runTransaction(db, async (transaction) => {
          const playerDocRef = doc(db, 'rooms', roomRefId, 'players', currentPlayerId);
          const propDocRef = doc(db, 'rooms', roomRefId, 'properties', propertyId);
          
          const playerSnap = await transaction.get(playerDocRef);
          const propSnap = await transaction.get(propDocRef);

          if (!playerSnap.exists() || !propSnap.exists()) {
            throw new Error("玩家或地產不存在。");
          }

          const playerData = playerSnap.data() as Player;
          const propData = propSnap.data() as Property;

          const newBalance = playerData.balance - price;
          const newHouses = propData.houses + 1;
          transaction.update(playerDocRef, { balance: newBalance });
          transaction.update(propDocRef, { houses: newHouses });

          // Log transaction
          const txId = 'tx_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
          const txDocRef = doc(db, 'rooms', roomRefId, 'transactions', txId);
          const newTx: Transaction = {
            id: txId,
            fromId: currentPlayerId,
            fromName: playerData.name,
            toId: 'bank',
            toName: '銀行 (地產建設費)',
            amount: price,
            type: 'bank_take',
            timestamp: Date.now()
          };
          transaction.set(txDocRef, newTx);
        });
        playUpgradeSound();
      } else {
        // Local Mode
        const localPlayersRaw = localStorage.getItem(`local_players_${room.id}`) || '[]';
        const localPlayers: Player[] = JSON.parse(localPlayersRaw);
        const builderIdx = localPlayers.findIndex(p => p.id === currentPlayerId);
        
        if (builderIdx !== -1) {
          localPlayers[builderIdx].balance -= price;
        }

        const updatedProps = properties.map(p => {
          if (p.id === propertyId) {
            return { ...p, houses: p.houses + 1 };
          }
          return p;
        });

        const txId = 'tx_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
        const localTxsRaw = localStorage.getItem(`local_txs_${room.id}`) || '[]';
        const localTxs: Transaction[] = JSON.parse(localTxsRaw);
        const newTx: Transaction = {
          id: txId,
          fromId: currentPlayerId,
          fromName: builder.name,
          toId: 'bank',
          toName: '銀行 (地產建設費)',
          amount: price,
          type: 'bank_take',
          timestamp: Date.now()
        };
        localTxs.unshift(newTx);

        localStorage.setItem(`local_players_${room.id}`, JSON.stringify(localPlayers));
        localStorage.setItem(`local_properties_${room.id}`, JSON.stringify(updatedProps));
        localStorage.setItem(`local_txs_${room.id}`, JSON.stringify(localTxs));

        setPlayers(localPlayers);
        setProperties(updatedProps);
        setTransactions(localTxs);
        playUpgradeSound();
      }
    } catch (err) {
      console.error("Upgrade property failed:", err);
      alert("升級建設失敗：" + err);
    }
  };

  const handleMortgageProperty = async (propertyId: string) => {
    if (!room || !currentPlayerId) return;
    const property = properties.find((p) => p.id === propertyId);
    if (!property) return;
    if (property.ownerId !== currentPlayerId) return;
    if (property.isMortgaged) return;

    const player = players.find(p => p.id === currentPlayerId);
    if (player) {
      await pushBackup(`抵押房產：${player.name} 抵押 [${property.name}]`, players, properties, transactions);
    }

    if (property.houses > 0) {
      alert("此地產上蓋有房屋，抵押前必須先將房屋拆除售回（系統會自動將等級重設為0）！");
    }

    const payout = Math.floor(property.price / 2);

    try {
      if (isFirebaseReady && db) {
        const roomRefId = room.id;
        await runTransaction(db, async (transaction) => {
          const playerDocRef = doc(db, 'rooms', roomRefId, 'players', currentPlayerId);
          const propDocRef = doc(db, 'rooms', roomRefId, 'properties', propertyId);
          
          const playerSnap = await transaction.get(playerDocRef);
          const propSnap = await transaction.get(propDocRef);

          if (!playerSnap.exists() || !propSnap.exists()) {
            throw new Error("玩家或地產不存在。");
          }

          const playerData = playerSnap.data() as Player;

          const newBalance = playerData.balance + payout;
          transaction.update(playerDocRef, { balance: newBalance });
          transaction.update(propDocRef, { isMortgaged: true, houses: 0 });

          // Log transaction
          const txId = 'tx_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
          const txDocRef = doc(db, 'rooms', roomRefId, 'transactions', txId);
          const newTx: Transaction = {
            id: txId,
            fromId: 'bank',
            fromName: '銀行 (地產抵押部)',
            toId: currentPlayerId,
            toName: playerData.name,
            amount: payout,
            type: 'bank_give',
            timestamp: Date.now()
          };
          transaction.set(txDocRef, newTx);
        });
        playCoinSound();
      } else {
        // Local Mode
        const localPlayersRaw = localStorage.getItem(`local_players_${room.id}`) || '[]';
        const localPlayers: Player[] = JSON.parse(localPlayersRaw);
        const builderIdx = localPlayers.findIndex(p => p.id === currentPlayerId);
        
        let localPlayerName = "我";
        if (builderIdx !== -1) {
          localPlayers[builderIdx].balance += payout;
          localPlayerName = localPlayers[builderIdx].name;
        }

        const updatedProps = properties.map(p => {
          if (p.id === propertyId) {
            return { ...p, isMortgaged: true, houses: 0 };
          }
          return p;
        });

        const txId = 'tx_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
        const localTxsRaw = localStorage.getItem(`local_txs_${room.id}`) || '[]';
        const localTxs: Transaction[] = JSON.parse(localTxsRaw);
        const newTx: Transaction = {
          id: txId,
          fromId: 'bank',
          fromName: '銀行 (地產抵押部)',
          toId: currentPlayerId,
          toName: localPlayerName,
          amount: payout,
          type: 'bank_give',
          timestamp: Date.now()
        };
        localTxs.unshift(newTx);

        localStorage.setItem(`local_players_${room.id}`, JSON.stringify(localPlayers));
        localStorage.setItem(`local_properties_${room.id}`, JSON.stringify(updatedProps));
        localStorage.setItem(`local_txs_${room.id}`, JSON.stringify(localTxs));

        setPlayers(localPlayers);
        setProperties(updatedProps);
        setTransactions(localTxs);
        playCoinSound();
      }
    } catch (err) {
      console.error("Mortgage property failed:", err);
      alert("抵押地產失敗：" + err);
    }
  };

  const handleUnmortgageProperty = async (propertyId: string) => {
    if (!room || !currentPlayerId) return;
    const property = properties.find((p) => p.id === propertyId);
    if (!property) return;
    if (property.ownerId !== currentPlayerId) return;
    if (!property.isMortgaged) return;

    // Unmortgage cost is (price/2) * 1.10 (mortgage cost + 10% interest)
    const cost = Math.floor((property.price / 2) * 1.1);
    const builder = players.find(p => p.id === currentPlayerId);
    if (!builder) return;

    await pushBackup(`贖回房產：${builder.name} 贖回 [${property.name}]`, players, properties, transactions);

    if (builder.balance < cost) {
      if (!confirm(`您的現金不足以贖回產權 ($${cost}，您只有 $${builder.balance})，確定要透支扣款以贖回嗎？`)) {
        return;
      }
    }

    try {
      if (isFirebaseReady && db) {
        const roomRefId = room.id;
        await runTransaction(db, async (transaction) => {
          const playerDocRef = doc(db, 'rooms', roomRefId, 'players', currentPlayerId);
          const propDocRef = doc(db, 'rooms', roomRefId, 'properties', propertyId);
          
          const playerSnap = await transaction.get(playerDocRef);
          const propSnap = await transaction.get(propDocRef);

          if (!playerSnap.exists() || !propSnap.exists()) {
            throw new Error("玩家或地產不存在。");
          }

          const playerData = playerSnap.data() as Player;

          const newBalance = playerData.balance - cost;
          transaction.update(playerDocRef, { balance: newBalance });
          transaction.update(propDocRef, { isMortgaged: false });

          // Log transaction
          const txId = 'tx_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
          const txDocRef = doc(db, 'rooms', roomRefId, 'transactions', txId);
          const newTx: Transaction = {
            id: txId,
            fromId: currentPlayerId,
            fromName: playerData.name,
            toId: 'bank',
            toName: '銀行 (地產贖回登記)',
            amount: cost,
            type: 'bank_take',
            timestamp: Date.now()
          };
          transaction.set(txDocRef, newTx);
        });
        playCoinSound();
      } else {
        // Local Mode
        const localPlayersRaw = localStorage.getItem(`local_players_${room.id}`) || '[]';
        const localPlayers: Player[] = JSON.parse(localPlayersRaw);
        const builderIdx = localPlayers.findIndex(p => p.id === currentPlayerId);
        
        if (builderIdx !== -1) {
          localPlayers[builderIdx].balance -= cost;
        }

        const updatedProps = properties.map(p => {
          if (p.id === propertyId) {
            return { ...p, isMortgaged: false };
          }
          return p;
        });

        const txId = 'tx_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
        const localTxsRaw = localStorage.getItem(`local_txs_${room.id}`) || '[]';
        const localTxs: Transaction[] = JSON.parse(localTxsRaw);
        const newTx: Transaction = {
          id: txId,
          fromId: currentPlayerId,
          fromName: builder.name,
          toId: 'bank',
          toName: '銀行 (地產贖回登記)',
          amount: cost,
          type: 'bank_take',
          timestamp: Date.now()
        };
        localTxs.unshift(newTx);

        localStorage.setItem(`local_players_${room.id}`, JSON.stringify(localPlayers));
        localStorage.setItem(`local_properties_${room.id}`, JSON.stringify(updatedProps));
        localStorage.setItem(`local_txs_${room.id}`, JSON.stringify(localTxs));

        setPlayers(localPlayers);
        setProperties(updatedProps);
        setTransactions(localTxs);
        playCoinSound();
      }
    } catch (err) {
      console.error("Unmortgage property failed:", err);
      alert("贖回產權失敗：" + err);
    }
  };

  const handlePayPropertyRent = async (propertyId: string) => {
    if (!room || !currentPlayerId) return;
    const property = properties.find((p) => p.id === propertyId);
    if (!property || !property.ownerId || property.ownerId === currentPlayerId) return;

    const owner = players.find(p => p.id === property.ownerId);
    if (!owner) {
      alert("找不到該土地的登記所有人！");
      return;
    }

    const rentAmt = calculateRent(property, properties);
    if (rentAmt <= 0) return;

    const payer = players.find(p => p.id === currentPlayerId);
    if (!payer) return;

    await pushBackup(`過路費：${payer.name} 支付 $${rentAmt} 給 ${owner.name}`, players, properties, transactions);

    if (payer.balance < rentAmt) {
      if (!confirm(`過路費金額為 $${rentAmt}，您的賬上餘額 ($${payer.balance}) 不足，是否要強制進入「賒帳/負債」透支模式進行扣款？`)) {
        return;
      }
    }

    try {
      if (isFirebaseReady && db) {
        const roomRefId = room.id;
        await runTransaction(db, async (transaction) => {
          const payerRef = doc(db, 'rooms', roomRefId, 'players', currentPlayerId);
          const ownerRef = doc(db, 'rooms', roomRefId, 'players', property.ownerId!);
          
          const payerSnap = await transaction.get(payerRef);
          const ownerSnap = await transaction.get(ownerRef);

          if (!payerSnap.exists() || !ownerSnap.exists()) {
            throw new Error("玩家資料讀取異常。");
          }

          const payerData = payerSnap.data() as Player;
          const ownerData = ownerSnap.data() as Player;

          transaction.update(payerRef, { balance: payerData.balance - rentAmt });
          transaction.update(ownerRef, { balance: ownerData.balance + rentAmt });

          // Log transaction
          const txId = 'tx_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
          const txDocRef = doc(db, 'rooms', roomRefId, 'transactions', txId);
          const newTx: Transaction = {
            id: txId,
            fromId: currentPlayerId,
            fromName: payerData.name,
            toId: property.ownerId!,
            toName: ownerData.name,
            amount: rentAmt,
            type: 'transfer',
            timestamp: Date.now()
          };
          transaction.set(txDocRef, newTx);
        });
        playCoinSound();
      } else {
        // Local Mode
        const localPlayersRaw = localStorage.getItem(`local_players_${room.id}`) || '[]';
        const localPlayers: Player[] = JSON.parse(localPlayersRaw);
        
        const payerIdx = localPlayers.findIndex(p => p.id === currentPlayerId);
        const ownerIdx = localPlayers.findIndex(p => p.id === property.ownerId);

        if (payerIdx !== -1) localPlayers[payerIdx].balance -= rentAmt;
        if (ownerIdx !== -1) localPlayers[ownerIdx].balance += rentAmt;

        const txId = 'tx_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
        const localTxsRaw = localStorage.getItem(`local_txs_${room.id}`) || '[]';
        const localTxs: Transaction[] = JSON.parse(localTxsRaw);
        const newTx: Transaction = {
          id: txId,
          fromId: currentPlayerId,
          fromName: payer.name,
          toId: property.ownerId,
          toName: owner.name,
          amount: rentAmt,
          type: 'transfer',
          timestamp: Date.now()
        };
        localTxs.unshift(newTx);

        localStorage.setItem(`local_players_${room.id}`, JSON.stringify(localPlayers));
        localStorage.setItem(`local_txs_${room.id}`, JSON.stringify(localTxs));

        setPlayers(localPlayers);
        setTransactions(localTxs);
        playCoinSound();
      }
    } catch (err) {
      console.error("Pay rent failed:", err);
      alert("支付過路費失敗：" + err);
    }
  };

  const handleTransferPropertyDeed = async (propertyId: string, toPlayerId: string) => {
    if (!room || !currentPlayerId) return;
    const property = properties.find((p) => p.id === propertyId);
    if (!property || property.ownerId !== currentPlayerId) return;

    const targetUser = players.find(p => p.id === toPlayerId);
    if (!targetUser) return;

    const giver = players.find(p => p.id === currentPlayerId);
    if (giver) {
      await pushBackup(`轉撥地產：${giver.name} 將 [${property.name}] 轉送給 ${targetUser.name}`, players, properties, transactions);
    }

    if (!confirm(`確定要把 [${property.name}] 的地產契約產權轉讓給「${targetUser.name}」嗎？`)) {
      return;
    }

    try {
      if (isFirebaseReady && db) {
        const roomRefId = room.id;
        const propDocRef = doc(db, 'rooms', roomRefId, 'properties', propertyId);
        await updateDoc(propDocRef, { ownerId: toPlayerId });
      } else {
        // Local Mode
        const updatedProps = properties.map(p => {
          if (p.id === propertyId) {
            return { ...p, ownerId: toPlayerId };
          }
          return p;
        });
        localStorage.setItem(`local_properties_${room.id}`, JSON.stringify(updatedProps));
        setProperties(updatedProps);
      }
      playUpgradeSound();
    } catch (err) {
      console.error("Transfer deed failed:", err);
      alert("轉移地產產權失敗");
    }
  };

  // 7. Action: P2P TRANSFER (The critical money transfer function!)
  const handleTransfer = async (toPlayerId: string, amount: number) => {
    if (!room) return;
    
    const sender = players.find(p => p.id === currentPlayerId);
    const receiver = players.find(p => p.id === toPlayerId);
    if (sender && receiver) {
      await pushBackup(`轉帳資金：${sender.name} 轉帳 $${amount} 給 ${receiver.name}`, players, properties, transactions);
    }

    try {
      if (isFirebaseReady && db) {
        const roomRefId = room.id;
        const senderId = currentPlayerId;

        // Perform an atomic multi-doc update transaction in Firestore
        await runTransaction(db, async (transaction) => {
          const senderDocRef = doc(db, 'rooms', roomRefId, 'players', senderId);
          const receiverDocRef = doc(db, 'rooms', roomRefId, 'players', toPlayerId);
          
          const senderSnap = await transaction.get(senderDocRef);
          const receiverSnap = await transaction.get(receiverDocRef);

          if (!senderSnap.exists() || !receiverSnap.exists()) {
            throw new Error("One or more players do not exist inside this banking portal.");
          }

          const senderData = senderSnap.data() as Player;
          const receiverData = receiverSnap.data() as Player;

          const newSenderBalance = senderData.balance - amount;
          const newReceiverBalance = receiverData.balance + amount;

          // Perform writes
          transaction.update(senderDocRef, { balance: newSenderBalance });
          transaction.update(receiverDocRef, { balance: newReceiverBalance });

          // Generate transaction id and push document
          const txId = 'tx_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
          const txDocRef = doc(db, 'rooms', roomRefId, 'transactions', txId);
          
          const newTx: Transaction = {
            id: txId,
            fromId: senderId,
            fromName: senderData.name,
            toId: toPlayerId,
            toName: receiverData.name,
            amount: amount,
            type: 'transfer',
            timestamp: Date.now()
          };

          transaction.set(txDocRef, newTx);
        });
      } else {
        // --- LOCAL EMULATION ---
        const localPlayersRaw = localStorage.getItem(`local_players_${room.id}`) || '[]';
        const localPlayers: Player[] = JSON.parse(localPlayersRaw);
        
        let sender = localPlayers.find(p => p.id === currentPlayerId);
        let receiver = localPlayers.find(p => p.id === toPlayerId);

        if (sender && receiver) {
          sender.balance -= amount;
          receiver.balance += amount;

          // Save player cards
          localStorage.setItem(`local_players_${room.id}`, JSON.stringify(localPlayers));

          // Log transaction
          const txId = 'tx_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
          const newTx: Transaction = {
            id: txId,
            fromId: currentPlayerId,
            fromName: sender.name,
            toId: toPlayerId,
            toName: receiver.name,
            amount: amount,
            type: 'transfer',
            timestamp: Date.now()
          };

          const localTxsRaw = localStorage.getItem(`local_txs_${room.id}`) || '[]';
          const localTxs = JSON.parse(localTxsRaw);
          localTxs.unshift(newTx);
          localStorage.setItem(`local_txs_${room.id}`, JSON.stringify(localTxs));

          // Set client state
          setPlayers(localPlayers);
          setTransactions(localTxs);
        }
      }
    } catch (err) {
      console.error("Transfer transaction failed:", err);
      alert("轉帳程序受阻，請再次核對餘額跟網路狀態！");
    }
  };

  // 8. Action: BANK GIVE MONEY
  const handleBankGive = async (playerIdTo: string, amount: number) => {
    if (!room) return;

    const receiver = players.find(p => p.id === playerIdTo);
    if (receiver) {
      await pushBackup(`銀行發放：金庫給予 ${receiver.name} $${amount}`, players, properties, transactions);
    }

    try {
      if (isFirebaseReady && db) {
        const roomRefId = room.id;
        
        await runTransaction(db, async (transaction) => {
          const receiverDocRef = doc(db, 'rooms', roomRefId, 'players', playerIdTo);
          const receiverSnap = await transaction.get(receiverDocRef);

          if (!receiverSnap.exists()) {
            throw new Error("Target player does not exist.");
          }

          const receiverData = receiverSnap.data() as Player;
          const newBalance = receiverData.balance + amount;

          transaction.update(receiverDocRef, { balance: newBalance });

          // Log transaction
          const txId = 'tx_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
          const txDocRef = doc(db, 'rooms', roomRefId, 'transactions', txId);
          
          const newTx: Transaction = {
            id: txId,
            fromId: 'bank',
            fromName: '中央銀行金庫',
            toId: playerIdTo,
            toName: receiverData.name,
            amount: amount,
            type: 'bank_give',
            timestamp: Date.now()
          };

          transaction.set(txDocRef, newTx);
        });
      } else {
        // --- LOCAL EMULATION ---
        const localPlayersRaw = localStorage.getItem(`local_players_${room.id}`) || '[]';
        const localPlayers: Player[] = JSON.parse(localPlayersRaw);
        const recv = localPlayers.find(p => p.id === playerIdTo);

        if (recv) {
          recv.balance += amount;
          localStorage.setItem(`local_players_${room.id}`, JSON.stringify(localPlayers));

          const txId = 'tx_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
          const newTx: Transaction = {
            id: txId,
            fromId: 'bank',
            fromName: '銀行聯總金庫',
            toId: playerIdTo,
            toName: recv.name,
            amount: amount,
            type: 'bank_give',
            timestamp: Date.now()
          };

          const localTxsRaw = localStorage.getItem(`local_txs_${room.id}`) || '[]';
          const localTxs = JSON.parse(localTxsRaw);
          localTxs.unshift(newTx);
          localStorage.setItem(`local_txs_${room.id}`, JSON.stringify(localTxs));

          setPlayers(localPlayers);
          setTransactions(localTxs);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 9. Action: BANK TAKE MONEY
  const handleBankTake = async (playerIdFrom: string, amount: number) => {
    if (!room) return;

    const sender = players.find(p => p.id === playerIdFrom);
    if (sender) {
      await pushBackup(`銀行徵收：向 ${sender.name} 扣收 $${amount}`, players, properties, transactions);
    }

    try {
      if (isFirebaseReady && db) {
        const roomRefId = room.id;
        
        await runTransaction(db, async (transaction) => {
          const senderDocRef = doc(db, 'rooms', roomRefId, 'players', playerIdFrom);
          const senderSnap = await transaction.get(senderDocRef);

          if (!senderSnap.exists()) {
            throw new Error("Target player does not exist.");
          }

          const senderData = senderSnap.data() as Player;
          const newBalance = senderData.balance - amount;

          transaction.update(senderDocRef, { balance: newBalance });

          // Log transaction
          const txId = 'tx_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
          const txDocRef = doc(db, 'rooms', roomRefId, 'transactions', txId);
          
          const newTx: Transaction = {
            id: txId,
            fromId: playerIdFrom,
            fromName: senderData.name,
            toId: 'bank',
            toName: '中央銀行接收',
            amount: amount,
            type: 'bank_take',
            timestamp: Date.now()
          };

          transaction.set(txDocRef, newTx);
        });
      } else {
        // --- LOCAL EMULATION ---
        const localPlayersRaw = localStorage.getItem(`local_players_${room.id}`) || '[]';
        const localPlayers: Player[] = JSON.parse(localPlayersRaw);
        const sendingPlr = localPlayers.find(p => p.id === playerIdFrom);

        if (sendingPlr) {
          sendingPlr.balance -= amount;
          localStorage.setItem(`local_players_${room.id}`, JSON.stringify(localPlayers));

          const txId = 'tx_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
          const newTx: Transaction = {
            id: txId,
            fromId: playerIdFrom,
            fromName: sendingPlr.name,
            toId: 'bank',
            toName: '銀行聯總接收',
            amount: amount,
            type: 'bank_take',
            timestamp: Date.now()
          };

          const localTxsRaw = localStorage.getItem(`local_txs_${room.id}`) || '[]';
          const localTxs = JSON.parse(localTxsRaw);
          localTxs.unshift(newTx);
          localStorage.setItem(`local_txs_${room.id}`, JSON.stringify(localTxs));

          setPlayers(localPlayers);
          setTransactions(localTxs);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 10. Action: BANK SET AMOUNT (Modify Exact)
  const handleBankSet = async (playerId: string, exactAmount: number) => {
    if (!room) return;

    const targetPlayer = players.find(p => p.id === playerId);
    if (targetPlayer) {
      await pushBackup(`修改資金：調整 ${targetPlayer.name} 的財產為 $${exactAmount}`, players, properties, transactions);
    }

    try {
      if (isFirebaseReady && db) {
        const roomRefId = room.id;
        
        await runTransaction(db, async (transaction) => {
          const userDocRef = doc(db, 'rooms', roomRefId, 'players', playerId);
          const userSnap = await transaction.get(userDocRef);

          if (!userSnap.exists()) return;

          const userData = userSnap.data() as Player;
          transaction.update(userDocRef, { balance: exactAmount });

          const txId = 'tx_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
          const txDocRef = doc(db, 'rooms', roomRefId, 'transactions', txId);
          
          const newTx: Transaction = {
            id: txId,
            fromId: 'bank',
            fromName: '銀行財政會計',
            toId: playerId,
            toName: userData.name,
            amount: exactAmount,
            type: 'reset',
            timestamp: Date.now()
          };

          transaction.set(txDocRef, newTx);
        });
      } else {
        // LOCAL EMULATION
        const localPlayersRaw = localStorage.getItem(`local_players_${room.id}`) || '[]';
        const localPlayers: Player[] = JSON.parse(localPlayersRaw);
        const plr = localPlayers.find(p => p.id === playerId);

        if (plr) {
          plr.balance = exactAmount;
          localStorage.setItem(`local_players_${room.id}`, JSON.stringify(localPlayers));

          const txId = 'tx_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
          const newTx: Transaction = {
            id: txId,
            fromId: 'bank',
            fromName: '銀行財政會計',
            toId: playerId,
            toName: plr.name,
            amount: exactAmount,
            type: 'reset',
            timestamp: Date.now()
          };

          const localTxsRaw = localStorage.getItem(`local_txs_${room.id}`) || '[]';
          const localTxs = JSON.parse(localTxsRaw);
          localTxs.unshift(newTx);
          localStorage.setItem(`local_txs_${room.id}`, JSON.stringify(localTxs));

          setPlayers(localPlayers);
          setTransactions(localTxs);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 11. Action: RESET GAME (All players back to initialAmount, wipe transactions, clear properties)
  const handleResetGame = async () => {
    if (!room) return;

    await pushBackup(`重置清除：行長初始化遊戲與歸零產權`, players, properties, transactions);

    try {
      if (isFirebaseReady && db) {
        const roomRefId = room.id;
        const initialAmt = room.initialBalance;

        // Fetch all players & properties
        const playersRef = collection(db, 'rooms', roomRefId, 'players');
        const pSnap = await getDocs(playersRef);

        const propertiesRef = collection(db, 'rooms', roomRefId, 'properties');
        const propSnap = await getDocs(propertiesRef);

        await runTransaction(db, async (transaction) => {
          pSnap.forEach((pDoc) => {
            const pDocRef = pDoc.ref;
            transaction.update(pDocRef, { balance: initialAmt });
          });

          propSnap.forEach((pDoc) => {
            const pRef = pDoc.ref;
            transaction.update(pRef, {
              ownerId: null,
              houses: 0,
              isMortgaged: false
            });
          });

          const txId = 'tx_reset_' + Date.now();
          const txDocRef = doc(db, 'rooms', roomRefId, 'transactions', txId);
          const resetLog: Transaction = {
            id: txId,
            fromId: 'bank',
            fromName: '銀行體系',
            toId: 'all',
            toName: '全體大亨',
            amount: initialAmt,
            type: 'reset',
            timestamp: Date.now()
          };
          transaction.set(txDocRef, resetLog);
        });
      } else {
        // --- LOCAL EMULATION ---
        const localPlayersRaw = localStorage.getItem(`local_players_${room.id}`) || '[]';
        const localPlayers: Player[] = JSON.parse(localPlayersRaw);
        
        const resetPlrs = localPlayers.map(p => ({ ...p, balance: room.initialBalance }));
        localStorage.setItem(`local_players_${room.id}`, JSON.stringify(resetPlrs));

        const initialProps = getInitialProperties();
        localStorage.setItem(`local_properties_${room.id}`, JSON.stringify(initialProps));

        const txId = 'tx_reset_' + Date.now();
        const resetLog: Transaction = {
          id: txId,
          fromId: 'bank',
          fromName: '銀行體系',
          toId: 'all',
          toName: '全體大亨',
          amount: room.initialBalance,
          type: 'reset',
          timestamp: Date.now()
        };

        localStorage.setItem(`local_txs_${room.id}`, JSON.stringify([resetLog]));

        setPlayers(resetPlrs);
        setProperties(initialProps);
        setTransactions([resetLog]);
      }
    } catch (e) {
      console.error("Reset game failed:", e);
    }
  };

  // 12. Action: SETTLE GAME (Update room status to 'settled')
  const handleSettleGame = async () => {
    if (!room) return;
    try {
      if (isFirebaseReady && db) {
        const roomRef = doc(db, 'rooms', room.id);
        await updateDoc(roomRef, { 
          status: 'settled',
          updatedAt: Date.now()
        });
      } else {
        // Local emulation status
        const localRoomsRaw = localStorage.getItem('local_monopoly_rooms') || '{}';
        const localRooms = JSON.parse(localRoomsRaw);
        if (localRooms[room.id]) {
          localRooms[room.id].status = 'settled';
          localRooms[room.id].updatedAt = Date.now();
          localStorage.setItem('local_monopoly_rooms', JSON.stringify(localRooms));
          
          setRoom(localRooms[room.id]);
        }
      }
    } catch (e) {
      console.error("Settle game failed:", e);
    }
  };

  // 13. Action: RESUME GAME (Update room status back to 'playing')
  const handleResumeGame = async () => {
    if (!room) return;
    try {
      if (isFirebaseReady && db) {
        const roomRef = doc(db, 'rooms', room.id);
        await updateDoc(roomRef, { 
          status: 'playing',
          updatedAt: Date.now()
        });
      } else {
        // Local emulation status
        const localRoomsRaw = localStorage.getItem('local_monopoly_rooms') || '{}';
        const localRooms = JSON.parse(localRoomsRaw);
        if (localRooms[room.id]) {
          localRooms[room.id].status = 'playing';
          localRooms[room.id].updatedAt = Date.now();
          localStorage.setItem('local_monopoly_rooms', JSON.stringify(localRooms));
          
          setRoom(localRooms[room.id]);
        }
      }
    } catch (e) {
      console.error("Resume game failed:", e);
    }
  };

  // 14. Action: Save a history state backup
  async function pushBackup(actionName: string, currentPlayers: Player[], currentProperties: Property[], currentTransactions: Transaction[]) {
    if (!room) return;
    const backupId = 'bak_' + Date.now();
    const backup = {
      id: backupId,
      actionName,
      timestamp: Date.now(),
      players: JSON.stringify(currentPlayers),
      properties: JSON.stringify(currentProperties),
      transactions: JSON.stringify(currentTransactions)
    };

    if (isFirebaseReady && db) {
      try {
        const backupRef = doc(db, 'rooms', room.id, 'backups', backupId);
        await setDoc(backupRef, backup);

        // Keep last 10 backups in Firestore
        const backupsColl = collection(db, 'rooms', room.id, 'backups');
        const snap = await getDocs(backupsColl);
        if (snap.size > 10) {
          const sortedList = snap.docs.map(dDoc => ({
            ref: dDoc.ref,
            timestamp: dDoc.data().timestamp || 0
          })).sort((a, b) => b.timestamp - a.timestamp);

          for (let i = 10; i < sortedList.length; i++) {
            await deleteDoc(sortedList[i].ref);
          }
        }
      } catch (err) {
        console.warn("Failed to push backup to Firebase:", err);
      }
    } else {
      const key = `local_backups_${room.id}`;
      const raw = localStorage.getItem(key) || '[]';
      const list = JSON.parse(raw);
      list.unshift(backup);
      if (list.length > 10) {
        list.splice(10);
      }
      localStorage.setItem(key, JSON.stringify(list));
      setBackups(list);
    }
  }

  // 15. Action: Restore a history state backup
  async function handleRestoreBackup(backupId: string) {
    if (!room) return;
    try {
      let backupToRestore: any = null;

      if (isFirebaseReady && db) {
        const backupRef = doc(db, 'rooms', room.id, 'backups', backupId);
        const snap = await getDoc(backupRef);
        if (snap.exists()) {
          backupToRestore = snap.data();
        }
      } else {
        const key = `local_backups_${room.id}`;
        const raw = localStorage.getItem(key) || '[]';
        const list = JSON.parse(raw);
        backupToRestore = list.find((b: any) => b.id === backupId);
      }

      if (!backupToRestore) {
        alert("⚠️ 錯誤：找不到此紀錄點！");
        return;
      }

      const restoredPlrs: Player[] = JSON.parse(backupToRestore.players);
      const restoredProps: Property[] = JSON.parse(backupToRestore.properties);
      const restoredTxs: Transaction[] = JSON.parse(backupToRestore.transactions);

      if (isFirebaseReady && db) {
        // Restore players and properties inside a transaction
        await runTransaction(db, async (transaction) => {
          for (const p of restoredPlrs) {
            const pRef = doc(db, 'rooms', room.id, 'players', p.id);
            transaction.set(pRef, p);
          }
          for (const pr of restoredProps) {
            const prRef = doc(db, 'rooms', room.id, 'properties', pr.id);
            transaction.set(prRef, pr);
          }
        });

        // Restore transactions (overwrite)
        const txsColl = collection(db, 'rooms', room.id, 'transactions');
        const txsSnap = await getDocs(txsColl);
        await Promise.all(txsSnap.docs.map(tDoc => deleteDoc(tDoc.ref)));
        await Promise.all(restoredTxs.map(tx => setDoc(doc(db, 'rooms', room.id, 'transactions', tx.id), tx)));

        // Remove the restored backup and all backups newer
        const backupRef = doc(db, 'rooms', room.id, 'backups', backupId);
        await deleteDoc(backupRef);
      } else {
        localStorage.setItem(`local_players_${room.id}`, JSON.stringify(restoredPlrs));
        localStorage.setItem(`local_properties_${room.id}`, JSON.stringify(restoredProps));
        localStorage.setItem(`local_txs_${room.id}`, JSON.stringify(restoredTxs));

        const key = `local_backups_${room.id}`;
        const raw = localStorage.getItem(key) || '[]';
        let list = JSON.parse(raw);
        const itemIdx = list.findIndex((b: any) => b.id === backupId);
        if (itemIdx !== -1) {
          list.splice(0, itemIdx + 1);
        }
        localStorage.setItem(key, JSON.stringify(list));

        setPlayers(restoredPlrs);
        setProperties(restoredProps);
        setTransactions(restoredTxs);
        setBackups(list);
      }

      alert(`✅ 已成功回滾到上一步：${backupToRestore.actionName}`);
    } catch (err) {
      console.error("Restore backup failed:", err);
      alert("❌ 回滾失敗，請檢查系統或紀錄完整性。");
    }
  }

  // Leave active room context
  const handleLeaveRoom = async () => {
    // Clean up active Firestore subscribers immediately
    if (subCleanupRef.current) {
      try {
        subCleanupRef.current();
      } catch (err) {
        console.warn("Error releasing listeners on room leave:", err);
      }
      subCleanupRef.current = null;
    }

    if (room && currentPlayerId) {
      try {
        if (isFirebaseReady && db) {
          const referee = doc(db, 'rooms', room.id, 'players', currentPlayerId);
          await updateDoc(referee, { isOnline: false });
        } else {
          // Local emulation offline flag
          const localPlayersRaw = localStorage.getItem(`local_players_${room.id}`) || '[]';
          const localPlayers: Player[] = JSON.parse(localPlayersRaw);
          const updateLocal = localPlayers.map(p => p.id === currentPlayerId ? { ...p, isOnline: false } : p);
          localStorage.setItem(`local_players_${room.id}`, JSON.stringify(updateLocal));
        }
      } catch (e) {
        console.warn("Soft disconnected on logout:", e);
      }
    }

    // Clear local cache keys
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    setRoom(null);
    setPlayers([]);
    setTransactions([]);
    setCurrentPlayerId('');
    setViewState('home');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center font-sans px-4 text-center">
        <div className="w-16 h-16 border-4 border-dashed border-red-500 rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-gray-700 mt-4">大富翁中央電子金庫讀取中...</p>
        <span className="text-xs text-gray-400 font-mono mt-1">RECOVERING SESSIONS AND LEDGERS</span>
        
        {/* Force clean button to recover from stuck state if any */}
        <button 
          id="btn-force-clear-session"
          onClick={() => {
            localStorage.removeItem(SESSION_KEY);
            sessionStorage.removeItem(SESSION_KEY);
            window.location.href = window.location.origin + window.location.pathname;
          }}
          className="mt-8 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold font-mono tracking-wide rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          FORCE CLEAR SESSION & EXIT (若連線卡住)
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-black pb-12 font-sans flex flex-col justify-between">
      {/* Top Banner indicating local or server model */}
      <header className="bg-black text-[10px] text-gray-300 py-1.5 px-4 font-mono select-none flex justify-between items-center shrink-0">
        <span className="flex items-center">
          <Landmark className="w-3.5 h-3.5 text-lime-400 mr-1.5" />
          <span>MONOPOLY BANK v4.0 • PRODUCTION</span>
        </span>
        <span className="font-bold flex items-center">
          {isFirebaseReady ? (
            <span className="text-emerald-400">● FIRESTORE CLOUD ACTIVE</span>
          ) : (
            <span className="text-amber-400">▲ LOCAL TEST SANDBOX PLAY</span>
          )}
        </span>
      </header>

      {/* Main Container */}
      <main className="flex-grow flex items-center justify-center py-6">
        {viewState === 'home' && (
          <CreateJoinView
            onJoin={handleJoinRoom}
            onCreate={handleCreateRoom}
            onTakeover={handleTakeoverPlayer}
            getRoomPlayers={getRoomPlayers}
            initialRoomCode={urlRoomCode}
            isFirebaseReady={isFirebaseReady}
          />
        )}

        {viewState === 'lobby' && room && (
          <LobbyView
            room={room}
            players={players}
            currentPlayerId={currentPlayerId}
            onStartGame={handleStartGame}
          />
        )}

        {viewState === 'game' && room && (
          <GameView
            room={room}
            players={players}
            transactions={transactions}
            properties={properties}
            currentPlayerId={currentPlayerId}
            onTransfer={handleTransfer}
            onBankGive={handleBankGive}
            onBankTake={handleBankTake}
            onBankSet={handleBankSet}
            onResetGame={handleResetGame}
            onLeaveRoom={handleLeaveRoom}
            isFirebaseReady={isFirebaseReady}
            onBuyProperty={handleBuyProperty}
            onUpgradeProperty={handleUpgradeProperty}
            onMortgageProperty={handleMortgageProperty}
            onUnmortgageProperty={handleUnmortgageProperty}
            onPayRent={handlePayPropertyRent}
            onTransferDeed={handleTransferPropertyDeed}
            onSettleGame={handleSettleGame}
            onResumeGame={handleResumeGame}
            backups={backups}
            onRestoreBackup={handleRestoreBackup}
          />
        )}
      </main>

      {/* Bottom Footer Credits */}
      <footer className="w-full max-w-md mx-auto text-center px-4 pt-4 mt-auto">
        <div className="bg-white border-2 border-dashed border-gray-300 p-3 rounded-xl flex items-start space-x-2 text-left">
          <HelpCircle className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] font-bold text-gray-600 block">房主指南：如何讓朋友連入？</span>
            <span className="text-[9px] text-gray-450 block leading-relaxed mt-0.5">
              如果您開啟了「連線模式」，點擊「複製邀請網址」將 URL 傳給朋友（或讓朋友掃描 QR 碼）。朋友可以直接連進您的金庫同台交易！
            </span>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 font-bold mt-3 font-mono uppercase tracking-widest leading-none">
          © {new Date().getFullYear()} MONOPOLY ELECTRONIC CO-OP BANKING SYSTEM
        </p>
      </footer>
    </div>
  );
}
