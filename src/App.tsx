/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  runTransaction 
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { Player, Room, Transaction, ViewState } from './types';
import CreateJoinView from './components/CreateJoinView';
import LobbyView from './components/LobbyView';
import GameView from './components/GameView';
import { playCoinSound, playUpgradeSound } from './utils/audio';
import { Landmark, Sparkles, HelpCircle } from 'lucide-react';

const SESSION_KEY = 'monopoly_banking_session';

export default function App() {
  const [viewState, setViewState] = useState<ViewState>('home');
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('');
  
  const [isFirebaseReady, setIsFirebaseReady] = useState(isFirebaseConfigured);
  const [loading, setLoading] = useState(true);
  const [urlRoomCode, setUrlRoomCode] = useState<string>('');

  // 1. Initial mounting checks (parse URL query, parse sessionStorage/localStorage Session)
  useEffect(() => {
    // Parse invite code in Url e.g., ?room=123456
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get('room');
    if (roomCode && roomCode.length === 6) {
      setUrlRoomCode(roomCode);
    }

    // Recover previous identity session (Disconnect Reconnection mechanism)
    // tab-specific sessionStorage takes precedence to avoid cross-tab collision
    const sessionStored = sessionStorage.getItem(SESSION_KEY);
    const localStored = localStorage.getItem(SESSION_KEY);
    const stored = sessionStored || localStored;

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
            await updateDoc(playerRef, { isOnline: true });
            
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
              const updated = localPlayers.map(p => p.id === playerId ? { ...p, isOnline: true } : p);
              localStorage.setItem(`local_players_${roomId}`, JSON.stringify(updated));
              
              setRoom(activeRoom);
              setPlayers(updated);
              setTransactions(txsRaw ? JSON.parse(txsRaw) : []);
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
      snapshot.forEach(docSnap => {
        pList.push(docSnap.data() as Player);
      });
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
      
      // Sound feedback threshold checking: If a new transaction arrives, trigger coin effect!
      if (transactions.length > 0 && txList.length > transactions.length) {
        const latestTx = txList[0];
        if (latestTx.toId === myPlayerId) {
          playCoinSound();
        }
      }
      setTransactions(txList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `rooms/${roomId}/transactions`);
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
    return () => {
      unsubRoom();
      unsubPlayers();
      unsubTxs();
      window.removeEventListener('beforeunload', handleUnload);
    };
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
          joinedAt: Date.now()
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
          joinedAt: Date.now()
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
          joinedAt: Date.now()
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
          joinedAt: Date.now()
        };

        localPlayers.push(newLocalPlayer);
        localStorage.setItem(`local_players_${targetRoomId}`, JSON.stringify(localPlayers));
        localStorage.setItem(SESSION_KEY, JSON.stringify({ roomId: targetRoomId, playerId: myLocalId }));
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ roomId: targetRoomId, playerId: myLocalId }));

        // Load logs
        const localTxsRaw = localStorage.getItem(`local_txs_${targetRoomId}`) || '[]';

        setCurrentPlayerId(myLocalId);
        setRoom(targetRoom);
        setPlayers(localPlayers);
        setTransactions(JSON.parse(localTxsRaw));
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

  // 7. Action: P2P TRANSFER (The critical money transfer function!)
  const handleTransfer = async (toPlayerId: string, amount: number) => {
    if (!room) return;
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

  // 11. Action: RESET GAME (All players back to initialAmount, wipe transactions)
  const handleResetGame = async () => {
    if (!room) return;
    try {
      if (isFirebaseReady && db) {
        const roomRefId = room.id;
        const initialAmt = room.initialBalance;

        // Fetch all players
        const playersRef = collection(db, 'rooms', roomRefId, 'players');
        const pSnap = await getDocs(playersRef);

        await runTransaction(db, async (transaction) => {
          pSnap.forEach((pDoc) => {
            const pDocRef = pDoc.ref;
            transaction.update(pDocRef, { balance: initialAmt });
          });

          // Delete all records of transactions
          // Note: Standard Firestore transactions are write-only additions.
          // Since deleting collections inside client is unsafe, we add a terminal 'reset' log.
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
        setTransactions([resetLog]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Leave active room context
  const handleLeaveRoom = async () => {
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
            currentPlayerId={currentPlayerId}
            onTransfer={handleTransfer}
            onBankGive={handleBankGive}
            onBankTake={handleBankTake}
            onBankSet={handleBankSet}
            onResetGame={handleResetGame}
            onLeaveRoom={handleLeaveRoom}
            isFirebaseReady={isFirebaseReady}
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
