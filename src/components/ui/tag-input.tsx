
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

  return (
    <div>
        <div className={cn("flex flex-wrap items-center gap-2 rounded-md border border-input p-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2", className)}>
            {tags.map((tag, index) => (
                <Badge key={index} variant="secondary">
                {tag}
                <button
                    type="button"
                    className="ml-1 rounded-full outline-none ring-offset-secondary"
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
                className="flex-1 border-0 shadow-none focus-visible:ring-0 h-auto p-0 bg-transparent"
                {...props}
            />
        </div>
    </div>
  );
}
