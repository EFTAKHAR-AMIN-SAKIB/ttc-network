import React, { useState } from "react";
import { ChevronDown, ChevronUp, Plus, X, Trash2, Calendar } from "lucide-react";

export function CollapsibleSection({ 
    title, 
    icon: Icon, 
    children, 
    defaultOpen = false 
}: { 
    title: string; 
    icon: any; 
    children: React.ReactNode; 
    defaultOpen?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-[#1a1b23] shadow-sm mb-4">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 dark:bg-primary/20 text-primary rounded-xl">
                        <Icon size={18} />
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white">{title}</span>
                </div>
                <div className="text-gray-400">
                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
            </button>
            
            {isOpen && (
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#15161d]">
                    {children}
                </div>
            )}
        </div>
    );
}

// Reusable standard text input
export function FormInput({ label, value, onChange, placeholder, type = "text", icon: Icon }: any) {
    return (
        <div className="mb-4 last:mb-0">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                {Icon && <Icon size={14} className="inline mr-1 text-gray-400" />}
                {label}
            </label>
            <input
                type={type}
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-[#0f1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
        </div>
    );
}

export function FormSelect({ label, value, onChange, options, icon: Icon }: any) {
    return (
        <div className="mb-4 last:mb-0">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                {Icon && <Icon size={14} className="inline mr-1 text-gray-400" />}
                {label}
            </label>
            <select
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-[#0f1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
            >
                <option value="">Select {label}...</option>
                {options.map((opt: any) => (
                    <option key={opt.value || opt} value={opt.value || opt}>
                        {opt.label || opt}
                    </option>
                ))}
            </select>
        </div>
    );
}

export type FieldType = "text" | "url" | "date" | "textarea" | "select";

export interface ArrayFieldDef<T> {
    key: keyof T;
    label: string;
    type: FieldType;
    placeholder?: string;
    options?: { label: string; value: string }[];
    required?: boolean;
}

export function ArrayEditor<T extends { id: string }>({
    title,
    icon: Icon,
    items,
    onChange,
    fields,
    itemTitleKey,
    itemSubtitleKey,
}: {
    title: string;
    icon: any;
    items: T[];
    onChange: (items: T[]) => void;
    fields: ArrayFieldDef<T>[];
    itemTitleKey: keyof T;
    itemSubtitleKey?: keyof T;
}) {
    const handleAdd = () => {
        const newItem: any = { id: Math.random().toString(36).substr(2, 9) };
        fields.forEach(f => (newItem[f.key] = ""));
        onChange([...items, newItem]);
    };

    const handleRemove = (id: string) => {
        onChange(items.filter((item) => item.id !== id));
    };

    const handleUpdate = (id: string, key: keyof T, value: any) => {
        onChange(
            items.map((item) => (item.id === id ? { ...item, [key]: value } : item))
        );
    };

    return (
        <CollapsibleSection title={title} icon={Icon}>
            <div className="space-y-4">
                {items.map((item, index) => (
                    <div key={item.id} className="p-4 bg-white dark:bg-[#0f1117] border border-gray-200 dark:border-gray-800 rounded-xl relative">
                        <div className="flex justify-between items-center mb-3">
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white">
                                    {String(item[itemTitleKey] || `New ${title}`)}
                                </h4>
                                {itemSubtitleKey && item[itemSubtitleKey] && (
                                    <p className="text-xs text-gray-500">{String(item[itemSubtitleKey])}</p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRemove(item.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {fields.map(field => (
                                <div key={String(field.key)} className={field.type === "textarea" ? "col-span-full" : ""}>
                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                        {field.label} {field.required && "*"}
                                    </label>
                                    {field.type === "textarea" ? (
                                        <textarea
                                            value={(item[field.key] as string) || ""}
                                            onChange={(e) => handleUpdate(item.id, field.key, e.target.value)}
                                            placeholder={field.placeholder}
                                            rows={2}
                                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-[#1a1b23] text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-primary focus:border-primary resize-none transition-all"
                                        />
                                    ) : field.type === "select" ? (
                                        <select
                                            value={(item[field.key] as string) || ""}
                                            onChange={(e) => handleUpdate(item.id, field.key, e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-[#1a1b23] text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-primary focus:border-primary appearance-none transition-all"
                                        >
                                            <option value="">Select...</option>
                                            {field.options?.map((opt: any) => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type={field.type}
                                            value={(item[field.key] as string) || ""}
                                            onChange={(e) => handleUpdate(item.id, field.key, e.target.value)}
                                            placeholder={field.placeholder}
                                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-[#1a1b23] text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                
                <button
                    type="button"
                    onClick={handleAdd}
                    className="flex w-full items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 hover:text-primary hover:border-primary dark:hover:border-primary transition-colors font-semibold text-sm"
                >
                    <Plus size={16} /> Add {title}
                </button>
            </div>
        </CollapsibleSection>
    );
}
