import { FileUploaderRegular } from '@uploadcare/react-uploader';
import '@uploadcare/react-uploader/core.css';

interface ImageUploadProps {
    value: string;
    onChange: (url: string) => void;
}

export const ImageUpload = ({ value, onChange }: ImageUploadProps) => {
    return (
        <div className='w-full'>
            {value ? (
                <div className='relative w-full h-48 rounded-lg overflow-hidden mb-4'>
                    <img src={value} alt='Preview' className='w-full h-full object-cover' />
                    <button
                        onClick={() => onChange('')}
                        className='absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full'
                    >
                        Remove
                    </button>
                </div>
            ) : (
                <FileUploaderRegular
                    pubkey={process.env.NEXT_PUBLIC_UPLOADCARE_PUB_KEY || ''}
                    maxLocalFileSizeBytes={10000000}
                    imgOnly={true}
                    sourceList='local, url, camera'
                    className='uc-light'
                    onFileUploadSuccess={(file) => {
                        if (file.cdnUrl) {
                            onChange(file.cdnUrl);
                        }
                    }}
                />
            )}
        </div>
    );
};
