import { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { X, Check, RotateCw, ZoomIn } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

interface ImageCropModalProps {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onConfirm: (croppedImageBlob: Blob) => void;
  aspect?: number;
  circularCrop?: boolean;
}

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function ImageCropModal({
  open,
  imageSrc,
  onClose,
  onConfirm,
  aspect,
  circularCrop = false,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { toast } = useToast();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open && imageSrc) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setCroppedAreaPixels(null);
      setImageLoaded(false);
      
      // Preload image to ensure it's ready
      const img = new Image();
      img.onload = () => {
        setImageLoaded(true);
      };
      img.onerror = () => {
        toast({
          variant: 'error',
          title: 'Image Error',
          description: 'Failed to load image',
        });
      };
      img.src = imageSrc;
    }
  }, [open, imageSrc, toast]);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getRadianAngle = (degreeValue: number) => {
    return (degreeValue * Math.PI) / 180;
  };

  const rotateSize = (width: number, height: number, rotation: number) => {
    const rotRad = getRadianAngle(rotation);
    return {
      width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
      height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
    };
  };

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
    rotation = 0,
    flip = { horizontal: false, vertical: false }
  ): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    const rotRad = getRadianAngle(rotation);

    // Calculate bounding box of the rotated image
    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
      image.width,
      image.height,
      rotation
    );

    // Set canvas size to match the bounding box
    canvas.width = bBoxWidth;
    canvas.height = bBoxHeight;

    // Translate canvas context to a central location to allow rotating and flipping around the center
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
    ctx.rotate(rotRad);
    ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
    ctx.translate(-image.width / 2, -image.height / 2);

    // Draw rotated image
    ctx.drawImage(image, 0, 0);

    const data = ctx.getImageData(
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height
    );

    // Set canvas width to final desired crop size - this will clear existing context
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Paste generated rotate image at the top left corner
    ctx.putImageData(data, 0, 0);

    // If circular crop, create circular mask
    if (circularCrop) {
      const circularCanvas = document.createElement('canvas');
      circularCanvas.width = pixelCrop.width;
      circularCanvas.height = pixelCrop.height;
      const circularCtx = circularCanvas.getContext('2d');

      if (!circularCtx) {
        throw new Error('Unable to get 2D context for circular crop');
      }

      circularCtx.beginPath();
      circularCtx.arc(
        pixelCrop.width / 2,
        pixelCrop.height / 2,
        Math.min(pixelCrop.width, pixelCrop.height) / 2,
        0,
        2 * Math.PI
      );
      circularCtx.clip();
      circularCtx.drawImage(canvas, 0, 0);
      return new Promise((resolve, reject) => {
        circularCanvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create circular image blob'));
          }, 'image/png');
        }, 'image/png');
      });
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create image blob'));
      }, 'image/png');
    });
  };

  const handleConfirm = async () => {
    if (!croppedAreaPixels) {
      toast({
        variant: 'error',
        title: 'Error',
        description: 'Please crop the image first',
      });
      return;
    }

    if (!imageSrc) {
      toast({
        variant: 'error',
        title: 'Error',
        description: 'No image to crop',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      onConfirm(croppedImageBlob);
      onClose();
    } catch (error) {
      console.error('Crop error:', error);
      toast({
        variant: 'error',
        title: 'Crop Failed',
        description: error instanceof Error ? error.message : 'Failed to crop image',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!open || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl mx-4 flex flex-col h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
          <h3 className="text-xl font-semibold text-white">Crop Image</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            disabled={isProcessing}
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Cropper Container - Fixed Height */}
        <div className="relative bg-gray-900 h-[500px] w-full">
          {imageSrc && imageLoaded ? (
            <div className="relative w-full h-full">
              {/* Cropper component requires style prop - library API requirement */}
              {/* eslint-disable-next-line react/forbid-dom-props */}
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
                cropShape={circularCrop ? 'round' : 'rect'}
                showGrid={true}
                restrictPosition={true}
                style={{
                  containerStyle: {
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    backgroundColor: '#111827',
                  },
                  cropAreaStyle: {
                    border: '2px solid #a855f7',
                  },
                  mediaStyle: {
                    maxWidth: '100%',
                    maxHeight: '100%',
                  },
                }}
              />
            </div>
          ) : imageSrc ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading image...</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400">No image selected</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-gray-700 space-y-4 flex-shrink-0 bg-gray-800">
          {/* Zoom Control */}
          <div className="space-y-2">
            <label htmlFor="zoom-input" className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <ZoomIn className="h-4 w-4" />
              Zoom: {Math.round(zoom * 100)}%
            </label>
            <input
              id="zoom-input"
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          {/* Rotation Control */}
          <div className="space-y-2">
            <label htmlFor="rotation-input" className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <RotateCw className="h-4 w-4" />
              Rotation: {rotation}°
            </label>
            <input
              id="rotation-input"
              type="range"
              min={0}
              max={360}
              step={1}
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isProcessing || !croppedAreaPixels || !imageLoaded}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Confirm Crop
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
