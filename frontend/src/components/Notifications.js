import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const NotificationContext = createContext(null);

function NotificationToast({ notification, onDismiss }) {
    useEffect(() => {
        const timeout = window.setTimeout(() => onDismiss(notification.id), 5000);
        return () => window.clearTimeout(timeout);
    }, [notification.id, onDismiss]);

    return (
        <div
            className={`toast show align-items-center text-bg-${notification.variant} border-0`}
            role={notification.variant === "danger" ? "alert" : "status"}
            aria-live={notification.variant === "danger" ? "assertive" : "polite"}
            aria-atomic="true"
        >
            <div className="d-flex">
                <div className="toast-body">{notification.message}</div>
                <button
                    type="button"
                    className="btn-close btn-close-white me-2 m-auto"
                    aria-label="Sulje ilmoitus"
                    onClick={() => onDismiss(notification.id)}
                />
            </div>
        </div>
    );
}

export function NotificationProvider({ children }) {
    const [notifications, setNotifications] = useState([]);
    const nextId = useRef(0);

    const notify = useCallback((message, variant = "info") => {
        const id = nextId.current++;
        setNotifications((current) => [...current, { id, message, variant }]);
    }, []);

    const dismiss = useCallback((id) => {
        setNotifications((current) => current.filter((notification) => notification.id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={notify}>
            {children}
            <div className="toast-container position-fixed top-0 end-0 p-3" aria-live="polite" aria-atomic="false">
                {notifications.map((notification) => (
                    <NotificationToast key={notification.id} notification={notification} onDismiss={dismiss} />
                ))}
            </div>
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const notify = useContext(NotificationContext);
    if (!notify) throw new Error("useNotification must be used within a NotificationProvider");
    return notify;
}
