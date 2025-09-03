"use client";

import { useEffect, useRef, useCallback } from "react";
import { useState, ChangeEvent } from "react";
import { Textarea } from "./textarea";
import { cn } from "../../lib/utils";
import {
    ImageIcon,
    FileUp,
    Figma,
    MonitorIcon,
    CircleUserRound,
    ArrowUpIcon,
    Paperclip,
    PlusIcon,
    AlertTriangle,
    TrendingUp,
    FileSearch,
    Zap,
    Sparkles,
} from "lucide-react";

interface VercelV0ChatProps {
    onAnalysisRequest?: (prompt: string) => void;
    canAnalyze?: boolean;
}

interface UseAutoResizeTextareaProps {
    minHeight: number;
    maxHeight?: number;
}

function useAutoResizeTextarea({
    minHeight,
    maxHeight,
}: UseAutoResizeTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback(
        (reset?: boolean) => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            if (reset) {
                textarea.style.height = `${minHeight}px`;
                return;
            }

            // Temporarily shrink to get the right scrollHeight
            textarea.style.height = `${minHeight}px`;

            // Calculate new height
            const newHeight = Math.max(
                minHeight,
                Math.min(
                    textarea.scrollHeight,
                    maxHeight ?? Number.POSITIVE_INFINITY
                )
            );

            textarea.style.height = `${newHeight}px`;
        },
        [minHeight, maxHeight]
    );

    useEffect(() => {
        // Set initial height
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = `${minHeight}px`;
        }
    }, [minHeight]);

    // Adjust height on window resize
    useEffect(() => {
        const handleResize = () => adjustHeight();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [adjustHeight]);

    return { textareaRef, adjustHeight };
}

export function VercelV0Chat({ onAnalysisRequest, canAnalyze = false }: VercelV0ChatProps = {}) {
    const [value, setValue] = useState("");
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 42,
        maxHeight: 140,
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (value.trim()) {
                handleSendMessage();
            }
        }
    };

    const handleSendMessage = () => {
        if (!value.trim() || !canAnalyze) return;
        
        if (onAnalysisRequest) {
            onAnalysisRequest(value.trim());
        }
        setValue("");
        adjustHeight(true);
    };

    const handleQuickAction = (actionType: string) => {
        if (!canAnalyze || !onAnalysisRequest) return;

        const prompts = {
            'full': 'Perform a comprehensive analysis of this credit report and highlight all potential legal issues.',
            'late_chunking': 'Perform an advanced late chunking analysis of this credit report with enhanced context preservation to identify all potential legal issues with maximum accuracy.',
            'fcra': 'Analyze this credit report for potential Fair Credit Reporting Act (FCRA) violations and highlight any compliance issues.',
            'collections': 'Analyze all collection accounts for accuracy, validation requirements, and potential FDCPA violations.',
            'disputes': 'Identify and highlight all disputed accounts and verify they are properly marked according to FCRA requirements.'
        };

        const prompt = prompts[actionType as keyof typeof prompts];
        if (prompt) {
            onAnalysisRequest(prompt);
        }
    };

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            // Handle file selection here
            console.log('Selected files:', files);
            // You can add your file handling logic here
        }
    };

    return (
        <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-3 space-y-6">
            <div className="w-full">
                <div className="relative bg-neutral-900 rounded-xl border border-neutral-800">
                    <div className="overflow-y-auto">
                        <Textarea
                            ref={textareaRef}
                            value={value}
                            onChange={(e) => {
                                setValue(e.target.value);
                                adjustHeight();
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask me to analyze your credit report..."
                            className={cn(
                                "w-full px-3 py-2",
                                "resize-none",
                                "bg-transparent",
                                "border-none",
                                "text-white text-sm",
                                "focus:outline-none",
                                "focus-visible:ring-0 focus-visible:ring-offset-0",
                                "placeholder:text-neutral-500 placeholder:text-sm",
                                "min-h-[42px]"
                            )}
                            style={{
                                overflow: "hidden",
                            }}
                        />
                    </div>

                    <div className="flex items-center justify-between p-2">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="group p-2 hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Paperclip className="w-4 h-4 text-white" />
                                <span className="text-xs text-zinc-400 hidden group-hover:inline transition-opacity">
                                    Attach
                                </span>
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                hidden
                                onChange={handleFileSelect}
                                accept="image/*,application/pdf,video/*,audio/*,text/*,application/zip"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleSendMessage}
                                disabled={!value.trim() || !canAnalyze}
                                className={cn(
                                    "px-1.5 py-1.5 rounded-lg text-sm transition-colors border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800 flex items-center justify-between gap-1",
                                    value.trim() && canAnalyze
                                        ? "bg-white text-black"
                                        : "text-zinc-400"
                                )}
                            >
                                <ArrowUpIcon
                                    className={cn(
                                        "w-4 h-4",
                                        value.trim()
                                            ? "text-black"
                                            : "text-zinc-400"
                                    )}
                                />
                                <span className="sr-only">Send</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-2 mt-3">
                    <ActionButton
                        icon={<Zap className="w-4 h-4" />}
                        label="Full Analysis"
                        onClick={() => handleQuickAction('full')}
                        disabled={!canAnalyze}
                    />
                    <ActionButton
                        icon={<Sparkles className="w-4 h-4" />}
                        label="Late Chunking"
                        onClick={() => handleQuickAction('late_chunking')}
                        disabled={!canAnalyze}
                    />
                    <ActionButton
                        icon={<AlertTriangle className="w-4 h-4" />}
                        label="FCRA Violations"
                        onClick={() => handleQuickAction('fcra')}
                        disabled={!canAnalyze}
                    />
                    <ActionButton
                        icon={<TrendingUp className="w-4 h-4" />}
                        label="Collections Analysis"
                        onClick={() => handleQuickAction('collections')}
                        disabled={!canAnalyze}
                    />
                    <ActionButton
                        icon={<FileSearch className="w-4 h-4" />}
                        label="Disputed Accounts"
                        onClick={() => handleQuickAction('disputes')}
                        disabled={!canAnalyze}
                    />
                </div>
            </div>
        </div>
    );
}

interface ActionButtonProps {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    disabled?: boolean;
}

function ActionButton({ icon, label, onClick, disabled = false }: ActionButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "flex items-center gap-2 px-4 py-2 bg-neutral-900 rounded-full border border-neutral-800 text-neutral-400 transition-colors",
                disabled 
                    ? "opacity-50 cursor-not-allowed" 
                    : "hover:bg-blue-500/10 hover:border-blue-500 hover:text-blue-500"
            )}
        >
            {icon}
            <span className="text-xs">{label}</span>
        </button>
    );
}
