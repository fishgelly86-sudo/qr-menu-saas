import { useEffect, useRef, useState } from 'react';

interface NotificationOptions {
    title: string;
    body: string;
    icon?: string;
}

export function useEnhancedNotifications(soundUrl: string) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
    const hasInteracted = useRef(false);

    // Initialize audio
    useEffect(() => {
        audioRef.current = new Audio(soundUrl);
        audioRef.current.volume = 0.7;
    }, [soundUrl]);

    // Request notification permission on mount
    useEffect(() => {
        if ('Notification' in window) {
            setNotificationPermission(Notification.permission);

            if (Notification.permission === 'default') {
                Notification.requestPermission().then(permission => {
                    setNotificationPermission(permission);
                });
            }
        }
    }, []);

    // Auto-enable audio after first user interaction
    useEffect(() => {
        const enableAudioOnInteraction = () => {
            if (!hasInteracted.current) {
                hasInteracted.current = true;
                setAudioEnabled(true);

                // Test play to unlock audio (required by browsers)
                if (audioRef.current) {
                    audioRef.current.play().then(() => {
                        audioRef.current!.pause();
                        audioRef.current!.currentTime = 0;
                    }).catch(() => {
                        // Ignore errors on test play
                    });
                }
            }
        };

        // Listen for any user interaction
        document.addEventListener('click', enableAudioOnInteraction, { once: true });
        document.addEventListener('keydown', enableAudioOnInteraction, { once: true });
        document.addEventListener('touchstart', enableAudioOnInteraction, { once: true });

        return () => {
            document.removeEventListener('click', enableAudioOnInteraction);
            document.removeEventListener('keydown', enableAudioOnInteraction);
            document.removeEventListener('touchstart', enableAudioOnInteraction);
        };
    }, []);

    const playSound = () => {
        if (audioRef.current && audioEnabled) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch((error) => {
                console.error("Failed to play notification sound:", error);
            });
        }
    };

    const showNotification = (options: NotificationOptions) => {
        // Show browser notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(options.title, {
                body: options.body,
                icon: options.icon || '/icon-192x192.png',
                badge: '/icon-192x192.png',
                tag: 'restaurant-notification',
                requireInteraction: false,
                silent: false, // Allow sound
            });

            // Auto-close after 10 seconds
            setTimeout(() => notification.close(), 10000);

            // Focus window when notification is clicked
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        }

        // Always play sound
        playSound();
    };

    return {
        showNotification,
        playSound,
        audioEnabled,
        notificationPermission,
        requestPermission: async () => {
            if ('Notification' in window) {
                const permission = await Notification.requestPermission();
                setNotificationPermission(permission);
                return permission;
            }
            return 'denied';
        }
    };
}
