"use client";

// import { Check, Copy, Download } from "lucide-react";
import { FC, memo } from "react";
import { Prism, SyntaxHighlighterProps } from "react-syntax-highlighter";

import { coldarkDark } from "react-syntax-highlighter/dist/cjs/styles/prism";

// TODO: Remove this when @type/react-syntax-highlighter is updated
const SyntaxHighlighter = Prism as unknown as FC<SyntaxHighlighterProps>;

interface Props {
    language: string;
    value: string;
}

interface languageMap {
    [key: string]: string | undefined;
}

export const programmingLanguages: languageMap = {
    javascript: ".js",
    python: ".py",
    java: ".java",
    c: ".c",
    cpp: ".cpp",
    "c++": ".cpp",
    "c#": ".cs",
    ruby: ".rb",
    php: ".php",
    swift: ".swift",
    "objective-c": ".m",
    kotlin: ".kt",
    typescript: ".ts",
    go: ".go",
    perl: ".pl",
    rust: ".rs",
    scala: ".scala",
    haskell: ".hs",
    lua: ".lua",
    shell: ".sh",
    sql: ".sql",
    html: ".html",
    css: ".css",
    // add more file extensions here, make sure the key is same as language prop in CodeBlock.tsx component
};

export const generateRandomString = (length: number, lowercase = false) => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXY3456789"; // excluding similar looking characters like Z, 2, I, 1, O, 0
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return lowercase ? result?.toLowerCase() : result;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const AiCodeBlock: FC<Props> = memo(({ language, value }) => {
    // const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 2000 });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const downloadAsFile = () => {
        if (typeof window === "undefined") {
            return;
        }
        const fileExtension = programmingLanguages[language] || ".file";
        const suggestedFileName = `file-${generateRandomString(
            3,
            true,
        )}${fileExtension}`;
        const fileName = window.prompt("Enter file name", suggestedFileName);

        if (!fileName) {
            // User pressed cancel on prompt.
            return;
        }

        const blob = new Blob([value], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = fileName;
        link.href = url;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // const onCopy = () => {
    //     if (isCopied) return;
    //     copyToClipboard(value);
    // };

    return (
        <div className="codeblock relative w-full bg-zinc-950 font-sans">
            <div className="flex w-full items-center justify-between bg-zinc-800 px-6 py-2 pr-4 text-zinc-100">
                <span className="text-xs lowercase">{language}</span>
                {/* <div className="flex items-center space-x-1">
                    <Button variant="ghost" onClick={downloadAsFile} size="icon">
                        <Download />
                        <span className="sr-only">Download</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onCopy}>
                        {isCopied ? (
                            <Check className="h-4 w-4" />
                        ) : (
                            <Copy className="h-4 w-4" />
                        )}
                        <span className="sr-only">Copy code</span>
                    </Button>
                </div> */}
            </div>
            <SyntaxHighlighter
                language={language}
                style={coldarkDark}
                PreTag="div"
                showLineNumbers
                customStyle={{
                    width: "100%",
                    background: "transparent",
                    padding: "1.5rem 1rem",
                    borderRadius: "0.5rem",
                }}
                codeTagProps={{
                    style: {
                        fontSize: "0.9rem",
                        fontFamily: "var(--font-mono)",
                    },
                }}
            >
                {value}
            </SyntaxHighlighter>
        </div>
    );
});
AiCodeBlock.displayName = "AiCodeBlock";

export { AiCodeBlock };


{/* <ReactMarkdown
                                        remarkPlugins={[remarkGfm, remarkMath]}
                                        components={{
                                            p({ children }: { children: React.ReactNode }) {
                                                return <p className="mb-2 last:mb-0">{children}</p>;
                                            },
                                            code({ node, inline, className, children, ...props }: { node: any, inline: boolean, className?: string, children: React.ReactNode[], [key: string]: any }) {
                                                if (children.length) {
                                                    if (children[0] == "▍") {
                                                        return (
                                                            <span className="mt-1 animate-pulse cursor-default">▍</span>
                                                        );
                                                    }

                                                    children[0] = (children[0] as string).replace("`▍`", "▍");
                                                }

                                                const match = /language-(\w+)/.exec(className || "");

                                                if (inline) {
                                                    return (
                                                        <code className={className} {...props}>
                                                            {children}
                                                        </code>
                                                    );
                                                }

                                                return (
                                                    // <pre className={className} {...props}>
                                                    //     <code className={className} {...props}>
                                                    //         {children}
                                                    //     </code>
                                                    // </pre>
                                                    <CodeBlock
                                                        key={Math.random()}
                                                        language={(match && match[1]) || ""}
                                                        value={String(children).replace(/\n$/, "")}
                                                        {...props}
                                                    />
                                                );
                                            },
                                        }}
                                    >
                                        {this.state.code}

                                    </ReactMarkdown> */}