import React from 'react';
import ReactMarkdown from 'react-markdown';
// import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { Box, Paper, Typography, Divider, Alert } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface DocumentationViewerProps {
  content?: string;
  videoUrl?: string;
  projectName: string;
}

export const DocumentationViewer: React.FC<DocumentationViewerProps> = ({ content, videoUrl, projectName }) => {
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: '#fff' }}>
        {projectName} Documentation
      </Typography>

      {videoUrl && (
        <Paper sx={{ p: 0, bgcolor: '#000', mb: 4, overflow: 'hidden', borderRadius: 2, border: '1px solid #333' }}>
          <Box sx={{ position: 'relative', paddingTop: '56.25%' /* 16:9 Aspect Ratio */ }}>
            <iframe
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              src={videoUrl.replace('watch?v=', 'embed/')}
              title="Project Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </Box>
        </Paper>
      )}

      <Paper sx={{ p: 4, bgcolor: '#1e1e1e', color: '#e6e6e6', border: '1px solid #333', borderRadius: 2 }}>
        {content ? (
          <div className="markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ node, ...props }) => <Typography variant="h4" sx={{ mt: 4, mb: 2, color: '#fff', fontWeight: 700 }} {...props} />,
                h2: ({ node, ...props }) => <Typography variant="h5" sx={{ mt: 3, mb: 1.5, color: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #333', pb: 1 }} {...props} />,
                h3: ({ node, ...props }) => <Typography variant="h6" sx={{ mt: 2, mb: 1, color: '#e0e0e0', fontWeight: 600 }} {...props} />,
                p: ({ node, ...props }) => <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.6 }} {...props} />,
                li: ({ node, ...props }) => <li style={{ marginBottom: '0.5em', lineHeight: '1.6' }} {...props} />,
                code: ({ node, inline, className, children, ...props }: any) => {
                  const match = /language-(\w+)/.exec(className || '')
                  return !inline ? (
                    <Box sx={{ my: 2, bgcolor: '#111', p: 2, borderRadius: 1, overflowX: 'auto', border: '1px solid #333', fontFamily: 'monospace' }}>
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </Box>
                  ) : (
                    <code className={className} style={{ backgroundColor: 'rgba(187, 134, 252, 0.1)', color: '#BB86FC', padding: '0.2em 0.4em', borderRadius: '4px', fontFamily: 'monospace' }} {...props}>
                      {children}
                    </code>
                  )
                },
                blockquote: ({ node, ...props }) => <Box sx={{ borderLeft: '4px solid #BB86FC', pl: 2, my: 2, color: '#aaa', fontStyle: 'italic' }}><blockquote style={{ margin: 0 }} {...props} /></Box>
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <Alert
            severity="info"
            variant="outlined"
            icon={<WarningAmberIcon fontSize="inherit" />}
            sx={{ bgcolor: 'rgba(187, 134, 252, 0.05)', color: '#BB86FC', borderColor: 'rgba(187, 134, 252, 0.3)' }}
          >
            No documentation provided for this project yet. Add a README.md or project description to see it here.
          </Alert>
        )}
      </Paper>
    </Box>
  );
};
