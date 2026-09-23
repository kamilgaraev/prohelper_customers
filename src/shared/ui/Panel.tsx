import { HTMLAttributes } from 'react';

interface PanelProps extends HTMLAttributes<HTMLElement> {
  as?: 'article' | 'section' | 'div';
}

export function Panel({ as: Element = 'section', className = '', ...props }: PanelProps) {
  return <Element className={`ui-panel ${className}`.trim()} {...props} />;
}
