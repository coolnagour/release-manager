
"use client";

import React, { useState } from "react";
import { Input, type InputProps } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps extends Omit<InputProps, 'value' | 'onChange'> {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  inputType?: React.HTMLInputTypeAttribute;
}

export function TagInput({ value: tags = [], onChange, placeholder, className, inputType, ...props }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (!tags.includes(newTag)) {
        onChange([...tags, newTag]);
      }
      setInputValue("");
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
        e.preventDefault();
        removeTag(tags.length - 1);
    }
  };

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, index) => index !== indexToRemove));
  };

  const handleClearAll = () => {
    onChange([]);
  }

  return (
    <div className={cn("flex items-center gap-2 rounded-md border border-input p-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2", className)}>
        <div className="flex flex-1 flex-wrap items-center gap-2">
            {tags.map((tag, index) => (
                <Badge key={index} variant="secondary">
                {tag}
                <button
                    type="button"
                    className="ml-1 rounded-full outline-none"
                    onClick={() => removeTag(index)}
                    disabled={props.disabled}
                >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
                </Badge>
            ))}
            <Input
                type={inputType || "text"}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                placeholder={tags.length > 0 ? "" : placeholder}
                className="min-w-[60px] flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 h-auto p-0"
                {...props}
            />
        </div>
        {tags.length > 0 && (
            <button
                type="button"
                className="rounded-full outline-none text-muted-foreground hover:text-foreground"
                onClick={handleClearAll}
                disabled={props.disabled}
                aria-label="Clear all tags"
            >
                <X className="h-4 w-4" />
            </button>
        )}
    </div>
  );
}
