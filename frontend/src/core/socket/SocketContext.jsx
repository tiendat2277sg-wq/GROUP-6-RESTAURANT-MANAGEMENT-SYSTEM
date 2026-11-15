import { getAuthToken } from "@/core/api/httpClient.js";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "./socketConfig.js";

const SocketContext = createContext({
  socket: null,
  connected: false,
});

function resolveUserId(user) {
  const id = Number(user?.userId ?? user?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function resolveRoleId(user) {
  const id = Number(user?.roleId ?? user?.role_id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function SocketProvider({ children, user = null, sessionId = null, tableToken = null }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  const userId = resolveUserId(user);
  const roleId = resolveRoleId(user);
  const parsedSessionId = Number(sessionId);
  const activeSessionId =
    Number.isFinite(parsedSessionId) && parsedSessionId > 0
      ? parsedSessionId
      : null;

  useEffect(() => {
    if ((!userId || !roleId) && !activeSessionId) {
      setSocket(null);
      setConnected(false);
      return undefined;
    }

    let isMounted = true;

    const instance = io(SOCKET_URL, {
      autoConnect: false,
      transports: ["websocket"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      auth: done => done({token:getAuthToken(),tableToken}),
    });

    const onConnect = () => {
      if (isMounted) setConnected(true);
    };
    const onDisconnect = () => {
      if (isMounted) setConnected(false);
    };

    instance.on("connect", onConnect);
    instance.on("disconnect", onDisconnect);

    instance.connect();
    setSocket(instance);

    return () => {
      isMounted = false;
      instance.off("connect", onConnect);
      instance.off("disconnect", onDisconnect);
      if (instance.connected) {
        instance.disconnect();
      } else {
        setTimeout(() => {
          try {
            instance.disconnect();
          } catch {}
        }, 50);
      }
      setSocket(null);
      setConnected(false);
    };
  }, [userId, roleId, activeSessionId, tableToken]);

  const value = useMemo(
    () => ({
      socket,
      connected,
    }),
    [socket, connected]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
