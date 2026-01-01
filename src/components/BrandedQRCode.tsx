import React, { useEffect, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';

interface BrandedQRCodeProps {
    value: string;
    logoUrl?: string;
    size?: number;
    id?: string;
}

export const BrandedQRCode: React.FC<BrandedQRCodeProps> = ({
    value,
    logoUrl,
    size = 300,
    id = "qr-code-instance"
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const qrCode = useRef<QRCodeStyling | null>(null);

    useEffect(() => {
        // Initialize QR Code Styling
        qrCode.current = new QRCodeStyling({
            width: size,
            height: size,
            type: 'canvas',
            data: value,
            image: logoUrl,
            margin: 10,
            qrOptions: {
                typeNumber: 0,
                mode: 'Byte',
                errorCorrectionLevel: 'H'
            },
            imageOptions: {
                hideBackgroundDots: true,
                imageSize: 0.3,
                margin: 5, // Padding around logo
                crossOrigin: 'anonymous',
            },
            dotsOptions: {
                color: '#222222',
                type: 'dots' // Correct type for round dots
            },
            backgroundOptions: {
                color: '#ffffff',
            },
            cornersSquareOptions: {
                type: 'extra-rounded', // Rounded eyes outer
                color: '#222222'
            },
            cornersDotOptions: {
                type: 'dot', // Round eyes inner
                color: '#222222'
            },
        });

        if (ref.current) {
            ref.current.innerHTML = ''; // Cleanup previous
            qrCode.current.append(ref.current);
        }
    }, []);

    useEffect(() => {
        if (qrCode.current) {
            qrCode.current.update({
                data: value,
                image: logoUrl,
                width: size,
                height: size,
                imageOptions: {
                    hideBackgroundDots: true,
                    imageSize: 0.3,
                    margin: 5,
                    crossOrigin: 'anonymous'
                },
                dotsOptions: {
                    color: '#222222',
                    type: 'dots'
                },
                cornersSquareOptions: {
                    type: 'extra-rounded',
                    color: '#222222'
                },
                cornersDotOptions: {
                    type: 'dot',
                    color: '#222222'
                }
            });
        }
    }, [value, logoUrl, size]);

    return <div id={id} ref={ref} className="qr-code-container" style={{ display: 'inline-block' }} />;
};
