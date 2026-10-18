import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function CommentBody({ body }: { body: string }) {
  const [expanded, setExpanded] = useState(false);
  const source = body.trim();
  if (!source) return <p className="muted">(empty comment)</p>;
  const long = source.length > 700;

  return (
    <div className="comment-body">
      <div className={long && !expanded ? 'markdown collapsed' : 'markdown'}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) => {
              if (!isSafeUrl(href)) return <span>{children}</span>;
              return (
                <a href={href} target="_blank" rel="noreferrer">
                  {children}
                </a>
              );
            },
            img: ({ src, alt }) => {
              if (!isSafeUrl(src)) return null;
              return <img src={src} alt={alt ?? ''} />;
            },
          }}
        >
          {source}
        </ReactMarkdown>
      </div>
      {long ? (
        <button type="button" className="text-button" onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Show less' : 'Show more'}
        </button>
      ) : null}
    </div>
  );
}

function isSafeUrl(value: string | undefined): value is string {
  if (!value) return false;
  return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('mailto:') || value.startsWith('/');
}
