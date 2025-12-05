import { useEffect, useRef } from 'react';

export function useNotificationSound(soundUrl: string) {
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        audioRef.current = new Audio(soundUrl);
    }, [soundUrl]);

    const playSound = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch((error) => {
                console.error("Failed to play notification sound:", error);
            });
        }
    };

    return playSound;
}
