declare module 'ink-divider' {
  import { FC } from 'react';
  interface DividerProps {
    title?: string;
    width?: number;
    padding?: number;
    dividerChar?: string;
    titleColor?: string;
    dividerColor?: string;
  }
  const Divider: FC<DividerProps>;
  export default Divider;
}

declare module 'ink-gradient' {
  import { FC } from 'react';
  interface GradientProps {
    name?: string;
    children: React.ReactNode;
  }
  const Gradient: FC<GradientProps>;
  export default Gradient;
}

declare module 'ink-big-text' {
  import { FC } from 'react';
  interface BigTextProps {
    text: string;
    font?: string;
    align?: 'left' | 'center' | 'right';
    colors?: string[];
  }
  const BigText: FC<BigTextProps>;
  export default BigText;
}

declare module 'ink-progress-bar' {
  import { FC } from 'react';
  interface ProgressBarProps {
    percent: number;
    left?: React.ReactNode;
    right?: React.ReactNode;
    character?: string;
    width?: number;
  }
  const ProgressBar: FC<ProgressBarProps>;
  export default ProgressBar;
}

declare module 'ink-link' {
  import { FC } from 'react';
  interface LinkProps {
    url: string;
    children: React.ReactNode;
  }
  const Link: FC<LinkProps>;
  export default Link;
}

declare module 'ink-confirm-input' {
  import { FC } from 'react';
  interface ConfirmInputProps {
    message: string;
    onConfirm: (value: boolean) => void;
    onCancel?: () => void;
  }
  const ConfirmInput: FC<ConfirmInputProps>;
  export default ConfirmInput;
}

declare module 'ink-multi-select' {
  import { FC } from 'react';
  interface Item {
    label: string;
    value: string;
  }
  interface MultiSelectProps {
    items: Item[];
    onSubmit: (items: Item[]) => void;
    onHighlight?: (item: Item) => void;
  }
  const MultiSelect: FC<MultiSelectProps>;
  export default MultiSelect;
} 