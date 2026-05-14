import { FixedSizeList as List } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { ReactNode } from 'react';

interface Props<T> {
  items: T[];
  rowHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
}

export function VirtualList<T>({ items, rowHeight, renderItem, keyExtractor }: Props<T>) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style} key={keyExtractor(items[index], index)}>
      {renderItem(items[index], index)}
    </div>
  );

  return (
    <div style={{ height: '60vh', minHeight: 400 }}>
      <AutoSizer
        renderProp={({ height, width }) => (
          <List
            height={height ?? 400}
            itemCount={items.length}
            itemSize={rowHeight}
            width={width ?? 600}
          >
            {Row}
          </List>
        )}
      />
    </div>
  );
}
