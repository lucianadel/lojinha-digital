import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

export function ProductMarkdown({ children }: { children: string }) {
  return <Markdown remarkPlugins={[remarkGfm, remarkBreaks]} skipHtml
    components={{ h1: ({ children }) => <h2>{children}</h2> }}>
    {children}
  </Markdown>;
}
