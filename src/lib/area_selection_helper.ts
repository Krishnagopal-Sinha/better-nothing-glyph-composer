import * as React from 'react';
import useGlobalAppStore from './timeline_state';

interface Coordinates {
  x: number;
  y: number;
}
interface DrawnArea {
  start: undefined | Coordinates;
  end: undefined | Coordinates;
}
interface UseAreaSelectionProps {
  container: React.RefObject<HTMLElement> | undefined;
}
const boxNode = document.createElement('div');
boxNode.style.position = 'fixed';
boxNode.style.background = 'rgba(255, 255, 255, 0.5)';
boxNode.style.border = 'solid 1px white';
boxNode.style.borderRadius = '2px';
boxNode.style.mixBlendMode = 'screen';
boxNode.style.pointerEvents = 'none';
boxNode.style.zIndex = '9999';

export function useAreaSelection({
  container = { current: document.body }
}: UseAreaSelectionProps) {
  const boxRef = React.useRef<HTMLDivElement>(boxNode);
  const boxElement = boxRef;
  const [mouseDown, setMouseDown] = React.useState<boolean>(false);
  const [selection, setSelection] = React.useState<DOMRect | null>(null);
  const [drawArea, setDrawArea] = React.useState<DrawnArea>({
    start: undefined,
    end: undefined
  });

  // Get the selectAll function from the global store
  const selectAll = useGlobalAppStore((state) => state.selectAll);

  const handleMouseMove = (e: MouseEvent) => {
    // Always allow drag selection - no need to check if it's enabled
    document.body.style.userSelect = 'none';
    setDrawArea((prev) => ({
      ...prev,
      end: {
        x: e.clientX,
        y: e.clientY
      }
    }));
  };

  const handleMouseDown = (e: MouseEvent) => {
    const containerElement = container.current;
    const target = e.target as HTMLElement;

    // Check if clicking on a block or interactive element
    const isClickingOnBlock =
      target.closest('[data-drag-handler]') ||
      target.closest('[data-trim-handler]') ||
      target.closest('[data-selected-block]');

    // If clicking outside blocks, start drag selection
    if (!isClickingOnBlock) {
      setMouseDown(true);

      if (containerElement && containerElement.contains(target)) {
        document.addEventListener('mousemove', handleMouseMove);
        setDrawArea({
          start: {
            x: e.clientX,
            y: e.clientY
          },
          end: {
            x: e.clientX,
            y: e.clientY
          }
        });
      }
    } else {
      // Clear any existing drag selection when clicking on blocks
      setMouseDown(false);
      setDrawArea({ start: undefined, end: undefined });
    }
  };

  const handleMouseUp = () => {
    document.body.style.userSelect = 'initial';
    document.removeEventListener('mousemove', handleMouseMove);
    setMouseDown(false);
    setDrawArea({ start: undefined, end: undefined });
  };

  React.useEffect(() => {
    const containerElement = container.current;
    if (containerElement) {
      containerElement.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        containerElement.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [container, selectAll]);

  React.useEffect(() => {
    const { start, end } = drawArea;
    if (start && end && boxElement.current) {
      drawSelectionBox(boxElement.current, start, end);
      setSelection(boxElement.current.getBoundingClientRect());
      // Show the selection box
      boxElement.current.style.display = 'block';
    } else if (boxElement.current) {
      // Hide the selection box when no selection area
      boxElement.current.style.display = 'none';
      setSelection(null);
    }
  }, [drawArea, boxElement]);

  React.useEffect(() => {
    const containerElement = container.current;
    const selectionBoxElement = boxElement.current;
    if (containerElement && selectionBoxElement) {
      if (mouseDown) {
        if (!document.body.contains(selectionBoxElement)) {
          containerElement.appendChild(selectionBoxElement);
        }
      } else {
        if (containerElement.contains(selectionBoxElement)) {
          containerElement.removeChild(selectionBoxElement);
        }
        // Also hide the selection box when drag select is disabled
        if (selectionBoxElement.style.display !== 'none') {
          selectionBoxElement.style.display = 'none';
        }
      }
    }
  }, [mouseDown, container, boxElement]);

  return selection;
}

export function useSelected(elementRef: React.RefObject<HTMLElement>, selection: DOMRect | null) {
  const [isSelected, setIsSelected] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!elementRef.current || !selection) {
      setIsSelected(false);
    } else {
      const a = elementRef.current.getBoundingClientRect();
      const b = selection;
      setIsSelected(
        !(
          a.y + a.height < b.y ||
          a.y > b.y + b.height ||
          a.x + a.width < b.x ||
          a.x > b.x + b.width
        )
      );
      // console.log('block drag selection updated!');
    }
  }, [elementRef, selection]);

  return isSelected;
}

function drawSelectionBox(boxElement: HTMLElement, start: Coordinates, end: Coordinates): void {
  const b = boxElement;
  if (end.x > start.x) {
    b.style.left = start.x + 'px';
    b.style.width = end.x - start.x + 'px';
  } else {
    b.style.left = end.x + 'px';
    b.style.width = start.x - end.x + 'px';
  }

  if (end.y > start.y) {
    b.style.top = start.y + 'px';
    b.style.height = end.y - start.y + 'px';
  } else {
    b.style.top = end.y + 'px';
    b.style.height = start.y - end.y + 'px';
  }
}
