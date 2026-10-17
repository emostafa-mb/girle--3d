import type { CSSProperties, DetailedHTMLProps, HTMLAttributes, Ref } from 'react';

// <model-viewer> is a custom element; React passes its attributes through as strings.
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        ref?: Ref<HTMLElement>;
        src: string;
        poster?: string;
        alt: string;
        style?: CSSProperties;
        [attribute: `${string}-${string}`]: string | undefined;
        ar?: string;
        exposure?: string;
      };
    }
  }
}
