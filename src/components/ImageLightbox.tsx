"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn, ZoomOut, RotateCcw, Maximize2 } from "lucide-react";

interface ImageLightboxProps {
    src: string | null;
    alt?: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function ImageLightbox({ src, alt, isOpen, onClose }: ImageLightboxProps) {
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    // Reset zoom and pan on open/source change
    useEffect(() => {
        if (isOpen) {
            setScale(1);
            setOffset({ x: 0, y: 0 });
        }
    }, [isOpen, src]);

    const handleZoomIn = () => {
        setScale((prev) => Math.min(prev + 0.5, 5));
    };

    const handleZoomOut = () => {
        setScale((prev) => {
            const next = Math.max(prev - 0.5, 1);
            if (next === 1) {
                setOffset({ x: 0, y: 0 });
            }
            return next;
        });
    };

    const handleReset = () => {
        setScale(1);
        setOffset({ x: 0, y: 0 });
    };

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === "Escape") {
                onClose();
            } else if (e.key === "+" || e.key === "=") {
                handleZoomIn();
            } else if (e.key === "-" || e.key === "_") {
                handleZoomOut();
            } else if (e.key === "0") {
                handleReset();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen]);

    // Handle mouse wheel zoom
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const zoomFactor = 0.15;
        const direction = e.deltaY < 0 ? 1 : -1;
        setScale((prev) => {
            const next = Math.max(1, Math.min(prev + direction * zoomFactor, 5));
            if (next === 1) {
                setOffset({ x: 0, y: 0 });
            }
            return next;
        });
    };

    // Pointer-down: handles both touch and mouse unified
    const handlePointerDown = (e: React.PointerEvent) => {
        if (scale <= 1) return;
        e.preventDefault();
        setIsDragging(true);
        // Keep track of pointer relative to current offset
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
        if (containerRef.current) {
            containerRef.current.setPointerCapture(e.pointerId);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || scale <= 1) return;
        e.preventDefault();

        const img = imgRef.current;
        const container = containerRef.current;
        if (!img || !container) return;

        const containerRect = container.getBoundingClientRect();
        const imgRect = img.getBoundingClientRect();

        // Get the base (unscaled) size of the image inside the container
        const baseWidth = imgRect.width / scale;
        const baseHeight = imgRect.height / scale;

        // Current scaled dimensions of the image
        const scaledWidth = baseWidth * scale;
        const scaledHeight = baseHeight * scale;

        // Calculate max dragging offset from the center
        const maxOffsetX = scaledWidth > containerRect.width ? (scaledWidth - containerRect.width) / 2 : 0;
        const maxOffsetY = scaledHeight > containerRect.height ? (scaledHeight - containerRect.height) / 2 : 0;

        const targetX = e.clientX - dragStart.x;
        const targetY = e.clientY - dragStart.y;

        setOffset({
            x: Math.max(-maxOffsetX, Math.min(maxOffsetX, targetX)),
            y: Math.max(-maxOffsetY, Math.min(maxOffsetY, targetY)),
        });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (isDragging) {
            setIsDragging(false);
            if (containerRef.current) {
                containerRef.current.releasePointerCapture(e.pointerId);
            }
        }
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (scale > 1) {
            handleReset();
        } else {
            setScale(2.5);
            setOffset({ x: 0, y: 0 });
        }
    };

    if (!src) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-4 select-none"
                    onClick={onClose}
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 hover:scale-105 active:scale-95 text-white rounded-full transition-all border border-white/10 z-[110] shadow-lg"
                        title="Close (Esc)"
                    >
                        <X size={20} />
                    </button>

                    {/* Image Viewer Container */}
                    <div
                        ref={containerRef}
                        className="relative w-full h-full max-w-5xl max-h-[80vh] flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        onWheel={handleWheel}
                        onDoubleClick={handleDoubleClick}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <motion.div
                            style={{
                                x: offset.x,
                                y: offset.y,
                                scale: scale,
                            }}
                            transition={
                                isDragging
                                    ? { type: "tween", duration: 0 }
                                    : { type: "spring", damping: 25, stiffness: 220 }
                            }
                            className="relative max-w-full max-h-full flex items-center justify-center"
                        >
                            <img
                                ref={imgRef}
                                src={src}
                                alt={alt || "Notice attachment"}
                                className="rounded-2xl max-w-full max-h-[75vh] object-contain shadow-2xl border border-white/10 pointer-events-none select-none"
                                onLoad={() => {
                                    setScale(1);
                                    setOffset({ x: 0, y: 0 });
                                }}
                            />
                        </motion.div>
                    </div>

                    {/* Glassmorphism Floating Toolbar */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 20, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-8 px-6 py-3 rounded-full bg-slate-900/70 border border-white/10 shadow-2xl flex items-center gap-5 text-white backdrop-blur-md z-[110]"
                    >
                        {/* Zoom Out */}
                        <button
                            onClick={handleZoomOut}
                            disabled={scale <= 1}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Zoom Out (-)"
                        >
                            <ZoomOut size={18} />
                        </button>

                        {/* Zoom level */}
                        <span className="text-xs font-black min-w-[48px] text-center select-none text-gray-300">
                            {Math.round(scale * 100)}%
                        </span>

                        {/* Zoom In */}
                        <button
                            onClick={handleZoomIn}
                            disabled={scale >= 5}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Zoom In (+)"
                        >
                            <ZoomIn size={18} />
                        </button>

                        {/* Divider */}
                        <div className="w-[1px] h-4 bg-white/15" />

                        {/* Reset */}
                        <button
                            onClick={handleReset}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                            title="Reset Zoom (0)"
                        >
                            <RotateCcw size={18} />
                        </button>

                        {/* Divider */}
                        <div className="w-[1px] h-4 bg-white/15" />

                        {/* Open original */}
                        <button
                            onClick={() => window.open(src, "_blank")}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                            title="Open Original"
                        >
                            <Maximize2 size={18} />
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
