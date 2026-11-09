/**
 * Utility functions for converting between ContentEditable HTML and Markdown.
 * Preserves bold styling (**bold**), paragraphs, and line breaks while keeping
 * the storage format 100% compatible with Firestore and RichText renderer.
 */

export function convertHtmlToMarkdown(element: HTMLElement | null): string {
    if (!element) return "";

    function walkNode(node: Node): string {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent || "";
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const tag = el.tagName.toLowerCase();

            if (tag === "br") {
                return "\n";
            }

            let inner = "";
            for (const child of Array.from(el.childNodes)) {
                inner += walkNode(child);
            }

            const isBoldTag = tag === "b" || tag === "strong";
            const fontWeight = el.style?.fontWeight;
            const isBoldStyle = fontWeight === "bold" || parseInt(fontWeight || "0", 10) >= 600;

            if (isBoldTag || isBoldStyle) {
                if (!inner || !inner.trim()) return inner;
                // Preserve leading and trailing spaces outside the ** markers
                const leading = inner.match(/^\s*/)?.[0] || "";
                const trailing = inner.match(/\s*$/)?.[0] || "";
                const content = inner.trim();
                return `${leading}**${content}**${trailing}`;
            }

            if (tag === "div" || tag === "p") {
                // If it's an empty line created by Enter in contentEditable (<p><br></p> or <div><br></div>)
                if ((!inner || inner === "") && el.querySelector("br")) {
                    return "\n";
                }
                return inner ? `\n${inner}` : "\n";
            }

            return inner;
        }

        return "";
    }

    let output = "";
    for (const child of Array.from(element.childNodes)) {
        output += walkNode(child);
    }

    // Clean up single leading newline introduced by top-level <div> wrapper
    return output.replace(/^\n/, "");
}

export function convertMarkdownToHtml(markdown: string): string {
    if (!markdown) return "";

    // 1. Sanitize angle brackets
    const escaped = markdown
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // 2. Replace **bold text** or __bold text__ with <strong>bold text</strong>
    const withBold = escaped.replace(/(\*\*[\s\S]+?\*\*|__[\s\S]+?__)/g, (match) => {
        const inner = match.slice(2, -2);
        return `<strong>${inner}</strong>`;
    });

    // 3. Convert newlines to <br>
    return withBold.replace(/\n/g, "<br>");
}
