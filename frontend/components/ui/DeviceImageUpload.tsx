"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { casesApi, extractApiError, resolveAssetUrl } from "@/services/api";
import { useToastStore } from "@/store/toastStore";

interface BaseProps {
  label?: string;
  accept?: string;
  buttonText?: string;
  variant?: "paper" | "dark";
  helperText?: string;
}

interface UrlUploadProps extends BaseProps {
  mode?: "url";
  caseId: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  showUrlInput?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}

interface FileSelectProps extends BaseProps {
  mode: "file";
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
}

export type DeviceImageUploadProps = UrlUploadProps | FileSelectProps;

export function DeviceImageUpload(props: DeviceImageUploadProps) {
  const {
    label = "Image",
    accept = ".jpg,.jpeg,.png,.webp,.gif",
    buttonText = "Upload Image from Device",
    variant = "dark",
    helperText,
  } = props;

  const pushToast = useToastStore((s) => s.push);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  const selectedFile = props.mode === "file" ? props.selectedFile : null;

  useEffect(() => {
    if (props.mode !== "file") return;
    if (!selectedFile) {
      setFilePreviewUrl(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (selectedFile.type.startsWith("image/")) {
      const objUrl = URL.createObjectURL(selectedFile);
      setFilePreviewUrl(objUrl);
      return () => URL.revokeObjectURL(objUrl);
    }
    setFilePreviewUrl(null);
  }, [props.mode, selectedFile]);

  const isPaper = variant === "paper";
  const labelClass = isPaper
    ? "block text-xs font-typewriter uppercase mb-1 text-[#1e1914]"
    : "block text-xs font-typewriter uppercase text-paper/80 mb-1";
  const btnClass = isPaper
    ? "inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#231d18] hover:bg-[#382d24] text-cream rounded-sm text-xs font-typewriter uppercase transition disabled:opacity-60"
    : "inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2a221b] hover:bg-[#382d24] border border-[#5a4733] text-paper rounded-sm text-xs font-typewriter uppercase transition disabled:opacity-60";
  const inputClass = isPaper
    ? "w-full px-3 py-2 bg-[#f5ebd8] border border-[#8c7353] rounded-sm text-xs text-[#1e1914]"
    : "w-full px-3 py-2 bg-[#12100e] border border-[#3d3126] rounded-sm text-xs text-cream";
  const clearBtnClass = isPaper
    ? "p-1.5 text-blood-red hover:bg-blood-red/15 rounded-sm"
    : "p-1.5 text-blood-red hover:bg-blood-red/20 rounded-sm";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    if (props.mode === "file") {
      props.onFileSelect(file);
      return;
    }

    setUploading(true);
    props.onUploadingChange?.(true);
    try {
      const res = await casesApi.uploadImage(props.caseId, file);
      props.onChange(res.url);
      pushToast({ type: "success", title: "Image uploaded from device" });
    } catch (err) {
      pushToast({
        type: "error",
        title: "Image upload failed",
        description: extractApiError(err),
      });
    } finally {
      setUploading(false);
      props.onUploadingChange?.(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleClear = () => {
    if (inputRef.current) inputRef.current.value = "";
    if (props.mode === "file") {
      props.onFileSelect(null);
    } else {
      props.onChange("");
    }
  };

  const previewUrl =
    props.mode === "file" ? filePreviewUrl : resolveAssetUrl(props.value.trim() || null);
  const hasSelection = props.mode === "file" ? Boolean(props.selectedFile) : Boolean(props.value.trim());

  return (
    <div className="space-y-2">
      <label className={labelClass}>{label}</label>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className={btnClass}
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5 text-blood-red" />
          )}
          {uploading ? "Uploading..." : buttonText}
        </button>

        {props.mode === "file" && props.selectedFile && (
          <span
            className={`text-xs truncate max-w-[200px] ${
              isPaper ? "text-[#3d3023]" : "text-paper/80"
            }`}
            title={props.selectedFile.name}
          >
            {props.selectedFile.name}
          </span>
        )}

        {hasSelection && (
          <button
            type="button"
            onClick={handleClear}
            className={clearBtnClass}
            title="Clear selection"
            aria-label="Clear image"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {props.mode !== "file" && props.showUrlInput !== false && (
        <input
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder || "Or paste image URL (/images/demo/... or /uploads/...)"}
          className={inputClass}
        />
      )}

      {previewUrl ? (
        <div
          className={`flex items-center gap-2.5 p-1.5 rounded-sm border ${
            isPaper ? "bg-[#f5ebd8] border-[#bfa682]" : "bg-[#12100e] border-[#3d3126]"
          }`}
        >
          <img
            src={previewUrl}
            alt="Selected preview"
            className="w-12 h-12 object-cover rounded-sm border border-[#7c664a] shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className={`text-[11px] font-typewriter truncate ${isPaper ? "text-[#3d3023]" : "text-paper/80"}`}>
              {props.mode === "file" ? props.selectedFile?.name : "Image ready"}
            </p>
          </div>
        </div>
      ) : helperText ? (
        <p className={`text-[11px] flex items-center gap-1 ${isPaper ? "text-[#5a452d]" : "text-paper/60"}`}>
          <ImageIcon className="w-3 h-3 shrink-0" />
          <span>{helperText}</span>
        </p>
      ) : null}
    </div>
  );
}
